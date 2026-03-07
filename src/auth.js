// ── Role definitions ───────────────────────────────────────────────────────────
// admin    → full access, sees cost prices, manages users & connections
// manager  → sees stock/albaranes/regularizacion/pedidos/historial/productos/proveedores
//            NO cost prices, NO config, NO user management
// employee → only stock + regularizacion (count only). No prices. No orders/albaranes.
// readonly → dashboard + alertas + stock read-only. Zero actions.

export const ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN:      'admin',
  MANAGER:    'manager',
  EMPLOYEE:   'employee',
  READONLY:   'readonly',
}

export const NAV_ACCESS = {
  // superadmin: acceso absoluto a todo, incluido el módulo de usuarios
  superadmin: ['dashboard','alertas','stock','regularizacion','pedidos','historico','albaranes','traspasos','productos','proveedores','setup','usuarios','informe'],
  // admin: igual que antes, pero SIN el módulo de usuarios
  admin:      ['dashboard','alertas','stock','regularizacion','pedidos','historico','albaranes','traspasos','productos','proveedores','setup','informe'],
  manager:    ['dashboard','alertas','stock','regularizacion','pedidos','historico','albaranes','traspasos','productos','proveedores','informe'],
  employee:   ['dashboard','alertas','stock','regularizacion'],
  readonly:   ['dashboard','alertas','stock'],
}

export const PERMS = {
  seeCostPrices:  (role) => role === 'superadmin' || role === 'admin' || role === 'manager',
  canWrite:       (role) => role === 'superadmin' || role === 'admin' || role === 'manager',
  canRegularize:  (role) => role === 'superadmin' || role === 'admin' || role === 'manager' || role === 'employee',
  canManageConns: (role) => role === 'superadmin' || role === 'admin',
  // Solo superadmin puede gestionar usuarios
  canManageUsers: (role) => role === 'superadmin',
  canSeeSetup:    (role) => role === 'superadmin' || role === 'admin',
}

// ── API client ────────────────────────────────────────────────────────────────
const API_BASE = '/api'

const apiFetch = (path, opts = {}) => {
  const token = sessionStorage.getItem('stockin_token')
  return fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  }).then(async r => {
    if (!r.ok) {
      const err = await r.json().catch(() => ({ error: r.statusText }))
      throw new Error(err.error || `HTTP ${r.status}`)
    }
    return r.json()
  })
}

export const authAPI = {
  login:   (username, password) => apiFetch('/auth/login', { method: 'POST', body: { username, password } }),
  logout:  ()                   => apiFetch('/auth/logout', { method: 'POST' }),
  me:      ()                   => apiFetch('/auth/me'),
}

export const usersAPI = {
  list:    ()        => apiFetch('/users'),
  create:  (data)    => apiFetch('/users', { method: 'POST', body: data }),
  update:  (id, data)=> apiFetch(`/users/${id}`, { method: 'PUT', body: data }),
  remove:  (id)      => apiFetch(`/users/${id}`, { method: 'DELETE' }),
  activityLog: ()    => apiFetch('/activity-log'),
}

export const emailAPI = {
  getConfig:   ()     => apiFetch('/email-config'),
  saveConfig:  (data) => apiFetch('/email-config', { method: 'PUT', body: data }),
  sendTest:    ()     => apiFetch('/email-config/test', { method: 'POST' }),
  getHistory:  ()     => apiFetch('/email-config/history'),
}
