import { useState, useEffect, useRef, useCallback } from "react"
import LoginScreen from "./components/LoginScreen.jsx"
import UsersPanel from "./components/UsersPanel.jsx"
import MonthlyReport from "./components/MonthlyReport.jsx"
import { authAPI, NAV_ACCESS, PERMS } from "./auth.js"
import { addToQueue, getQueue, removeFromQueue, cacheData, getCachedData } from "./offline.js"

// ═══════════════════════════════════════════════════════════════════════════════
//  STORAGE
// ═══════════════════════════════════════════════════════════════════════════════
const STORE_KEY  = "rekor_si_connections_v2"
const ACTIVE_KEY = "rekor_si_active_v2"
const loadConnections = () => { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || [] } catch { return [] } }
const saveConnections = (l) => { try { localStorage.setItem(STORE_KEY, JSON.stringify(l)) } catch {} }
const loadActiveId = () => { try { return localStorage.getItem(ACTIVE_KEY) || null } catch { return null } }
const saveActiveId = (id) => { try { localStorage.setItem(ACTIVE_KEY, id || "") } catch {} }
const emptyConn = () => ({
  id: `conn_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
  name:"", mode:"mono", agoraUrl:"", proxyUrl:"", apiToken:"",
  useClaudeProxy:false, activeWorkplace:null, workplaces:[],
  createdAt:new Date().toISOString(),
})

// ═══════════════════════════════════════════════════════════════════════════════
//  AGORA API
// ═══════════════════════════════════════════════════════════════════════════════
const createAPI = (conn) => {
  const isIframe = () => { try { return window.self !== window.top } catch { return true } }
  const viaPostMessage = (method, endpoint, body=null) => new Promise((resolve,reject) => {
    const reqId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const timeout = setTimeout(() => { window.removeEventListener("message",handler); reject(new Error("Timeout: Ágora no respondió")) }, 15000)
    const handler = ({data}) => {
      if (!data || data.requestId!==reqId) return
      window.removeEventListener("message",handler); clearTimeout(timeout)
      data.error ? reject(new Error(data.error)) : resolve(data.response)
    }
    window.addEventListener("message",handler)
    window.parent.postMessage({type:"agora:pos:invoke-api",endpoint,apiToken:conn.apiToken,requestId:reqId,body:body?JSON.stringify(body):""},{targetOrigin:"*"})
  })
  const viaFetch = async (method, endpoint, body=null) => {
    const base = (conn.proxyUrl||conn.agoraUrl||"").replace(/\/$/,"")
    if (!base) throw new Error("Introduce la URL de Ágora en la configuración")
    const res = await fetch(`${base}${endpoint}`,{method,headers:{"Api-Token":conn.apiToken,"Accept":"application/json",...(body?{"Content-Type":"application/json"}:{})}, ...(body?{body:JSON.stringify(body)}:{})})
    if (!res.ok) throw new Error(`HTTP ${res.status} — ${res.statusText}`)
    const text = await res.text()
    return text ? JSON.parse(text) : {ok:true}
  }
  const viaClaudeProxy = async (method, endpoint, body=null) => {
    const base = conn.agoraUrl?.replace(/\/$/,"") || ""
    if (!base) throw new Error("Introduce la URL de Ágora")
    const prompt = `You are an HTTP proxy. Make a ${method} request to ${base}${endpoint} with headers Api-Token: ${conn.apiToken} and Accept: application/json${body?` and body: ${JSON.stringify(body)}`:""}. Return ONLY the raw JSON response, no markdown. On error: {"_proxy_error":"description"}`
    const resp = await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:8192,messages:[{role:"user",content:prompt}]})})
    if (!resp.ok) throw new Error(`Proxy error ${resp.status}`)
    const data = await resp.json()
    const text = (data.content?.[0]?.text||"").trim().replace(/^```json\n?|^```\n?|\n?```$/g,"").trim()
    const parsed = JSON.parse(text)
    if (parsed._proxy_error) throw new Error(parsed._proxy_error)
    return parsed
  }
  const call = (method, endpoint, body=null) => {
    if (isIframe()) return viaPostMessage(method,endpoint,body)
    if (conn.useClaudeProxy) return viaClaudeProxy(method,endpoint,body)
    return viaFetch(method,endpoint,body)
  }
  const wp = (ids) => ids?.length ? `&workplaces=${ids.join(",")}` : ""
  const td = new Date().toISOString().slice(0,10)
  return {
    isIframe,
    test:        ()       => call("GET","/api/export-master/?filter=Warehouses"),
    getMaestros: (ids=[]) => call("GET",`/api/export-master/?filter=Products,Stocks,Suppliers,Warehouses${wp(ids)}`),
    getWpSummary:()       => call("GET","/api/export-master/?filter=WorkplacesSummary"),
    getAlbaranes:(ids=[]) => call("GET",`/api/export/?filter=IncomingDeliveryNotes${wp(ids)}&business-day=${td}`),
    getTraspasos:(ids=[]) => call("GET",`/api/export/?filter=StockTransfers${wp(ids)}&business-day=${td}`),
    importar:    (payload)=> call("POST","/api/import/",payload),
    acmsHub:     (ids=[]) => call("POST",`/api/hub/generate-data/${ids.length?`?workplaces=${ids.join(",")}`:""}`)
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  HELPERS & THEME
// ═══════════════════════════════════════════════════════════════════════════════
const norm  = (data,key) => Array.isArray(data?.[key]) ? data[key] : []
const fmt   = (n) => typeof n==="number" ? n.toFixed(2) : "—"
const today = () => new Date().toISOString().slice(0,10)
const buildStockRows = (products,stocks,warehouses) => stocks.map(s => {
  const prod = products.find(p=>p.Id===s.ProductId); if(!prod) return null
  const wh   = warehouses.find(w=>w.Id===s.WarehouseId)
  const so   = (prod.StorageOptions||[]).find(o=>o.WarehouseId===s.WarehouseId)||{}
  const cp   = (prod.CostPrices||[]).find(o=>o.WarehouseId===s.WarehouseId)
  return {...s,prod,wh,whName:wh?.Name||`Almacén ${s.WarehouseId}`,loc:so.Location||null,minStock:so.MinStock??0,maxStock:so.MaxStock??0,costPrice:cp?.CostPrice??prod.CostPrice??null,salePrice:prod.Prices?.[0]?.Price??null}
}).filter(Boolean)

const T = {brand:"#034650",accent:"#0592A7",accentD:"#046f80",bg:"#f0f5f6",surface:"#ffffff",card:"#ffffff",border:"#dde7e9",border2:"#c5d8db",text:"#0c2b30",muted:"#6b8f95",green:"#0a9e76",red:"#dc3545",yellow:"#d97706",orange:"#ea6c00",blue:"#0592A7"}
const S = {
  card:{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:20,boxShadow:"0 1px 3px rgba(3,70,80,0.07)"},
  inp:{background:"#fff",border:`1px solid ${T.border2}`,borderRadius:8,padding:"9px 12px",color:T.text,fontSize:14,outline:"none",width:"100%",fontFamily:"inherit"},
  label:{fontSize:11,color:T.muted,display:"block",marginBottom:5,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em"},
}
const thSt = {padding:"9px 14px",textAlign:"left",fontSize:10,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.06em",borderBottom:`1px solid ${T.border}`,whiteSpace:"nowrap"}

const IC = {
  dashboard:"M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
  stock:"M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z",
  albaran:"M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z",
  transfer:"M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z",
  proveedor:"M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
  settings:"M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.57 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z",
  sync:"M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z",
  alert:"M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z",
  plus:"M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
  check:"M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
  close:"M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
  search:"M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
  camera:"M12 15.2A3.2 3.2 0 0 1 8.8 12 3.2 3.2 0 0 1 12 8.8 3.2 3.2 0 0 1 15.2 12 3.2 3.2 0 0 1 12 15.2M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9z",
  upload:"M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z",
  euro:"M15 18.5c-2.51 0-4.68-1.42-5.76-3.5H15v-2H8.58c-.05-.33-.08-.66-.08-1s.03-.67.08-1H15V9H9.24C10.32 6.92 12.5 5.5 15 5.5c1.61 0 3.08.59 4.23 1.57L21 5.3C19.41 3.87 17.3 3 15 3c-3.92 0-7.24 2.51-8.48 6H3v2h3.06c-.04.33-.06.66-.06 1s.02.67.06 1H3v2h3.52c1.24 3.49 4.56 6 8.48 6 2.31 0 4.41-.87 6-2.3l-1.78-1.77c-1.14.98-2.6 1.57-4.22 1.57z",
  warehouse:"M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4z",
  menu:"M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z",
  chevron:"M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z",
  trash:"M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",
  link:"M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1 0 1.71-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z",
  info:"M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z",
  box:"M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
  adjust:"M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z",
  cart:"M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2zm-1.45-5c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0 0 20 4H5.21L4.27 2H1v2h2l3.6 7.59-1.35 2.44C4.52 15.37 5.48 17 7 17h12v-2H7.42c-.14 0-.25-.11-.25-.25z",
  history:"M13 3a9 9 0 1 0 0 18A9 9 0 0 0 13 3zM11 8h2v5l4.25 2.52-.77 1.28L12 14V8zM7 1L1 7l6 6V9h2.08A10 10 0 0 0 3 19h2a8 8 0 0 1 8-8V7H9V5h4V1H7z",
  users:"M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
  mail:"M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z",
  logout:"M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z",
}
const Ic = ({n,s=18,spin:sp}) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" style={{flexShrink:0,...(sp?{animation:"spin 1s linear infinite"}:{})}}>
    <path d={IC[n]||IC.dashboard}/>
  </svg>
)

// ── SHARED UI ─────────────────────────────────────────────────────────────────
function Badge({color,label,dot}) {
  return <span style={{background:`${color}18`,color,borderRadius:5,padding:"3px 9px",fontSize:11,fontWeight:600,whiteSpace:"nowrap",display:"inline-flex",alignItems:"center",gap:4}}>
    {dot&&<span style={{width:5,height:5,borderRadius:"50%",background:color,flexShrink:0}}/>}{label}</span>
}
function StatusBadge({status}) {
  const map={Pending:[T.yellow,"Pendiente"],Invoiced:[T.green,"Facturado"],Cancelled:[T.red,"Cancelado"],Served:[T.blue,"Servido"]}
  const [c,l]=map[status]||[T.muted,status||"—"]
  return <Badge color={c} label={l}/>
}
function Btn({onClick,disabled,children,variant="primary",small,full,style:sx={}}) {
  const styles={primary:{background:T.accent,color:"#fff",border:"none"},brand:{background:T.brand,color:"#fff",border:"none"},secondary:{background:"#f0f4f5",color:T.text,border:`1px solid ${T.border}`},ghost:{background:"transparent",color:T.muted,border:`1px solid ${T.border}`},danger:{background:"rgba(220,53,69,0.08)",color:T.red,border:"1px solid rgba(220,53,69,0.2)"},success:{background:"rgba(10,158,118,0.1)",color:T.green,border:"1px solid rgba(10,158,118,0.25)"}}
  return <button onClick={!disabled?onClick:undefined} disabled={disabled} style={{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6,padding:small?"6px 12px":"9px 18px",borderRadius:8,cursor:disabled?"not-allowed":"pointer",fontSize:small?12:13,fontWeight:600,fontFamily:"inherit",opacity:disabled?0.45:1,transition:"opacity 0.15s",width:full?"100%":"auto",...styles[variant],...sx}}>{children}</button>
}
function Modal({title,onClose,children,maxW=600}) {
  return <div style={{position:"fixed",inset:0,zIndex:300,background:"rgba(3,70,80,0.4)",backdropFilter:"blur(3px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
    <div style={{background:"#fff",borderRadius:14,border:`1px solid ${T.border}`,width:"100%",maxWidth:maxW,maxHeight:"92vh",overflow:"auto",padding:24,animation:"fadeUp 0.18s ease",boxShadow:"0 20px 60px rgba(3,70,80,0.18)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <h2 style={{fontSize:16,fontWeight:700,color:T.brand,margin:0}}>{title}</h2>
        <button onClick={onClose} style={{background:"none",border:"none",color:T.muted,cursor:"pointer",padding:4,borderRadius:6,display:"flex"}}><Ic n="close" s={17}/></button>
      </div>
      {children}
    </div>
  </div>
}
function Empty({msg,icon="search"}) {
  return <div style={{textAlign:"center",padding:"28px 16px",color:T.muted,display:"flex",flexDirection:"column",alignItems:"center",gap:10}}><Ic n={icon} s={26}/><div style={{fontSize:13,lineHeight:1.6}}>{msg}</div></div>
}
function Field({label,children,hint}) {
  return <div><label style={S.label}>{label}</label>{children}{hint&&<div style={{fontSize:11,color:T.muted,marginTop:4,lineHeight:1.5}}>{hint}</div>}</div>
}

// ── CONNECTION SELECTOR ───────────────────────────────────────────────────────
function ConnectionSelector({connections,activeId,onSwitch,onCreate,onManage}) {
  const [open,setOpen]=useState(false); const ref=useRef()
  const active=connections.find(c=>c.id===activeId)
  useEffect(()=>{const h=(e)=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false)};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h)},[])
  return <div ref={ref} style={{position:"relative"}}>
    <button onClick={()=>setOpen(o=>!o)} style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:8,border:"1px solid rgba(255,255,255,0.15)",background:"rgba(255,255,255,0.08)",cursor:"pointer",fontFamily:"inherit",color:"#fff",fontSize:12,fontWeight:500}}>
      <div style={{width:7,height:7,borderRadius:"50%",background:T.green,flexShrink:0}}/>
      <span style={{flex:1,textAlign:"left",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{active?active.name||active.agoraUrl||"Sin nombre":"Sin conexión"}</span>
      <Ic n="chevron" s={14}/>
    </button>
    {open&&<div style={{position:"absolute",top:"calc(100% + 6px)",left:0,right:0,background:"#fff",border:`1px solid ${T.border}`,borderRadius:10,boxShadow:"0 8px 32px rgba(3,70,80,0.18)",zIndex:200,overflow:"hidden"}}>
      {connections.length===0&&<div style={{padding:"12px 14px",fontSize:12,color:T.muted}}>Sin conexiones guardadas</div>}
      {connections.map(c=><button key={c.id} onClick={()=>{onSwitch(c.id);setOpen(false)}} style={{width:"100%",display:"flex",alignItems:"center",gap:9,padding:"10px 14px",border:"none",cursor:"pointer",fontFamily:"inherit",background:c.id===activeId?"rgba(5,146,167,0.07)":"#fff",borderBottom:`1px solid ${T.border}`,textAlign:"left"}}>
        <div style={{width:32,height:32,borderRadius:8,background:T.brand,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:13,fontWeight:700,color:"#fff"}}>{(c.name||c.agoraUrl||"?")[0].toUpperCase()}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13,fontWeight:600,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name||"Sin nombre"}</div>
          <div style={{fontSize:11,color:T.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.agoraUrl||"iframe/TPV"} · {c.mode==="acms"?"ACMS":"Mono"}</div>
        </div>
        {c.id===activeId&&<Ic n="check" s={14} style={{color:T.accent}}/>}
      </button>)}
      <div style={{display:"flex",borderTop:connections.length?`1px solid ${T.border}`:"none"}}>
        <button onClick={()=>{onCreate();setOpen(false)}} style={{flex:1,padding:"10px 14px",border:"none",cursor:"pointer",background:"#fff",color:T.accent,fontSize:12,fontWeight:600,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:5,borderRight:`1px solid ${T.border}`}}><Ic n="plus" s={13}/>Nueva</button>
        <button onClick={()=>{onManage();setOpen(false)}} style={{flex:1,padding:"10px 14px",border:"none",cursor:"pointer",background:"#fff",color:T.muted,fontSize:12,fontWeight:600,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}><Ic n="settings" s={13}/>Gestionar</button>
      </div>
    </div>}
  </div>
}
function WorkplaceSelector({workplaces,activeId,onChange}) {
  if(!workplaces?.length) return null
  return <div style={{padding:"8px 12px",borderTop:"1px solid rgba(255,255,255,0.1)"}}>
    <div style={{fontSize:10,color:"rgba(255,255,255,0.45)",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.07em"}}>Local activo</div>
    <select value={activeId||""} onChange={e=>onChange(e.target.value?+e.target.value:null)} style={{...S.inp,padding:"6px 10px",fontSize:12,background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",color:"#fff",borderRadius:7}}>
      <option value="">Todos los locales</option>
      {workplaces.map(w=><option key={w.Id} value={w.Id}>{w.Name}</option>)}
    </select>
  </div>
}

// ── CONNECTION FORM ───────────────────────────────────────────────────────────
function ConnectionForm({initial,onSave,onCancel,toast}) {
  const [f,setF]=useState(initial||emptyConn())
  const [testing,setTesting]=useState(false)
  const [testResult,setTestResult]=useState(null)
  const [wps,setWps]=useState(initial?.workplaces||[])
  const [showToken,setShowToken]=useState(false)
  const inIframe=(()=>{try{return window.self!==window.top}catch{return true}})()
  const isCorsError=(msg="")=>msg.toLowerCase().includes("cors")||msg.toLowerCase().includes("failed to fetch")||msg.toLowerCase().includes("network")
  const test=async()=>{
    if(!f.apiToken.trim()) return toast("Introduce el API Token primero","err")
    if(!inIframe&&!f.agoraUrl.trim()&&!f.proxyUrl.trim()) return toast("Introduce la URL de Ágora","err")
    setTesting(true);setTestResult(null)
    try {
      const api=createAPI(f); await api.test()
      let wpsFound=[]
      if(f.mode==="acms"){try{const d=await api.getWpSummary();wpsFound=norm(d,"WorkplacesSummary");setWps(wpsFound)}catch{}}
      setTestResult({ok:true,msg:`Conexión OK${wpsFound.length?` · ${wpsFound.length} locales`:""}`});toast("Conexión verificada ✓")
    } catch(e){const cors=isCorsError(e.message);setTestResult({ok:false,cors,msg:e.message});toast("Error: "+e.message.slice(0,60),"err")}
    finally{setTesting(false)}
  }
  const canSave=f.apiToken.trim()&&(inIframe||f.agoraUrl.trim()||f.proxyUrl.trim())
  return <div style={{display:"flex",flexDirection:"column",gap:16}}>
    <Field label="Nombre de la conexión"><input value={f.name} onChange={e=>setF(p=>({...p,name:e.target.value}))} placeholder="Ej: Restaurante Centro" style={S.inp}/></Field>
    <Field label="Tipo de instalación">
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {[{val:"mono",label:"Monolocal",desc:"Un establecimiento"},{val:"acms",label:"ACMS Multi-local",desc:"Central + locales"}].map(opt=>(
          <button key={opt.val} onClick={()=>setF(p=>({...p,mode:opt.val}))} style={{padding:"11px 14px",border:`2px solid ${f.mode===opt.val?T.accent:T.border}`,background:f.mode===opt.val?"rgba(5,146,167,0.06)":"#fafcfc",borderRadius:9,cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>
            <div style={{fontSize:13,fontWeight:700,color:f.mode===opt.val?T.accent:T.text}}>{opt.label}</div>
            <div style={{fontSize:11,color:T.muted,marginTop:2}}>{opt.desc}</div>
          </button>
        ))}
      </div>
    </Field>
    <div style={{borderRadius:10,border:`1px solid ${T.border}`,overflow:"hidden"}}>
      <div style={{background:"#f5f9fa",padding:"9px 14px",fontSize:11,fontWeight:700,color:T.brand,textTransform:"uppercase",letterSpacing:"0.06em"}}>Credenciales API</div>
      <div style={{padding:14,display:"flex",flexDirection:"column",gap:12}}>
        <Field label="API Token" hint="Monitor Ágora → Herramientas → Activar Módulos Adicionales → API HTTP">
          <div style={{position:"relative"}}>
            <input type={showToken?"text":"password"} value={f.apiToken} onChange={e=>{setF(p=>({...p,apiToken:e.target.value}));setTestResult(null)}} placeholder="gtSUwbHbxwg3hRXhZ01Kictq" style={{...S.inp,paddingRight:40}}/>
            <button onClick={()=>setShowToken(s=>!s)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:T.muted,fontSize:11,fontFamily:"inherit"}}>{showToken?"ocultar":"ver"}</button>
          </div>
        </Field>
        <Field label="URL del servidor Ágora" hint="IP o DNS del servidor Ágora. Puerto por defecto: 8984.">
          <input value={f.agoraUrl} onChange={e=>{setF(p=>({...p,agoraUrl:e.target.value}));setTestResult(null)}} placeholder="http://192.168.1.10:8984" style={S.inp}/>
        </Field>
        {!inIframe&&!f.useClaudeProxy&&(
          <Field label="URL Proxy CORS (opcional)">
            <input value={f.proxyUrl} onChange={e=>{setF(p=>({...p,proxyUrl:e.target.value}));setTestResult(null)}} placeholder="https://miproxy.ejemplo.com" style={S.inp}/>
          </Field>
        )}
        {!inIframe&&f.agoraUrl&&(
          <div>
            <label style={S.label}>Modo de conexión</label>
            <div style={{display:"flex",gap:8}}>
              {[{v:false,l:"Directo"},{v:true,l:"Proxy vía Claude"}].map(opt=>(
                <button key={opt.l} onClick={()=>{setF(p=>({...p,useClaudeProxy:opt.v,proxyUrl:opt.v?"":p.proxyUrl}));setTestResult(null)}} style={{flex:1,padding:"9px 12px",border:`1.5px solid ${f.useClaudeProxy===opt.v?T.accent:T.border}`,background:f.useClaudeProxy===opt.v?"rgba(5,146,167,0.06)":"#fff",borderRadius:8,cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:f.useClaudeProxy===opt.v?700:400,color:f.useClaudeProxy===opt.v?T.accent:T.muted}}>{opt.l}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <Btn onClick={test} disabled={testing} variant={testResult?.ok?"success":"secondary"}><Ic n="sync" s={13} spin={testing}/>{testing?"Probando…":"Probar conexión"}</Btn>
        {testResult?.ok&&<span style={{color:T.green,fontSize:13,display:"flex",alignItems:"center",gap:5,fontWeight:600}}><Ic n="check" s={14}/>{testResult.msg}</span>}
        {testResult&&!testResult.ok&&<span style={{color:T.red,fontSize:12,fontWeight:500}}>✗ {testResult.msg.slice(0,90)}</span>}
      </div>
      {testResult&&!testResult.ok&&testResult.cors&&!f.useClaudeProxy&&(
        <div style={{background:"rgba(5,146,167,0.06)",border:"1px solid rgba(5,146,167,0.3)",borderRadius:8,padding:"10px 14px"}}>
          <div style={{fontSize:12,fontWeight:700,color:T.accent,marginBottom:6}}>Solución rápida: Proxy vía Claude</div>
          <Btn variant="primary" small onClick={()=>{setF(p=>({...p,useClaudeProxy:true,proxyUrl:""}));setTestResult(null)}}>Activar Proxy vía Claude</Btn>
        </div>
      )}
      {f.mode==="acms"&&wps.length>0&&(
        <div style={{background:"rgba(5,146,167,0.04)",borderRadius:9,padding:14,border:"1px solid rgba(5,146,167,0.2)"}}>
          <div style={{fontSize:12,fontWeight:700,color:T.brand,marginBottom:8}}>{wps.length} locales detectados</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:6}}>
            {wps.map(w=><div key={w.Id} style={{background:"#fff",border:`1px solid ${T.border}`,borderRadius:7,padding:"7px 10px"}}><div style={{fontSize:12,fontWeight:600,color:T.text}}>{w.Name}</div></div>)}
          </div>
        </div>
      )}
      <div style={{display:"flex",gap:10,justifyContent:"flex-end",paddingTop:4}}>
        <Btn onClick={onCancel} variant="ghost">Cancelar</Btn>
        <Btn onClick={()=>onSave({...f,workplaces:wps})} disabled={!canSave} variant="primary"><Ic n="check" s={13}/>Guardar conexión</Btn>
      </div>
    </div>
  </div>
}
function ManageConnections({connections,activeId,onSwitch,onDelete,onEdit,onClose}) {
  return <div>
    {connections.length===0?<Empty msg="No hay conexiones." icon="link"/>:connections.map(c=>(
      <div key={c.id} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 0",borderBottom:`1px solid ${T.border}`}}>
        <div style={{width:36,height:36,borderRadius:9,background:c.id===activeId?T.accent:T.brand,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:14,fontWeight:700,color:"#fff"}}>{(c.name||c.agoraUrl||"?")[0].toUpperCase()}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13,fontWeight:600,color:T.text}}>{c.name||"Sin nombre"}</div>
          <div style={{fontSize:11,color:T.muted}}>{c.agoraUrl||"iframe/TPV"} · {c.mode==="acms"?"ACMS":"Mono"}</div>
        </div>
        <div style={{display:"flex",gap:6,flexShrink:0}}>
          {c.id!==activeId&&<Btn small variant="success" onClick={()=>{onSwitch(c.id);onClose()}}>Activar</Btn>}
          {c.id===activeId&&<Badge color={T.accent} label="Activa"/>}
          <Btn small variant="secondary" onClick={()=>onEdit(c)}><Ic n="settings" s={12}/></Btn>
          <Btn small variant="danger" onClick={()=>onDelete(c.id)}><Ic n="trash" s={12}/></Btn>
        </div>
      </div>
    ))}
  </div>
}

// ═══════════════════════════════════════════════════════════════════════════════
//  APP ROOT
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  // ── Auth state ──────────────────────────────────────────────────────────────
  const [user,     setUser]     = useState(null)   // {id,username,role,fullName}
  const [authLoading, setAuthLoading] = useState(true)

  // ── Connection state ────────────────────────────────────────────────────────
  const [connections,setConnections]=useState(loadConnections)
  const [activeId,   setActiveId]   =useState(loadActiveId)
  const [view,       setView]       =useState("dashboard")
  const [sideOpen,   setSideOpen]   =useState(false)
  const [modal,      setModal]      =useState(null)
  const [editConn,   setEditConn]   =useState(null)

  // ── Data ────────────────────────────────────────────────────────────────────
  const [products,  setProducts]  =useState([])
  const [stocks,    setStocks]    =useState([])
  const [suppliers, setSuppliers] =useState([])
  const [warehouses,setWarehouses]=useState([])
  const [albaranes, setAlbaranes] =useState([])
  const [traspasos, setTraspasos] =useState([])
  const [connected, setConnected] =useState(null)
  const [syncing,   setSyncing]   =useState(false)
  const [syncErr,   setSyncErr]   =useState(null)
  const [lastSync,  setLastSync]  =useState(null)
  const [notif,     setNotif]     =useState(null)
  const [cachedAt,  setCachedAt]  =useState(null)

  // ── Offline queue ───────────────────────────────────────────────────────────
  const [online,      setOnline]      =useState(navigator.onLine)
  const [queueCount,  setQueueCount]  =useState(0)
  const [showBanner,  setShowBanner]  =useState(false)

  const activeConn=connections.find(c=>c.id===activeId)||null
  const configured=!!(activeConn?.apiToken)
  const role = user?.role || "readonly"
  const canSeeNav = (id) => (NAV_ACCESS[role]||[]).includes(id)

  // ── Check auth on start ─────────────────────────────────────────────────────
  useEffect(()=>{
    const token=localStorage.getItem("stockin_token")
    if(!token){setAuthLoading(false);return}
    authAPI.me().then(u=>{setUser(u);setAuthLoading(false)}).catch(()=>{localStorage.removeItem("stockin_token");setAuthLoading(false)})
  },[])

  // ── Initial sync after auth ─────────────────────────────────────────────────
  useEffect(()=>{
    if(!user) return
    if(configured){setView("dashboard");doSync(activeConn)}
    else if(connections.length===0){setView("setup")}
  },[user])

  // ── Online/offline events ───────────────────────────────────────────────────
  useEffect(()=>{
    const goOnline=()=>{setOnline(true);setShowBanner(true);setTimeout(()=>setShowBanner(false),5000);processQueue()}
    const goOffline=()=>{setOnline(false);setShowBanner(false)}
    window.addEventListener("online",goOnline)
    window.addEventListener("offline",goOffline)
    getQueue().then(q=>setQueueCount(q.length))
    return()=>{window.removeEventListener("online",goOnline);window.removeEventListener("offline",goOffline)}
  },[])

  const toast=(msg,type="ok")=>{setNotif({msg,type});setTimeout(()=>setNotif(null),5000)}

  // ── Login / Logout ──────────────────────────────────────────────────────────
  const handleLogin=async(username,password)=>{
    const data=await authAPI.login(username,password)
    localStorage.setItem("stockin_token",data.token)
    setUser(data.user)
    if(configured){setView("dashboard");doSync(activeConn)}
    else setView("setup")
  }
  const handleLogout=async()=>{
    try{await authAPI.logout()}catch{}
    localStorage.removeItem("stockin_token")
    setUser(null);setView("dashboard")
    setProducts([]);setStocks([]);setSuppliers([]);setWarehouses([]);setAlbaranes([]);setTraspasos([])
    setConnected(null)
  }

  // ── Offline queue processor ─────────────────────────────────────────────────
  const processQueue=async()=>{
    const queue=await getQueue()
    if(!queue.length||!activeConn) return
    toast(`Conexión restaurada · procesando ${queue.length} acción${queue.length>1?"es":""}…`)
    const api=createAPI(activeConn)
    let ok=0,fail=0
    for(const item of queue){
      try{
        await api.importar(item.payload)
        await removeFromQueue(item.id)
        ok++
      }catch{fail++}
    }
    const remaining=await getQueue()
    setQueueCount(remaining.length)
    if(ok) toast(`${ok} acción${ok>1?"es":""} sincronizada${ok>1?"s":""}${fail?` · ${fail} con error`:""}`)
    doSync()
  }

  const queueAction=async(payload,label)=>{
    await addToQueue({payload,label})
    const q=await getQueue()
    setQueueCount(q.length)
    toast(`Sin conexión — "${label}" guardada, se enviará al reconectar`,"warn")
  }

  // ── SYNC ────────────────────────────────────────────────────────────────────
  const doSync=useCallback(async(conn=activeConn)=>{
    if(!conn?.apiToken||syncing) return
    setSyncing(true);setSyncErr(null)
    const api=createAPI(conn)
    const wpIds=conn.mode==="acms"&&conn.activeWorkplace?[conn.activeWorkplace]:[]
    try{
      const maestros=await api.getMaestros(wpIds)
      const prods=norm(maestros,"Products"),stks=norm(maestros,"Stocks"),sups=norm(maestros,"Suppliers"),whs=norm(maestros,"Warehouses")
      setProducts(prods);setStocks(stks);setSuppliers(sups);setWarehouses(whs)
      // Cache for offline use
      await cacheData(`maestros_${conn.id}`,{prods,stks,sups,whs})
      if(conn.mode==="acms"){try{const wpData=await api.getWpSummary();const wps=norm(wpData,"WorkplacesSummary");updateConn(conn.id,{workplaces:wps})}catch{}}
      try{const albData=await api.getAlbaranes(wpIds);const albs=norm(albData,"IncomingDeliveryNotes").map(a=>({...a,_synced:true}));setAlbaranes(albs);await cacheData(`albaranes_${conn.id}`,albs)}catch{setAlbaranes([])}
      try{const trData=await api.getTraspasos(wpIds);setTraspasos(norm(trData,"StockTransfers"))}catch{}
      setConnected(true)
      const ts=new Date().toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"})
      setLastSync(ts);setCachedAt(null)
      toast(`${prods.length} productos · ${stks.length} stocks cargados`)
    }catch(err){
      setConnected(false);setSyncErr(err.message)
      // Try loading from IndexedDB cache
      const cached=await getCachedData(`maestros_${conn?.id}`)
      if(cached){
        setProducts(cached.data.prods||[]);setStocks(cached.data.stks||[]);setSuppliers(cached.data.sups||[]);setWarehouses(cached.data.whs||[])
        setCachedAt(cached.cachedAt)
        const albCached=await getCachedData(`albaranes_${conn?.id}`)
        if(albCached) setAlbaranes(albCached.data||[])
        toast("Cargando datos en caché (sin conexión)","warn")
      } else {
        toast("Error de conexión: "+err.message,"err")
      }
    }finally{setSyncing(false)}
  },[activeConn,syncing])

  // ── Connections management ──────────────────────────────────────────────────
  const updateConn=(id,changes)=>{
    setConnections(prev=>{const next=prev.map(c=>c.id===id?{...c,...changes}:c);saveConnections(next);return next})
  }
  const saveNewConn=(conn)=>{
    const next=[...connections,conn];saveConnections(next);setConnections(next)
    saveActiveId(conn.id);setActiveId(conn.id);setModal(null)
    toast("Conexión guardada · sincronizando…");setView("dashboard")
    setProducts([]);setStocks([]);setSuppliers([]);setWarehouses([]);setAlbaranes([]);setTraspasos([])
    setConnected(null);setSyncErr(null);doSync(conn)
  }
  const saveEditConn=(conn)=>{
    updateConn(conn.id,conn);setModal(null);setEditConn(null);toast("Conexión actualizada")
    if(conn.id===activeId){setConnected(null);setSyncErr(null);setProducts([]);setStocks([]);doSync(conn)}
  }
  const deleteConn=(id)=>{
    const next=connections.filter(c=>c.id!==id);saveConnections(next);setConnections(next)
    if(id===activeId){const first=next[0]||null;saveActiveId(first?.id||"");setActiveId(first?.id||null);if(first)doSync(first);else{setProducts([]);setStocks([]);setConnected(null)}}
  }
  const switchConn=(id)=>{
    saveActiveId(id);setActiveId(id)
    const conn=connections.find(c=>c.id===id);if(!conn) return
    setConnected(null);setSyncErr(null);setProducts([]);setStocks([]);setSuppliers([]);setWarehouses([]);setAlbaranes([]);setTraspasos([])
    setView("dashboard");doSync(conn)
  }
  const switchWorkplace=(wpId)=>{
    if(!activeConn) return
    updateConn(activeConn.id,{activeWorkplace:wpId})
    const updated={...activeConn,activeWorkplace:wpId}
    setConnected(null);setProducts([]);setStocks([]);doSync(updated)
  }

  // ── Importar helpers ────────────────────────────────────────────────────────
  const withOfflineSupport=async(payload,label,apiFn)=>{
    if(!online){await queueAction(payload,label);return}
    try{await apiFn()}catch(e){toast("Error: "+e.message,"err");throw e}
  }
  const importarAlbaran=async(albaran)=>{
    if(!activeConn) return
    await withOfflineSupport({IncomingDeliveryNotes:[albaran]},"Albarán",async()=>{
      const api=createAPI(activeConn)
      await api.importar({IncomingDeliveryNotes:[albaran]})
      if(activeConn.mode==="acms")try{await api.acmsHub(activeConn.activeWorkplace?[activeConn.activeWorkplace]:[])}catch{}
      toast("Albarán importado ✓");doSync()
    })
  }
  const importarTraspaso=async(t)=>{
    if(!activeConn) return
    await withOfflineSupport({StockAdjustments:[t]},"Traspaso",async()=>{
      const api=createAPI(activeConn)
      try{await api.importar({StockAdjustments:[t]})}catch{}
      setTraspasos(prev=>[{...t,_local:true,_date:new Date().toISOString()},...prev])
      toast("Traspaso registrado ✓");doSync()
    })
  }
  const importarRegularizacion=async({lineas,motivo,warehouseId,tipo})=>{
    if(!activeConn) return
    const api=createAPI(activeConn)
    const ahora=new Date()
    const serie=tipo==="entrada"?"RE":"RM"
    const Lines=lineas.map(l=>({ProductId:l.ProductId,ProductName:l.productName,OrderedQuantity:tipo==="entrada"?Math.abs(parseFloat(l.cantidad)):-Math.abs(parseFloat(l.cantidad)),DeliveredQuantity:tipo==="entrada"?Math.abs(parseFloat(l.cantidad)):-Math.abs(parseFloat(l.cantidad)),Price:parseFloat(l.costPrice)||0}))
    const albaran={Serie:serie,Number:ahora.getTime(),Date:ahora.toISOString().slice(0,10),Status:"Pending",Notes:motivo||"Regularización StockIn",Warehouse:{Id:warehouseId},Supplier:{},Lines}
    await withOfflineSupport({IncomingDeliveryNotes:[albaran]},"Regularización",async()=>{
      await api.importar({IncomingDeliveryNotes:[albaran]})
      if(activeConn.mode==="acms")try{await api.acmsHub(activeConn.activeWorkplace?[activeConn.activeWorkplace]:[])}catch{}
      doSync()
    })
  }
  const importarPedidoReposicion=async(pedido)=>{
    if(!activeConn) return
    await withOfflineSupport({PurchaseOrders:[pedido]},"Pedido",async()=>{
      const api=createAPI(activeConn)
      await api.importar({PurchaseOrders:[pedido]})
      if(activeConn.mode==="acms")try{await api.acmsHub(activeConn.activeWorkplace?[activeConn.activeWorkplace]:[])}catch{}
      toast("Pedido enviado a Ágora ✓");doSync()
    })
  }
  const importarProducto=async(prod)=>{
    if(!activeConn) return
    const api=createAPI(activeConn)
    const payload={Products:[{Id:prod.Id,Name:prod.Name,VatId:prod.VatId,FamilyId:prod.FamilyId??null,CostPrice:prod.CostPrice??0,StorageOptions:(prod.StorageOptions||[]).map(so=>({WarehouseId:so.WarehouseId,Location:so.Location||"",MinStock:parseFloat(so.MinStock)||0,MaxStock:parseFloat(so.MaxStock)||0})),CostPrices:(prod.CostPrices||[]).map(cp=>({WarehouseId:cp.WarehouseId,CostPrice:parseFloat(cp.CostPrice)||0}))}]}
    await api.importar(payload)
    setProducts(prev=>prev.map(p=>p.Id===prod.Id?{...p,...prod}:p))
    if(activeConn.mode==="acms")try{const a=createAPI(activeConn);await a.acmsHub(activeConn.activeWorkplace?[activeConn.activeWorkplace]:[])}catch{}
  }

  const syncColor=!configured?"rgba(255,255,255,0.25)":syncing?T.yellow:connected===false?T.red:connected===true?T.green:"rgba(255,255,255,0.4)"
  const stockRows=buildStockRows(products,stocks,warehouses)
  const alertas=stockRows.filter(r=>r.minStock>0&&r.Quantity<=r.minStock)

  const NAV_ITEMS=[
    {id:"dashboard",   label:"Dashboard",      icon:"dashboard"},
    {id:"alertas",     label:"Alertas",        icon:"alert",   badge:alertas.length||null,bc:T.red},
    {id:"stock",       label:"Stock",          icon:"stock"},
    {id:"regularizacion",label:"Regularización",icon:"adjust"},
    {id:"pedidos",     label:"Reposición",     icon:"cart"},
    {id:"historico",   label:"Historial",      icon:"history"},
    {id:"albaranes",   label:"Albaranes",      icon:"albaran"},
    {id:"traspasos",   label:"Traspasos",      icon:"transfer"},
    {id:"productos",   label:"Productos",      icon:"box"},
    {id:"proveedores", label:"Proveedores",    icon:"proveedor"},
    {id:"informe",     label:"Informe mensual",icon:"mail"},
    {id:"usuarios",    label:"Usuarios",       icon:"users"},
    {id:"setup",       label:"Configuración",  icon:"settings",badge:!configured?"!":null,bc:T.yellow},
  ].filter(item=>canSeeNav(item.id))

  const navigate=(id)=>{setView(id);setSideOpen(false)}

  if(authLoading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#f0f5f6",fontFamily:"sans-serif",color:"#6b8f95"}}>Cargando…</div>
  if(!user) return <LoginScreen onLogin={handleLogin}/>

  const ROLE_BADGE_COLOR={admin:T.accent,manager:T.brand,employee:T.green,readonly:T.muted}
  const ROLE_BADGE_LABEL={admin:"Admin",manager:"Encargado",employee:"Empleado",readonly:"Lectura"}

  const SidebarContent=()=>(
    <>
      <div style={{padding:"16px 14px 12px",borderBottom:"1px solid rgba(255,255,255,0.1)"}}>
        <div style={{display:"flex",alignItems:"center",gap:9}}>
          <div style={{width:34,height:34,borderRadius:9,background:T.accent,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <Ic n="warehouse" s={17}/>
          </div>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:"#fff",letterSpacing:"-0.2px"}}><span style={{color:T.accent}}>rekor</span><span style={{color:"rgba(255,255,255,0.45)"}}>.es</span></div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",letterSpacing:"0.1em",textTransform:"uppercase"}}>StockIn</div>
          </div>
        </div>
        {PERMS.canManageConns(role)&&<div style={{marginTop:10}}>
          <ConnectionSelector connections={connections} activeId={activeId} onSwitch={switchConn} onCreate={()=>setModal("new-conn")} onManage={()=>setModal("manage-conn")}/>
        </div>}
      </div>
      {activeConn?.mode==="acms"&&activeConn.workplaces?.length>0&&<WorkplaceSelector workplaces={activeConn.workplaces} activeId={activeConn.activeWorkplace} onChange={switchWorkplace}/>}
      <nav style={{flex:1,padding:"10px 8px",overflowY:"auto"}}>
        {NAV_ITEMS.map(item=>(
          <button key={item.id} onClick={()=>navigate(item.id)} style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"9px 10px",borderRadius:8,border:"none",cursor:"pointer",marginBottom:1,fontFamily:"inherit",background:view===item.id?"rgba(255,255,255,0.12)":"transparent",color:view===item.id?"#fff":"rgba(255,255,255,0.55)",fontSize:13,fontWeight:view===item.id?600:400,textAlign:"left"}}>
            <Ic n={item.icon} s={15}/>
            <span style={{flex:1}}>{item.label}</span>
            {item.badge&&<span style={{background:item.bc,color:item.bc===T.yellow?"#000":"#fff",borderRadius:20,padding:"1px 7px",fontSize:10,fontWeight:700}}>{item.badge}</span>}
          </button>
        ))}
      </nav>
      {/* User info + logout */}
      <div style={{padding:"10px 10px 4px",borderTop:"1px solid rgba(255,255,255,0.1)"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 6px",borderRadius:8,background:"rgba(255,255,255,0.07)",marginBottom:6}}>
          <div style={{width:32,height:32,borderRadius:8,background:ROLE_BADGE_COLOR[role]||T.muted,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:13,fontWeight:700,color:"#fff"}}>{user.fullName?.[0]?.toUpperCase()||"?"}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:12,fontWeight:600,color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.fullName}</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.5)"}}>{ROLE_BADGE_LABEL[role]||role}</div>
          </div>
          <button onClick={handleLogout} title="Cerrar sesión" style={{background:"rgba(255,255,255,0.1)",border:"none",borderRadius:6,color:"rgba(255,255,255,0.6)",cursor:"pointer",padding:"5px",display:"flex"}}>
            <Ic n="logout" s={14}/>
          </button>
        </div>
        {/* Sync button */}
        <button onClick={()=>{if(configured&&!syncing)doSync()}} disabled={!configured||syncing} style={{width:"100%",padding:"8px",borderRadius:8,fontFamily:"inherit",background:connected===true&&!syncing?"rgba(10,158,118,0.15)":connected===false?"rgba(220,53,69,0.15)":"rgba(255,255,255,0.05)",border:`1px solid ${syncColor}`,color:syncColor,cursor:!configured||syncing?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6,fontSize:12,fontWeight:600,opacity:!configured?0.4:1,marginBottom:6}}>
          <Ic n="sync" s={13} spin={syncing}/>
          {syncing?"Sincronizando…":connected===false?"Reintentar":connected===true?`Sync · ${lastSync}`:"Sincronizar"}
        </button>
        {/* Offline indicator */}
        {!online&&<div style={{fontSize:10,color:T.orange,textAlign:"center",padding:"4px 0",fontWeight:600}}>Sin conexión{queueCount>0?` · ${queueCount} pendiente${queueCount>1?"s":""}`:""}</div>}
        {syncErr&&<div style={{marginTop:2,fontSize:10,color:T.red,textAlign:"center",lineHeight:1.4,wordBreak:"break-word",marginBottom:6}}>{syncErr.slice(0,80)}</div>}
        {cachedAt&&<div style={{fontSize:10,color:T.yellow,textAlign:"center",lineHeight:1.4,marginBottom:6}}>Datos del {new Date(cachedAt).toLocaleString("es-ES",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</div>}
      </div>
    </>
  )

  return (
    <div style={{fontFamily:"'IBM Plex Sans',sans-serif",background:T.bg,minHeight:"100vh",color:T.text,display:"flex"}}>
      <aside className="sidebar-desktop" style={{width:240,background:T.brand,display:"flex",flexDirection:"column",position:"sticky",top:0,height:"100vh",flexShrink:0,zIndex:10}}>
        <SidebarContent/>
      </aside>
      {sideOpen&&(
        <div style={{position:"fixed",inset:0,zIndex:200,display:"flex"}}>
          <div style={{width:260,background:T.brand,display:"flex",flexDirection:"column",height:"100%",animation:"slideRight 0.22s ease"}}><SidebarContent/></div>
          <div style={{flex:1,background:"rgba(3,70,80,0.5)"}} onClick={()=>setSideOpen(false)}/>
        </div>
      )}
      <main style={{flex:1,overflow:"auto",minWidth:0}}>
        {/* Mobile topbar */}
        <div className="topbar-mobile" style={{display:"none",alignItems:"center",gap:10,padding:"12px 16px",background:T.brand,position:"sticky",top:0,zIndex:100,borderBottom:"1px solid rgba(255,255,255,0.1)"}}>
          <button onClick={()=>setSideOpen(true)} style={{background:"rgba(255,255,255,0.1)",border:"none",borderRadius:8,color:"#fff",cursor:"pointer",padding:"7px",display:"flex"}}><Ic n="menu" s={18}/></button>
          <div style={{flex:1,fontSize:14,fontWeight:700,color:"#fff"}}><span style={{color:T.accent}}>rekor</span>.es StockIn</div>
          {/* Offline dot */}
          <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,fontWeight:600,color:online?T.green:T.orange}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:online?T.green:T.orange,animation:!online?"pulse 1.5s infinite":"none"}}/>
            {!online&&"Offline"}
          </div>
          <button onClick={()=>{if(configured&&!syncing)doSync()}} style={{background:"none",border:"none",cursor:"pointer",color:syncColor,display:"flex",padding:4}}><Ic n="sync" s={18} spin={syncing}/></button>
        </div>
        {/* Offline banner */}
        {!online&&<div style={{background:"rgba(234,108,0,0.1)",borderBottom:`2px solid ${T.orange}`,padding:"7px 20px",display:"flex",alignItems:"center",justifyContent:"center",gap:10,fontSize:12,fontWeight:600,color:T.orange}}>
          ⚠ Sin conexión — trabajando con datos en caché. Las acciones se guardarán y enviarán al reconectar.
          {queueCount>0&&<span style={{background:T.orange,color:"#fff",borderRadius:12,padding:"2px 8px",fontSize:11}}>{queueCount} pendiente{queueCount>1?"s":""}</span>}
        </div>}
        {/* Reconnection banner */}
        {showBanner&&<div style={{background:T.green,color:"#fff",padding:"9px 20px",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontSize:13,fontWeight:600,animation:"slideDown 0.3s ease"}}>
          ✓ Conexión restaurada{queueCount>0?` · sincronizando ${queueCount} acción${queueCount>1?"es":""}…`:""}
        </div>}
        <div style={{padding:"24px 28px"}} className="main-pad">
          {/* Toast */}
          {notif&&<div style={{position:"fixed",top:16,right:16,zIndex:400,maxWidth:380,background:notif.type==="ok"?"#f0fdf8":notif.type==="warn"?"#fffbeb":"#fff5f5",border:`1px solid ${notif.type==="ok"?T.green:notif.type==="warn"?T.yellow:T.red}`,borderRadius:10,padding:"11px 16px",display:"flex",alignItems:"center",gap:10,color:notif.type==="ok"?T.green:notif.type==="warn"?T.yellow:T.red,fontSize:13,fontWeight:500,boxShadow:"0 4px 20px rgba(3,70,80,0.12)",animation:"slideIn 0.2s ease"}}>
            <Ic n={notif.type==="ok"?"check":"alert"} s={15}/>{notif.msg}
          </div>}
          {/* VIEWS */}
          {view==="setup"&&PERMS.canSeeSetup(role)&&<SetupView connections={connections} activeId={activeId} onNew={()=>setModal("new-conn")} onEdit={(c)=>{setEditConn(c);setModal("edit-conn")}} onSwitch={switchConn} onDelete={deleteConn} toast={toast}/>}
          {view==="usuarios"&&PERMS.canManageUsers(role)&&<UsersPanel currentUser={user} toast={toast}/>}
          {view==="informe"&&<MonthlyReport stockRows={stockRows} albaranes={albaranes} alertas={alertas} conn={activeConn} toast={toast}/>}
          {view!=="setup"&&view!=="usuarios"&&view!=="informe"&&!configured&&<NoConnection onSetup={()=>setView("setup")} onNew={()=>setModal("new-conn")}/>}
          {view!=="setup"&&view!=="usuarios"&&view!=="informe"&&configured&&<>
            {syncing&&!products.length&&<LoadingScreen/>}
            {!syncing&&connected===false&&!products.length&&!cachedAt&&<ErrorScreen error={syncErr} onRetry={()=>doSync()} onSetup={()=>setView("setup")}/>}
            {(products.length>0||(connected===true&&!syncing)||cachedAt)&&<>
              {view==="dashboard"&&<Dashboard stockRows={stockRows} alertas={alertas} albaranes={albaranes} traspasos={traspasos} conn={activeConn} onNav={navigate} role={role}/>}
              {view==="alertas"&&<AlertasView stockRows={stockRows} alertas={alertas} warehouses={warehouses} onIrInventario={()=>navigate("regularizacion")} role={role}/>}
              {view==="stock"&&<StockView stockRows={stockRows} warehouses={warehouses} role={role}/>}
              {view==="regularizacion"&&PERMS.canRegularize(role)&&<RegularizacionView stockRows={stockRows} products={products} warehouses={warehouses} conn={activeConn} onGuardar={importarRegularizacion} toast={toast} role={role}/>}
              {view==="pedidos"&&PERMS.canWrite(role)&&<PedidosReposicionView stockRows={stockRows} products={products} warehouses={warehouses} suppliers={suppliers} conn={activeConn} onCrear={importarPedidoReposicion} toast={toast} role={role}/>}
              {view==="historico"&&<HistoricoView albaranes={albaranes} traspasos={traspasos} warehouses={warehouses}/>}
              {view==="albaranes"&&PERMS.canWrite(role)&&<AlbaranesView albaranes={albaranes} products={products} suppliers={suppliers} warehouses={warehouses} conn={activeConn} onImportar={importarAlbaran} toast={toast} role={role}/>}
              {view==="traspasos"&&PERMS.canWrite(role)&&<TraspasosView traspasos={traspasos} products={products} warehouses={warehouses} conn={activeConn} onImportar={importarTraspaso} toast={toast} stockRows={stockRows}/>}
              {view==="productos"&&PERMS.canWrite(role)&&<ProductosView products={products} warehouses={warehouses} suppliers={suppliers} conn={activeConn} onSave={importarProducto} toast={toast} role={role}/>}
              {view==="proveedores"&&<ProveedoresView suppliers={suppliers} albaranes={albaranes}/>}
            </>}
          </>}
        </div>
      </main>
      {/* Connection modals */}
      {modal==="new-conn"&&<Modal title="Nueva conexión con Ágora" onClose={()=>setModal(null)}><ConnectionForm onSave={saveNewConn} onCancel={()=>setModal(null)} toast={toast}/></Modal>}
      {modal==="edit-conn"&&editConn&&<Modal title="Editar conexión" onClose={()=>{setModal(null);setEditConn(null)}}><ConnectionForm initial={editConn} onSave={saveEditConn} onCancel={()=>{setModal(null);setEditConn(null)}} toast={toast}/></Modal>}
      {modal==="manage-conn"&&<Modal title="Gestionar conexiones" onClose={()=>setModal(null)}>
        <ManageConnections connections={connections} activeId={activeId} onSwitch={switchConn} onDelete={deleteConn} onEdit={(c)=>{setEditConn(c);setModal("edit-conn")}} onClose={()=>setModal(null)}/>
        <div style={{marginTop:14,display:"flex",justifyContent:"flex-end"}}><Btn variant="primary" onClick={()=>setModal("new-conn")}><Ic n="plus" s={13}/>Añadir conexión</Btn></div>
      </Modal>}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:#f0f5f6}::-webkit-scrollbar-thumb{background:#c5d8db;border-radius:3px}
        button:focus-visible{outline:2px solid #0592A7;outline-offset:2px}
        input:focus{border-color:#0592A7 !important;box-shadow:0 0 0 3px rgba(5,146,167,0.12) !important}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        @keyframes slideIn{from{opacity:0;transform:translateX(14px)}to{opacity:1;transform:none}}
        @keyframes slideRight{from{transform:translateX(-100%)}to{transform:none}}
        @keyframes slideDown{from{opacity:0;transform:translateY(-100%)}to{opacity:1;transform:none}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @media(max-width:768px){.sidebar-desktop{display:none !important}.topbar-mobile{display:flex !important}.main-pad{padding:16px 14px !important}}
        @media(min-width:769px){.topbar-mobile{display:none !important}}
      `}</style>
    </div>
  )
}
