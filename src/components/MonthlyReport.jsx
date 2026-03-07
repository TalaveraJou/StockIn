import { useState, useEffect } from 'react'
import { emailAPI } from '../auth.js'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const T = {
  brand:'#034650', accent:'#0592A7', text:'#0c2b30', muted:'#6b8f95',
  border:'#dde7e9', green:'#0a9e76', red:'#dc3545', yellow:'#d97706', orange:'#ea6c00',
}
const S = {
  inp: { background:'#fff', border:`1px solid ${T.border}`, borderRadius:8, padding:'9px 12px', color:T.text, fontSize:14, outline:'none', width:'100%', fontFamily:'inherit' },
  label: { fontSize:11, color:T.muted, display:'block', marginBottom:5, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em' },
  card: { background:'#fff', border:`1px solid ${T.border}`, borderRadius:12, padding:20, boxShadow:'0 1px 3px rgba(3,70,80,0.07)' },
}

function Btn({ onClick, disabled, children, variant='primary', small }) {
  const styles = {
    primary:{ background:T.accent, color:'#fff', border:'none' },
    secondary:{ background:'#f0f4f5', color:T.text, border:`1px solid ${T.border}` },
    ghost:{ background:'transparent', color:T.muted, border:`1px solid ${T.border}` },
    success:{ background:'rgba(10,158,118,0.1)', color:T.green, border:'1px solid rgba(10,158,118,0.25)' },
    danger:{ background:'rgba(220,53,69,0.08)', color:T.red, border:'1px solid rgba(220,53,69,0.2)' },
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

// ── PDF Generator ─────────────────────────────────────────────────────────────
export function generateMonthlyPDF({ stockRows, albaranes, alertas, connName, month, year }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const BRAND = [3, 70, 80]
  const ACCENT = [5, 146, 167]

  // ── Cover page ──
  doc.setFillColor(...BRAND)
  doc.rect(0, 0, pageW, 60, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(28); doc.setFont('helvetica', 'bold')
  doc.text('StockIn', 20, 30)
  doc.setFontSize(13); doc.setFont('helvetica', 'normal')
  doc.text('rekor.es · Gestión de inventario', 20, 40)
  doc.setFontSize(16); doc.setFont('helvetica', 'bold')
  doc.text(`Informe mensual — ${month} ${year}`, 20, 53)

  if (connName) {
    doc.setFontSize(11); doc.setFont('helvetica', 'normal')
    doc.text(`Establecimiento: ${connName}`, 20, 62)
  }

  doc.setTextColor(0, 0, 0)
  let y = 75

  // ── Executive summary ──
  doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND)
  doc.text('Resumen ejecutivo', 20, y); y += 8

  const valor = stockRows.reduce((a, r) => a + r.Quantity * (r.costPrice ?? 0), 0)
  const valorVenta = stockRows.reduce((a, r) => a + r.Quantity * (r.salePrice ?? 0), 0)
  const totalAlbaranes = albaranes.length
  const valorCompras = albaranes.reduce((a, al) => a + (al.Lines||[]).reduce((t,l) => t+(l.DeliveredQuantity||0)*(l.Price||0), 0), 0)
  const uniqueProds = new Set(stockRows.map(r => r.ProductId)).size
  const agotados = stockRows.filter(r => r.Quantity === 0).length

  const kpis = [
    [`Valor inventario (coste)`, `${valor.toFixed(2)} €`],
    [`Valor inventario (venta)`, `${valorVenta.toFixed(2)} €`],
    [`Productos en stock`, `${uniqueProds}`],
    [`Productos agotados`, `${agotados}`],
    [`Albaranes recibidos`, `${totalAlbaranes}`],
    [`Total compras`, `${valorCompras.toFixed(2)} €`],
  ]

  autoTable(doc, {
    startY: y, head: [['Indicador', 'Valor']],
    body: kpis,
    theme: 'grid', headStyles: { fillColor: ACCENT, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [240, 245, 246] },
    margin: { left: 20, right: 20 }, styles: { fontSize: 10 },
  })
  y = doc.lastAutoTable.finalY + 12

  // ── Top 10 products by value ──
  if (y > 220) { doc.addPage(); y = 20 }
  doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND)
  doc.text('Top 10 productos por valor en stock', 20, y); y += 6

  const top10Value = [...stockRows]
    .sort((a, b) => (b.Quantity * (b.costPrice ?? 0)) - (a.Quantity * (a.costPrice ?? 0)))
    .slice(0, 10)
    .map(r => [r.prod?.Name || '-', r.Quantity, `${(r.costPrice ?? 0).toFixed(2)} €`, `${(r.Quantity * (r.costPrice ?? 0)).toFixed(2)} €`])

  autoTable(doc, {
    startY: y, head: [['Producto', 'Stock', 'P. Coste', 'Valor total']],
    body: top10Value, theme: 'striped',
    headStyles: { fillColor: BRAND, textColor: 255, fontStyle: 'bold' },
    margin: { left: 20, right: 20 }, styles: { fontSize: 9 },
  })
  y = doc.lastAutoTable.finalY + 12

  // ── Alerts ──
  if (alertas.length > 0) {
    if (y > 200) { doc.addPage(); y = 20 }
    doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(220, 53, 69)
    doc.text(`Alertas de stock (${alertas.length})`, 20, y); y += 6

    autoTable(doc, {
      startY: y, head: [['Producto', 'Almacén', 'Stock', 'Mínimo']],
      body: alertas.slice(0, 30).map(r => [r.prod?.Name || '-', r.whName, r.Quantity, r.minStock]),
      theme: 'striped', headStyles: { fillColor: [220, 53, 69], textColor: 255, fontStyle: 'bold' },
      margin: { left: 20, right: 20 }, styles: { fontSize: 9 },
    })
    y = doc.lastAutoTable.finalY + 12
  }

  // ── Footer on all pages ──
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8); doc.setTextColor(150)
    doc.text(`StockIn · rekor.es · Pág. ${i} de ${pageCount}`, pageW / 2, 290, { align: 'center' })
  }

  return doc
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MonthlyReport({ stockRows, albaranes, alertas, conn, toast }) {
  const [cfg, setCfg]           = useState(null)
  const [history, setHistory]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [testing, setTesting]   = useState(false)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    Promise.all([emailAPI.getConfig(), emailAPI.getHistory()])
      .then(([c, h]) => { setCfg(c); setHistory(h) })
      .catch(() => toast('Error al cargar config email', 'err'))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await emailAPI.saveConfig(cfg)
      toast('Configuración guardada ✓')
    } catch (e) { toast(e.message, 'err') }
    finally { setSaving(false) }
  }

  const handleTest = async () => {
    setTesting(true)
    try {
      const res = await emailAPI.sendTest()
      toast(res.message || 'Email de prueba enviado ✓')
    } catch (e) { toast('Error: ' + e.message, 'err') }
    finally { setTesting(false) }
  }

  const handleGeneratePDF = () => {
    setGenerating(true)
    try {
      const now = new Date()
      const month = now.toLocaleString('es-ES', { month: 'long' })
      const year = now.getFullYear()
      const doc = generateMonthlyPDF({ stockRows, albaranes, alertas, connName: conn?.name, month, year })
      doc.save(`StockIn-Informe-${month}-${year}.pdf`)
      toast('PDF generado y descargado ✓')
    } catch (e) { toast('Error al generar PDF: ' + e.message, 'err') }
    finally { setGenerating(false) }
  }

  if (loading) return <div style={{ padding:40, textAlign:'center', color:T.muted }}>Cargando…</div>
  if (!cfg) return null

  return (
    <div style={{ animation:'fadeUp 0.3s ease', maxWidth:700 }}>
      <div style={{ marginBottom:22 }}>
        <h1 style={{ fontSize:22, fontWeight:800, color:T.brand }}>Informe Mensual</h1>
        <p style={{ fontSize:12, color:T.muted }}>Genera y envía el informe mensual por email automáticamente</p>
      </div>

      {/* Generate PDF */}
      <div style={{ ...S.card, marginBottom:14, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:14, fontWeight:700, color:T.brand }}>📊 Informe del mes actual</div>
          <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>{stockRows.length} productos · {albaranes.length} albaranes · {alertas.length} alertas</div>
        </div>
        <Btn variant="primary" onClick={handleGeneratePDF} disabled={generating}>
          {generating ? 'Generando…' : '⬇ Descargar PDF'}
        </Btn>
      </div>

      {/* Email config */}
      <div style={S.card}>
        <div style={{ fontSize:14, fontWeight:700, color:T.brand, marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
          📧 Envío automático por email
          <label style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8, fontSize:13, fontWeight:600, cursor:'pointer', color: cfg.enabled ? T.green : T.muted }}>
            <input type="checkbox" checked={cfg.enabled} onChange={e => setCfg(p => ({...p, enabled:e.target.checked}))} />
            {cfg.enabled ? 'Activado' : 'Desactivado'}
          </label>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:12, marginBottom:14 }}>
          <div>
            <label style={S.label}>Destinatarios (separados por comas)</label>
            <input value={cfg.recipients||''} onChange={e=>setCfg(p=>({...p,recipients:e.target.value}))} style={S.inp} placeholder="email@ejemplo.com, otro@mail.com" />
          </div>
          <div>
            <label style={S.label}>Nombre del remitente</label>
            <input value={cfg.senderName||''} onChange={e=>setCfg(p=>({...p,senderName:e.target.value}))} style={S.inp} placeholder="StockIn Reports" />
          </div>
          <div>
            <label style={S.label}>Día del mes para envío</label>
            <select value={cfg.sendDay||1} onChange={e=>setCfg(p=>({...p,sendDay:+e.target.value}))} style={S.inp}>
              {Array.from({length:28},(_,i)=>i+1).map(d=><option key={d} value={d}>Día {d}</option>)}
            </select>
          </div>
        </div>

        <div style={{ background:'#f5f9fa', borderRadius:10, padding:14, marginBottom:14 }}>
          <div style={{ fontSize:12, fontWeight:700, color:T.brand, marginBottom:10 }}>Configuración SMTP</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(170px, 1fr))', gap:10 }}>
            <div>
              <label style={S.label}>Servidor SMTP</label>
              <input value={cfg.smtp?.host||''} onChange={e=>setCfg(p=>({...p,smtp:{...p.smtp,host:e.target.value}}))} style={S.inp} placeholder="smtp.gmail.com" />
            </div>
            <div>
              <label style={S.label}>Puerto</label>
              <input type="number" value={cfg.smtp?.port||587} onChange={e=>setCfg(p=>({...p,smtp:{...p.smtp,port:+e.target.value}}))} style={S.inp} placeholder="587" />
            </div>
            <div>
              <label style={S.label}>Usuario / Email</label>
              <input value={cfg.smtp?.user||''} onChange={e=>setCfg(p=>({...p,smtp:{...p.smtp,user:e.target.value}}))} style={S.inp} placeholder="tu@gmail.com" />
            </div>
            <div>
              <label style={S.label}>Contraseña de aplicación</label>
              <input type="password" value={cfg.smtp?.pass||''} onChange={e=>setCfg(p=>({...p,smtp:{...p.smtp,pass:e.target.value}}))} style={S.inp} placeholder="xxxx xxxx xxxx xxxx" />
            </div>
          </div>
          <div style={{ marginTop:10, fontSize:11, color:T.muted, lineHeight:1.6, background:'rgba(5,146,167,0.05)', borderRadius:7, padding:'8px 10px' }}>
            💡 <strong>Gmail:</strong> Ve a tu cuenta Google → Seguridad → Verificación en dos pasos → Contraseñas de aplicación. Genera una contraseña específica para StockIn.
          </div>
        </div>

        <div style={{ display:'flex', gap:10, justifyContent:'space-between', flexWrap:'wrap' }}>
          <Btn variant="secondary" onClick={handleTest} disabled={testing}>
            {testing ? 'Enviando…' : '📤 Enviar prueba ahora'}
          </Btn>
          <Btn variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar configuración'}
          </Btn>
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div style={{ ...S.card, marginTop:14 }}>
          <div style={{ fontSize:13, fontWeight:700, color:T.brand, marginBottom:12 }}>Historial de informes enviados</div>
          {history.map((h, i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom: i<history.length-1 ? `1px solid ${T.border}` : 'none' }}>
              <div style={{ fontSize:13, color:T.text }}>{h.month}</div>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:11, color:T.muted }}>{new Date(h.date).toLocaleDateString('es-ES')}</span>
                <span style={{ fontSize:11, fontWeight:600, color: h.status==='sent' ? T.green : h.status==='error' ? T.red : T.muted }}>
                  {h.status==='sent' ? '✓ Enviado' : h.status==='error' ? '✗ Error' : '○ Programado'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
