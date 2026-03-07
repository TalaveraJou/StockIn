/**
 * server/app.js — Express app exportado sin .listen()
 * Usado tanto por server/index.js (desarrollo local) como
 * por api/server.js (Vercel serverless function).
 */
import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const JWT_SECRET = process.env.JWT_SECRET || 'stockin-secret-key-change-in-production'

// ── Superadmin (hardcoded, NUNCA se guarda en users.json) ─────────────────────
const SUPERADMIN_EMAIL         = process.env.SUPERADMIN_EMAIL    || 'alvaro@tpvrent.es'
const SUPERADMIN_PASSWORD      = process.env.SUPERADMIN_PASSWORD || 'tpvrent2013'
const SUPERADMIN_USERNAME_DEMO = 'superadmin'
const SUPERADMIN_PASSWORD_DEMO = 'super123'
const SUPERADMIN = {
  id: 'superadmin', username: SUPERADMIN_EMAIL,
  fullName: 'Álvaro', role: 'superadmin', active: true,
  createdAt: '2024-01-01T00:00:00.000Z',
}

// ── Data directory — usa /tmp en entornos serverless (Vercel) ─────────────────
// En local usa __dirname/data; en Vercel escribe en /tmp y carga defaults
const LOCAL_DATA_DIR = join(__dirname, 'data')

// Usuarios de demo que se usan cuando no hay users.json persistente
const DEFAULT_USERS = [
  {
    id: '1', username: 'admin',
    passwordHash: '$2a$10$jHvWWOR0os0ENfN4hcetQOo9ikER5poK1Sx6kkq0EkAnqreaAzJVq',
    fullName: 'Administrador Demo', role: 'admin',
    active: true, createdAt: '2024-01-01T00:00:00.000Z', lastLogin: null,
  },
  {
    id: '2', username: 'encargado',
    passwordHash: '$2a$10$NExuZfINVdSJCuFuPLcu4u2UH49l.gtZQBr8gF4fVnsMMPkHUNLY.',
    fullName: 'Encargado Demo', role: 'encargado',
    active: true, createdAt: '2024-01-01T00:00:00.000Z', lastLogin: null,
  },
  {
    id: '3', username: 'camarero',
    passwordHash: '$2a$10$HsN7c1fG50q8BcFS.A3kf.sezODUwOMPMYKepJC8oKpJAN5C1y5US',
    fullName: 'Camarero Demo', role: 'camarero',
    active: true, createdAt: '2024-01-01T00:00:00.000Z', lastLogin: null,
  },
]

// En Vercel (readonly FS) los datos viven en memoria durante la ejecución
let _memUsers = null
let _memLog   = []

const isWritable = (dir) => {
  try { mkdirSync(dir, { recursive: true }); return true } catch { return false }
}

const getDataDir = () => {
  if (isWritable(LOCAL_DATA_DIR)) return LOCAL_DATA_DIR
  // Fallback serverless: /tmp
  const tmp = '/tmp/stockin-data'
  mkdirSync(tmp, { recursive: true })
  return tmp
}

const readJSON = (file) => {
  if (file === 'users.json' && _memUsers) return _memUsers
  const dir  = getDataDir()
  const path = join(dir, file)
  if (!existsSync(path)) {
    if (file === 'users.json') return DEFAULT_USERS.map(u => ({ ...u }))
    return []
  }
  try { return JSON.parse(readFileSync(path, 'utf8')) } catch { return [] }
}

const writeJSON = (file, data) => {
  if (file === 'users.json') _memUsers = data
  try {
    const dir = getDataDir()
    writeFileSync(join(dir, file), JSON.stringify(data, null, 2))
  } catch {
    // In truly read-only environments keep only in memory
    if (file === 'users.json') _memUsers = data
    if (file === 'activity-log.json') _memLog = data
  }
}

// ── Activity log ──────────────────────────────────────────────────────────────
const logActivity = (userId, username, action, ip, details = {}) => {
  const log = readJSON('activity-log.json')
  log.unshift({ id: `log_${Date.now()}`, userId, username, action, details, ip, timestamp: new Date().toISOString() })
  writeJSON('activity-log.json', log.slice(0, 1000))
}

// ── Auth middleware ───────────────────────────────────────────────────────────
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Token requerido' })
  try { req.user = jwt.verify(token, JWT_SECRET); next() }
  catch { res.status(401).json({ error: 'Token inválido o expirado' }) }
}

