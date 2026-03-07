// ── Role definitions ───────────────────────────────────────────────────────────
// admin    → full access, sees cost prices, manages users & connections
// manager  → sees stock/albaranes/regularizacion/pedidos/historial/productos/proveedores
//            NO cost prices, NO config, NO user management
// employee → only stock + regularizacion (count only). No prices. No orders/albaranes.
// readonly → dashboard + alertas + stock read-only. Zero actions.

export const ROLES = {
  ADMIN:    'admin',
  MANAGER:  'manager',
  EMPLOYEE: 'employee',
  READONLY: 'readonly',
}

export const NAV_ACCESS = {
  admin:    ['dashboard','alertas','stock','regularizacion','pedidos','historico','albaranes','traspasos','productos','proveedores','setup','usuarios','informe'],
  manager:  ['dashboard','alertas','stock','regularizacion','pedidos','historico','albaranes','traspasos','productos','proveedores','informe'],
  employee: ['dashboard','alertas','stock','regularizacion'],
  readonly: ['dashboard','alertas','stock'],
}

export const PERMS = {
  // Can see cost prices (CostPrice fields)
  seeCostPrices:    (role) => role === 'admin' || role === 'manager',
  // Can perform write actions (create, import, save)
  canWrite:         (role) => role === 'admin' || role === 'manager',
  // Can do regularizacion
  canRegularize:    (role) => role === 'admin' || role === 'manager' || role === 'employee',
  // Can manage connections (setup tab)
  canManageConns:   (role) => role === 'admin',
  // Can manage users
  canManageUsers:   (role) => role === 'admin',
  // Can see setup tab
  canSeeSetup:      (role) => role === 'admin',
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
