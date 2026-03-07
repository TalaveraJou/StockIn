export default function SuspendedScreen({ onLogout }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f5f5f5',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 12,
        padding: '48px 40px',
        maxWidth: 480,
        width: '90%',
        textAlign: 'center',
        boxShadow: '0 2px 16px rgba(0,0,0,0.10)',
      }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: '#FEE2E2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          fontSize: 28,
        }}>
          🔒
        </div>
        <h2 style={{ margin: '0 0 12px', fontSize: 22, color: '#111', fontWeight: 700 }}>
          Acceso suspendido
        </h2>
        <p style={{ margin: 0, color: '#555', fontSize: 15, lineHeight: 1.6 }}>
          Tu acceso a StockIn está temporalmente suspendido. Contacta con tu administrador.
        </p>
        {onLogout && (
          <button
            onClick={onLogout}
            style={{ marginTop: 24, background: 'none', border: '1px solid #ddd', borderRadius: 8, padding: '8px 20px', color: '#888', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}
          >
            Cerrar sesión
          </button>
        )}
      </div>
    </div>
  )
}
