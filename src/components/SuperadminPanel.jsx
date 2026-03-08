import { useState, useEffect, useCallback, useRef } from 'react'
import { Building2, MapPin, Users, BarChart2, Settings, Plus, Pencil, Trash2, X, Search, LogOut, Eye, EyeOff, Check, AlertTriangle, ArrowLeft, Mail, RefreshCw, ChevronRight, ChevronLeft, Menu, Wifi, WifiOff, Loader2, Upload } from 'lucide-react'
import { saAPI } from '../auth.js'

// ── Theme ─────────────────────────────────────────────────────────────────────
const T = {
  brand: '#034650', accent: '#0592A7', accentD: '#046f80',
  bg: '#f0f5f6', surface: '#ffffff', border: '#dde7e9', border2: '#c5d8db',
  text: '#0c2b30', muted: '#6b8f95', green: '#0a9e76', red: '#dc3545',
  yellow: '#d97706', orange: '#ea6c00', blue: '#0592A7', purple: '#7c3aed',
}
const S = {
  inp: { background: '#fff', border: `1px solid ${T.border2}`, borderRadius: 8, padding: '9px 12px', color: T.text, fontSize: 14, outline: 'none', width: '100%', fontFamily: 'inherit' },
  label: { fontSize: 11, color: T.muted, display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' },
  card: { background: '#fff', border: `1px solid ${T.border}`, borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(3,70,80,0.07)' },
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const IC_LUCIDE_SA = {
  distributor: Building2,
  location:    MapPin,
  users:       Users,
  chart:       BarChart2,
  settings:    Settings,
  plus:        Plus,
  edit:        Pencil,
  trash:       Trash2,
  close:       X,
  search:      Search,
  logout:      LogOut,
  block:       LogOut,
  check:       Check,
  warn:        AlertTriangle,
  back:        ArrowLeft,
  mail:        Mail,
  refresh:     RefreshCw,
  eye:         Eye,
  eyeoff:      EyeOff,
  chevron:     ChevronRight,
  wifi:        Wifi,
  wifiOff:     WifiOff,
  loader:      Loader2,
}
const Ic = ({ n, s = 18, style: sx = {} }) => {
  const Icon = IC_LUCIDE_SA[n] || Settings
  return <Icon size={s} style={{ flexShrink: 0, ...sx }} />
}

// ── Shared UI ─────────────────────────────────────────────────────────────────
function Btn({ onClick, disabled, children, variant = 'primary', small, style: sx = {} }) {
  const styles = {
    primary:   { background: T.accent,  color: '#fff',   border: 'none',   boxShadow: '0 1px 4px rgba(5,146,167,0.25)' },
    brand:     { background: T.brand,   color: '#fff',   border: 'none',   boxShadow: '0 1px 4px rgba(3,70,80,0.25)' },
    secondary: { background: '#f0f4f5', color: T.text,   border: `1px solid ${T.border}` },
    danger:    { background: 'rgba(220,53,69,0.08)', color: T.red,    border: '1px solid rgba(220,53,69,0.2)' },
    success:   { background: 'rgba(10,158,118,0.1)', color: T.green,  border: '1px solid rgba(10,158,118,0.25)' },
    warn:      { background: 'rgba(217,119,6,0.1)',  color: T.yellow, border: '1px solid rgba(217,119,6,0.25)' },
  }
  return (
    <button
      onClick={!disabled ? onClick : undefined}
      disabled={disabled}
      className={`sa-btn sa-btn-${variant}`}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: small ? '5px 11px' : '9px 18px', borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer', fontSize: small ? 12 : 13, fontWeight: 600, fontFamily: 'inherit', opacity: disabled ? 0.45 : 1, transition: 'filter 0.12s, box-shadow 0.12s, transform 0.1s', ...styles[variant], ...sx }}
    >
      {children}
    </button>
  )
}

function Modal({ title, onClose, children, maxW = 560 }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(3,70,80,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="sa-modal-inner" style={{ background: '#fff', borderRadius: 16, border: `1px solid ${T.border}`, width: '100%', maxWidth: maxW, maxHeight: '92vh', overflow: 'auto', padding: 24, boxShadow: '0 24px 64px rgba(3,70,80,0.22)', animation: 'fadeUp 0.18s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 14, borderBottom: `1px solid ${T.border}` }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: T.brand, margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: `${T.bg}`, border: `1px solid ${T.border}`, color: T.muted, cursor: 'pointer', padding: '5px 7px', borderRadius: 8, display: 'flex', transition: 'background 0.1s' }}><Ic n="close" s={15} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children, hint }) {
  return (
    <div>
      <label style={S.label}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

function Badge({ color, label }) {
  return <span style={{ background: `${color}18`, color, borderRadius: 5, padding: '3px 9px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</span>
}

function Empty({ msg }) {
  return <div style={{ textAlign: 'center', padding: '32px 16px', color: T.muted, fontSize: 13 }}>{msg}</div>
}

function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: T.brand, margin: '0 0 4px' }}>{title}</h1>
        {subtitle && <p style={{ margin: 0, color: T.muted, fontSize: 13 }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

// ── Table helper ──────────────────────────────────────────────────────────────
const thSt = { padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${T.border}`, whiteSpace: 'nowrap' }
const tdSt = { padding: '11px 14px', fontSize: 13, color: T.text, borderBottom: `1px solid ${T.border}` }

// ═══════════════════════════════════════════════════════════════════════════════
//  DISTRIBUIDORES MODULE
// ═══════════════════════════════════════════════════════════════════════════════
function LogoPicker({ value, name, onChange }) {
  const inputRef = useRef()

  const processFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const MAX = 128
        const scale = Math.min(MAX / img.width, MAX / img.height, 1)
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        onChange(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  }

  const [drag, setDrag] = useState(false)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); processFile(e.dataTransfer.files[0]) }}
        style={{
          width: 80, height: 80, borderRadius: 16, flexShrink: 0, cursor: 'pointer', overflow: 'hidden',
          border: drag ? `2px dashed ${T.accent}` : value ? `2px solid ${T.border}` : `2px dashed ${T.border}`,
          background: drag ? `${T.accent}10` : value ? '#fff' : T.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
          transition: 'border-color 0.15s, background 0.15s',
        }}
      >
        {value
          ? <img src={value} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ textAlign: 'center', pointerEvents: 'none' }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: T.brand, lineHeight: 1 }}>{name?.[0]?.toUpperCase() || '?'}</div>
              <Upload size={12} style={{ color: T.muted, marginTop: 4 }} />
            </div>
        }
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <Btn small variant="secondary" onClick={() => inputRef.current?.click()}><Upload size={12} /> Subir logo</Btn>
        {value && <Btn small variant="danger" onClick={() => onChange('')}><Ic n="trash" s={12} /> Eliminar logo</Btn>}
        <span style={{ fontSize: 11, color: T.muted, lineHeight: 1.4 }}>PNG, JPG o WebP.<br/>Se redimensionará a 128 px.</span>
      </div>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { processFile(e.target.files[0]); e.target.value = '' }} />
    </div>
  )
}

function DistributorForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState({ name: '', contactEmail: '', contactPhone: '', notes: '', logo: '', ...initial })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Field label="Logo">
        <LogoPicker value={form.logo} name={form.name} onChange={v => set('logo', v)} />
      </Field>
      <Field label="Nombre *"><input style={S.inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Nombre del distribuidor" /></Field>
      <div className="sa-g2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Email de contacto"><input style={S.inp} type="email" value={form.contactEmail} onChange={e => set('contactEmail', e.target.value)} placeholder="email@ejemplo.com" /></Field>
        <Field label="Teléfono"><input style={S.inp} value={form.contactPhone} onChange={e => set('contactPhone', e.target.value)} placeholder="+34 600 000 000" /></Field>
      </div>
      <Field label="Notas"><textarea style={{ ...S.inp, minHeight: 72, resize: 'vertical' }} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Notas internas…" /></Field>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
        <Btn variant="secondary" onClick={onCancel}>Cancelar</Btn>
        <Btn onClick={() => onSave(form)} disabled={saving || !form.name.trim()}>
          {saving ? 'Guardando…' : initial?.id ? 'Guardar cambios' : 'Crear distribuidor'}
        </Btn>
      </div>
    </div>
  )
}

function DistributorDetail({ dist, onBack, toast }) {
  const [tab, setTab] = useState('locales')
  const [locations, setLocations] = useState([])
  const [users, setUsers]         = useState([])
  const [loading, setLoading]     = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const lRes = await saAPI.getLocations(`?distributorId=${dist.id}`)
      setLocations(Array.isArray(lRes) ? lRes : [])
    } catch (e) { toast(e.message, 'err') }
    setLoading(false)
    saAPI.getSaUsers(`?distributorId=${dist.id}`).then(r => { if (Array.isArray(r)) setUsers(r) }).catch(() => {})
  }, [dist.id])

  useEffect(() => { load() }, [load])

  const handleBlock = async (loc) => {
    try {
      await (loc.status === 'blocked' ? saAPI.unblockLocation(loc.id) : saAPI.blockLocation(loc.id))
      toast(`Local ${loc.status === 'blocked' ? 'desbloqueado' : 'bloqueado'} ✓`)
      load()
    } catch (e) { toast(e.message, 'err') }
  }

  const handleForceLogout = async (u) => {
    try { await saAPI.forceLogout(u.id); toast(`Sesión cerrada para ${u.username} ✓`); load() } catch (e) { toast(e.message, 'err') }
  }

  return (
    <div>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: T.accent, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, padding: '0 0 16px', fontFamily: 'inherit' }}>
        <Ic n="back" s={16} /> Volver a distribuidores
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: dist.logo ? '#fff' : T.brand, border: dist.logo ? `1px solid ${T.border}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, fontWeight: 700, flexShrink: 0, overflow: 'hidden' }}>
          {dist.logo ? <img src={dist.logo} alt={dist.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (dist.name?.[0]?.toUpperCase() || 'D')}
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: T.brand, margin: '0 0 4px' }}>{dist.name}</h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Badge color={dist.status === 'suspended' ? T.red : T.green} label={dist.status === 'suspended' ? 'Suspendido' : 'Activo'} />
            {dist.contactEmail && <span style={{ fontSize: 12, color: T.muted }}>{dist.contactEmail}</span>}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${T.border}`, marginBottom: 20 }}>
        {[['locales', 'Locales', locations.length], ['usuarios', 'Usuarios', users.length]].map(([id, label, count]) => (
          <button key={id} onClick={() => setTab(id)} style={{ padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === id ? 700 : 400, color: tab === id ? T.accent : T.muted, borderBottom: tab === id ? `2px solid ${T.accent}` : '2px solid transparent', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
            {label}
            <span style={{ background: T.border, color: T.muted, borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>{count}</span>
          </button>
        ))}
      </div>

      {loading ? <div style={{ color: T.muted, fontSize: 13, padding: 20 }}>Cargando…</div> : (
        tab === 'locales' ? (
          locations.length === 0 ? <Empty msg="No hay locales para este distribuidor." /> : (
            <div className="sa-table-wrap" style={{ ...S.card, padding: 0 }}>
              <table className="sa-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th style={thSt}>Local</th><th className="sa-hide-xs" style={thSt}>Ciudad</th><th style={thSt}>Estado</th><th style={thSt} /></tr></thead>
                <tbody>
                  {locations.map(loc => (
                    <tr key={loc.id} style={{ background: '#fff' }}>
                      <td style={tdSt}><span style={{ fontWeight: 600 }}>{loc.name}</span></td>
                      <td className="sa-hide-xs" style={tdSt}><span style={{ color: T.muted }}>{loc.city || '—'}</span></td>
                      <td style={tdSt}><Badge color={loc.status === 'blocked' ? T.red : T.green} label={loc.status === 'blocked' ? 'Bloqueado' : 'Activo'} /></td>
                      <td style={{ ...tdSt, textAlign: 'right' }}>
                        <Btn small variant={loc.status === 'blocked' ? 'success' : 'warn'} onClick={() => handleBlock(loc)}>
                          {loc.status === 'blocked' ? 'Desbloquear' : 'Bloquear'}
                        </Btn>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          users.length === 0 ? <Empty msg="No hay usuarios para este distribuidor." /> : (
            <div className="sa-table-wrap" style={{ ...S.card, padding: 0 }}>
              <table className="sa-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th style={thSt}>Usuario</th><th style={thSt}>Rol</th><th className="sa-hide-xs" style={thSt}>Local</th><th style={thSt} /></tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td style={tdSt}><div style={{ fontWeight: 600 }}>{u.fullName}</div><div style={{ fontSize: 11, color: T.muted }}>{u.username}</div></td>
                      <td style={tdSt}><Badge color={T.accent} label={u.role} /></td>
                      <td className="sa-hide-xs" style={tdSt}><span style={{ color: T.muted }}>{u.locationName || '—'}</span></td>
                      <td style={{ ...tdSt, textAlign: 'right' }}>
                        <Btn small variant="danger" onClick={() => handleForceLogout(u)}><Ic n="logout" s={12} />Cerrar sesión</Btn>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )
      )}
    </div>
  )
}

function DistribuidoresModule({ toast }) {
  const [items,    setItems]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(null)
  const [editing,  setEditing]  = useState(null)
  const [saving,   setSaving]   = useState(false)
  const [detail,   setDetail]   = useState(null)
  const [confirm,  setConfirm]  = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await saAPI.getDistributors(); setItems(Array.isArray(r) ? r : []) } catch (e) { toast(e.message, 'err') }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async (form) => {
    setSaving(true)
    try {
      if (editing?.id) { await saAPI.updateDistributor(editing.id, form) } else { await saAPI.createDistributor(form) }
      toast(editing?.id ? 'Distribuidor actualizado ✓' : 'Distribuidor creado ✓')
      setModal(null); setEditing(null); load()
    } catch (e) { toast(e.message, 'err') }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    try { await saAPI.deleteDistributor(id); toast('Distribuidor eliminado'); load() } catch (e) { toast(e.message, 'err') }
    setConfirm(null)
  }

  const handleToggle = async (dist) => {
    try {
      if (dist.status === 'suspended') { await saAPI.activateDistributor(dist.id); toast('Distribuidor activado ✓') }
      else {
        await saAPI.suspendDistributor(dist.id)
        toast('Distribuidor suspendido — todos sus locales bloqueados y usuarios desconectados')
      }
      load()
    } catch (e) { toast(e.message, 'err') }
  }

  if (detail) return <DistributorDetail dist={detail} onBack={() => { setDetail(null); load() }} toast={toast} />

  return (
    <div>
      <PageHeader
        title="Distribuidores"
        subtitle="Gestiona los distribuidores y su jerarquía de locales y usuarios."
        action={<Btn onClick={() => { setEditing(null); setModal('form') }}><Ic n="plus" s={14} />Nuevo distribuidor</Btn>}
      />

      {loading ? <div style={{ color: T.muted, fontSize: 13 }}>Cargando…</div> : items.length === 0 ? (
        <Empty msg="No hay distribuidores. Crea el primero." />
      ) : (
        <div className="sa-dist-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
          {items.map(d => (
            <div key={d.id} className="sa-card" style={{ ...S.card, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: d.logo ? '#fff' : (d.status === 'suspended' ? '#fee2e2' : T.brand), border: d.logo ? `1px solid ${T.border}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: d.status === 'suspended' ? T.red : '#fff', fontSize: 16, fontWeight: 700, flexShrink: 0, overflow: 'hidden' }}>
                  {d.logo ? <img src={d.logo} alt={d.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (d.name?.[0]?.toUpperCase() || 'D')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: T.brand, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
                  <Badge color={d.status === 'suspended' ? T.red : T.green} label={d.status === 'suspended' ? 'Suspendido' : 'Activo'} />
                </div>
              </div>
              {d.contactEmail && <div style={{ fontSize: 12, color: T.muted }}>{d.contactEmail}</div>}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
                <Btn small variant="secondary" onClick={() => setDetail(d)}><Ic n="eye" s={12} />Ver detalle</Btn>
                <Btn small variant="secondary" onClick={() => { setEditing(d); setModal('form') }}><Ic n="edit" s={12} />Editar</Btn>
                <Btn small variant={d.status === 'suspended' ? 'success' : 'warn'} onClick={() => handleToggle(d)}>
                  {d.status === 'suspended' ? 'Activar' : 'Suspender'}
                </Btn>
                <Btn small variant="danger" onClick={() => setConfirm(d)}><Ic n="trash" s={12} />Eliminar</Btn>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal === 'form' && (
        <Modal title={editing?.id ? 'Editar distribuidor' : 'Nuevo distribuidor'} onClose={() => { setModal(null); setEditing(null) }}>
          <DistributorForm initial={editing} onSave={handleSave} onCancel={() => { setModal(null); setEditing(null) }} saving={saving} />
        </Modal>
      )}

      {confirm && (
        <Modal title="Eliminar distribuidor" onClose={() => setConfirm(null)} maxW={400}>
          <p style={{ color: T.text, fontSize: 14, marginBottom: 20 }}>
            ¿Seguro que quieres eliminar <strong>{confirm.name}</strong>? Esta acción no se puede deshacer. Se eliminarán todos sus locales y usuarios.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Btn variant="secondary" onClick={() => setConfirm(null)}>Cancelar</Btn>
            <Btn variant="danger" onClick={() => handleDelete(confirm.id)}>Eliminar</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  LOCALES MODULE
// ═══════════════════════════════════════════════════════════════════════════════
const SYNC_LABELS = [
  { key: 'employees',  label: 'Empleados',       icon: '👤' },
  { key: 'warehouses', label: 'Almacenes',        icon: '🏭' },
  { key: 'products',   label: 'Productos',        icon: '📦' },
  { key: 'suppliers',  label: 'Proveedores',      icon: '🚚' },
  { key: 'stocks',     label: 'Líneas de stock',  icon: '📊' },
  { key: 'workplaces', label: 'Puestos de venta', icon: '🖥️' },
]

function SyncSummaryPanel({ summary, status, msg, onRetry, canRetry }) {
  if (!status) return null
  const isLoading = status === 'loading'
  const isOk      = status === 'ok'
  const accent    = isOk ? T.green : isLoading ? T.accent : T.red

  return (
    <div style={{ borderRadius: 10, border: `1px solid ${accent}30`, background: isOk ? `${T.green}08` : isLoading ? `${T.accent}08` : `${T.red}08`, padding: 14, marginTop: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: isOk && summary ? 12 : 0 }}>
        {isLoading
          ? <Loader2 size={15} style={{ color: T.accent, animation: 'spin 1s linear infinite', flexShrink: 0 }} />
          : isOk ? <Wifi size={15} style={{ color: T.green, flexShrink: 0 }} />
                 : <WifiOff size={15} style={{ color: T.red, flexShrink: 0 }} />}
        <span style={{ fontSize: 13, fontWeight: 600, color: accent }}>
          {isLoading ? 'Probando sincronización con Ágora…' : isOk ? 'Sincronización correcta' : msg || 'Error de conexión'}
        </span>
        {!isOk && !isLoading && canRetry && (
          <button onClick={onRetry} style={{ marginLeft: 'auto', background: 'none', border: `1px solid ${T.red}40`, borderRadius: 6, padding: '3px 10px', fontSize: 11, color: T.red, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            <RefreshCw size={11}/> Reintentar
          </button>
        )}
      </div>
      {isOk && summary && (
        <div className="sa-sync-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {SYNC_LABELS.filter(s => summary[s.key] !== undefined).map(({ key, label, icon }) => (
            <div key={key} style={{ background: '#fff', borderRadius: 8, padding: '8px 10px', border: `1px solid ${T.border}`, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 2 }}>{icon} {label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: T.brand }}>{summary[key]}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function LocationForm({ initial, distributors, onSave, onCancel, saving }) {
  const [form, setForm] = useState({ name: '', city: '', distributorId: '', notes: '', agoraUrl: '', apiToken: '', ...initial })
  const [showToken,   setShowToken]   = useState(false)
  const [syncStatus,  setSyncStatus]  = useState(null)   // null | 'loading' | 'ok' | 'error'
  const [syncMsg,     setSyncMsg]     = useState('')
  const [syncSummary, setSyncSummary] = useState(null)
  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }))
    if (k === 'agoraUrl' || k === 'apiToken') { setSyncStatus(null); setSyncMsg(''); setSyncSummary(null) }
  }

  const runSync = async () => {
    if (!form.agoraUrl || !form.apiToken) return
    setSyncStatus('loading'); setSyncMsg(''); setSyncSummary(null)
    try {
      const r = await saAPI.testAgoraConnection({ agoraUrl: form.agoraUrl, apiToken: form.apiToken })
      if (r.ok) { setSyncStatus('ok'); setSyncSummary(r.summary) }
      else       { setSyncStatus('error'); setSyncMsg(r.error || 'Error desconocido') }
    } catch (e) { setSyncStatus('error'); setSyncMsg(e.message || 'Error de conexión') }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Field label="Nombre del local *"><input style={S.inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Bar Ejemplo" /></Field>
      <div className="sa-g2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Ciudad"><input style={S.inp} value={form.city} onChange={e => set('city', e.target.value)} placeholder="Madrid" /></Field>
        <Field label="Distribuidor *">
          <select style={S.inp} value={form.distributorId} onChange={e => set('distributorId', e.target.value)}>
            <option value="">— Seleccionar —</option>
            {distributors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
      </div>

      {/* ── Ágora connection ─────────────────────────────────────────── */}
      <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.brand, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Conexión Ágora TPV
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Field label="URL del servidor Ágora" hint="Ej: http://192.168.1.10:8984">
            <input style={S.inp} value={form.agoraUrl} onChange={e => set('agoraUrl', e.target.value)} placeholder="http://192.168.1.10:8984" />
          </Field>
          <Field label="API Token de Ágora">
            <div className="sa-token-row" style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                <input style={{ ...S.inp, paddingRight: 40 }} type={showToken ? 'text' : 'password'} value={form.apiToken} onChange={e => set('apiToken', e.target.value)} placeholder="Token de Ágora" />
                <button type="button" onClick={() => setShowToken(s => !s)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: T.muted, display: 'flex', alignItems: 'center' }}>
                  {showToken ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
              <Btn
                variant={syncStatus === 'ok' ? 'success' : 'secondary'}
                onClick={runSync}
                disabled={!form.agoraUrl || !form.apiToken || syncStatus === 'loading'}
                style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                {syncStatus === 'loading'
                  ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                  : <RefreshCw size={13} />}
                Probar sincronización
              </Btn>
            </div>
          </Field>
          <SyncSummaryPanel
            status={syncStatus} summary={syncSummary} msg={syncMsg}
            onRetry={runSync} canRetry={!!(form.agoraUrl && form.apiToken)}
          />
        </div>
      </div>

      <Field label="Notas"><textarea style={{ ...S.inp, minHeight: 60, resize: 'vertical' }} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Notas internas…" /></Field>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
        <Btn variant="secondary" onClick={onCancel}>Cancelar</Btn>
        <Btn onClick={() => onSave(form)} disabled={saving || !form.name.trim() || !form.distributorId}>
          {saving ? 'Guardando…' : initial?.id ? 'Guardar cambios' : 'Crear local'}
        </Btn>
      </div>
    </div>
  )
}

const fmtDate = (iso) => {
  if (!iso) return null
  const d = new Date(iso)
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

function LocalesModule({ toast }) {
  const [items,       setItems]       = useState([])
  const [distributors,setDistributors]= useState([])
  const [loading,     setLoading]     = useState(true)
  const [modal,       setModal]       = useState(null)
  const [editing,     setEditing]     = useState(null)
  const [saving,      setSaving]      = useState(false)
  const [confirm,     setConfirm]     = useState(null)
  const [search,      setSearch]      = useState('')
  const [filterDist,  setFilterDist]  = useState('')
  const [filterStatus,setFilterStatus]= useState('')
  const [syncingId,   setSyncingId]   = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const lRes = await saAPI.getLocations()
      setItems(Array.isArray(lRes) ? lRes : [])
    } catch (e) { toast(e.message, 'err') }
    setLoading(false)
    saAPI.getDistributors().then(r => { if (Array.isArray(r)) setDistributors(r) }).catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async (form) => {
    setSaving(true)
    try {
      if (editing?.id) { await saAPI.updateLocation(editing.id, form) } else { await saAPI.createLocation(form) }
      toast(editing?.id ? 'Local actualizado ✓' : 'Local creado ✓')
      setModal(null); setEditing(null); load()
    } catch (e) { toast(e.message, 'err') }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    try { await saAPI.deleteLocation(id); toast('Local eliminado'); load() } catch (e) { toast(e.message, 'err') }
    setConfirm(null)
  }

  const handleToggle = async (loc) => {
    try {
      if (loc.status === 'blocked') { await saAPI.unblockLocation(loc.id); toast('Local desbloqueado ✓') }
      else { await saAPI.blockLocation(loc.id); toast('Local bloqueado — usuarios desconectados en breve') }
      load()
    } catch (e) { toast(e.message, 'err') }
  }

  const handleSync = async (loc) => {
    setSyncingId(loc.id)
    try {
      const r = await saAPI.syncLocation(loc.id)
      if (r.ok) {
        const s = r.summary
        toast(`Sincronización OK — ${s.employees} empleados, ${s.products} productos, ${s.warehouses} almacenes`)
      } else {
        toast(`Error de sincronización: ${r.error}`, 'err')
      }
      load()
    } catch (e) { toast(e.message, 'err') }
    setSyncingId(null)
  }

  const filtered = items.filter(l => {
    if (search && !l.name.toLowerCase().includes(search.toLowerCase()) && !l.city?.toLowerCase().includes(search.toLowerCase())) return false
    if (filterDist && l.distributorId !== filterDist) return false
    if (filterStatus && l.status !== filterStatus) return false
    return true
  })

  return (
    <div>
      <PageHeader
        title="Locales"
        subtitle="Todos los locales de todos los distribuidores."
        action={<Btn onClick={() => { setEditing(null); setModal('form') }}><Ic n="plus" s={14} />Nuevo local</Btn>}
      />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 160 }}>
          <input
            style={{ ...S.inp, paddingLeft: 32, height: 38, boxSizing: 'border-box' }}
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar local o ciudad…"
          />
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.muted, pointerEvents: 'none', display: 'flex' }}><Ic n="search" s={14} /></span>
        </div>
        <select style={{ ...S.inp, width: 'auto', flex: '0 1 180px', height: 38, boxSizing: 'border-box' }} value={filterDist} onChange={e => setFilterDist(e.target.value)}>
          <option value="">Todos los distribuidores</option>
          {distributors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select style={{ ...S.inp, width: 'auto', flex: '0 1 140px', height: 38, boxSizing: 'border-box' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="active">Activo</option>
          <option value="blocked">Bloqueado</option>
        </select>
      </div>

      {loading ? <div style={{ color: T.muted, fontSize: 13 }}>Cargando…</div> : filtered.length === 0 ? (
        <Empty msg={items.length === 0 ? 'No hay locales registrados.' : 'No hay resultados para los filtros aplicados.'} />
      ) : (
        <div className="sa-table-wrap" style={{ ...S.card, padding: 0 }}>
          <table className="sa-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thSt}>Local</th>
                <th className="sa-hide-xs" style={thSt}>Ciudad</th>
                <th className="sa-hide-xs" style={thSt}>Distribuidor</th>
                <th style={thSt}>Estado</th>
                <th style={thSt}>Ágora</th>
                <th style={thSt} />
              </tr>
            </thead>
            <tbody>
              {filtered.map(loc => {
                const dist      = distributors.find(d => d.id === loc.distributorId)
                const cs        = loc.connectionStatus
                const connColor = cs === 'active' ? T.green : cs === 'error' ? T.red : T.muted
                const isSyncing = syncingId === loc.id
                return (
                  <tr key={loc.id} style={{ background: '#fff' }}>
                    <td style={tdSt}><span style={{ fontWeight: 600 }}>{loc.name}</span></td>
                    <td className="sa-hide-xs" style={tdSt}><span style={{ color: T.muted }}>{loc.city || '—'}</span></td>
                    <td className="sa-hide-xs" style={tdSt}><span style={{ color: T.muted }}>{dist?.name || '—'}</span></td>
                    <td style={tdSt}><Badge color={loc.status === 'blocked' ? T.red : T.green} label={loc.status === 'blocked' ? 'Bloqueado' : 'Activo'} /></td>
                    <td style={tdSt}>
                      {loc.agoraUrl ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            {cs === 'active'
                              ? <Wifi size={13} style={{ color: T.green }} />
                              : <WifiOff size={13} style={{ color: connColor }} />}
                            <Badge
                              color={connColor}
                              label={cs === 'active' ? 'Conectado' : cs === 'error' ? 'Error' : 'Sin sync'}
                            />
                          </div>
                          {loc.syncSummary && cs === 'active' && (
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              {[['employees','👤'],['products','📦'],['warehouses','🏭']].map(([k,ico]) => (
                                loc.syncSummary[k] !== undefined &&
                                <span key={k} style={{ fontSize: 10, color: T.muted }}>{ico} {loc.syncSummary[k]}</span>
                              ))}
                            </div>
                          )}
                          {loc.lastSync && (
                            <span style={{ fontSize: 10, color: T.muted }}>
                              Última sync: {fmtDate(loc.lastSync)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: T.muted, fontSize: 12 }}>Sin configurar</span>
                      )}
                    </td>
                    <td style={{ ...tdSt, textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        {loc.agoraUrl && (
                          <Btn small variant={cs === 'active' ? 'success' : 'secondary'} onClick={() => handleSync(loc)} disabled={isSyncing}>
                            {isSyncing
                              ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                              : <RefreshCw size={12} />}
                            {isSyncing ? 'Sincronizando…' : 'Sincronizar'}
                          </Btn>
                        )}
                        <Btn small variant="secondary" onClick={() => { setEditing(loc); setModal('form') }}><Ic n="edit" s={12} /></Btn>
                        <Btn small variant={loc.status === 'blocked' ? 'success' : 'warn'} onClick={() => handleToggle(loc)}>
                          {loc.status === 'blocked' ? 'Desbloquear' : 'Bloquear'}
                        </Btn>
                        <Btn small variant="danger" onClick={() => setConfirm(loc)}><Ic n="trash" s={12} /></Btn>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal === 'form' && (
        <Modal title={editing?.id ? 'Editar local' : 'Nuevo local'} onClose={() => { setModal(null); setEditing(null) }}>
          <LocationForm initial={editing} distributors={distributors} onSave={handleSave} onCancel={() => { setModal(null); setEditing(null) }} saving={saving} />
        </Modal>
      )}

      {confirm && (
        <Modal title="Eliminar local" onClose={() => setConfirm(null)} maxW={400}>
          <p style={{ color: T.text, fontSize: 14, marginBottom: 20 }}>
            ¿Seguro que quieres eliminar <strong>{confirm.name}</strong>? Se eliminarán sus usuarios asociados.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Btn variant="secondary" onClick={() => setConfirm(null)}>Cancelar</Btn>
            <Btn variant="danger" onClick={() => handleDelete(confirm.id)}>Eliminar</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  USUARIOS MODULE
// ═══════════════════════════════════════════════════════════════════════════════
const ROLE_LABELS = { admin: 'Admin', encargado: 'Encargado', camarero: 'Camarero', manager: 'Encargado', employee: 'Camarero', readonly: 'Solo lectura' }
const ROLE_COLORS = { admin: T.accent, encargado: T.brand, camarero: T.green, manager: T.brand, employee: T.green, readonly: T.muted }

function UserForm({ initial, distributors, locations, onSave, onCancel, saving }) {
  const [form, setForm] = useState({ username: '', fullName: '', password: '', role: 'encargado', locationId: '', distributorId: '', active: true, agoraEmployeeId: '', agoraEmployeeName: '', ...initial })
  const [confirmPw, setConfirmPw]   = useState('')
  const [showPw,    setShowPw]      = useState(false)
  const [pwErr,     setPwErr]       = useState('')
  const [filteredLocs, setFilteredLocs] = useState([])
  const [employees,   setEmployees] = useState([])
  const [empLoading,  setEmpLoading]= useState(false)
  const [empError,    setEmpError]  = useState('')
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    setFilteredLocs(locations.filter(l => !form.distributorId || l.distributorId === form.distributorId))
  }, [form.distributorId, locations])

  useEffect(() => {
    if (!form.locationId) { setEmployees([]); setEmpError(''); return }
    const loc = locations.find(l => l.id === form.locationId)
    if (!loc?.agoraUrl || !loc?.apiToken) { setEmployees([]); setEmpError(''); return }
    setEmpLoading(true); setEmpError('')
    saAPI.getLocationEmployees(form.locationId)
      .then(r => { setEmployees(Array.isArray(r) ? r : []); setEmpLoading(false) })
      .catch(e => { setEmpError(e.message || 'No se pudo cargar la lista de empleados de Ágora'); setEmpLoading(false) })
  }, [form.locationId, locations])

  const handleSave = () => {
    if (form.password && form.password !== confirmPw) { setPwErr('Las contraseñas no coinciden'); return }
    if (isNew && !form.password.trim()) { setPwErr('La contraseña es obligatoria'); return }
    setPwErr('')
    onSave(form)
  }

  const isNew       = !initial?.id
  const pwMismatch  = form.password && confirmPw && form.password !== confirmPw
  const pwRequired  = isNew && !form.password.trim()
  const selectedLoc = locations.find(l => l.id === form.locationId)
  const needsAgoraEmployee = !!(selectedLoc?.agoraUrl && selectedLoc?.apiToken)
  const empRequired = needsAgoraEmployee && !form.agoraEmployeeId
  const canSave     = form.username.trim() && form.fullName.trim() && !pwRequired && !pwMismatch && !empRequired

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="sa-g2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Nombre completo *"><input style={S.inp} value={form.fullName} onChange={e => set('fullName', e.target.value)} placeholder="Nombre y apellido" /></Field>
        <Field label="Email / Usuario *"><input style={S.inp} value={form.username} onChange={e => set('username', e.target.value)} placeholder="usuario@ejemplo.com" /></Field>
      </div>

      {/* Password fields */}
      <div className="sa-g2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label={isNew ? 'Contraseña *' : 'Nueva contraseña (vacío = no cambiar)'}>
          <div style={{ position: 'relative' }}>
            <input
              style={S.inp}
              type={showPw ? 'text' : 'password'}
              value={form.password}
              onChange={e => { set('password', e.target.value); setPwErr('') }}
              placeholder="••••••••"
              autoComplete="new-password"
            />
            <button type="button" onClick={() => setShowPw(s => !s)} style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: T.muted,
              display: 'flex', alignItems: 'center',
            }}>{showPw ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
          </div>
        </Field>
        <Field label="Confirmar contraseña">
          <input
            style={{ ...S.inp, borderColor: pwErr ? T.red : undefined }}
            type={showPw ? 'text' : 'password'}
            value={confirmPw}
            onChange={e => { setConfirmPw(e.target.value); setPwErr('') }}
            placeholder="••••••••"
            autoComplete="new-password"
          />
        </Field>
      </div>
      {pwErr && <div style={{ fontSize: 12, color: T.red, marginTop: -8 }}>{pwErr}</div>}

      <div className="sa-g2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Rol">
          <select style={S.inp} value={form.role} onChange={e => set('role', e.target.value)}>
            <option value="admin">Admin — panel completo + Mi equipo</option>
            <option value="encargado">Encargado — sin Mi equipo</option>
            <option value="camarero">Camarero — solo albaranes</option>
          </select>
        </Field>
        <Field label="Distribuidor">
          <select style={S.inp} value={form.distributorId} onChange={e => { set('distributorId', e.target.value); set('locationId', '') }}>
            <option value="">— Sin asignar —</option>
            {distributors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Local">
        <select style={S.inp} value={form.locationId} onChange={e => { set('locationId', e.target.value); set('agoraEmployeeId', ''); set('agoraEmployeeName', '') }}>
          <option value="">— Sin asignar —</option>
          {filteredLocs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </Field>

      {/* Ágora employee selector — shown when selected location has Ágora configured */}
      {form.locationId && (() => {
        const loc = locations.find(l => l.id === form.locationId)
        if (!loc?.agoraUrl || !loc?.apiToken) return null
        return (
          <Field label="Usuario en Ágora *" hint="Asocia este usuario a un empleado de Ágora para que sus permisos estén sincronizados.">
            {empLoading && <div style={{ fontSize: 12, color: T.muted, padding: '9px 12px', background: T.bg, borderRadius: 8 }}>Cargando empleados de Ágora…</div>}
            {empError && (
              <div style={{ background: 'rgba(220,53,69,0.07)', border: '1px solid rgba(220,53,69,0.25)', borderRadius: 8, padding: '9px 12px', fontSize: 12, color: T.red }}>
                <div style={{ marginBottom: 6 }}>No se puede cargar la lista de empleados de Ágora. Verifica que el TPV está encendido e inténtalo de nuevo.</div>
                <Btn small variant="secondary" onClick={() => { setEmpLoading(true); setEmpError(''); saAPI.getLocationEmployees(form.locationId).then(r => { setEmployees(Array.isArray(r) ? r : []); setEmpLoading(false) }).catch(e => { setEmpError(e.message); setEmpLoading(false) }) }}>
                  <RefreshCw size={13}/> Reintentar
                </Btn>
              </div>
            )}
            {!empLoading && !empError && (
              <select style={{ ...S.inp, borderColor: !form.agoraEmployeeId ? T.border2 : T.green }} value={form.agoraEmployeeId} onChange={e => {
                const emp = employees.find(em => String(em.Id || em.id) === e.target.value)
                set('agoraEmployeeId', e.target.value)
                set('agoraEmployeeName', emp ? (emp.Name || emp.name || '') : '')
              }}>
                <option value="">— Seleccionar empleado de Ágora —</option>
                {employees.map(em => <option key={em.Id || em.id} value={String(em.Id || em.id)}>{em.Name || em.name || `Empleado ${em.Id || em.id}`}</option>)}
              </select>
            )}
          </Field>
        )
      })()}

      {/* Active toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: T.bg, borderRadius: 8, border: `1px solid ${T.border}` }}>
        <button
          type="button"
          onClick={() => set('active', !form.active)}
          style={{
            width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
            background: form.active ? T.green : T.border2, transition: 'background 0.2s',
            position: 'relative', flexShrink: 0,
          }}
        >
          <span style={{
            position: 'absolute', top: 3, left: form.active ? 20 : 3,
            width: 16, height: 16, borderRadius: '50%', background: '#fff',
            transition: 'left 0.2s', display: 'block',
          }} />
        </button>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{form.active ? 'Usuario activo' : 'Usuario inactivo'}</div>
          <div style={{ fontSize: 11, color: T.muted }}>{form.active ? 'Puede iniciar sesión en StockIn' : 'No puede iniciar sesión'}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
        <Btn variant="secondary" onClick={onCancel}>Cancelar</Btn>
        <Btn onClick={handleSave} disabled={saving || !canSave}>
          {saving ? 'Guardando…' : isNew ? 'Crear usuario' : 'Guardar cambios'}
        </Btn>
      </div>
    </div>
  )
}

function UsuariosModule({ toast }) {
  const [items,       setItems]        = useState([])
  const [distributors,setDistributors] = useState([])
  const [locations,   setLocations]    = useState([])
  const [loading,     setLoading]      = useState(true)
  const [search,      setSearch]       = useState('')
  const [filterDist,  setFilterDist]   = useState('')
  const [filterRole,  setFilterRole]   = useState('')
  const [modal,       setModal]        = useState(null)
  const [editing,     setEditing]      = useState(null)
  const [saving,      setSaving]       = useState(false)
  const [confirm,     setConfirm]      = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    // Fetch users first — critical path; a failure here shows an error
    try {
      const uRes = await saAPI.getSaUsers()
      setItems(Array.isArray(uRes) ? uRes : [])
    } catch (e) {
      toast('Error al cargar usuarios: ' + e.message, 'err')
      setLoading(false)
      return
    }
    setLoading(false)
    // Distributors and locations load independently — don't block the user list
    saAPI.getDistributors().then(r => { if (Array.isArray(r)) setDistributors(r) }).catch(() => {})
    saAPI.getLocations().then(r => { if (Array.isArray(r)) setLocations(r) }).catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async (form) => {
    setSaving(true)
    try {
      if (editing?.id) { await saAPI.updateSaUser(editing.id, form) } else { await saAPI.createSaUser(form) }
      toast(editing?.id ? 'Usuario actualizado ✓' : 'Usuario creado ✓')
      setModal(null); setEditing(null); load()
    } catch (e) { toast(e.message, 'err') }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    try { await saAPI.deleteSaUser(id); toast('Usuario eliminado'); load() } catch (e) { toast(e.message, 'err') }
    setConfirm(null)
  }

  const handleForceLogout = async (u) => {
    try { await saAPI.forceLogout(u.id); toast(`Sesión cerrada para ${u.username} ✓`); load() } catch (e) { toast(e.message, 'err') }
  }

  const filtered = items.filter(u => {
    if (search && !u.fullName?.toLowerCase().includes(search.toLowerCase()) && !u.username?.toLowerCase().includes(search.toLowerCase())) return false
    if (filterDist && u.distributorId !== filterDist) return false
    if (filterRole && u.role !== filterRole) return false
    return true
  })

  return (
    <div>
      <PageHeader
        title="Usuarios"
        subtitle="Todos los usuarios de todos los locales y distribuidores."
        action={<Btn onClick={() => { setEditing(null); setModal('form') }}><Ic n="plus" s={14} />Nuevo usuario</Btn>}
      />

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 160 }}>
          <input style={{ ...S.inp, paddingLeft: 32 }} value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar usuario…" />
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.muted, pointerEvents: 'none', display: 'flex' }}><Ic n="search" s={14} /></span>
        </div>
        <select style={{ ...S.inp, width: 'auto', flex: '0 1 180px' }} value={filterDist} onChange={e => setFilterDist(e.target.value)}>
          <option value="">Todos los distribuidores</option>
          {distributors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select style={{ ...S.inp, width: 'auto', flex: '0 1 140px' }} value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="">Todos los roles</option>
          <option value="admin">Admin</option>
          <option value="encargado">Encargado</option>
          <option value="camarero">Camarero</option>
        </select>
      </div>

      {loading ? <div style={{ color: T.muted, fontSize: 13 }}>Cargando…</div> : filtered.length === 0 ? (
        <Empty msg={items.length === 0 ? 'No hay usuarios registrados.' : 'No hay resultados.'} />
      ) : (
        <div className="sa-table-wrap" style={{ ...S.card, padding: 0 }}>
          <table className="sa-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thSt}>Usuario</th>
                <th style={thSt}>Rol</th>
                <th className="sa-hide-xs" style={thSt}>Distribuidor</th>
                <th className="sa-hide-xs" style={thSt}>Local</th>
                <th style={thSt}>Estado</th>
                <th style={thSt} />
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const dist = distributors.find(d => d.id === u.distributorId)
                const loc  = locations.find(l => l.id === u.locationId)
                return (
                  <tr key={u.id}>
                    <td style={tdSt}>
                      <div style={{ fontWeight: 600 }}>{u.fullName}</div>
                      <div style={{ fontSize: 11, color: T.muted }}>{u.username}</div>
                    </td>
                    <td style={tdSt}><Badge color={ROLE_COLORS[u.role] || T.muted} label={ROLE_LABELS[u.role] || u.role} /></td>
                    <td className="sa-hide-xs" style={tdSt}><span style={{ color: T.muted }}>{dist?.name || '—'}</span></td>
                    <td className="sa-hide-xs" style={tdSt}><span style={{ color: T.muted }}>{loc?.name || u.locationName || '—'}</span></td>
                    <td style={tdSt}><Badge color={u.active !== false ? T.green : T.red} label={u.active !== false ? 'Activo' : 'Inactivo'} /></td>
                    <td style={{ ...tdSt, textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <Btn small variant="secondary" onClick={() => { setEditing(u); setModal('form') }}><Ic n="edit" s={12} /></Btn>
                        <Btn small variant="warn" onClick={() => handleForceLogout(u)} title="Cerrar sesión activa"><Ic n="logout" s={12} /></Btn>
                        <Btn small variant="danger" onClick={() => setConfirm(u)}><Ic n="trash" s={12} /></Btn>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal === 'form' && (
        <Modal title={editing?.id ? 'Editar usuario' : 'Nuevo usuario'} onClose={() => { setModal(null); setEditing(null) }} maxW={600}>
          <UserForm initial={editing} distributors={distributors} locations={locations} onSave={handleSave} onCancel={() => { setModal(null); setEditing(null) }} saving={saving} />
        </Modal>
      )}

      {confirm && (
        <Modal title="Eliminar usuario" onClose={() => setConfirm(null)} maxW={400}>
          <p style={{ color: T.text, fontSize: 14, marginBottom: 20 }}>
            ¿Seguro que quieres eliminar a <strong>{confirm.fullName}</strong>?
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Btn variant="secondary" onClick={() => setConfirm(null)}>Cancelar</Btn>
            <Btn variant="danger" onClick={() => handleDelete(confirm.id)}>Eliminar</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  INFORMES MODULE
// ═══════════════════════════════════════════════════════════════════════════════
function MetricCard({ label, value, color = T.accent, icon }) {
  return (
    <div style={{ ...S.card, display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
        <Ic n={icon} s={22} />
      </div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 800, color: T.brand, lineHeight: 1 }}>{value ?? '—'}</div>
        <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>{label}</div>
      </div>
    </div>
  )
}

function InformesModule({ toast }) {
  const [metrics, setMetrics] = useState(null)
  const [events,  setEvents]  = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const mRes = await saAPI.getMetrics()
      setMetrics(mRes)
    } catch (e) { toast('Error al cargar métricas: ' + e.message, 'err') }
    setLoading(false)
    saAPI.getEvents().then(r => { if (Array.isArray(r)) setEvents(r) }).catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <div style={{ color: T.muted, fontSize: 13 }}>Cargando informes…</div>

  return (
    <div>
      <PageHeader
        title="Informes"
        subtitle="Métricas globales y registro de actividad."
        action={<Btn variant="secondary" onClick={load}><Ic n="refresh" s={14} />Actualizar</Btn>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 16, marginBottom: 28 }}>
        <MetricCard label="Distribuidores" value={metrics?.distributors ?? 0} icon="distributor" color={T.brand} />
        <MetricCard label="Locales" value={metrics?.locations ?? 0} icon="location" color={T.accent} />
        <MetricCard label="Usuarios" value={metrics?.users ?? 0} icon="users" color={T.purple} />
        <MetricCard label="Locales bloqueados" value={metrics?.blockedLocations ?? 0} icon="block" color={T.red} />
        <MetricCard label="Distribuidores suspendidos" value={metrics?.suspendedDistributors ?? 0} icon="warn" color={T.yellow} />
        <MetricCard label="Sesiones activas (aprox.)" value={metrics?.activeSessions ?? 0} icon="check" color={T.green} />
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 700, color: T.brand, marginBottom: 14 }}>Registro de actividad</h2>
      {events.length === 0 ? <Empty msg="No hay eventos registrados." /> : (
        <div className="sa-table-wrap" style={{ ...S.card, padding: 0 }}>
          <table className="sa-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thSt}>Fecha</th>
                <th style={thSt}>Tipo</th>
                <th className="sa-hide-xs" style={thSt}>Actor</th>
                <th style={thSt}>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {events.slice(0, 100).map((ev, i) => (
                <tr key={i}>
                  <td style={{ ...tdSt, fontSize: 11, color: T.muted, whiteSpace: 'nowrap' }}>
                    {ev.date ? new Date(ev.date).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td style={tdSt}>
                    <Badge
                      color={ev.type === 'error' ? T.red : ev.type === 'warn' ? T.yellow : T.blue}
                      label={ev.type || 'info'}
                    />
                  </td>
                  <td className="sa-hide-xs" style={tdSt}><span style={{ color: T.muted }}>{ev.actor || '—'}</span></td>
                  <td style={{ ...tdSt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.detail || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CONFIGURACIÓN MODULE
// ═══════════════════════════════════════════════════════════════════════════════
function ConfiguracionModule({ toast }) {
  const [cfg,     setCfg]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await saAPI.getGlobalConfig(); setCfg(r) } catch (e) { toast(e.message, 'err') }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const set = (path, value) => {
    setCfg(prev => {
      const next = { ...prev }
      const parts = path.split('.')
      let cur = next
      for (let i = 0; i < parts.length - 1; i++) {
        cur[parts[i]] = { ...cur[parts[i]] }
        cur = cur[parts[i]]
      }
      cur[parts[parts.length - 1]] = value
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try { await saAPI.saveGlobalConfig(cfg); toast('Configuración guardada ✓') } catch (e) { toast(e.message, 'err') }
    setSaving(false)
  }

  if (loading || !cfg) return <div style={{ color: T.muted, fontSize: 13 }}>Cargando configuración…</div>

  const SectionTitle = ({ children }) => <h3 style={{ fontSize: 14, fontWeight: 700, color: T.brand, margin: '28px 0 14px', paddingBottom: 8, borderBottom: `1px solid ${T.border}` }}>{children}</h3>

  return (
    <div style={{ maxWidth: 680 }}>
      <PageHeader title="Configuración global" subtitle="Ajustes globales del sistema StockIn." />

      <SectionTitle>Sesión y sincronización</SectionTitle>
      <div className="sa-g2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Timeout de sesión (minutos)" hint="Tiempo de inactividad antes de cerrar sesión automáticamente.">
          <input style={S.inp} type="number" min={15} max={1440} value={cfg.sessionTimeout ?? 480} onChange={e => set('sessionTimeout', parseInt(e.target.value) || 480)} />
        </Field>
        <Field label="Intervalo de sync automático (minutos)" hint="0 = sin sync automática.">
          <input style={S.inp} type="number" min={0} max={60} value={cfg.syncInterval ?? 15} onChange={e => set('syncInterval', parseInt(e.target.value) || 0)} />
        </Field>
      </div>

      <SectionTitle>WhatsApp (CallMeBot)</SectionTitle>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
          <input type="checkbox" checked={cfg.whatsapp?.enabled ?? false} onChange={e => set('whatsapp.enabled', e.target.checked)} />
          Activar alertas por WhatsApp
        </label>
      </div>
      <div className="sa-g2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, opacity: cfg.whatsapp?.enabled ? 1 : 0.45 }}>
        <Field label="API Key de CallMeBot">
          <input style={S.inp} value={cfg.whatsapp?.apikey ?? ''} onChange={e => set('whatsapp.apikey', e.target.value)} disabled={!cfg.whatsapp?.enabled} placeholder="xxxxxxxx" />
        </Field>
        <Field label="Número de teléfono">
          <input style={S.inp} value={cfg.whatsapp?.phone ?? ''} onChange={e => set('whatsapp.phone', e.target.value)} disabled={!cfg.whatsapp?.enabled} placeholder="+34600000000" />
        </Field>
      </div>

      <SectionTitle>Email (informes mensuales)</SectionTitle>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
          <input type="checkbox" checked={cfg.email?.enabled ?? false} onChange={e => set('email.enabled', e.target.checked)} />
          Activar informes por email
        </label>
      </div>
      <div style={{ opacity: cfg.email?.enabled ? 1 : 0.45, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="sa-g2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Host SMTP"><input style={S.inp} value={cfg.email?.smtp?.host ?? ''} onChange={e => set('email.smtp.host', e.target.value)} disabled={!cfg.email?.enabled} placeholder="smtp.example.com" /></Field>
          <Field label="Puerto SMTP"><input style={S.inp} type="number" value={cfg.email?.smtp?.port ?? 587} onChange={e => set('email.smtp.port', parseInt(e.target.value))} disabled={!cfg.email?.enabled} /></Field>
        </div>
        <div className="sa-g2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Usuario SMTP"><input style={S.inp} value={cfg.email?.smtp?.user ?? ''} onChange={e => set('email.smtp.user', e.target.value)} disabled={!cfg.email?.enabled} /></Field>
          <Field label="Contraseña SMTP"><input style={S.inp} type="password" value={cfg.email?.smtp?.pass ?? ''} onChange={e => set('email.smtp.pass', e.target.value)} disabled={!cfg.email?.enabled} /></Field>
        </div>
        <div className="sa-g2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Nombre del remitente"><input style={S.inp} value={cfg.email?.senderName ?? ''} onChange={e => set('email.senderName', e.target.value)} disabled={!cfg.email?.enabled} placeholder="StockIn" /></Field>
          <Field label="Destinatarios (separados por coma)"><input style={S.inp} value={cfg.email?.recipients ?? ''} onChange={e => set('email.recipients', e.target.value)} disabled={!cfg.email?.enabled} placeholder="jefe@local.com, otro@local.com" /></Field>
        </div>
      </div>

      <div style={{ marginTop: 28 }}>
        <Btn onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar configuración'}
        </Btn>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CHANGELOG MODULE
// ═══════════════════════════════════════════════════════════════════════════════
const INITIAL_CHANGELOG = [
  { id: 1, status: 'done',   title: 'Panel superadmin completo', desc: 'Gestión de distribuidores, locales y usuarios con roles y permisos.' },
  { id: 2, status: 'done',   title: 'Login con demo rápido', desc: 'Acceso directo a usuarios de demo sin introducir contraseña.' },
  { id: 3, status: 'done',   title: 'Informe mensual PDF', desc: 'Genera y descarga el informe de inventario en PDF.' },
  { id: 4, status: 'done',   title: 'Datos mock Tpvrent Bistró', desc: 'Entorno de demo con productos, alertas, albaranes y traspasos reales.' },
  { id: 5, status: 'wip',    title: 'Diseño responsive completo', desc: 'Adaptación a móvil, tablet y escritorio en todos los módulos.' },
  { id: 6, status: 'wip',    title: 'Dashboard por perfil', desc: 'Widgets específicos para cada rol: admin, encargado, camarero.' },
  { id: 7, status: 'soon',   title: 'Notificaciones push web', desc: 'Alertas de stock crítico en el navegador sin necesidad de abrir la app.' },
  { id: 8, status: 'soon',   title: 'Integración Ágora multilocal', desc: 'Soporte para cadenas con múltiples locales en un mismo panel.' },
  { id: 9, status: 'soon',   title: 'Exportación avanzada', desc: 'Exportar inventario, albaranes y pedidos a Excel y CSV.' },
]

const STATUS_LABELS = { done: 'Funcionando', wip: 'En proceso', soon: 'Próximamente' }
const STATUS_COLORS = { done: '#0a9e76', wip: '#d97706', soon: '#6b8f95' }

function ChangelogModule({ toast }) {
  const [items,    setItems]    = useState(INITIAL_CHANGELOG)
  const [editing,  setEditing]  = useState(null)   // { id } or null
  const [sending,  setSending]  = useState(false)
  const [newItem,  setNewItem]  = useState(null)

  const update = (id, changes) => setItems(prev => prev.map(it => it.id === id ? { ...it, ...changes } : it))

  const handleSend = async () => {
    setSending(true)
    await new Promise(r => setTimeout(r, 900))
    setSending(false)
    toast('Changelog enviado a usuarios suscritos ✓')
  }

  const addItem = () => {
    const id = Date.now()
    setNewItem({ id, status: 'soon', title: '', desc: '' })
  }

  const confirmAdd = () => {
    if (!newItem?.title.trim()) { toast('El título es obligatorio', 'err'); return }
    setItems(prev => [...prev, newItem])
    setNewItem(null)
    toast('Entrada añadida ✓')
  }

  const remove = (id) => setItems(prev => prev.filter(it => it.id !== id))

  return (
    <div style={{ maxWidth: 760 }}>
      <PageHeader
        title="Changelog"
        subtitle="Estado de funcionalidades · editable · envía a usuarios suscritos"
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="secondary" onClick={addItem}><Ic n="plus" s={13} />Añadir entrada</Btn>
            <Btn onClick={handleSend} disabled={sending}>
              <Ic n="mail" s={13} />{sending ? 'Enviando…' : 'Enviar a suscritos'}
            </Btn>
          </div>
        }
      />

      {/* New item form */}
      {newItem && (
        <div style={{ ...S.card, marginBottom: 14, border: `1.5px solid ${T.accent}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.accent, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nueva entrada</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="sa-g2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Título *">
                <input style={S.inp} value={newItem.title} onChange={e => setNewItem(p => ({ ...p, title: e.target.value }))} placeholder="Nombre de la funcionalidad" />
              </Field>
              <Field label="Estado">
                <select style={S.inp} value={newItem.status} onChange={e => setNewItem(p => ({ ...p, status: e.target.value }))}>
                  <option value="done">Funcionando</option>
                  <option value="wip">En proceso</option>
                  <option value="soon">Próximamente</option>
                </select>
              </Field>
            </div>
            <Field label="Descripción">
              <textarea style={{ ...S.inp, minHeight: 60, resize: 'vertical' }} value={newItem.desc} onChange={e => setNewItem(p => ({ ...p, desc: e.target.value }))} placeholder="Breve descripción para los usuarios…" />
            </Field>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Btn variant="secondary" onClick={() => setNewItem(null)}>Cancelar</Btn>
              <Btn onClick={confirmAdd}>Añadir</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Grouped by status */}
      {['done', 'wip', 'soon'].map(status => {
        const group = items.filter(it => it.status === status)
        if (!group.length) return null
        return (
          <div key={status} style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ background: `${STATUS_COLORS[status]}20`, color: STATUS_COLORS[status], borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>{STATUS_LABELS[status]}</span>
              <span style={{ fontSize: 11, color: T.muted }}>{group.length} entrada{group.length !== 1 ? 's' : ''}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {group.map(it => (
                <div key={it.id} style={{ ...S.card, padding: '14px 16px', borderLeft: `3px solid ${STATUS_COLORS[it.status]}` }}>
                  {editing === it.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
                        <input style={S.inp} value={it.title} onChange={e => update(it.id, { title: e.target.value })} />
                        <select style={{ ...S.inp, width: 'auto' }} value={it.status} onChange={e => update(it.id, { status: e.target.value })}>
                          <option value="done">Funcionando</option>
                          <option value="wip">En proceso</option>
                          <option value="soon">Próximamente</option>
                        </select>
                      </div>
                      <textarea style={{ ...S.inp, minHeight: 54, resize: 'vertical' }} value={it.desc} onChange={e => update(it.id, { desc: e.target.value })} />
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <Btn variant="danger" small onClick={() => remove(it.id)}><Ic n="trash" s={12} />Eliminar</Btn>
                        <Btn small onClick={() => setEditing(null)}>Hecho</Btn>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{it.title}</div>
                        {it.desc && <div style={{ fontSize: 12, color: T.muted, marginTop: 3, lineHeight: 1.5 }}>{it.desc}</div>}
                      </div>
                      <button onClick={() => setEditing(it.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, padding: 4, borderRadius: 6, display: 'flex', flexShrink: 0 }}>
                        <Ic n="edit" s={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SUPERADMIN PANEL — ROOT COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const NAV = [
  { id: 'distribuidores', label: 'Distribuidores', icon: 'distributor' },
  { id: 'locales',        label: 'Locales',        icon: 'location' },
  { id: 'usuarios',       label: 'Usuarios',       icon: 'users' },
  { id: 'informes',       label: 'Informes',       icon: 'chart' },
  { id: 'changelog',      label: 'Changelog',      icon: 'refresh' },
  { id: 'config',         label: 'Configuración',  icon: 'settings' },
]

export default function SuperadminPanel({ user, onLogout }) {
  const [view,  setView]  = useState('distribuidores')
  const [notif, setNotif] = useState(null)
  const [sideOpen, setSideOpen] = useState(false)
  const [sideCollapsed, setSideCollapsed] = useState(() => {
    const saved = localStorage.getItem('stockin_sidebar_collapsed')
    if (saved !== null) return saved === 'true'
    return typeof window !== 'undefined' && window.innerWidth <= 1024
  })
  const toggleSidebar = () => setSideCollapsed(c => { const n = !c; localStorage.setItem('stockin_sidebar_collapsed', String(n)); return n })
  const SW = sideCollapsed ? 64 : 220

  const toast = (msg, type = 'ok') => { setNotif({ msg, type }); setTimeout(() => setNotif(null), 5000) }

  const navigate = (id) => { setView(id); setSideOpen(false) }

  return (
    <div style={{ fontFamily: "'IBM Plex Sans',sans-serif", background: T.bg, minHeight: '100vh', color: T.text }}>

      {/* ── Fixed Header ── */}
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 56, background: T.brand, display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', zIndex: 200, boxShadow: '0 2px 8px rgba(3,70,80,0.18)' }}>
        <button className="sa-hamburger" onClick={() => setSideOpen(s => !s)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', padding: '7px', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <Menu size={18} />
        </button>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Ic n="settings" s={16} />
        </div>
        <span style={{ fontSize: 14, fontWeight: 800, color: '#fff', whiteSpace: 'nowrap' }}>
          <span style={{ color: '#5dd8e8' }}>rekor</span><span style={{ color: 'rgba(255,255,255,0.45)' }}>.es</span> StockIn
        </span>
        <div className="sa-header-location" style={{ flex: 1, textAlign: 'center', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>SuperAdmin</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: T.purple, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {user?.fullName?.[0]?.toUpperCase() || 'S'}
          </div>
          <span className="sa-header-uname" style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{user?.fullName || 'Superadmin'}</span>
          <button onClick={onLogout} title="Cerrar sesión" style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, color: 'rgba(255,255,255,0.65)', cursor: 'pointer', padding: '6px', display: 'flex' }}>
            <Ic n="logout" s={14} />
          </button>
        </div>
      </header>

      {/* ── Fixed Sidebar ── */}
      <aside className="sa-sidebar" style={{ position: 'fixed', top: 56, left: 0, bottom: 0, width: SW, background: '#fff', borderRight: '1px solid #dde7e9', display: 'flex', flexDirection: 'column', zIndex: 150, transition: 'width 0.2s ease', overflow: 'hidden' }}>
        <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
          {NAV.map(item => (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className="sa-nav-btn"
              data-active={view === item.id ? 'true' : 'false'}
              title={sideCollapsed ? item.label : ''}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: sideCollapsed ? 0 : 9, padding: sideCollapsed ? '9px 0' : '9px 12px', justifyContent: sideCollapsed ? 'center' : 'flex-start', borderRadius: 9, border: 'none', cursor: 'pointer', marginBottom: 2, fontFamily: 'inherit', background: view === item.id ? '#0592A7' : 'transparent', color: view === item.id ? '#fff' : '#034650', fontSize: 13, fontWeight: view === item.id ? 600 : 400, textAlign: 'left', transition: 'background 0.12s, color 0.12s' }}
            >
              <Ic n={item.icon} s={sideCollapsed ? 18 : 15} />
              {!sideCollapsed && <span style={{ flex: 1 }}>{item.label}</span>}
            </button>
          ))}
        </nav>
        <button onClick={toggleSidebar} style={{ width: '100%', padding: '10px', borderTop: '1px solid #dde7e9', background: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: sideCollapsed ? 'center' : 'flex-start', gap: 6, fontSize: 12, fontWeight: 600, color: '#6b8f95', fontFamily: 'inherit' }}>
          {sideCollapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /><span>Contraer</span></>}
        </button>
      </aside>

      {/* ── Mobile drawer overlay ── */}
      {sideOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex' }} onClick={() => setSideOpen(false)}>
          <div style={{ width: 260, background: '#fff', display: 'flex', flexDirection: 'column', height: '100%', borderRight: '1px solid #dde7e9', animation: 'slideRight 0.22s ease' }} onClick={e => e.stopPropagation()}>
            <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto', marginTop: 8 }}>
              {NAV.map(item => (
                <button
                  key={item.id}
                  data-active={view === item.id ? 'true' : 'false'}
                  onClick={() => navigate(item.id)}
                  className="sa-nav-btn"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', borderRadius: 9, border: 'none', cursor: 'pointer', marginBottom: 2, fontFamily: 'inherit', background: view === item.id ? '#0592A7' : 'transparent', color: view === item.id ? '#fff' : '#034650', fontSize: 13, fontWeight: 600, textAlign: 'left' }}
                >
                  <Ic n={item.icon} s={15} /><span style={{ flex: 1 }}>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
          <div style={{ flex: 1, background: 'rgba(3,70,80,0.5)' }} />
        </div>
      )}

      {/* ── Main content area ── */}
      <div className="sa-main" style={{ paddingTop: 56, marginLeft: SW, transition: 'margin-left 0.2s ease', minHeight: '100vh' }}>
        <div className="sa-content" style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>
          {view === 'distribuidores' && <DistribuidoresModule toast={toast} />}
          {view === 'locales'        && <LocalesModule        toast={toast} />}
          {view === 'usuarios'       && <UsuariosModule       toast={toast} />}
          {view === 'informes'       && <InformesModule       toast={toast} />}
          {view === 'changelog'      && <ChangelogModule      toast={toast} />}
          {view === 'config'         && <ConfiguracionModule  toast={toast} />}
        </div>
      </div>

      {/* Toast notification */}
      {notif && (
        <div className="sa-toast" style={{ position: 'fixed', top: 16, right: 16, zIndex: 400, maxWidth: 380, background: notif.type === 'ok' ? '#f0fdf8' : notif.type === 'warn' ? '#fffbeb' : '#fff5f5', border: `1px solid ${notif.type === 'ok' ? T.green : notif.type === 'warn' ? T.yellow : T.red}`, borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, color: notif.type === 'ok' ? T.green : notif.type === 'warn' ? T.yellow : T.red, fontSize: 13, fontWeight: 500, boxShadow: '0 6px 24px rgba(3,70,80,0.15)', animation: 'slideIn 0.2s ease' }}>
          <Ic n={notif.type === 'ok' ? 'check' : 'warn'} s={15} />{notif.msg}
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:#f0f5f6}::-webkit-scrollbar-thumb{background:#c5d8db;border-radius:3px}::-webkit-scrollbar-thumb:hover{background:${T.accent}}
        button:focus-visible{outline:2px solid ${T.accent};outline-offset:2px}
        input:focus,select:focus,textarea:focus{border-color:${T.accent} !important;box-shadow:0 0 0 3px rgba(5,146,167,0.13) !important;outline:none}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes slideIn{from{opacity:0;transform:translateX(14px)}to{opacity:1;transform:none}}
        @keyframes slideRight{from{transform:translateX(-100%)}to{transform:none}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        /* Buttons */
        .sa-btn{transition:filter 0.12s,box-shadow 0.12s,transform 0.1s !important}
        .sa-btn:hover:not(:disabled){filter:brightness(0.92)}
        .sa-btn:active:not(:disabled){transform:scale(0.97) !important}
        .sa-btn-primary:hover:not(:disabled){box-shadow:0 4px 14px rgba(5,146,167,0.38) !important}
        .sa-btn-brand:hover:not(:disabled){box-shadow:0 4px 14px rgba(3,70,80,0.35) !important}
        .sa-btn-danger:hover:not(:disabled){background:rgba(220,53,69,0.14) !important}
        .sa-btn-success:hover:not(:disabled){background:rgba(10,158,118,0.16) !important}
        /* Cards hover */
        .sa-card{transition:box-shadow 0.15s,transform 0.15s}
        .sa-card:hover{box-shadow:0 6px 20px rgba(3,70,80,0.1) !important;transform:translateY(-2px)}
        /* Table hover */
        .sa-table tbody tr{transition:background 0.07s}
        .sa-table tbody tr:hover>td{background:#f4f9fa !important}
        /* Sidebar nav */
        .sa-hamburger{display:none}
        .sa-nav-btn{transition:background 0.12s,color 0.12s !important}
        .sa-nav-btn:hover:not(:disabled){background:rgba(5,146,167,0.08) !important;color:#034650 !important}
        .sa-nav-btn[data-active="true"]:hover{background:#046f80 !important;color:#fff !important}
        /* Modal */
        .sa-modal-inner{animation:fadeUp 0.18s ease}
        /* Responsive breakpoints */
        @media(max-width:767px){
          .sa-hamburger{display:flex !important}
          .sa-sidebar{display:none !important}
          .sa-main{margin-left:0 !important;transition:none !important}
          .sa-header-uname{display:none !important}
          .sa-header-location{display:none !important}
          .sa-content{padding:14px 14px 24px !important}
          .sa-g2{grid-template-columns:1fr !important}
          .sa-dist-grid{grid-template-columns:1fr !important}
          .sa-token-row{flex-direction:column !important;align-items:stretch !important}
          .sa-token-row>*{width:100% !important}
          .sa-toast{top:auto !important;bottom:16px !important;right:12px !important;left:12px !important;max-width:none !important;border-radius:12px !important}
          .sa-modal-inner{padding:18px !important;max-height:95vh !important}
          .sa-card:hover{transform:none !important;box-shadow:none !important}
          input,select,textarea{font-size:16px !important}
          .sa-btn{min-height:40px !important}
          .sa-hide-xs{display:none !important}
          button{min-height:44px}
        }
        @media(max-width:479px){
          .sa-content{padding:12px !important}
          .sa-sync-grid{grid-template-columns:1fr 1fr !important}
          .sa-table-wrap{border-radius:10px !important}
        }
        @media(max-width:359px){
          .sa-sync-grid{grid-template-columns:1fr !important}
        }
        @media(min-width:768px){.sa-hamburger{display:none !important}}
      `}</style>
    </div>
  )
}
