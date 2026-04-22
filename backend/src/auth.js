const jwt = require('jsonwebtoken')
const { run, get } = require('./db')

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret123'

function issueToken(user) {
  return jwt.sign(
    { id: user.Id, email: user.Email, role: user.Role, teamId: user.TeamId || null },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization
  if (!header) return res.status(401).json({ message: 'No token' })
  const token = header.split(' ')[1]
  try {
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' })
  }
}

function register() {
  return async (req, res) => {
    const { email, password, role = 'user', teamName = '' } = req.body || {}
    const normEmail = String(email || '').trim().toLowerCase()
    const normRole = role === 'team_lead' ? 'team_lead' : 'user'

    if (!normEmail || !password) return res.status(400).json({ message: 'Введите email и пароль' })

    try {
      const exists = await get(`SELECT Id FROM Users WHERE Email=?`, [normEmail])
      if (exists) return res.status(409).json({ message: 'Email уже зарегистрирован' })

      const createdAt = new Date().toISOString()
      let teamId = null

      const userInsert = await run(
        `INSERT INTO Users(Email, PasswordHash, Role, CreatedAt, TeamId) VALUES(?,?,?,?,NULL)`,
        [normEmail, String(password), normRole, createdAt]
      )
      const userId = userInsert.lastID

      if (normRole === 'team_lead') {
        const teamInsert = await run(
          `INSERT INTO Teams(Name, LeadUserId, CreatedAt) VALUES(?,?,?)`,
          [String(teamName || `Team ${normEmail.split('@')[0]}`).trim(), userId, createdAt]
        )
        teamId = teamInsert.lastID
        await run(`UPDATE Users SET TeamId=? WHERE Id=?`, [teamId, userId])
      }

      const user = await get(`SELECT Id, Email, Role, TeamId FROM Users WHERE Id=?`, [userId])
      return res.json({ token: issueToken(user), user })
    } catch (err) {
      return res.status(500).json({ message: 'DB error: ' + (err?.message || 'unknown') })
    }
  }
}

function login() {
  return async (req, res) => {
    const { email, password } = req.body || {}
    const normEmail = String(email || '').trim().toLowerCase()
    if (!normEmail || !password) return res.status(400).json({ message: 'Введите email и пароль' })

    try {
      const user = await get(`SELECT Id, Email, PasswordHash, Role, TeamId FROM Users WHERE Email=? LIMIT 1`, [normEmail])
      if (!user || user.PasswordHash !== String(password)) {
        return res.status(401).json({ message: 'Неверные данные' })
      }
      return res.json({ token: issueToken(user), user: { id: user.Id, email: user.Email, role: user.Role, teamId: user.TeamId || null } })
    } catch (err) {
      return res.status(500).json({ message: 'DB error' })
    }
  }
}

module.exports = { register, login, authMiddleware, issueToken }
