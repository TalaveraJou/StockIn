/**
 * server/index.js — Entry point para desarrollo local.
 * Importa el Express app desde app.js y arranca el servidor con listen().
 * En producción Vercel, se usa api/server.js en su lugar.
 */
import cron from 'node-cron'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import app from './app.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR  = join(__dirname, 'data')
const PORT      = process.env.PORT || 3001

const readJSON  = (f) => { const p = join(DATA_DIR, f); return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : [] }
const writeJSON = (f, d) => writeFileSync(join(DATA_DIR, f), JSON.stringify(d, null, 2))

// ── CRON: informe mensual ─────────────────────────────────────────────────────
cron.schedule('0 8 * * *', () => {
  const cfg = readJSON('email-config.json')
  if (!cfg.enabled) return
  const today   = new Date()
  const sendDay = cfg.sendDay || 1
  if (today.getDate() !== sendDay) return
  console.log('[CRON] Monthly report scheduled.')
  const entry = { date: today.toISOString(), status: 'scheduled', month: today.toLocaleString('es-ES', { month: 'long', year: 'numeric' }) }
  cfg.history = [entry, ...(cfg.history || [])].slice(0, 12)
  cfg.lastSent = today.toISOString()
  writeJSON('email-config.json', cfg)
})

app.listen(PORT, () => {
  console.log(`\n  StockIn API server running on http://localhost:${PORT}\n`)
})
