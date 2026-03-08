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
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync, chmodSync } from 'fs'
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
    id: 'demo_admin', username: 'admin@tpvrent.es',
    passwordHash: '$2a$10$jHvWWOR0os0ENfN4hcetQOo9ikER5poK1Sx6kkq0EkAnqreaAzJVq',
    fullName: 'María Gómez', role: 'admin',
    active: true, createdAt: '2024-01-01T00:00:00.000Z', lastLogin: null,
  },
  {
    id: 'demo_enc', username: 'encargado@tpvrent.es',
    passwordHash: '$2a$10$NExuZfINVdSJCuFuPLcu4u2UH49l.gtZQBr8gF4fVnsMMPkHUNLY.',
    fullName: 'Carlos Martín', role: 'encargado',
    active: true, createdAt: '2024-01-01T00:00:00.000Z', lastLogin: null,
  },
  {
    id: 'demo_cam', username: 'camarero@tpvrent.es',
    passwordHash: '$2a$10$HsN7c1fG50q8BcFS.A3kf.sezODUwOMPMYKepJC8oKpJAN5C1y5US',
    fullName: 'Ana López', role: 'camarero',
    active: true, createdAt: '2024-01-01T00:00:00.000Z', lastLogin: null,
  },
]

// ── Defaults for config files ─────────────────────────────────────────────────
const DEFAULT_EMAIL_CONFIG = {
  recipients: '', senderName: 'StockIn Reports',
  smtp: { host: 'smtp.gmail.com', port: 587, user: '', pass: '' },
  sendDay: 1, enabled: false, lastSent: null, history: [],
}

const DEFAULT_GLOBAL_CONFIG = {
  sessionTimeout: 480, syncInterval: 15,
  whatsapp: { enabled: false, apikey: '', phone: '' },
  email: { enabled: false, smtp: { host: '', port: 587, user: '', pass: '' }, senderName: 'StockIn', recipients: '' },
}

// En Vercel (readonly FS) los datos viven en memoria durante la ejecución
let _memUsers        = null
let _memLog          = []
let _memDistributors = null
let _memLocations    = null

const isWritable = (dir) => {
  try {
    mkdirSync(dir, { recursive: true })
    // Actually test write access — mkdirSync on an existing dir never throws
    const probe = join(dir, '.write-probe')
    writeFileSync(probe, '')
    unlinkSync(probe)
    return true
  } catch { return false }
}

const getDataDir = () => {
  if (isWritable(LOCAL_DATA_DIR)) return LOCAL_DATA_DIR
  // Fallback serverless: /tmp
  const tmp = '/tmp/stockin-data'
  mkdirSync(tmp, { recursive: true })
  return tmp
}

const readJSON = (file) => {
  if (file === 'users.json'        && _memUsers)        return _memUsers
  if (file === 'distributors.json' && _memDistributors) return _memDistributors
  if (file === 'locations.json'    && _memLocations)    return _memLocations
  const dir  = getDataDir()
  const path = join(dir, file)
  if (!existsSync(path)) {
    if (file === 'users.json')        { _memUsers = DEFAULT_USERS.map(u => ({ ...u })); return _memUsers }
    if (file === 'email-config.json')  return JSON.parse(JSON.stringify(DEFAULT_EMAIL_CONFIG))
    if (file === 'global-config.json') return JSON.parse(JSON.stringify(DEFAULT_GLOBAL_CONFIG))
    return []
  }
  try {
    const data = JSON.parse(readFileSync(path, 'utf8'))
    if (file === 'users.json')        _memUsers        = data
    if (file === 'distributors.json') _memDistributors = data
    if (file === 'locations.json')    _memLocations    = data
    return data
  } catch { return [] }
}

const writeJSON = (file, data) => {
  if (file === 'users.json')        _memUsers        = data
  if (file === 'distributors.json') _memDistributors = data
  if (file === 'locations.json')    _memLocations    = data
  try {
    const dir = getDataDir()
    writeFileSync(join(dir, file), JSON.stringify(data, null, 2))
  } catch {
    // In truly read-only environments keep only in memory
    if (file === 'users.json')        _memUsers        = data
    if (file === 'distributors.json') _memDistributors = data
    if (file === 'locations.json')    _memLocations    = data
    if (file === 'activity-log.json') _memLog = data
  }
}

