import { useState, useEffect } from 'react'

const T = { green:'#0a9e76', orange:'#ea6c00', brand:'#034650', accent:'#0592A7' }

export default function OfflineIndicator({ queueCount = 0, onSyncing }) {
  const [online, setOnline] = useState(navigator.onLine)
  const [showBanner, setShowBanner] = useState(false)
  const [wasSyncing, setWasSyncing] = useState(false)

  useEffect(() => {
    const goOnline  = () => { setOnline(true);  setShowBanner(true); setTimeout(() => setShowBanner(false), 5000) }
    const goOffline = () => { setOnline(false); setShowBanner(false) }
    window.addEventListener('online',  goOnline)
    window.addEventListener('offline', goOffline)
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline) }
  }, [])

  // Dot indicator (always visible in topbar)
  const Dot = () => (
    <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, fontWeight:600, color: online ? T.green : T.orange }}>
      <div style={{
        width:7, height:7, borderRadius:'50%',
        background: online ? T.green : T.orange,
        animation: !online ? 'pulse 1.5s ease-in-out infinite' : 'none',
      }} />
      {online ? 'Online' : `Sin conexión${queueCount > 0 ? ` · ${queueCount} pendiente${queueCount>1?'s':''}` : ''}`}
    </div>
  )

  // Reconnection banner
  const Banner = () => !showBanner ? null : (
    <div style={{
      position:'fixed', top:0, left:0, right:0, zIndex:500,
      background: T.green, color:'#fff', padding:'10px 20px',
      display:'flex', alignItems:'center', justifyContent:'center', gap:10,
      fontSize:13, fontWeight:600, animation:'slideDown 0.3s ease',
    }}>
      <div style={{ width:8, height:8, borderRadius:'50%', background:'#fff' }} />
      Conexión restaurada{queueCount > 0 ? ` · sincronizando ${queueCount} acción${queueCount>1?'es':''}…` : ' ✓'}
    </div>
  )

  // Offline banner (persistent when offline)
  const OfflineBanner = () => online ? null : (
    <div style={{
      background:'rgba(234,108,0,0.1)', borderBottom:`2px solid ${T.orange}`,
      padding:'8px 20px', display:'flex', alignItems:'center', justifyContent:'center', gap:10,
      fontSize:12, fontWeight:600, color:T.orange,
    }}>
      ⚠ Sin conexión — trabajando con datos en caché. Las acciones se guardarán y enviarán al reconectar.
      {queueCount > 0 && <span style={{ background:T.orange, color:'#fff', borderRadius:12, padding:'2px 8px', fontSize:11 }}>{queueCount} pendiente{queueCount>1?'s':''}</span>}
    </div>
  )

  return { Dot, Banner, OfflineBanner, online }
}
