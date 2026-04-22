const { get, all, run } = require('./db')

const STATUS_LIST = ['New', 'Contacted', 'Briefing', 'Proposal', 'Won', 'Lost']

function normalizePhone(v) {
  return String(v || '').trim().replace(/[\s\-()]/g, '')
}

function isValidPhone(v) {
  const p = normalizePhone(v)
  if (!p) return true
  return /^\+?\d{10,15}$/.test(p)
}

function mapLeadRow(row) {
  if (!row) return null
  return {
    id: row.Id,
    name: row.Name,
    phone: row.Phone || '',
    email: row.Email || '',
    socials: row.Socials || '',
    source: row.Source || 'Не указано',
    status: row.Status || 'New',
    clientRequest: row.ClientRequest || '',
    deadline: row.Deadline || null,
    createdAt: row.CreatedAt,
    ownerId: row.OwnerId,
    teamId: row.TeamId || null,
    assignedToUserId: row.AssignedToUserId || null
  }
}

async function getTeamInfo(user) {
  if (!user.teamId) return null
  return get(`SELECT * FROM Teams WHERE Id=?`, [user.teamId])
}

function ensureCanWrite(req, res) {
  if (!req.user) {
    res.status(401).json({ message: 'No auth' })
    return false
  }
  return true
}

async function canCreateLead(req) {
  return { ok: true }
}

function getLeads() {
  return async (req, res) => {
    try {
      let rows = []
      if (req.user.role === 'admin') {
        rows = await all(`SELECT * FROM Leads ORDER BY Id ASC`)
      } else if (req.user.role === 'team_lead') {
        rows = await all(`SELECT * FROM Leads WHERE TeamId=? ORDER BY Id ASC`, [req.user.teamId])
      } else {
        rows = await all(`SELECT * FROM Leads WHERE AssignedToUserId=? OR OwnerId=? ORDER BY Id ASC`, [req.user.id, req.user.id])
      }
      res.json(rows.map(mapLeadRow))
    } catch (e) {
      res.status(500).json({ message: 'DB error' })
    }
  }
}

function createLead() {
  return async (req, res) => {
    if (!ensureCanWrite(req, res)) return
    const check = await canCreateLead(req)
    if (!check.ok) return res.status(403).json({ message: check.message })

    const {
      name,
      phone = '',
      email = '',
      socials = '',
      source = 'Не указано',
      status = 'New',
      clientRequest = ''
    } = req.body || {}

    if (!name) return res.status(400).json({ message: 'Заполните name' })
    if (!isValidPhone(phone)) return res.status(400).json({ message: 'Некорректный номер телефона' })

    try {
      const createdAt = new Date().toISOString()
      const teamId = req.user.role === 'team_lead' ? req.user.teamId : (req.user.role === 'user' ? req.user.teamId || null : null)
      const assignedToUserId = req.user.role === 'user' ? req.user.id : null
      const r = await run(
        `INSERT INTO Leads(Name, Phone, Email, Socials, Source, Status, ClientRequest, CreatedAt, OwnerId, TeamId, AssignedToUserId)
         VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
        [
          String(name).trim(),
          normalizePhone(phone),
          String(email).trim(),
          String(socials).trim(),
          String(source).trim() || 'Не указано',
          STATUS_LIST.includes(status) ? status : 'New',
          String(clientRequest).trim(),
          createdAt,
          req.user.id,
          teamId,
          assignedToUserId
        ]
      )
      res.json({ id: Number(r.lastID) })
    } catch (e) {
      res.status(500).json({ message: 'DB error' })
    }
  }
}

function updateStatus() {
  return async (req, res) => {
    if (!ensureCanWrite(req, res)) return
    const id = Number(req.params.id)
    const { status } = req.body || {}
    try {
      let row = null
      if (req.user.role === 'admin') row = await get(`SELECT Status FROM Leads WHERE Id=?`, [id])
      else if (req.user.role === 'team_lead') row = await get(`SELECT Status FROM Leads WHERE Id=? AND TeamId=?`, [id, req.user.teamId])
      else row = await get(`SELECT Status FROM Leads WHERE Id=? AND (AssignedToUserId=? OR OwnerId=?)`, [id, req.user.id, req.user.id])

      if (!row) return res.status(404).json({ message: 'Not found' })
      let next = row.Status
      if (status && STATUS_LIST.includes(status)) next = status
      else {
        const idx = STATUS_LIST.indexOf(row.Status)
        if (idx >= 0 && idx < STATUS_LIST.length - 1) next = STATUS_LIST[idx + 1]
      }

      await run(`UPDATE Leads SET Status=? WHERE Id=?`, [next, id])
      res.json({ ok: true, status: next })
    } catch (e) {
      res.status(500).json({ message: 'DB error' })
    }
  }
}

function updateDeadline() {
  return async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'team_lead') {
      return res.status(403).json({ message: 'Only team lead/admin' })
    }
    const id = Number(req.params.id)
    const { deadline } = req.body || {}
    try {
      let row = null
      if (req.user.role === 'admin') row = await get(`SELECT Id FROM Leads WHERE Id=?`, [id])
      else row = await get(`SELECT Id FROM Leads WHERE Id=? AND TeamId=?`, [id, req.user.teamId])
      if (!row) return res.status(404).json({ message: 'Not found' })

      const nextDeadline = deadline ? new Date(`${deadline}T00:00:00.000Z`).toISOString() : null
      await run(`UPDATE Leads SET Deadline=? WHERE Id=?`, [nextDeadline, id])
      res.json({ ok: true, deadline: nextDeadline })
    } catch (e) {
      res.status(500).json({ message: 'DB error' })
    }
  }
}

function deleteLead() {
  return async (req, res) => {
    if (!ensureCanWrite(req, res)) return
    const id = Number(req.params.id)
    try {
      let target = null
      if (req.user.role === 'admin') target = await get(`SELECT Id FROM Leads WHERE Id=?`, [id])
      else if (req.user.role === 'team_lead') target = await get(`SELECT Id FROM Leads WHERE Id=? AND TeamId=?`, [id, req.user.teamId])
      else target = await get(`SELECT Id FROM Leads WHERE Id=? AND (AssignedToUserId=? OR OwnerId=?)`, [id, req.user.id, req.user.id])
      if (!target) return res.status(404).json({ message: 'Not found' })
      await run(`DELETE FROM Leads WHERE Id=?`, [id])
      res.json({ ok: true })
    } catch (e) {
      res.status(500).json({ message: 'DB error' })
    }
  }
}

function updateLead() {
  return async (req, res) => {
    if (!ensureCanWrite(req, res)) return
    const id = Number(req.params.id)
    const { name, phone = '', email = '', socials = '', source = 'Не указано', clientRequest = '' } = req.body || {}
    if (!name) return res.status(400).json({ message: 'Заполните name' })
    if (!isValidPhone(phone)) return res.status(400).json({ message: 'Некорректный номер телефона' })

    try {
      await run(
        `UPDATE Leads SET Name=?, Phone=?, Email=?, Socials=?, Source=?, ClientRequest=? WHERE Id=?`,
        [String(name).trim(), normalizePhone(phone), String(email).trim(), String(socials).trim(), String(source).trim() || 'Не указано', String(clientRequest).trim(), id]
      )
      res.json({ ok: true })
    } catch (e) {
      res.status(500).json({ message: 'DB error' })
    }
  }
}

module.exports = {
  STATUS_LIST,
  normalizePhone,
  isValidPhone,
  mapLeadRow,
  getLeads,
  createLead,
  updateStatus,
  updateLead,
  updateDeadline,
  deleteLead,
  getTeamInfo,
  canCreateLead
}