const adminOnly = (req, res, next) => {
  const allowed = ['admin', 'encargado', 'manager', 'superadmin']
  if (!allowed.includes(req.user.role))
    return res.status(403).json({ error: 'Acceso no autorizado para este rol' })
  next()
}

const superadminOnly = (req, res, next) => {
  if (req.user.role !== 'superadmin')
    return res.status(403).json({ error: 'Acceso exclusivo del superadministrador' })
  next()
}

// ── Express app ───────────────────────────────────────────────────────────────
const app = express()

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : []),
]
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (server-to-server, curl, Vercel functions calling self)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
    cb(null, true) // Allow all in demo; restrict in production via CORS_ORIGINS env var
  },
  credentials: true,
}))
app.use(bodyParser.json())

// ── AUTH ──────────────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password)
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' })

  // Superadmin — acepta email real y alias demo superadmin/super123
  const isSuperadmin =
    (username === SUPERADMIN_EMAIL && password === SUPERADMIN_PASSWORD) ||
    (username === SUPERADMIN_USERNAME_DEMO && password === SUPERADMIN_PASSWORD_DEMO)

  if (username === SUPERADMIN_EMAIL || username === SUPERADMIN_USERNAME_DEMO) {
    if (!isSuperadmin) return res.status(401).json({ error: 'Credenciales incorrectas' })
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown'
    logActivity(SUPERADMIN.id, SUPERADMIN.username, 'LOGIN', ip)
    const token = jwt.sign(
      { id: SUPERADMIN.id, username: SUPERADMIN.username, role: SUPERADMIN.role, fullName: SUPERADMIN.fullName },
      JWT_SECRET, { expiresIn: '8h' }
    )
    return res.json({ token, user: { id: SUPERADMIN.id, username: SUPERADMIN.username, role: SUPERADMIN.role, fullName: SUPERADMIN.fullName } })
  }

  const users = readJSON('users.json')
  const user  = users.find(u => u.username === username && u.active)
  if (!user) return res.status(401).json({ error: 'Credenciales incorrectas' })

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) return res.status(401).json({ error: 'Credenciales incorrectas' })

  user.lastLogin = new Date().toISOString()
  writeJSON('users.json', users)

  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown'
  logActivity(user.id, user.username, 'LOGIN', ip)

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, fullName: user.fullName },
    JWT_SECRET, { expiresIn: '8h' }
  )
  res.json({ token, user: { id: user.id, username: user.username, role: user.role, fullName: user.fullName } })
})

app.post('/api/auth/logout', authMiddleware, (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown'
  logActivity(req.user.id, req.user.username, 'LOGOUT', ip)
  res.json({ ok: true })
})

app.get('/api/auth/me', authMiddleware, (req, res) => {
  if (req.user.id === 'superadmin')
    return res.json({ id: SUPERADMIN.id, username: SUPERADMIN.username, role: SUPERADMIN.role, fullName: SUPERADMIN.fullName, lastLogin: null })
  const users = readJSON('users.json')
  const user  = users.find(u => u.id === req.user.id)
  if (!user || !user.active) return res.status(401).json({ error: 'Usuario no encontrado o inactivo' })
  res.json({ id: user.id, username: user.username, role: user.role, fullName: user.fullName, lastLogin: user.lastLogin })
})

// ── USERS (superadmin only) ───────────────────────────────────────────────────
app.get('/api/users', authMiddleware, superadminOnly, (req, res) => {
  const users = readJSON('users.json').map(u => ({
    id: u.id, username: u.username, fullName: u.fullName,
    role: u.role, active: u.active, lastLogin: u.lastLogin, createdAt: u.createdAt,
  }))
  res.json(users)
})

app.post('/api/users', authMiddleware, superadminOnly, async (req, res) => {
  const { username, password, fullName, role } = req.body
  if (!username || !password || !fullName || !role)
    return res.status(400).json({ error: 'Todos los campos son obligatorios' })
  if (username === SUPERADMIN_EMAIL || username === SUPERADMIN_USERNAME_DEMO)
    return res.status(400).json({ error: 'Ese nombre de usuario está reservado' })

  const users = readJSON('users.json')
  if (users.find(u => u.username === username))
    return res.status(409).json({ error: 'El email / usuario ya existe' })

  const passwordHash = await bcrypt.hash(password, 10)
  const newUser = { id: `user_${Date.now()}`, username, passwordHash, fullName, role, active: true, createdAt: new Date().toISOString(), lastLogin: null }
  users.push(newUser)
  writeJSON('users.json', users)

  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown'
  logActivity(req.user.id, req.user.username, 'CREATE_USER', ip, { newUser: username, role })
  res.status(201).json({ id: newUser.id, username, fullName, role, active: true })
})