// ── Initialise data files on startup (create with defaults if missing) ────────
const initDataFiles = () => {
  const dir = getDataDir()
  // Ensure directory and all data files are writable by any process user
  try { chmodSync(dir, 0o777) } catch {}
  const DATA_FILES = ['users.json','distributors.json','locations.json','activity-log.json','email-config.json','global-config.json']
  DATA_FILES.forEach(f => { const p = join(dir, f); if (existsSync(p)) try { chmodSync(p, 0o666) } catch {} })
  const write = (file, defaultData) => {
    const p = join(dir, file)
    if (!existsSync(p)) {
      try { writeFileSync(p, JSON.stringify(defaultData, null, 2)); try { chmodSync(p, 0o666) } catch {} } catch {}
    }
  }
  write('users.json',        DEFAULT_USERS.map(u => ({ ...u })))
  write('distributors.json', [])
  write('locations.json',    [])
  write('activity-log.json', [])
  write('email-config.json', JSON.parse(JSON.stringify(DEFAULT_EMAIL_CONFIG)))
  write('global-config.json',JSON.parse(JSON.stringify(DEFAULT_GLOBAL_CONFIG)))
}
initDataFiles()

// ── Activity log ──────────────────────────────────────────────────────────────
const logActivity = (userId, username, action, ip, details = {}) => {
  const log = readJSON('activity-log.json')
  log.unshift({ id: `log_${Date.now()}`, userId, username, action, details, ip, timestamp: new Date().toISOString() })
  writeJSON('activity-log.json', log.slice(0, 1000))
}

// ── Suspension chain helper ───────────────────────────────────────────────────
const checkSuspended = (userId) => {
  const users     = readJSON('users.json')
  const user      = users.find(u => u.id === userId)
  if (!user || !user.active) return { invalid: true }
  if (user.locationId) {
    const locs = readJSON('locations.json')
    const loc  = locs.find(l => l.id === user.locationId)
    if (loc?.status === 'blocked') return { suspended: true }
    if (loc?.distributorId) {
      const dists = readJSON('distributors.json')
      const dist  = dists.find(d => d.id === loc.distributorId)
      if (dist?.status === 'suspended') return { suspended: true }
    }
  }
  return { ok: true, user }
}

// ── Auth middleware ───────────────────────────────────────────────────────────
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Token requerido' })
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    if (decoded.id === 'superadmin') { req.user = decoded; return next() }

    const check = checkSuspended(decoded.id)
    if (check.invalid)   return res.status(401).json({ error: 'Usuario no encontrado o inactivo' })
    if (check.suspended) return res.status(403).json({ error: 'Tu acceso a StockIn está temporalmente suspendido. Contacta con tu administrador.', suspended: true })

    // Force logout check (forceLogoutAt in ms, iat in seconds)
    const u = check.user
    if (u.forceLogoutAt && decoded.iat < Math.floor(u.forceLogoutAt / 1000))
      return res.status(401).json({ error: 'Sesión cerrada por el administrador' })

    req.user = decoded; next()
  } catch { res.status(401).json({ error: 'Token inválido o expirado' }) }
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
app.use(bodyParser.json({ limit: '2mb' }))

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

  // Check suspension before granting access
  const check = checkSuspended(user.id)
  if (check.suspended)
    return res.status(403).json({ error: 'Tu acceso a StockIn está temporalmente suspendido. Contacta con tu administrador.', suspended: true })

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
  res.json({ id: user.id, username: user.username, role: user.role, fullName: user.fullName, lastLogin: user.lastLogin, locationId: user.locationId||null, distributorId: user.distributorId||null })
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

// ═══════════════════════════════════════════════════════════════════════════════
//  SUPERADMIN API — /api/sa/*  (all routes require superadminOnly)
// ═══════════════════════════════════════════════════════════════════════════════

// ── Helpers ───────────────────────────────────────────────────────────────────
const forceLogoutUsers = (userIds) => {
  const users = readJSON('users.json')
  const ts    = Date.now()
  const updated = users.map(u => userIds.includes(u.id) ? { ...u, forceLogoutAt: ts } : u)
  writeJSON('users.json', updated)
}

const usersOfLocations = (locationIds) => {
  const users = readJSON('users.json')
  return users.filter(u => locationIds.includes(u.locationId)).map(u => u.id)
}

