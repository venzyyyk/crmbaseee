const sqlite3 = require('sqlite3').verbose()
const path = require('path')

const dbPath = path.join(__dirname, '..', 'database.sqlite')
const db = new sqlite3.Database(dbPath)

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err)
      resolve({ lastID: this.lastID, changes: this.changes })
    })
  })
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err)
      resolve(row || null)
    })
  })
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err)
      resolve(rows || [])
    })
  })
}

async function addColumnIfMissing(tableName, columnName, columnDef) {
  const cols = await all(`PRAGMA table_info(${tableName})`)
  const exists = cols.some((c) => c.name === columnName)
  if (!exists) {
    await run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`)
  }
}

async function init() {
  await run(`CREATE TABLE IF NOT EXISTS Teams(
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Name TEXT NOT NULL,
    LeadUserId INTEGER,
    CreatedAt TEXT NOT NULL
  )`)

  await run(`CREATE TABLE IF NOT EXISTS Users(
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Email TEXT NOT NULL UNIQUE,
    PasswordHash TEXT NOT NULL,
    Role TEXT NOT NULL DEFAULT 'user',
    CreatedAt TEXT NOT NULL,
    TeamId INTEGER
  )`)

  await run(`CREATE TABLE IF NOT EXISTS Leads(
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Name TEXT NOT NULL,
    Phone TEXT NOT NULL DEFAULT '',
    Email TEXT NOT NULL DEFAULT '',
    Socials TEXT NOT NULL DEFAULT '',
    Source TEXT NOT NULL DEFAULT 'Не указано',
    Status TEXT NOT NULL DEFAULT 'New',
    ClientRequest TEXT NOT NULL DEFAULT '',
    Deadline TEXT,
    CreatedAt TEXT NOT NULL,
    OwnerId INTEGER NOT NULL,
    TeamId INTEGER,
    AssignedToUserId INTEGER
  )`)

  await addColumnIfMissing('Users', 'TeamId', 'INTEGER')
  await addColumnIfMissing('Leads', 'TeamId', 'INTEGER')
  await addColumnIfMissing('Leads', 'Deadline', 'TEXT')
  await addColumnIfMissing('Leads', 'AssignedToUserId', 'INTEGER')

  await run(`CREATE INDEX IF NOT EXISTS IX_Users_TeamId ON Users(TeamId)`)
  await run(`CREATE INDEX IF NOT EXISTS IX_Leads_OwnerId ON Leads(OwnerId)`)
  await run(`CREATE INDEX IF NOT EXISTS IX_Leads_TeamId ON Leads(TeamId)`)
  await run(`CREATE INDEX IF NOT EXISTS IX_Leads_AssignedToUserId ON Leads(AssignedToUserId)`)

  const admin = await get(`SELECT Id FROM Users WHERE Email=?`, ['admin@crm.local'])
  if (!admin) {
    const createdAt = new Date().toISOString()
    await run(
      `INSERT INTO Users(Email, PasswordHash, Role, CreatedAt, TeamId)
       VALUES(?,?,?,?,NULL)`,
      ['admin@crm.local', 'admin123', 'admin', createdAt]
    )
  }
}

module.exports = { db, run, get, all, init }