app.put('/api/users/:id', authMiddleware, superadminOnly, async (req, res) => {
  if (req.params.id === 'superadmin')
    return res.status(400).json({ error: 'El superadmin no puede ser modificado' })

  const users = readJSON('users.json')
  const idx   = users.findIndex(u => u.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Usuario no encontrado' })

  const { fullName, role, active, password } = req.body
  if (fullName !== undefined) users[idx].fullName = fullName
  if (role     !== undefined) users[idx].role     = role
  if (active   !== undefined) users[idx].active   = active
  if (password) users[idx].passwordHash = await bcrypt.hash(password, 10)

  writeJSON('users.json', users)
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown'
  logActivity(req.user.id, req.user.username, 'UPDATE_USER', ip, { userId: req.params.id })
  res.json({ ok: true })
})

app.delete('/api/users/:id', authMiddleware, superadminOnly, (req, res) => {
  if (req.params.id === 'superadmin')
    return res.status(400).json({ error: 'El superadmin no puede ser eliminado' })

  const users    = readJSON('users.json')
  const filtered = users.filter(u => u.id !== req.params.id)
  if (filtered.length === users.length) return res.status(404).json({ error: 'Usuario no encontrado' })
  writeJSON('users.json', filtered)

  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown'
  logActivity(req.user.id, req.user.username, 'DELETE_USER', ip, { userId: req.params.id })
  res.json({ ok: true })
})

// ── ACTIVITY LOG ──────────────────────────────────────────────────────────────
app.get('/api/activity-log', authMiddleware, superadminOnly, (req, res) => {
  res.json(readJSON('activity-log.json').slice(0, 100))
})

// ── EMAIL CONFIG ──────────────────────────────────────────────────────────────
app.get('/api/email-config', authMiddleware, adminOnly, (req, res) => {
  const cfg  = readJSON('email-config.json')
  const safe = { ...cfg }
  if (safe.smtp?.pass) safe.smtp = { ...safe.smtp, pass: '••••••••' }
  res.json(safe)
})

app.put('/api/email-config', authMiddleware, adminOnly, (req, res) => {
  const current = readJSON('email-config.json')
  const update  = req.body
  if (update.smtp?.pass === '••••••••') update.smtp.pass = current.smtp?.pass || ''
  writeJSON('email-config.json', { ...current, ...update, smtp: { ...current.smtp, ...update.smtp } })
  res.json({ ok: true })
})

app.post('/api/email-config/test', authMiddleware, adminOnly, async (req, res) => {
  const cfg = readJSON('email-config.json')
  if (!cfg.smtp?.host || !cfg.smtp?.user || !cfg.smtp?.pass)
    return res.status(400).json({ error: 'Configura el servidor SMTP primero' })
  try {
    const { default: nodemailer } = await import('nodemailer')
    const transporter = nodemailer.createTransport({
      host: cfg.smtp.host, port: cfg.smtp.port || 587,
      secure: cfg.smtp.port === 465,
      auth: { user: cfg.smtp.user, pass: cfg.smtp.pass },
    })
    await transporter.verify()
    const recipients = cfg.recipients?.split(',').map(e => e.trim()).filter(Boolean)
    if (!recipients?.length) return res.status(400).json({ error: 'Configura al menos un destinatario' })
    await transporter.sendMail({
      from: `"${cfg.senderName || 'StockIn'}" <${cfg.smtp.user}>`,
      to: recipients.join(', '),
      subject: 'StockIn — Test de conexión',
      html: '<h2 style="color:#034650">StockIn</h2><p>Email de prueba. La configuración SMTP es correcta ✓</p>',
    })
    res.json({ ok: true, message: 'Email de prueba enviado correctamente' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/email-config/history', authMiddleware, adminOnly, (req, res) => {
  res.json(readJSON('email-config.json').history || [])
})

export default app
