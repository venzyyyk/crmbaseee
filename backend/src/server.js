const express = require('express')
const cors = require('cors')
const multer = require('multer')
const fs = require('fs')
const path = require('path')
const sqlite3 = require('sqlite3').verbose()
const connectDB = require('./db');
const auth = require('./auth')
const leads = require('./leads')

const app = express()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

app.use(cors())
app.use(express.json())

function mapUser(u) {
  return {
    id: u._id,      
    email: u.email, 
    role: u.role,   
    teamId: u.teamId || null
  }
}

app.post('/auth/register', auth.register)
app.post('/auth/login', auth.login)
app.get('/me', auth.authMiddleware, async (req, res) => {
  try {
    const User = require('./models/User');
    const user = await User.findById(req.user.id);
    res.json({ user: mapUser(user), team: null });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка' });
  }
});

app.get('/leads', auth.authMiddleware, leads.getLeads)
app.post('/leads', auth.authMiddleware, leads.createLead)
app.post('/leads/:id/status', auth.authMiddleware, leads.updateStatus)
app.put('/leads/:id', auth.authMiddleware, leads.updateLead)
app.put('/leads/:id/deadline', auth.authMiddleware, leads.updateDeadline)
app.delete('/leads/:id', auth.authMiddleware, leads.deleteLead)

app.get('/analytics', auth.authMiddleware, async (req, res) => {
  try {
    let where = ''
    let params = []
    if (req.user.role === 'admin') {
      where = '1=1'
    } else if (req.user.role === 'team_lead') {
      where = 'TeamId=?'
      params = [req.user.teamId]
    } else {
      where = 'OwnerId=?'
      params = [req.user.id]
    }

    const statusRows = await all(`SELECT Status, COUNT(*) as c FROM Leads WHERE ${where} GROUP BY Status`, params)
    const sourceRows = await all(`SELECT Source, COUNT(*) as c FROM Leads WHERE ${where} GROUP BY Source`, params)
    const totalRow = await get(`SELECT COUNT(*) as total FROM Leads WHERE ${where}`, params)
    const teamCountRow = req.user.role === 'admin'
      ? await get(`SELECT COUNT(*) as total FROM Teams`, [])
      : req.user.teamId
        ? await get(`SELECT COUNT(*) as total FROM Users WHERE TeamId=?`, [req.user.teamId])
        : { total: 1 }

    const byStatus = {}
    for (const r of statusRows) byStatus[r.Status] = r.c
    const bySource = {}
    for (const r of sourceRows) bySource[r.Source || 'Не указано'] = r.c

    res.json({
      totalLeads: totalRow?.total || 0,
      byStatus,
      bySource,
      teamMembers: teamCountRow?.total || 0,
      statusList: leads.STATUS_LIST
    })
  } catch (e) {
    res.status(500).json({ message: 'DB error' })
  }
})

app.get('/team', auth.authMiddleware, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const teams = await all(`SELECT t.*, u.Email as LeadEmail FROM Teams t LEFT JOIN Users u ON u.Id=t.LeadUserId ORDER BY t.Id DESC`)
      return res.json({ teams })
    }

    if (!req.user.teamId) return res.json({ team: null, members: [] })

    const team = await get(`SELECT * FROM Teams WHERE Id=?`, [req.user.teamId])
    const members = await all(`SELECT Id, Email, Role, TeamId FROM Users WHERE TeamId=? ORDER BY Id ASC`, [req.user.teamId])
    res.json({ team, members: members.map(mapUser) })
  } catch (e) {
    res.status(500).json({ message: 'DB error' })
  }
})

app.post('/team/members', auth.authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'team_lead' && req.user.role !== 'admin') return res.status(403).json({ message: 'Only team lead/admin' })
    const { email, password, role = 'member' } = req.body || {}
    const normEmail = String(email || '').trim().toLowerCase()
    if (!normEmail || !password) return res.status(400).json({ message: 'Введите email и пароль' })

    const teamId = req.user.role === 'admin' ? (req.body.teamId || null) : req.user.teamId
    if (!teamId) return res.status(400).json({ message: 'Нет команды' })

    const exists = await get(`SELECT Id FROM Users WHERE Email=?`, [normEmail])
    if (exists) return res.status(409).json({ message: 'Email уже зарегистрирован' })

    const createdAt = new Date().toISOString()
    const normRole = role === 'team_lead' ? 'team_lead' : (role === 'user' ? 'user' : 'member')
    const r = await run(
      `INSERT INTO Users(Email, PasswordHash, Role, CreatedAt, TeamId) VALUES(?,?,?,?,?)`,
      [normEmail, String(password), normRole, createdAt, teamId]
    )
    const user = await get(`SELECT Id, Email, Role, TeamId FROM Users WHERE Id=?`, [r.lastID])
    res.json({ ok: true, member: mapUser(user) })
  } catch (e) {
    res.status(500).json({ message: 'DB error' })
  }
})

