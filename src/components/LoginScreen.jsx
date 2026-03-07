import { useState } from 'react'

const T = {
  brand:  '#034650',
  accent: '#0592A7',
  text:   '#0c2b30',
  muted:  '#6b8f95',
  border: '#dde7e9',
  red:    '#dc3545',
  bg:     '#f0f5f6',
}

export default function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
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
      `}</style>

      <div style={{
        width: '100%', maxWidth: 420,
        background: '#fff', borderRadius: 16, padding: '40px 36px',
        boxShadow: '0 8px 40px rgba(3,70,80,0.13)',
        border: `1px solid ${T.border}`,
        animation: 'fadeUp 0.35s ease',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, background: T.brand,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 14,
          }}>
            <svg width={28} height={28} viewBox="0 0 24 24" fill={T.accent}>
              <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4z"/>
            </svg>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.brand, letterSpacing: '-0.3px' }}>
            <span style={{ color: T.accent }}>rekor</span>.es StockIn
          </div>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>
            Gestión de inventario para Ágora TPV
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Username / Email */}
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
                fontSize: 15, color: T.text, fontFamily: 'inherit',
                transition: 'border 0.15s',
              }}
            />
          </div>

          {/* Password */}
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
                  fontSize: 15, color: T.text, fontFamily: 'inherit',
                  transition: 'border 0.15s',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPw(s => !s)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: T.muted, fontSize: 11, fontFamily: 'inherit', fontWeight: 600,
                }}
              >
                {showPw ? 'ocultar' : 'ver'}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(220,53,69,0.07)', border: '1px solid rgba(220,53,69,0.25)',
              borderRadius: 8, padding: '9px 13px', fontSize: 13, color: T.red,
              display: 'flex', alignItems: 'center', gap: 8,
              animation: 'shake 0.4s ease',
            }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill={T.red}><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 4, width: '100%', padding: '12px',
              background: loading ? 'rgba(5,146,167,0.6)' : T.accent,
              color: '#fff', border: 'none', borderRadius: 10,
              fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'background 0.15s',
            }}
          >
            {loading ? (
              <>
                <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Verificando…
              </>
            ) : 'Entrar'}
          </button>
        </form>

        {/* Role hints */}
        <div style={{ marginTop: 24, padding: '14px', background: T.bg, borderRadius: 10, fontSize: 11, color: T.muted, lineHeight: 1.7 }}>
          <div style={{ fontWeight: 700, color: T.brand, marginBottom: 6 }}>Usuarios de demo:</div>
          {[
            ['admin',     'admin123',     'Admin — panel completo + Mi equipo'],
            ['encargado', 'encargado123', 'Encargado — mismo que admin sin Mi equipo'],
            ['camarero',  'camarero123',  'Camarero — solo albaranes'],
            ['superadmin','super123',     'SuperAdmin — configuración y usuarios'],
          ].map(([u, p, desc]) => (
            <div key={u} style={{ display: 'flex', gap: 6, cursor: 'pointer', flexWrap: 'wrap' }}
              onClick={() => { setUsername(u); setPassword(p); setError(''); }}>
              <span style={{ fontFamily: 'monospace', color: T.brand, fontWeight: 600, minWidth: 90 }}>{u}</span>
              <span style={{ fontFamily: 'monospace', color: T.accent, minWidth: 100 }}>{p}</span>
              <span>{desc}</span>
            </div>
          ))}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
