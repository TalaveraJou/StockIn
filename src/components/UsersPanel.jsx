import { useState, useEffect } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { usersAPI } from '../auth.js'

const T = {
  brand:'#034650', accent:'#0592A7', text:'#0c2b30', muted:'#6b8f95',
  border:'#dde7e9', green:'#0a9e76', red:'#dc3545', yellow:'#d97706',
}
const S = {
  inp:   { background:'#fff', border:`1px solid ${T.border}`, borderRadius:8, padding:'9px 12px', color:T.text, fontSize:14, outline:'none', width:'100%', fontFamily:'inherit' },
  label: { fontSize:11, color:T.muted, display:'block', marginBottom:5, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em' },
  card:  { background:'#fff', border:`1px solid ${T.border}`, borderRadius:12, padding:20, boxShadow:'0 1px 3px rgba(3,70,80,0.07)' },
  thSt:  { padding:'9px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:T.muted, textTransform:'uppercase', letterSpacing:'0.06em', borderBottom:`1px solid ${T.border}`, whiteSpace:'nowrap' },
}

const ROLE_LABELS  = { admin:'Admin', encargado:'Encargado', camarero:'Camarero', manager:'Encargado', employee:'Camarero', readonly:'Solo lectura' }
const ROLE_COLORS  = { admin:T.accent, encargado:T.brand, camarero:T.green, manager:T.brand, employee:T.green, readonly:T.muted }

function Badge({ color, label }) {
  return <span style={{ background:`${color}18`, color, borderRadius:5, padding:'3px 9px', fontSize:11, fontWeight:600 }}>{label}</span>
}
function Btn({ onClick, disabled, children, variant='primary', small }) {
  const styles = {
    primary:   { background:T.accent, color:'#fff', border:'none' },
    secondary: { background:'#f0f4f5', color:T.text, border:`1px solid ${T.border}` },
    ghost:     { background:'transparent', color:T.muted, border:`1px solid ${T.border}` },
    danger:    { background:'rgba(220,53,69,0.08)', color:T.red, border:'1px solid rgba(220,53,69,0.2)' },
    success:   { background:'rgba(10,158,118,0.1)', color:T.green, border:'1px solid rgba(10,158,118,0.25)' },
  }
  return (
    <button onClick={!disabled ? onClick : undefined} disabled={disabled} style={{
      display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6,
      padding: small ? '6px 12px' : '9px 18px', borderRadius:8,
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontSize: small ? 12 : 13, fontWeight:600, fontFamily:'inherit',
      opacity: disabled ? 0.45 : 1, ...styles[variant],
    }}>{children}</button>
  )
}
function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(3,70,80,0.4)', backdropFilter:'blur(3px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'#fff', borderRadius:14, width:'100%', maxWidth:500, maxHeight:'92vh', overflow:'auto', padding:24, boxShadow:'0 20px 60px rgba(3,70,80,0.18)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <h2 style={{ fontSize:16, fontWeight:700, color:T.brand }}>{title}</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', color:T.muted, cursor:'pointer', fontSize:20, lineHeight:1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function UserForm({ initial, onSave, onCancel }) {
  const [f, setF]       = useState(initial || { username:'', fullName:'', password:'', role:'employee' })
  const [showPw, setShowPw] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr]   = useState('')
  const isEdit = !!initial?.id

  const submit = async () => {
    if (!f.fullName.trim()) return setErr('El nombre completo es obligatorio')
    if (!isEdit && (!f.username.trim() || !f.password.trim()))
      return setErr('Email y contraseña son obligatorios')
    setSaving(true); setErr('')
    try { await onSave(f) } catch(e) { setErr(e.message); setSaving(false) }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {!isEdit && (
        <div>
          <label style={S.label}>Email *</label>
          <input
            type="email"
            value={f.username}
            onChange={e => setF(p => ({ ...p, username: e.target.value }))}
            style={S.inp}
            placeholder="usuario@empresa.com"
            autoComplete="off"
          />
        </div>
      )}
      {isEdit && (
        <div style={{ padding:'10px 12px', background:'#f5f9fa', borderRadius:8, fontSize:12, color:T.muted }}>
          Email: <strong style={{ color:T.text }}>{initial.username}</strong>
        </div>
      )}
      <div>
        <label style={S.label}>Nombre completo *</label>
        <input
          value={f.fullName}
          onChange={e => setF(p => ({ ...p, fullName: e.target.value }))}
          style={S.inp}
          placeholder="Ej: María García"
        />
      </div>
      <div>
        <label style={S.label}>{isEdit ? 'Nueva contraseña (vacío = no cambiar)' : 'Contraseña *'}</label>
        <div style={{ position:'relative' }}>
          <input
            type={showPw ? 'text' : 'password'}
            value={f.password}
            onChange={e => setF(p => ({ ...p, password: e.target.value }))}
            style={{ ...S.inp, paddingRight:56 }}
            placeholder="••••••••"
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPw(s => !s)}
            style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:T.muted, display:'flex', alignItems:'center' }}
          >{showPw ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
        </div>
      </div>
      <div>
        <label style={S.label}>Rol *</label>
        <select value={f.role} onChange={e => setF(p => ({ ...p, role: e.target.value }))} style={S.inp}>
          <option value="admin">Admin — panel completo + Mi equipo</option>
          <option value="encargado">Encargado — mismo que admin sin Mi equipo</option>
          <option value="camarero">Camarero — solo albaranes</option>
        </select>
      </div>
      {err && (
        <div style={{ color:T.red, fontSize:12, padding:'8px 10px', background:'rgba(220,53,69,0.07)', borderRadius:7 }}>{err}</div>
      )}
      <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:4 }}>
        <Btn variant="ghost" onClick={onCancel}>Cancelar</Btn>
        <Btn variant="primary" onClick={submit} disabled={saving}>
          {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear usuario'}
        </Btn>
      </div>
    </div>
  )
}

