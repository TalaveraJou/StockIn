import { useState, useEffect, useCallback } from 'react'
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
const IC = {
  distributor: 'M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z',
  location: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
  users: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
  chart: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z',
  settings: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.57 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z',
  plus: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
  edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
  trash: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
  close: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  search: 'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
  logout: 'M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z',
  block: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z',
  check: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
  warn: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z',
  back: 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z',
  mail: 'M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z',
  refresh: 'M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z',
  eye: 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z',
}
const Ic = ({ n, s = 18 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
    <path d={IC[n] || IC.settings} />
  </svg>
)

// ── Shared UI ─────────────────────────────────────────────────────────────────
function Btn({ onClick, disabled, children, variant = 'primary', small, style: sx = {} }) {
  const styles = {
    primary:   { background: T.accent,  color: '#fff',   border: 'none' },
    brand:     { background: T.brand,   color: '#fff',   border: 'none' },
    secondary: { background: '#f0f4f5', color: T.text,   border: `1px solid ${T.border}` },
    danger:    { background: 'rgba(220,53,69,0.08)', color: T.red,   border: '1px solid rgba(220,53,69,0.2)' },
    success:   { background: 'rgba(10,158,118,0.1)', color: T.green, border: '1px solid rgba(10,158,118,0.25)' },
    warn:      { background: 'rgba(217,119,6,0.1)',  color: T.yellow, border: '1px solid rgba(217,119,6,0.25)' },
  }
  return (
    <button
      onClick={!disabled ? onClick : undefined}
      disabled={disabled}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: small ? '6px 12px' : '9px 18px', borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer', fontSize: small ? 12 : 13, fontWeight: 600, fontFamily: 'inherit', opacity: disabled ? 0.45 : 1, transition: 'opacity 0.15s', ...styles[variant], ...sx }}
    >
      {children}
    </button>
  )
}

function Modal({ title, onClose, children, maxW = 560 }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(3,70,80,0.4)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${T.border}`, width: '100%', maxWidth: maxW, maxHeight: '90vh', overflow: 'auto', padding: 24, boxShadow: '0 20px 60px rgba(3,70,80,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: T.brand, margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex' }}><Ic n="close" s={17} /></button>
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
function DistributorForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState({ name: '', contactEmail: '', contactPhone: '', notes: '', ...initial })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Field label="Nombre *"><input style={S.inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Nombre del distribuidor" /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
      const [lRes, uRes] = await Promise.all([
        saAPI.getLocations(`?distributorId=${dist.id}`),
        saAPI.getSaUsers(`?distributorId=${dist.id}`),
      ])
      setLocations(Array.isArray(lRes) ? lRes : [])
      setUsers(Array.isArray(uRes) ? uRes : [])
    } catch (e) { toast(e.message, 'err') }
    setLoading(false)
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
        <div style={{ width: 48, height: 48, borderRadius: 12, background: T.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, fontWeight: 700, flexShrink: 0 }}>
          {dist.name?.[0]?.toUpperCase() || 'D'}
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
            <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th style={thSt}>Local</th><th style={thSt}>Ciudad</th><th style={thSt}>Estado</th><th style={thSt} /></tr></thead>
                <tbody>
                  {locations.map(loc => (
                    <tr key={loc.id} style={{ background: '#fff' }}>
                      <td style={tdSt}><span style={{ fontWeight: 600 }}>{loc.name}</span></td>
                      <td style={tdSt}><span style={{ color: T.muted }}>{loc.city || '—'}</span></td>
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
            <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th style={thSt}>Usuario</th><th style={thSt}>Rol</th><th style={thSt}>Local</th><th style={thSt} /></tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td style={tdSt}><div style={{ fontWeight: 600 }}>{u.fullName}</div><div style={{ fontSize: 11, color: T.muted }}>{u.username}</div></td>
                      <td style={tdSt}><Badge color={T.accent} label={u.role} /></td>
                      <td style={tdSt}><span style={{ color: T.muted }}>{u.locationName || '—'}</span></td>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
          {items.map(d => (
            <div key={d.id} style={{ ...S.card, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: d.status === 'suspended' ? '#fee2e2' : T.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', color: d.status === 'suspended' ? T.red : '#fff', fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
                  {d.name?.[0]?.toUpperCase() || 'D'}
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
function LocationForm({ initial, distributors, onSave, onCancel, saving }) {
  const [form, setForm] = useState({ name: '', city: '', distributorId: '', notes: '', ...initial })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Field label="Nombre del local *"><input style={S.inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Bar Ejemplo" /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Ciudad"><input style={S.inp} value={form.city} onChange={e => set('city', e.target.value)} placeholder="Madrid" /></Field>
        <Field label="Distribuidor *">
          <select style={S.inp} value={form.distributorId} onChange={e => set('distributorId', e.target.value)}>
            <option value="">— Seleccionar —</option>
            {distributors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
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

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [lRes, dRes] = await Promise.all([saAPI.getLocations(), saAPI.getDistributors()])
      setItems(Array.isArray(lRes) ? lRes : [])
      setDistributors(Array.isArray(dRes) ? dRes : [])
    } catch (e) { toast(e.message, 'err') }
    setLoading(false)
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
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 160 }}>
          <Ic n="search" s={14} />
          <input
            style={{ ...S.inp, paddingLeft: 32 }}
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar local o ciudad…"
          />
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.muted, pointerEvents: 'none', display: 'flex' }}><Ic n="search" s={14} /></span>
        </div>
        <select style={{ ...S.inp, width: 'auto', flex: '0 1 180px' }} value={filterDist} onChange={e => setFilterDist(e.target.value)}>
          <option value="">Todos los distribuidores</option>
          {distributors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select style={{ ...S.inp, width: 'auto', flex: '0 1 140px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="active">Activo</option>
          <option value="blocked">Bloqueado</option>
        </select>
      </div>

      {loading ? <div style={{ color: T.muted, fontSize: 13 }}>Cargando…</div> : filtered.length === 0 ? (
        <Empty msg={items.length === 0 ? 'No hay locales registrados.' : 'No hay resultados para los filtros aplicados.'} />
      ) : (
        <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thSt}>Local</th>
                <th style={thSt}>Ciudad</th>
                <th style={thSt}>Distribuidor</th>
                <th style={thSt}>Estado</th>
                <th style={thSt} />
              </tr>
            </thead>
            <tbody>
              {filtered.map(loc => {
                const dist = distributors.find(d => d.id === loc.distributorId)
                return (
                  <tr key={loc.id} style={{ background: '#fff' }}>
                    <td style={tdSt}><span style={{ fontWeight: 600 }}>{loc.name}</span></td>
                    <td style={tdSt}><span style={{ color: T.muted }}>{loc.city || '—'}</span></td>
                    <td style={tdSt}><span style={{ color: T.muted }}>{dist?.name || '—'}</span></td>
                    <td style={tdSt}><Badge color={loc.status === 'blocked' ? T.red : T.green} label={loc.status === 'blocked' ? 'Bloqueado' : 'Activo'} /></td>
                    <td style={{ ...tdSt, textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
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
  const [form, setForm] = useState({ username: '', fullName: '', password: '', role: 'encargado', locationId: '', distributorId: '', active: true, ...initial })
  const [filteredLocs, setFilteredLocs] = useState([])
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    setFilteredLocs(locations.filter(l => !form.distributorId || l.distributorId === form.distributorId))
  }, [form.distributorId, locations])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Nombre completo *"><input style={S.inp} value={form.fullName} onChange={e => set('fullName', e.target.value)} /></Field>
        <Field label="Usuario *"><input style={S.inp} value={form.username} onChange={e => set('username', e.target.value)} /></Field>
      </div>
      <Field label={initial?.id ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}>
        <input style={S.inp} type="password" value={form.password} onChange={e => set('password', e.target.value)} />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
        <select style={S.inp} value={form.locationId} onChange={e => set('locationId', e.target.value)}>
          <option value="">— Sin asignar —</option>
          {filteredLocs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </Field>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
        <Btn variant="secondary" onClick={onCancel}>Cancelar</Btn>
        <Btn onClick={() => onSave(form)} disabled={saving || !form.username.trim() || !form.fullName.trim() || (!initial?.id && !form.password)}>
          {saving ? 'Guardando…' : initial?.id ? 'Guardar cambios' : 'Crear usuario'}
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
    try {
      const [uRes, dRes, lRes] = await Promise.all([saAPI.getSaUsers(), saAPI.getDistributors(), saAPI.getLocations()])
      setItems(Array.isArray(uRes) ? uRes : [])
      setDistributors(Array.isArray(dRes) ? dRes : [])
      setLocations(Array.isArray(lRes) ? lRes : [])
    } catch (e) { toast(e.message, 'err') }
    setLoading(false)
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
        <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thSt}>Usuario</th>
                <th style={thSt}>Rol</th>
                <th style={thSt}>Distribuidor</th>
                <th style={thSt}>Local</th>
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
                    <td style={tdSt}><span style={{ color: T.muted }}>{dist?.name || '—'}</span></td>
                    <td style={tdSt}><span style={{ color: T.muted }}>{loc?.name || u.locationName || '—'}</span></td>
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
      const [mRes, eRes] = await Promise.all([saAPI.getMetrics(), saAPI.getEvents()])
      setMetrics(mRes)
      setEvents(Array.isArray(eRes) ? eRes : [])
    } catch (e) { toast(e.message, 'err') }
    setLoading(false)
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
        <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thSt}>Fecha</th>
                <th style={thSt}>Tipo</th>
                <th style={thSt}>Actor</th>
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
                  <td style={tdSt}><span style={{ color: T.muted }}>{ev.actor || '—'}</span></td>
                  <td style={{ ...tdSt, maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.detail || '—'}</td>
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, opacity: cfg.whatsapp?.enabled ? 1 : 0.45 }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Host SMTP"><input style={S.inp} value={cfg.email?.smtp?.host ?? ''} onChange={e => set('email.smtp.host', e.target.value)} disabled={!cfg.email?.enabled} placeholder="smtp.example.com" /></Field>
          <Field label="Puerto SMTP"><input style={S.inp} type="number" value={cfg.email?.smtp?.port ?? 587} onChange={e => set('email.smtp.port', parseInt(e.target.value))} disabled={!cfg.email?.enabled} /></Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Usuario SMTP"><input style={S.inp} value={cfg.email?.smtp?.user ?? ''} onChange={e => set('email.smtp.user', e.target.value)} disabled={!cfg.email?.enabled} /></Field>
          <Field label="Contraseña SMTP"><input style={S.inp} type="password" value={cfg.email?.smtp?.pass ?? ''} onChange={e => set('email.smtp.pass', e.target.value)} disabled={!cfg.email?.enabled} /></Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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
//  SUPERADMIN PANEL — ROOT COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const NAV = [
  { id: 'distribuidores', label: 'Distribuidores', icon: 'distributor' },
  { id: 'locales',        label: 'Locales',        icon: 'location' },
  { id: 'usuarios',       label: 'Usuarios',       icon: 'users' },
  { id: 'informes',       label: 'Informes',       icon: 'chart' },
  { id: 'config',         label: 'Configuración',  icon: 'settings' },
]

export default function SuperadminPanel({ user, onLogout }) {
  const [view,  setView]  = useState('distribuidores')
  const [notif, setNotif] = useState(null)

  const toast = (msg, type = 'ok') => { setNotif({ msg, type }); setTimeout(() => setNotif(null), 5000) }

  return (
    <div style={{ fontFamily: "'IBM Plex Sans',sans-serif", background: T.bg, minHeight: '100vh', color: T.text, display: 'flex' }}>
      {/* Sidebar */}
      <aside style={{ width: 230, background: T.brand, display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ padding: '16px 14px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Ic n="settings" s={17} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: '-0.2px' }}><span style={{ color: T.accent }}>rekor</span><span style={{ color: 'rgba(255,255,255,0.45)' }}>.es</span></div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>SuperAdmin</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
          {NAV.map(item => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', marginBottom: 1, fontFamily: 'inherit', background: view === item.id ? 'rgba(255,255,255,0.12)' : 'transparent', color: view === item.id ? '#fff' : 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: view === item.id ? 600 : 400, textAlign: 'left' }}
            >
              <Ic n={item.icon} s={15} />
              <span style={{ flex: 1 }}>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* User + logout */}
        <div style={{ padding: '10px 10px 14px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 6px', borderRadius: 8, background: 'rgba(255,255,255,0.07)' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: T.purple, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, fontWeight: 700, color: '#fff' }}>
              {user?.fullName?.[0]?.toUpperCase() || 'S'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.fullName || 'Superadmin'}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>Super Admin</div>
            </div>
            <button onClick={onLogout} title="Cerrar sesión" style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: 5, display: 'flex' }}>
              <Ic n="logout" s={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
        <div style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>
          {view === 'distribuidores' && <DistribuidoresModule toast={toast} />}
          {view === 'locales'        && <LocalesModule        toast={toast} />}
          {view === 'usuarios'       && <UsuariosModule       toast={toast} />}
          {view === 'informes'       && <InformesModule       toast={toast} />}
          {view === 'config'         && <ConfiguracionModule  toast={toast} />}
        </div>
      </main>

      {/* Toast notification */}
      {notif && (
        <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 400, maxWidth: 380, background: notif.type === 'ok' ? '#f0fdf8' : notif.type === 'warn' ? '#fffbeb' : '#fff5f5', border: `1px solid ${notif.type === 'ok' ? T.green : notif.type === 'warn' ? T.yellow : T.red}`, borderRadius: 10, padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 10, color: notif.type === 'ok' ? T.green : notif.type === 'warn' ? T.yellow : T.red, fontSize: 13, fontWeight: 500, boxShadow: '0 4px 20px rgba(3,70,80,0.12)', animation: 'slideIn 0.2s ease' }}>
          <Ic n={notif.type === 'ok' ? 'check' : 'warn'} s={15} />{notif.msg}
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:#f0f5f6}::-webkit-scrollbar-thumb{background:#c5d8db;border-radius:3px}
        button:focus-visible{outline:2px solid #0592A7;outline-offset:2px}
        input:focus,select:focus,textarea:focus{border-color:#0592A7 !important;box-shadow:0 0 0 3px rgba(5,146,167,0.12) !important;outline:none}
        @keyframes slideIn{from{opacity:0;transform:translateX(14px)}to{opacity:1;transform:none}}
      `}</style>
    </div>
  )
}
