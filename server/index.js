import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import cron from 'node-cron'
import nodemailer from 'nodemailer'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, 'data')

const JWT_SECRET = process.env.JWT_SECRET || 'stockin-secret-key-change-in-production'
const PORT = process.env.PORT || 3001

// ── Data helpers ──────────────────────────────────────────────────────────────
const readJSON = (file) => {
  const path = join(DATA_DIR, file)
  if (!existsSync(path)) return file.includes('log') ? [] : []
  return JSON.parse(readFileSync(path, 'utf8'))
}
const writeJSON = (file, data) =>
  writeFileSync(join(DATA_DIR, file), JSON.stringify(data, null, 2))

// ── Activity log ──────────────────────────────────────────────────────────────
const logActivity = (userId, username, action, ip, details = {}) => {
  const log = readJSON('activity-log.json')
  log.unshift({
    id: `log_${Date.now()}`,
    userId,
    username,
    action,
    details,
    ip,
    timestamp: new Date().toISOString(),
  })
  writeJSON('activity-log.json', log.slice(0, 1000))
}

// ── Auth middleware ───────────────────────────────────────────────────────────
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Token requerido' })
  try {
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' })
  }
}

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Solo administradores' })
  next()
}

// ── App ───────────────────────────────────────────────────────────────────────
const app = express()
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:4173'], credentials: true }))
app.use(bodyParser.json())

// ── AUTH ──────────────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password)
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' })

  const users = readJSON('users.json')
  const user = users.find(u => u.username === username && u.active)
  if (!user) return res.status(401).json({ error: 'Credenciales incorrectas' })

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) return res.status(401).json({ error: 'Credenciales incorrectas' })

  // Update last login
  user.lastLogin = new Date().toISOString()
  writeJSON('users.json', users)

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown'
  logActivity(user.id, user.username, 'LOGIN', ip)

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, fullName: user.fullName },
    JWT_SECRET,
    { expiresIn: '8h' }
  )
  res.json({ token, user: { id: user.id, username: user.username, role: user.role, fullName: user.fullName } })
})

app.post('/api/auth/logout', authMiddleware, (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown'
  logActivity(req.user.id, req.user.username, 'LOGOUT', ip)
  res.json({ ok: true })
})

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const users = readJSON('users.json')
  const user = users.find(u => u.id === req.user.id)
  if (!user || !user.active) return res.status(401).json({ error: 'Usuario no encontrado o inactivo' })
  res.json({ id: user.id, username: user.username, role: user.role, fullName: user.fullName, lastLogin: user.lastLogin })
})

// ── USERS (admin only) ────────────────────────────────────────────────────────
app.get('/api/users', authMiddleware, adminOnly, (req, res) => {
  const users = readJSON('users.json').map(u => ({
    id: u.id, username: u.username, fullName: u.fullName,
    role: u.role, active: u.active, lastLogin: u.lastLogin, createdAt: u.createdAt,
  }))
  res.json(users)
})

app.post('/api/users', authMiddleware, adminOnly, async (req, res) => {
  const { username, password, fullName, role } = req.body
  if (!username || !password || !fullName || !role)
    return res.status(400).json({ error: 'Todos los campos son obligatorios' })

  const users = readJSON('users.json')
  if (users.find(u => u.username === username))
    return res.status(409).json({ error: 'El nombre de usuario ya existe' })

  const passwordHash = await bcrypt.hash(password, 10)
  const newUser = {
    id: `user_${Date.now()}`,
    username, passwordHash, fullName, role,
    active: true,
    createdAt: new Date().toISOString(),
    lastLogin: null,
  }
  users.push(newUser)
  writeJSON('users.json', users)

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown'
  logActivity(req.user.id, req.user.username, 'CREATE_USER', ip, { newUser: username, role })

  res.status(201).json({ id: newUser.id, username, fullName, role, active: true })
})

app.put('/api/users/:id', authMiddleware, adminOnly, async (req, res) => {
  const users = readJSON('users.json')
  const idx = users.findIndex(u => u.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Usuario no encontrado' })

  const { fullName, role, active, password } = req.body
  if (fullName !== undefined) users[idx].fullName = fullName
  if (role !== undefined) users[idx].role = role
  if (active !== undefined) users[idx].active = active
  if (password) users[idx].passwordHash = await bcrypt.hash(password, 10)

  writeJSON('users.json', users)
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown'
  logActivity(req.user.id, req.user.username, 'UPDATE_USER', ip, { userId: req.params.id, changes: req.body })
  res.json({ ok: true })
})

app.delete('/api/users/:id', authMiddleware, adminOnly, (req, res) => {
  if (req.params.id === req.user.id)
    return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' })

  const users = readJSON('users.json')
  const filtered = users.filter(u => u.id !== req.params.id)
  if (filtered.length === users.length) return res.status(404).json({ error: 'Usuario no encontrado' })
  writeJSON('users.json', filtered)

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown'
  logActivity(req.user.id, req.user.username, 'DELETE_USER', ip, { userId: req.params.id })
  res.json({ ok: true })
})

// ── ACTIVITY LOG ──────────────────────────────────────────────────────────────
app.get('/api/activity-log', authMiddleware, adminOnly, (req, res) => {
  const log = readJSON('activity-log.json')
  res.json(log.slice(0, 100))
})

// ── EMAIL CONFIG ──────────────────────────────────────────────────────────────
app.get('/api/email-config', authMiddleware, adminOnly, (req, res) => {
  const cfg = readJSON('email-config.json')
  const safe = { ...cfg }
  if (safe.smtp?.pass) safe.smtp = { ...safe.smtp, pass: '••••••••' }
  res.json(safe)
})

app.put('/api/email-config', authMiddleware, adminOnly, (req, res) => {
  const current = readJSON('email-config.json')
  const update = req.body
  // Don't overwrite password if masked
  if (update.smtp?.pass === '••••••••') update.smtp.pass = current.smtp?.pass || ''
  writeJSON('email-config.json', { ...current, ...update, smtp: { ...current.smtp, ...update.smtp } })
  res.json({ ok: true })
})

app.post('/api/email-config/test', authMiddleware, adminOnly, async (req, res) => {
  const cfg = readJSON('email-config.json')
  if (!cfg.smtp?.host || !cfg.smtp?.user || !cfg.smtp?.pass)
    return res.status(400).json({ error: 'Configura el servidor SMTP primero' })
  try {
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

// ── EMAIL REPORT HISTORY ──────────────────────────────────────────────────────
app.get('/api/email-config/history', authMiddleware, adminOnly, (req, res) => {
  const cfg = readJSON('email-config.json')
  res.json(cfg.history || [])
})

// ── CRON: monthly report ──────────────────────────────────────────────────────
cron.schedule('0 8 * * *', async () => {
  const cfg = readJSON('email-config.json')
  if (!cfg.enabled) return
  const today = new Date()
  const sendDay = cfg.sendDay || 1
  if (today.getDate() !== sendDay) return
  console.log('[CRON] Sending monthly report...')
  // Report generation is triggered; actual PDF built in frontend
  // Here we just log and update history
  const entry = { date: today.toISOString(), status: 'scheduled', month: today.toLocaleString('es-ES', { month: 'long', year: 'numeric' }) }
  cfg.history = [entry, ...(cfg.history || [])].slice(0, 12)
  cfg.lastSent = today.toISOString()
  writeJSON('email-config.json', cfg)
})

app.listen(PORT, () => {
  console.log(`\n  StockIn API server running on http://localhost:${PORT}\n`)
})
