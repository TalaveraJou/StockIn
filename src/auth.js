// ── Role definitions ───────────────────────────────────────────────────────────
// superadmin → created externally; configures Ágora connections; manages StockIn users
// admin      → created by superadmin; full panel (excl. setup/users); manages team ("Mi equipo")
// encargado  → same as admin but without team management
// camarero   → only albaranes (minimal UI)
// legacy aliases: manager = encargado, employee = camarero

export const ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN:      'admin',
  ENCARGADO:  'encargado',
  CAMARERO:   'camarero',
  // backward compat
  MANAGER:    'manager',
  EMPLOYEE:   'employee',
  READONLY:   'readonly',
}

export const NAV_ACCESS = {
  // superadmin: absolute access including setup and user management
  superadmin: ['dashboard','alertas','stock','regularizacion','pedidos','historico','albaranes','traspasos','productos','proveedores','setup','usuarios','informe'],
  // admin: full ops panel + "Mi equipo"; NO setup, NO usuarios
  admin:      ['dashboard','stock','alertas','regularizacion','albaranes','traspasos','pedidos','historico','proveedores','productos','informe','miequipo'],
  // encargado: same as admin minus "Mi equipo" and "informe"
  encargado:  ['dashboard','stock','alertas','regularizacion','albaranes','traspasos','pedidos','historico','proveedores','productos'],
  // camarero: only albaranes (rendered with minimal layout)
  camarero:   ['albaranes'],
  // legacy aliases
  manager:    ['dashboard','stock','alertas','regularizacion','albaranes','traspasos','pedidos','historico','proveedores','productos'],
  employee:   ['albaranes'],
  readonly:   ['dashboard','alertas','stock'],
}

export const PERMS = {
  seeCostPrices:  (role) => ['superadmin','admin','encargado','manager'].includes(role),
  canWrite:       (role) => ['superadmin','admin','encargado','manager'].includes(role),
  canRegularize:  (role) => ['superadmin','admin','encargado','manager','employee','camarero'].includes(role),
  // Only superadmin can manage Ágora connections and app config
  canManageConns: (role) => role === 'superadmin',
  canSeeSetup:    (role) => role === 'superadmin',
  // Only superadmin manages StockIn user accounts
  canManageUsers: (role) => role === 'superadmin',
  // Admin manages team members (Ágora employees mapped to StockIn roles)
  canManageTeam:  (role) => role === 'admin',
  // Camarero/employee: minimal layout, only albaranes
  isCamarero:     (role) => role === 'camarero' || role === 'employee',
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

// ── Superadmin API ────────────────────────────────────────────────────────────
export const saAPI = {
  // Distributors
  getDistributors:    ()        => apiFetch('/sa/distributors'),
  getDistributor:     (id)      => apiFetch(`/sa/distributors/${id}`),
  createDistributor:  (data)    => apiFetch('/sa/distributors',          { method: 'POST',   body: data }),
  updateDistributor:  (id,data) => apiFetch(`/sa/distributors/${id}`,    { method: 'PUT',    body: data }),
  deleteDistributor:  (id)      => apiFetch(`/sa/distributors/${id}`,    { method: 'DELETE' }),
  suspendDistributor: (id)      => apiFetch(`/sa/distributors/${id}/suspend`,  { method: 'POST' }),
  activateDistributor:(id)      => apiFetch(`/sa/distributors/${id}/activate`, { method: 'POST' }),
  // Locations
  getLocations:        (q='')    => apiFetch(`/sa/locations${q}`),
  createLocation:      (data)    => apiFetch('/sa/locations',          { method: 'POST',   body: data }),
  updateLocation:      (id,data) => apiFetch(`/sa/locations/${id}`,    { method: 'PUT',    body: data }),
  deleteLocation:      (id)      => apiFetch(`/sa/locations/${id}`,    { method: 'DELETE' }),
  blockLocation:       (id)      => apiFetch(`/sa/locations/${id}/block`,     { method: 'POST' }),
  unblockLocation:     (id)      => apiFetch(`/sa/locations/${id}/unblock`,   { method: 'POST' }),
  getLocationEmployees:(id)      => apiFetch(`/sa/locations/${id}/employees`),
  // Users
  getSaUsers:      (q='')       => apiFetch(`/sa/users${q}`),
  createSaUser:    (data)       => apiFetch('/sa/users',          { method: 'POST',   body: data }),
  updateSaUser:    (id,data)    => apiFetch(`/sa/users/${id}`,    { method: 'PUT',    body: data }),
  deleteSaUser:    (id)         => apiFetch(`/sa/users/${id}`,    { method: 'DELETE' }),
  forceLogout:     (id)         => apiFetch(`/sa/users/${id}/forcelogout`, { method: 'POST' }),
  // Reports & Config
  getMetrics:      ()           => apiFetch('/sa/reports/metrics'),
  getEvents:       ()           => apiFetch('/sa/reports/events'),
  getGlobalConfig: ()           => apiFetch('/sa/config'),
  saveGlobalConfig:(data)       => apiFetch('/sa/config', { method: 'PUT', body: data }),
}