export default function UsersPanel({ currentUser, toast }) {
  const [users,   setUsers]   = useState([])
  const [log,     setLog]     = useState([])
  const [tab,     setTab]     = useState('users')
  const [modal,   setModal]   = useState(null)   // null | 'new' | user-object
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [u, l] = await Promise.all([usersAPI.list(), usersAPI.activityLog()])
      // Superadmin nunca aparece en la lista gestionable
      setUsers(u.filter(x => x.id !== 'superadmin' && x.role !== 'superadmin'))
      setLog(l)
    } catch { toast('Error al cargar usuarios', 'err') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleSave = async (data) => {
    if (modal?.id) {
      await usersAPI.update(modal.id, data)
      toast('Usuario actualizado ✓')
    } else {
      await usersAPI.create(data)
      toast('Usuario creado ✓')
    }
    setModal(null); load()
  }

  const toggleActive = async (user) => {
    await usersAPI.update(user.id, { active: !user.active })
    toast(user.active ? 'Usuario desactivado' : 'Usuario activado')
    load()
  }

  const handleDelete = async (user) => {
    if (!confirm(`¿Eliminar el usuario "${user.fullName}"? Esta acción no se puede deshacer.`)) return
    await usersAPI.remove(user.id)
    toast('Usuario eliminado')
    load()
  }

  const ACTION_LABELS = {
    LOGIN:'Inicio de sesión', LOGOUT:'Cierre de sesión',
    CREATE_USER:'Creó usuario', UPDATE_USER:'Modificó usuario', DELETE_USER:'Eliminó usuario',
  }

  const fmtDate = (d) => {
    if (!d) return 'Nunca'
    try { return new Date(d).toLocaleString('es-ES', { day:'2-digit', month:'2-digit', year:'numeric' }) } catch { return d }
  }
  const fmtDatetime = (d) => {
    if (!d) return '—'
    try { return new Date(d).toLocaleString('es-ES', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }) } catch { return d }
  }

  return (
    <div style={{ animation:'fadeUp 0.3s ease' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:T.brand, margin:0 }}>Gestión de Usuarios</h1>
          <p style={{ fontSize:12, color:T.muted, marginTop:4 }}>{users.length} usuario{users.length !== 1 ? 's' : ''} en el sistema</p>
        </div>
        {tab === 'users' && (
          <Btn variant="primary" onClick={() => setModal('new')}>+ Nuevo usuario</Btn>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, background:'#f0f5f6', borderRadius:10, padding:4, marginBottom:18, width:'fit-content' }}>
        {[['users','Usuarios'],['log','Actividad']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding:'7px 16px', borderRadius:7, border:'none', cursor:'pointer',
            background: tab===id ? '#fff' : 'transparent',
            color: tab===id ? T.brand : T.muted,
            fontSize:13, fontWeight: tab===id ? 700 : 400, fontFamily:'inherit',
            boxShadow: tab===id ? '0 1px 3px rgba(3,70,80,0.1)' : 'none',
          }}>{label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:40, color:T.muted }}>Cargando…</div>
      ) : tab === 'users' ? (
        <div style={{ ...S.card, padding:0, overflow:'auto' }}>
          {users.length === 0 ? (
            <div style={{ padding:40, textAlign:'center', color:T.muted, fontSize:13 }}>
              Sin usuarios. Crea el primero con el botón de arriba.
            </div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:600 }}>
              <thead>
                <tr>
                  <th style={S.thSt}>Nombre</th>
                  <th style={S.thSt}>Email / Usuario</th>
                  <th style={S.thSt}>Rol</th>
                  <th style={S.thSt}>Creado</th>
                  <th style={S.thSt}>Último acceso</th>
                  <th style={S.thSt}></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id} style={{
                    background: !u.active ? 'rgba(0,0,0,0.02)' : i % 2 ? '#f8fbfb' : '#fff',
                    opacity: !u.active ? 0.65 : 1,
                    borderBottom:`1px solid ${T.border}`,
                  }}>
                    <td style={{ padding:'10px 14px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:34, height:34, borderRadius:9, background: u.active ? ROLE_COLORS[u.role]||T.muted : T.muted, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:14, fontWeight:700, color:'#fff' }}>
                          {u.fullName?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{u.fullName}</div>
                          {!u.active && <span style={{ fontSize:10, color:T.muted, fontWeight:600 }}>INACTIVO</span>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:'10px 14px', fontSize:12, color:T.muted, fontFamily:'monospace' }}>{u.username}</td>
                    <td style={{ padding:'10px 14px' }}><Badge color={ROLE_COLORS[u.role]||T.muted} label={ROLE_LABELS[u.role]||u.role}/></td>
                    <td style={{ padding:'10px 14px', fontSize:12, color:T.muted, whiteSpace:'nowrap' }}>{fmtDate(u.createdAt)}</td>
                    <td style={{ padding:'10px 14px', fontSize:12, color:T.muted, whiteSpace:'nowrap' }}>{fmtDatetime(u.lastLogin)}</td>
                    <td style={{ padding:'10px 14px' }}>
                      <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                        <Btn small variant="secondary" onClick={() => setModal(u)}>Editar</Btn>
                        <Btn small variant={u.active ? 'ghost' : 'success'} onClick={() => toggleActive(u)}>
                          {u.active ? 'Desactivar' : 'Activar'}
                        </Btn>
                        <Btn small variant="danger" onClick={() => handleDelete(u)}>Eliminar</Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div style={{ ...S.card, padding:0, overflow:'hidden' }}>
          {log.length === 0 ? (
            <div style={{ padding:32, textAlign:'center', color:T.muted, fontSize:13 }}>Sin actividad registrada</div>
          ) : log.slice(0, 100).map((entry, i) => (
            <div key={entry.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 18px', borderBottom: i < log.length-1 ? `1px solid ${T.border}` : 'none' }}>
              <div style={{ width:8, height:8, borderRadius:'50%', flexShrink:0,
                background: entry.action.includes('LOGIN') ? T.green : entry.action.includes('DELETE') ? T.red : T.accent,
              }}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, color:T.text }}>
                  <strong style={{ color:T.brand }}>{entry.username}</strong> — {ACTION_LABELS[entry.action] || entry.action}
                  {entry.details?.newUser && <span style={{ color:T.muted }}> ({entry.details.newUser})</span>}
                </div>
                <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>
                  {new Date(entry.timestamp).toLocaleString('es-ES')} · IP: {entry.ip}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal
          title={modal === 'new' ? 'Nuevo usuario' : `Editar · ${modal.fullName}`}
          onClose={() => setModal(null)}
        >
          <UserForm
            initial={modal === 'new' ? null : modal}
            onSave={handleSave}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}
    </div>
  )
}