// ── DISTRIBUTORS ──────────────────────────────────────────────────────────────
app.get('/api/sa/distributors', authMiddleware, superadminOnly, (req, res) => {
  const dists = readJSON('distributors.json')
  const locs  = readJSON('locations.json')
  const result = dists.map(d => ({
    ...d,
    locationsActive:  locs.filter(l => l.distributorId === d.id && l.status !== 'blocked').length,
    locationsBlocked: locs.filter(l => l.distributorId === d.id && l.status === 'blocked').length,
  }))
  res.json(result)
})

app.get('/api/sa/distributors/:id', authMiddleware, superadminOnly, (req, res) => {
  const dists = readJSON('distributors.json')
  const dist  = dists.find(d => d.id === req.params.id)
  if (!dist) return res.status(404).json({ error: 'Distribuidor no encontrado' })
  const locs  = readJSON('locations.json').filter(l => l.distributorId === dist.id)
  const users = readJSON('users.json').filter(u => u.distributorId === dist.id).map(u => ({
    id: u.id, username: u.username, fullName: u.fullName, role: u.role,
    active: u.active, lastLogin: u.lastLogin, locationId: u.locationId,
  }))
  const log   = readJSON('activity-log.json').filter(e => e.details?.distributorId === dist.id || users.some(u => u.id === e.userId)).slice(0, 20)
  res.json({ ...dist, locations: locs, users, recentActivity: log })
})

app.post('/api/sa/distributors', authMiddleware, superadminOnly, async (req, res) => {
  const { name, contactEmail, contactPhone, notes, logo } = req.body
  if (!name) return res.status(400).json({ error: 'El nombre del distribuidor es obligatorio' })
  const dists = readJSON('distributors.json')
  const newDist = {
    id: `dist_${Date.now()}`, name,
    contactEmail: contactEmail||'', contactPhone: contactPhone||'',
    status: 'active', createdAt: new Date().toISOString(), notes: notes||'',
    logo: logo||'',
  }
  dists.push(newDist)
  writeJSON('distributors.json', dists)
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown'
  logActivity('superadmin', SUPERADMIN.username, 'CREATE_DISTRIBUTOR', ip, { distributor: name })
  res.status(201).json(newDist)
})

