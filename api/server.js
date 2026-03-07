/**
 * api/server.js — Vercel Serverless Function
 *
 * Wraps the Express app from server/app.js so that all /api/* routes
 * are handled by the same logic both locally (via Vite proxy) and on Vercel.
 *
 * Note: In serverless environments the filesystem is read-only except /tmp.
 * server/app.js handles this transparently: it falls back to /tmp/stockin-data
 * for writes and uses DEFAULT_USERS when no persistent users.json exists.
 * Data resets on cold start — for production use a real database.
 */
import app from '../server/app.js'

export default app