app.post('/team/upgrade-to-lead', auth.authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'user' && req.user.role !== 'member') return res.status(400).json({ message: 'Уже team lead или admin' })
    const { teamName = '' } = req.body || {}
    const existingUser = await get(`SELECT Id, Email, Role, TeamId FROM Users WHERE Id=?`, [req.user.id])
    if (!existingUser) return res.status(404).json({ message: 'User not found' })
    if (existingUser.TeamId) return res.status(400).json({ message: 'У пользователя уже есть команда' })

    const createdAt = new Date().toISOString()
    const teamInsert = await run(
      `INSERT INTO Teams(Name, LeadUserId, CreatedAt) VALUES(?,?,?)`,
      [String(teamName || `Team ${existingUser.Email.split('@')[0]}`).trim(), req.user.id, createdAt]
    )
    await run(`UPDATE Users SET Role='team_lead', TeamId=? WHERE Id=?`, [teamInsert.lastID, req.user.id])
    const user = await get(`SELECT Id, Email, Role, TeamId FROM Users WHERE Id=?`, [req.user.id])
    return res.json({ ok: true, user: mapUser(user) })
  } catch (e) {
    res.status(500).json({ message: 'DB error' })
  }
})

app.post('/admin/team-leads', auth.authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Only admin' })
    const { email, password, teamName = '' } = req.body || {}
    const normEmail = String(email || '').trim().toLowerCase()
    if (!normEmail || !password) return res.status(400).json({ message: 'Введите email и пароль' })

    const exists = await get(`SELECT Id FROM Users WHERE Email=?`, [normEmail])
    if (exists) return res.status(409).json({ message: 'Email уже зарегистрирован' })

    const createdAt = new Date().toISOString()
    const userInsert = await run(
      `INSERT INTO Users(Email, PasswordHash, Role, CreatedAt, TeamId) VALUES(?,?,?,?,NULL)`,
      [normEmail, String(password), 'team_lead', createdAt]
    )
    const teamInsert = await run(
      `INSERT INTO Teams(Name, LeadUserId, CreatedAt) VALUES(?,?,?)`,
      [String(teamName || `Team ${normEmail.split('@')[0]}`).trim(), userInsert.lastID, createdAt]
    )
    await run(`UPDATE Users SET TeamId=? WHERE Id=?`, [teamInsert.lastID, userInsert.lastID])

    const user = await get(`SELECT Id, Email, Role, TeamId FROM Users WHERE Id=?`, [userInsert.lastID])
    return res.json({ ok: true, teamLead: mapUser(user), teamId: teamInsert.lastID })
  } catch (e) {
    res.status(500).json({ message: 'DB error' })
  }
})

app.post('/team/upload-base', auth.authMiddleware, upload.single('basefile'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Файл не найден' })

    let targetTeamId = null
    if (req.user.role === 'admin') {
      targetTeamId = Number(req.body.teamId || 0)
      if (!targetTeamId) return res.status(400).json({ message: 'Укажи teamId' })
    } else if (req.user.role === 'team_lead') {
      targetTeamId = req.user.teamId
    } else {
      return res.status(403).json({ message: 'Only admin/team lead' })
    }

    const team = await get(`SELECT * FROM Teams WHERE Id=?`, [targetTeamId])
    if (!team) return res.status(404).json({ message: 'Команда не найдена' })

    const original = String(req.file.originalname || '').toLowerCase()
    if (!original.endsWith('.sqlite') && !original.endsWith('.db')) {
      return res.status(400).json({ message: 'Нужен файл .sqlite или .db' })
    }

    const tmpPath = path.join(__dirname, '..', `upload_${Date.now()}.sqlite`)
    fs.writeFileSync(tmpPath, req.file.buffer)

    const importRows = await new Promise((resolve, reject) => {
      const extDb = new sqlite3.Database(tmpPath, sqlite3.OPEN_READONLY, (err) => {
        if (err) return reject(err)
      })

      const queries = ['SELECT * FROM Leads', 'SELECT * FROM leads']
      const tryQuery = (index) => {
        if (index >= queries.length) {
          extDb.close(() => {})
          return reject(new Error('В загруженной sqlite нет таблицы Leads'))
        }
        extDb.all(queries[index], [], (err, rows) => {
          if (err) return tryQuery(index + 1)
          extDb.close(() => {})
          resolve(rows || [])
        })
      }
      tryQuery(0)
    })

    try { fs.unlinkSync(tmpPath) } catch {}

    const members = await all(`SELECT Id, Role FROM Users WHERE TeamId=? AND Role IN ('member','user') ORDER BY Id ASC`, [targetTeamId])
    const fallbackAssigned = members.length ? members : [{ Id: team.LeadUserId }]

    await run(`DELETE FROM Leads WHERE TeamId=?`, [targetTeamId])

    let imported = 0
    let index = 0
    for (const item of importRows) {
      const assignee = fallbackAssigned[index % fallbackAssigned.length]
      const name = String(item.name || item.Name || '').trim()
      const phone = leads.normalizePhone(item.phone || item.Phone || item.contact || item.Contact || '')
      if (!name || !leads.isValidPhone(phone)) continue

      await run(
        `INSERT INTO Leads(Name, Phone, Email, Socials, Source, Status, ClientRequest, Deadline, CreatedAt, OwnerId, TeamId, AssignedToUserId)
         VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          name,
          phone,
          String(item.email || item.Email || '').trim(),
          String(item.socials || item.Socials || '').trim(),
          String(item.source || item.Source || 'Imported').trim(),
          leads.STATUS_LIST.includes(item.status || item.Status) ? (item.status || item.Status) : 'New',
          String(item.clientRequest || item.ClientRequest || '').trim(),
          item.deadline || item.Deadline || null,
          new Date().toISOString(),
          req.user.id,
          targetTeamId,
          assignee.Id
        ]
      )
      imported += 1
      index += 1
    }

    res.json({ ok: true, imported })
  } catch (e) {
    res.status(500).json({ message: 'DB error: ' + (e?.message || 'unknown') })
  }
})

connectDB(); 

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