app.put('/api/sa/distributors/:id', authMiddleware, superadminOnly, async (req, res) => {
  const dists = readJSON('distributors.json')
  const idx   = dists.findIndex(d => d.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Distribuidor no encontrado' })
  const { name, contactEmail, contactPhone, notes, logo } = req.body
  if (name         !== undefined) dists[idx].name         = name
  if (contactEmail !== undefined) dists[idx].contactEmail = contactEmail
  if (contactPhone !== undefined) dists[idx].contactPhone = contactPhone
  if (notes        !== undefined) dists[idx].notes        = notes
  if (logo         !== undefined) dists[idx].logo         = logo
  writeJSON('distributors.json', dists)
  res.json({ ok: true })
})

app.delete('/api/sa/distributors/:id', authMiddleware, superadminOnly, (req, res) => {
  const dists  = readJSON('distributors.json')
  const filtered = dists.filter(d => d.id !== req.params.id)
  if (filtered.length === dists.length) return res.status(404).json({ error: 'Distribuidor no encontrado' })
  writeJSON('distributors.json', filtered)
  // Also delete their locations and users
  const locs   = readJSON('locations.json').filter(l => l.distributorId !== req.params.id)
  writeJSON('locations.json', locs)
  const users  = readJSON('users.json').filter(u => u.distributorId !== req.params.id)
  writeJSON('users.json', users)
  logActivity('superadmin', SUPERADMIN.username, 'DELETE_DISTRIBUTOR', 'unknown', { distributorId: req.params.id })
  res.json({ ok: true })
})

app.post('/api/sa/distributors/:id/suspend', authMiddleware, superadminOnly, (req, res) => {
  const dists = readJSON('distributors.json')
  const idx   = dists.findIndex(d => d.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Distribuidor no encontrado' })
  dists[idx].status = 'suspended'
  writeJSON('distributors.json', dists)
  // Block all locations of this distributor and force-logout all their users
  const locs  = readJSON('locations.json')
  const blockedLocIds = locs.filter(l => l.distributorId === req.params.id).map(l => l.id)
  locs.forEach(l => { if (l.distributorId === req.params.id) l.status = 'blocked' })
  writeJSON('locations.json', locs)
  forceLogoutUsers(usersOfLocations(blockedLocIds))
  logActivity('superadmin', SUPERADMIN.username, 'SUSPEND_DISTRIBUTOR', 'unknown', { distributorId: req.params.id })
  res.json({ ok: true })
})

app.post('/api/sa/distributors/:id/activate', authMiddleware, superadminOnly, (req, res) => {
  const dists = readJSON('distributors.json')
  const idx   = dists.findIndex(d => d.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Distribuidor no encontrado' })
  dists[idx].status = 'active'
  writeJSON('distributors.json', dists)
  // Unblock all locations of this distributor
  const locs = readJSON('locations.json')
  locs.forEach(l => { if (l.distributorId === req.params.id && l.status === 'blocked') l.status = 'active' })
  writeJSON('locations.json', locs)
  logActivity('superadmin', SUPERADMIN.username, 'ACTIVATE_DISTRIBUTOR', 'unknown', { distributorId: req.params.id })
  res.json({ ok: true })
})

// ── LOCATIONS ─────────────────────────────────────────────────────────────────
// Helper: fetch all Ágora data from a given base URL + token
const agoraFullSync = async (base, token) => {
  const H   = { 'Api-Token': token, 'Accept': 'application/json' }
  const get = async (url) => {
    const r = await fetch(url, { headers: H, signal: AbortSignal.timeout(15000) })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return r.json()
  }
  const arr = (obj, ...keys) => { for (const k of keys) if (Array.isArray(obj?.[k])) return obj[k]; return [] }

  const [master, empRes, wpRes] = await Promise.allSettled([
    get(`${base}/api/export-master/?filter=Products,Stocks,Suppliers,Warehouses`),
    get(`${base}/api/export-master/?filter=Employees`),
    get(`${base}/api/export-master/?filter=WorkplacesSummary`),
  ])

  const masterOk = master.status === 'fulfilled'
  const empOk    = empRes.status  === 'fulfilled'

  if (!masterOk && !empOk) {
    const err = master.reason?.message || empRes.reason?.message || 'No se pudo conectar con Ágora'
    throw new Error(err)
  }

  const m  = masterOk ? master.value : {}
  const e  = empOk    ? empRes.value  : {}
  const wp = wpRes.status === 'fulfilled' ? wpRes.value : {}

  return {
    employees:  arr(e,  'Employees',  'employees'),
    warehouses: arr(m,  'Warehouses', 'warehouses'),
    products:   arr(m,  'Products',   'products'),
    suppliers:  arr(m,  'Suppliers',  'suppliers'),
    stocks:     arr(m,  'Stocks',     'stocks'),
    workplaces: arr(wp, 'WorkplacesSummary', 'workplacesSummary', 'Workplaces', 'workplaces'),
  }
}

// Test Ágora connection without saving (must be before /:id routes)
app.post('/api/sa/locations/test-agora', authMiddleware, superadminOnly, async (req, res) => {
  const { agoraUrl, apiToken } = req.body
  if (!agoraUrl || !apiToken) return res.status(400).json({ ok: false, error: 'URL y Token son obligatorios' })
  try {
    const data = await agoraFullSync(agoraUrl.replace(/\/$/,''), apiToken)
    res.json({
      ok: true,
      summary: {
        employees:  data.employees.length,
        warehouses: data.warehouses.length,
        products:   data.products.length,
        suppliers:  data.suppliers.length,
        stocks:     data.stocks.length,
        workplaces: data.workplaces.length,
      },
    })
  } catch (e) {
    res.json({ ok: false, error: e.message || 'No se pudo conectar con Ágora' })
  }
})

// Full sync for a saved location — stores results in the location record
app.post('/api/sa/locations/:id/sync', authMiddleware, superadminOnly, async (req, res) => {
  const locs = readJSON('locations.json')
  const idx  = locs.findIndex(l => l.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Local no encontrado' })
  const loc = locs[idx]
  if (!loc.agoraUrl || !loc.apiToken)
    return res.status(400).json({ ok: false, error: 'Este local no tiene configurada la conexión con Ágora' })
  try {
    const data = await agoraFullSync(loc.agoraUrl.replace(/\/$/,''), loc.apiToken)
    const summary = {
      employees:  data.employees.length,
      warehouses: data.warehouses.length,
      products:   data.products.length,
      suppliers:  data.suppliers.length,
      stocks:     data.stocks.length,
      workplaces: data.workplaces.length,
    }
    locs[idx].connectionStatus = 'active'
    locs[idx].lastSync         = new Date().toISOString()
    locs[idx].syncSummary      = summary
    writeJSON('locations.json', locs)
    logActivity('superadmin', SUPERADMIN.username, 'SYNC_LOCATION', 'unknown', { locationId: loc.id, name: loc.name, summary })
    res.json({ ok: true, summary })
  } catch (e) {
    locs[idx].connectionStatus = 'error'
    locs[idx].lastSyncError    = e.message
    writeJSON('locations.json', locs)
    res.json({ ok: false, error: e.message || 'No se pudo conectar con Ágora' })
  }
})

app.get('/api/sa/locations', authMiddleware, superadminOnly, (req, res) => {
  const locs  = readJSON('locations.json')
  const dists = readJSON('distributors.json')
  const { distributorId, connectionStatus, status } = req.query
  let result  = locs
  if (distributorId)    result = result.filter(l => l.distributorId === distributorId)
  if (connectionStatus) result = result.filter(l => l.connectionStatus === connectionStatus)
  if (status)           result = result.filter(l => l.status === status)
  result = result.map(l => ({
    ...l,
    distributorName: dists.find(d => d.id === l.distributorId)?.name || '—',
  }))
  res.json(result)
})

app.post('/api/sa/locations', authMiddleware, superadminOnly, async (req, res) => {
  const { distributorId, name, city, agoraUrl, apiToken, notes } = req.body
  if (!distributorId || !name) return res.status(400).json({ error: 'Distribuidor y nombre son obligatorios' })
  const locs = readJSON('locations.json')
  let connectionStatus = 'unconfigured'
  let syncSummary = null
  if (agoraUrl && apiToken) {
    try {
      const data = await agoraFullSync(agoraUrl.replace(/\/$/,''), apiToken)
      connectionStatus = 'active'
      syncSummary = { employees: data.employees.length, warehouses: data.warehouses.length, products: data.products.length, suppliers: data.suppliers.length, stocks: data.stocks.length, workplaces: data.workplaces.length }
    } catch { connectionStatus = 'error' }
  }
  const newLoc = {
    id: `loc_${Date.now()}`, distributorId, name,
    city: city||'', notes: notes||'',
    agoraUrl: agoraUrl||'', apiToken: apiToken||'',
    status: 'active', connectionStatus, syncSummary,
    lastSync: connectionStatus === 'active' ? new Date().toISOString() : null,
    createdAt: new Date().toISOString(),
  }
  locs.push(newLoc)
  writeJSON('locations.json', locs)
  logActivity('superadmin', SUPERADMIN.username, 'CREATE_LOCATION', 'unknown', { name, distributorId })
  res.status(201).json(newLoc)
})

app.put('/api/sa/locations/:id', authMiddleware, superadminOnly, async (req, res) => {
  const locs = readJSON('locations.json')
  const idx  = locs.findIndex(l => l.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Local no encontrado' })
  const { name, city, notes, agoraUrl, apiToken, connectionStatus, lastSync } = req.body
  if (name             !== undefined) locs[idx].name             = name
  if (city             !== undefined) locs[idx].city             = city
  if (notes            !== undefined) locs[idx].notes            = notes
  if (agoraUrl         !== undefined) locs[idx].agoraUrl         = agoraUrl
  if (apiToken         !== undefined) locs[idx].apiToken         = apiToken
  if (connectionStatus !== undefined) locs[idx].connectionStatus = connectionStatus
  if (lastSync         !== undefined) locs[idx].lastSync         = lastSync
  // Auto full-sync if credentials changed
  const newUrl   = agoraUrl !== undefined ? agoraUrl : locs[idx].agoraUrl
  const newToken = apiToken !== undefined ? apiToken : locs[idx].apiToken
  if ((agoraUrl !== undefined || apiToken !== undefined) && newUrl && newToken) {
    try {
      const data = await agoraFullSync(newUrl.replace(/\/$/,''), newToken)
      locs[idx].connectionStatus = 'active'
      locs[idx].lastSync = new Date().toISOString()
      locs[idx].syncSummary = { employees: data.employees.length, warehouses: data.warehouses.length, products: data.products.length, suppliers: data.suppliers.length, stocks: data.stocks.length, workplaces: data.workplaces.length }
    } catch { locs[idx].connectionStatus = 'error'; locs[idx].syncSummary = null }
  }
  writeJSON('locations.json', locs)
  res.json({ ok: true })
})

app.delete('/api/sa/locations/:id', authMiddleware, superadminOnly, (req, res) => {
  const locs     = readJSON('locations.json')
  const filtered = locs.filter(l => l.id !== req.params.id)
  if (filtered.length === locs.length) return res.status(404).json({ error: 'Local no encontrado' })
  writeJSON('locations.json', filtered)
  // Also remove users of this location
  const users = readJSON('users.json').filter(u => u.locationId !== req.params.id)
  writeJSON('users.json', users)
  res.json({ ok: true })
})

app.post('/api/sa/locations/:id/block', authMiddleware, superadminOnly, (req, res) => {
  const locs = readJSON('locations.json')
  const idx  = locs.findIndex(l => l.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Local no encontrado' })
  locs[idx].status = 'blocked'
  writeJSON('locations.json', locs)
  forceLogoutUsers(usersOfLocations([req.params.id]))
  logActivity('superadmin', SUPERADMIN.username, 'BLOCK_LOCATION', 'unknown', { locationId: req.params.id, name: locs[idx].name })
  res.json({ ok: true })
})

app.post('/api/sa/locations/:id/unblock', authMiddleware, superadminOnly, (req, res) => {
  const locs = readJSON('locations.json')
  const idx  = locs.findIndex(l => l.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Local no encontrado' })
  locs[idx].status = 'active'
  writeJSON('locations.json', locs)
  logActivity('superadmin', SUPERADMIN.username, 'UNBLOCK_LOCATION', 'unknown', { locationId: req.params.id })
  res.json({ ok: true })
})

// ── AGORA PROXY — employees for a given location ─────────────────────────────
app.get('/api/sa/locations/:id/employees', authMiddleware, superadminOnly, async (req, res) => {
  const locs = readJSON('locations.json')
  const loc  = locs.find(l => l.id === req.params.id)
  if (!loc) return res.status(404).json({ error: 'Local no encontrado' })
  if (!loc.agoraUrl || !loc.apiToken) return res.status(400).json({ error: 'Este local no tiene configurada la conexión con Ágora' })
  try {
    const url  = `${loc.agoraUrl.replace(/\/$/,'')}/api/export-master/?filter=Employees`
    const resp = await fetch(url, { headers: { 'Api-Token': loc.apiToken, 'Accept': 'application/json' }, signal: AbortSignal.timeout(10000) })
    if (!resp.ok) throw new Error(`Ágora respondió con HTTP ${resp.status}`)
    const data = await resp.json()
    const employees = data?.Employees || data?.employees || []
    res.json(employees)
  } catch (e) {
    res.status(502).json({ error: e.message || 'No se pudo conectar con Ágora' })
  }
})

// ── SA USERS ──────────────────────────────────────────────────────────────────
app.get('/api/sa/users', authMiddleware, superadminOnly, (req, res) => {
  const users = readJSON('users.json')
  const dists = readJSON('distributors.json')
  const locs  = readJSON('locations.json')
  const { search, distributorId, locationId } = req.query
  let result  = users
  if (distributorId) result = result.filter(u => u.distributorId === distributorId)
  if (locationId)    result = result.filter(u => u.locationId    === locationId)
  if (search)        result = result.filter(u => u.username.includes(search) || u.fullName?.toLowerCase().includes(search.toLowerCase()))
  res.json(result.map(u => ({
    id: u.id, username: u.username, fullName: u.fullName, role: u.role,
    active: u.active, lastLogin: u.lastLogin, createdAt: u.createdAt,
    distributorId: u.distributorId||null, locationId: u.locationId||null,
    distributorName: dists.find(d => d.id === u.distributorId)?.name || '—',
    locationName:    locs.find(l => l.id === u.locationId)?.name    || '—',
  })))
})

app.post('/api/sa/users', authMiddleware, superadminOnly, async (req, res) => {
  const { username, password, fullName, role, active, distributorId, locationId, agoraEmployeeId, agoraEmployeeName } = req.body
  if (!username || !password || !fullName || !role)
    return res.status(400).json({ error: 'Nombre, email, contraseña y rol son obligatorios' })
  const users = readJSON('users.json')
  if (users.find(u => u.username === username))
    return res.status(409).json({ error: 'El email / usuario ya existe' })
  const newUser = {
    id: `user_${Date.now()}`, username,
    passwordHash: await bcrypt.hash(password, 10),
    fullName, role,
    distributorId:    distributorId    || null,
    locationId:       locationId       || null,
    agoraEmployeeId:  agoraEmployeeId  || null,
    agoraEmployeeName:agoraEmployeeName|| null,
    active:        active !== false,
    createdAt: new Date().toISOString(), lastLogin: null,
  }
  users.push(newUser)
  writeJSON('users.json', users)
  logActivity('superadmin', SUPERADMIN.username, 'CREATE_USER', 'unknown', { username, role })
  res.status(201).json({ ...newUser, passwordHash: undefined })
})

app.put('/api/sa/users/:id', authMiddleware, superadminOnly, async (req, res) => {
  const users = readJSON('users.json')
  const idx   = users.findIndex(u => u.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Usuario no encontrado' })
  const { fullName, role, active, password, distributorId, locationId, agoraEmployeeId, agoraEmployeeName } = req.body
  if (fullName           !== undefined) users[idx].fullName           = fullName
  if (role               !== undefined) users[idx].role               = role
  if (active             !== undefined) users[idx].active             = active
  if (distributorId      !== undefined) users[idx].distributorId      = distributorId
  if (locationId         !== undefined) users[idx].locationId         = locationId
  if (agoraEmployeeId    !== undefined) users[idx].agoraEmployeeId    = agoraEmployeeId
  if (agoraEmployeeName  !== undefined) users[idx].agoraEmployeeName  = agoraEmployeeName
  if (password) users[idx].passwordHash = await bcrypt.hash(password, 10)
  writeJSON('users.json', users)
  res.json({ ok: true })
})

app.delete('/api/sa/users/:id', authMiddleware, superadminOnly, (req, res) => {
  const users    = readJSON('users.json')
  const filtered = users.filter(u => u.id !== req.params.id)
  if (filtered.length === users.length) return res.status(404).json({ error: 'Usuario no encontrado' })
  writeJSON('users.json', filtered)
  res.json({ ok: true })
})

app.post('/api/sa/users/:id/forcelogout', authMiddleware, superadminOnly, (req, res) => {
  const users = readJSON('users.json')
  const idx   = users.findIndex(u => u.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Usuario no encontrado' })
  users[idx].forceLogoutAt = Date.now()
  writeJSON('users.json', users)
  logActivity('superadmin', SUPERADMIN.username, 'FORCE_LOGOUT', 'unknown', { userId: req.params.id })
  res.json({ ok: true })
})

// ── SA REPORTS ────────────────────────────────────────────────────────────────
app.get('/api/sa/reports/metrics', authMiddleware, superadminOnly, (req, res) => {
  const dists = readJSON('distributors.json')
  const locs  = readJSON('locations.json')
  const users = readJSON('users.json')
  res.json({
    distributors:           dists.length,
    suspendedDistributors:  dists.filter(d => d.status === 'suspended').length,
    locations:              locs.length,
    blockedLocations:       locs.filter(l => l.status === 'blocked').length,
    users:                  users.length,
    activeSessions:         0,
  })
})

app.get('/api/sa/reports/events', authMiddleware, superadminOnly, (req, res) => {
  const log = readJSON('activity-log.json').slice(0, 50)
  res.json(log)
})

// ── GLOBAL CONFIG ─────────────────────────────────────────────────────────────
app.get('/api/sa/config', authMiddleware, superadminOnly, (req, res) => {
  const cfg  = readJSON('global-config.json')
  const safe = { ...cfg }
  if (safe.email?.smtp?.pass) safe.email = { ...safe.email, smtp: { ...safe.email.smtp, pass: '••••••••' } }
  if (safe.whatsapp?.apikey)  safe.whatsapp = { ...safe.whatsapp, apikey: '••••••••' }
  res.json(safe)
})

app.put('/api/sa/config', authMiddleware, superadminOnly, (req, res) => {
  const current = readJSON('global-config.json')
  const update  = req.body
  // Don't overwrite masked values
  if (update.email?.smtp?.pass === '••••••••') update.email.smtp.pass = current.email?.smtp?.pass || ''
  if (update.whatsapp?.apikey === '••••••••') update.whatsapp.apikey = current.whatsapp?.apikey || ''
  writeJSON('global-config.json', { ...current, ...update,
    email: { ...current.email, ...update.email, smtp: { ...current.email?.smtp, ...update.email?.smtp } },
    whatsapp: { ...current.whatsapp, ...update.whatsapp },
  })
  res.json({ ok: true })
})

export default app
