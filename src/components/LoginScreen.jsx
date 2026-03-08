import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { DEMO_USER_LIST, DEMO_CREDENTIALS } from '../mockData.js'

const T = {
  brand:  '#034650',
  accent: '#0592A7',
  text:   '#0c2b30',
  muted:  '#6b8f95',
  border: '#dde7e9',
  red:    '#dc3545',
  bg:     '#f0f5f6',
}

const ROLE_COLORS = {
  Admin:      T.accent,
  Encargado:  T.brand,
  Camarero:   '#0a9e76',
  SuperAdmin: '#7c3aed',
}

export default function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [loadingDemo, setLoadingDemo] = useState(null)
  const [error, setError]       = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setError('Introduce usuario y contraseña')
      return
    }
    setLoading(true)
    setError('')
    try {
      await onLogin(username.trim(), password)
    } catch (err) {
      setError(err.message || 'Credenciales incorrectas')
    } finally {
      setLoading(false)
    }
  }

  // Quick-login: use demo credentials without showing password
  const handleQuickLogin = async (user) => {
    const pw = DEMO_CREDENTIALS[user.username]
    if (!pw) return
    setLoadingDemo(user.username)
    setError('')
    try {
      await onLogin(user.username, pw)
    } catch (err) {
      setError(err.message || 'Error al entrar')
    } finally {
      setLoadingDemo(null)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: T.bg,
      fontFamily: "'IBM Plex Sans', sans-serif", padding: 16,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:focus { outline: none; border-color: ${T.accent} !important; box-shadow: 0 0 0 3px rgba(5,146,167,0.15) !important; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:none; } }
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)} }
        @keyframes spin { to { transform: rotate(360deg); } }
        .demo-btn:hover { opacity: 0.85; transform: translateY(-1px); }
        .demo-btn { transition: opacity 0.15s, transform 0.15s; }
      `}</style>

      <div style={{ width: '100%', maxWidth: 440, animation: 'fadeUp 0.35s ease' }}>
        {/* Main login card */}
        <div style={{
          background: '#fff', borderRadius: 16, padding: '36px 32px',
          boxShadow: '0 8px 40px rgba(3,70,80,0.13)',
          border: `1px solid ${T.border}`, marginBottom: 16,
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, background: T.brand,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
            }}>
              <svg width={26} height={26} viewBox="0 0 24 24" fill={T.accent}>
                <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4z"/>
              </svg>
            </div>
            <div style={{ fontSize: 21, fontWeight: 800, color: T.brand, letterSpacing: '-0.3px' }}>
              <span style={{ color: T.accent }}>rekor</span>.es StockIn
            </div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>
              Gestión de inventario para Ágora TPV
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            <div>
              <label style={{ fontSize: 11, color: T.muted, display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Usuario o email
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="usuario o email"
                autoComplete="username"
                autoFocus
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 9,
                  border: `1.5px solid ${error ? T.red : T.border}`,
                  fontSize: 16, color: T.text, fontFamily: 'inherit', outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, color: T.muted, display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{
                    width: '100%', padding: '11px 42px 11px 14px', borderRadius: 9,
                    border: `1.5px solid ${error ? T.red : T.border}`,
                    fontSize: 16, color: T.text, fontFamily: 'inherit', outline: 'none',
                  }}
                />
                <button type="button" onClick={() => setShowPw(s => !s)} style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: T.muted, display: 'flex', alignItems: 'center',
                }}>{showPw ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
              </div>
            </div>

            {error && (
              <div style={{
                background: 'rgba(220,53,69,0.07)', border: '1px solid rgba(220,53,69,0.25)',
                borderRadius: 8, padding: '9px 13px', fontSize: 13, color: T.red,
                display: 'flex', alignItems: 'center', gap: 8, animation: 'shake 0.4s ease',
              }}>
                <svg width={14} height={14} viewBox="0 0 24 24" fill={T.red}><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 2, width: '100%', padding: '12px',
                background: loading ? 'rgba(5,146,167,0.6)' : T.accent,
                color: '#fff', border: 'none', borderRadius: 10,
                fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 46,
              }}
            >
              {loading ? (
                <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Verificando…</>
              ) : 'Entrar'}
            </button>
          </form>
        </div>

        {/* Demo users card */}
        <div style={{
          background: '#fff', borderRadius: 14, padding: '20px 24px',
          boxShadow: '0 4px 20px rgba(3,70,80,0.08)', border: `1px solid ${T.border}`,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
            Acceso de demo — Tpvrent Bistró
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {DEMO_USER_LIST.map(user => (
              <div key={user.username} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 10, background: T.bg,
                border: `1px solid ${T.border}`,
              }}>
                {/* Avatar */}
                <div style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: ROLE_COLORS[user.roleLabel] || T.brand,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 14, fontWeight: 700, flexShrink: 0,
                }}>
                  {user.fullName[0]}
                </div>
                {/* Name */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{user.fullName}</div>
                  <div style={{ fontSize: 11, color: ROLE_COLORS[user.roleLabel] || T.muted, fontWeight: 600 }}>{user.roleLabel}</div>
                </div>
                {/* Quick login button */}
                <button
                  className="demo-btn"
                  onClick={() => handleQuickLogin(user)}
                  disabled={loadingDemo !== null}
                  style={{
                    padding: '7px 14px', borderRadius: 8, border: 'none',
                    background: ROLE_COLORS[user.roleLabel] || T.brand,
                    color: '#fff', fontSize: 12, fontWeight: 700,
                    fontFamily: 'inherit', cursor: loadingDemo !== null ? 'not-allowed' : 'pointer',
                    opacity: loadingDemo !== null && loadingDemo !== user.username ? 0.5 : 1,
                    display: 'flex', alignItems: 'center', gap: 5, minHeight: 34, whiteSpace: 'nowrap',
                  }}
                >
                  {loadingDemo === user.username
                    ? <><div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Entrando…</>
                    : 'Usar este usuario'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
