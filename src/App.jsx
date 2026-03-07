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
//  SIMPLE SCREENS
// ═══════════════════════════════════════════════════════════════════════════════
function LoadingScreen() {
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"60vh",gap:16,color:T.muted}}>
      <Ic n="sync" s={36} spin/>
      <div style={{fontSize:14,fontWeight:500}}>Conectando con Ágora…</div>
    </div>
  )
}
function ErrorScreen({error,onRetry,onSetup}) {
  const isCors=(error||"").toLowerCase().includes("cors")||(error||"").includes("fetch")||(error||"").includes("network")
  return (
    <div style={{maxWidth:480,margin:"60px auto",padding:24}}>
      <div style={{...S.card,textAlign:"center",padding:32}}>
        <div style={{fontSize:40,marginBottom:12}}>⚠️</div>
        <h2 style={{fontSize:17,fontWeight:700,color:T.text,marginBottom:8}}>Error de conexión</h2>
        <p style={{fontSize:13,color:T.muted,marginBottom:20,lineHeight:1.6}}>{error||"No se pudo conectar con Ágora TPV"}</p>
        {isCors&&<div style={{background:"rgba(5,146,167,0.06)",border:"1px solid rgba(5,146,167,0.25)",borderRadius:10,padding:14,marginBottom:16,textAlign:"left"}}>
          <div style={{fontSize:12,fontWeight:700,color:T.accent,marginBottom:6}}>💡 Error CORS — soluciones:</div>
          <ul style={{fontSize:12,color:T.muted,lineHeight:1.8,paddingLeft:18}}>
            <li>Abre StockIn dentro del iframe del TPV de Ágora</li>
            <li>Activa «Proxy vía Claude» en la configuración de conexión</li>
            <li>Configura un proxy CORS en tu servidor</li>
          </ul>
        </div>}
        <div style={{display:"flex",gap:10,justifyContent:"center"}}>
          <Btn onClick={onRetry} variant="primary"><Ic n="sync" s={13}/>Reintentar</Btn>
          <Btn onClick={onSetup} variant="secondary"><Ic n="settings" s={13}/>Configuración</Btn>
        </div>
      </div>
    </div>
  )
}
function NoConnection({onSetup,onNew}) {
  return (
    <div style={{maxWidth:480,margin:"60px auto",padding:24}}>
      <div style={{...S.card,textAlign:"center",padding:32}}>
        <div style={{fontSize:40,marginBottom:12}}>🔌</div>
        <h2 style={{fontSize:17,fontWeight:700,color:T.text,marginBottom:8}}>Sin conexión configurada</h2>
        <p style={{fontSize:13,color:T.muted,marginBottom:20,lineHeight:1.6}}>Configura una conexión con Ágora TPV para empezar.</p>
        <div style={{display:"flex",gap:10,justifyContent:"center"}}>
          <Btn onClick={onNew} variant="primary"><Ic n="plus" s={13}/>Nueva conexión</Btn>
          <Btn onClick={onSetup} variant="secondary"><Ic n="settings" s={13}/>Configuración</Btn>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SETUP VIEW
// ═══════════════════════════════════════════════════════════════════════════════
function SetupView({connections,activeId,onNew,onEdit,onSwitch,onDelete,toast,autoSyncInterval,onAutoSyncChange,whatsappCfg,onWhatsappSave}) {
  const [tab,setTab]=useState("conexiones")
  const [wa,setWa]=useState(whatsappCfg||{enabled:false,phone:"",apikey:""})
  const tabStyle=(t)=>({padding:"8px 16px",border:"none",cursor:"pointer",background:tab===t?T.accent:"transparent",color:tab===t?"#fff":T.muted,borderRadius:6,fontSize:13,fontWeight:600,fontFamily:"inherit"})
  return (
    <div style={{maxWidth:760,margin:"0 auto"}}>
      <div style={{marginBottom:20}}>
        <h1 style={{fontSize:20,fontWeight:800,color:T.brand,margin:0}}>Configuración</h1>
      </div>
      <div style={{display:"flex",gap:4,marginBottom:18,background:T.bg,padding:4,borderRadius:9,width:"fit-content"}}>
        {["conexiones","auto-sync","whatsapp"].map(t=><button key={t} style={tabStyle(t)} onClick={()=>setTab(t)}>{t==="conexiones"?"Conexiones":t==="auto-sync"?"Auto-sync":"WhatsApp"}</button>)}
      </div>
      {tab==="conexiones"&&<div style={S.card}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h2 style={{fontSize:15,fontWeight:700,color:T.brand,margin:0}}>Conexiones con Ágora</h2>
          <Btn small variant="primary" onClick={onNew}><Ic n="plus" s={13}/>Nueva conexión</Btn>
        </div>
        {connections.length===0?<Empty msg="No hay conexiones. Añade una para empezar." icon="link"/>:
        connections.map(c=><div key={c.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:`1px solid ${T.border}`}}>
          <div style={{width:38,height:38,borderRadius:10,background:c.id===activeId?T.accent:T.brand,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700,color:"#fff",flexShrink:0}}>{(c.name||"?")[0].toUpperCase()}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:600,color:T.text}}>{c.name||"Sin nombre"}</div>
            <div style={{fontSize:11,color:T.muted}}>{c.agoraUrl||"iframe/TPV"} · {c.mode==="acms"?"ACMS":"Mono"}{c.id===activeId?" · Activa":""}</div>
          </div>
          <div style={{display:"flex",gap:6}}>
            {c.id!==activeId&&<Btn small variant="success" onClick={()=>onSwitch(c.id)}>Activar</Btn>}
            <Btn small variant="secondary" onClick={()=>onEdit(c)}><Ic n="settings" s={12}/></Btn>
            <Btn small variant="danger" onClick={()=>onDelete(c.id)}><Ic n="trash" s={12}/></Btn>
          </div>
        </div>)}
      </div>}
      {tab==="auto-sync"&&<div style={S.card}>
        <h2 style={{fontSize:15,fontWeight:700,color:T.brand,marginBottom:16}}>Sincronización automática</h2>
        <Field label="Intervalo de sincronización">
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {[0,5,10,15,30].map(v=>(
              <button key={v} onClick={()=>onAutoSyncChange(v)} style={{padding:"8px 16px",borderRadius:8,border:`2px solid ${autoSyncInterval===v?T.accent:T.border}`,background:autoSyncInterval===v?"rgba(5,146,167,0.07)":"#fff",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:600,color:autoSyncInterval===v?T.accent:T.text}}>
                {v===0?"Desactivado":`${v} min`}
              </button>
            ))}
          </div>
        </Field>
        <p style={{fontSize:12,color:T.muted,marginTop:12,lineHeight:1.6}}>Cuando está activo, StockIn se sincroniza automáticamente con Ágora cada X minutos. El contador regresivo aparece en la barra lateral.</p>
      </div>}
      {tab==="whatsapp"&&<div style={S.card}>
        <h2 style={{fontSize:15,fontWeight:700,color:T.brand,marginBottom:4}}>Alertas por WhatsApp</h2>
        <p style={{fontSize:12,color:T.muted,marginBottom:16,lineHeight:1.6}}>Usa <b>CallMeBot</b> (gratis). Envía «I allow callmebot to send me messages» al +34 644 64 26 64 en WhatsApp para obtener tu apikey.</p>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <input type="checkbox" id="wa_enabled" checked={wa.enabled} onChange={e=>setWa(p=>({...p,enabled:e.target.checked}))} style={{width:16,height:16,accentColor:T.accent}}/>
            <label htmlFor="wa_enabled" style={{fontSize:13,fontWeight:600,color:T.text,cursor:"pointer"}}>Activar alertas WhatsApp</label>
          </div>
          <Field label="Número de teléfono (con prefijo, sin +)">
            <input value={wa.phone} onChange={e=>setWa(p=>({...p,phone:e.target.value}))} placeholder="34612345678" style={S.inp} disabled={!wa.enabled}/>
          </Field>
          <Field label="API Key de CallMeBot">
            <input value={wa.apikey} onChange={e=>setWa(p=>({...p,apikey:e.target.value}))} placeholder="123456" style={S.inp} disabled={!wa.enabled}/>
          </Field>
          <div style={{display:"flex",gap:8}}>
            <Btn variant="primary" onClick={()=>{onWhatsappSave(wa);toast("Configuración de WhatsApp guardada")}}>Guardar</Btn>
            <Btn variant="secondary" onClick={async()=>{
              if(!wa.phone||!wa.apikey){toast("Introduce teléfono y apikey","err");return}
              try{await fetch(`https://api.callmebot.com/whatsapp.php?phone=${wa.phone}&text=${encodeURIComponent("✅ StockIn — Prueba de alertas OK")}&apikey=${wa.apikey}`);toast("Mensaje de prueba enviado")}catch(e){toast("Error: "+e.message,"err")}
            }}>Probar</Btn>
          </div>
        </div>
      </div>}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
function Dashboard({stockRows,alertas,albaranes,traspasos,conn,onNav,role}) {
  const agotados=stockRows.filter(r=>r.Quantity<=0)
  const bajoMin=stockRows.filter(r=>r.minStock>0&&r.Quantity>0&&r.Quantity<r.minStock)
  const sobreMax=stockRows.filter(r=>r.maxStock>0&&r.Quantity>r.maxStock)
  const valorTotal=stockRows.reduce((s,r)=>{const p=r.salePrice??0;return s+r.Quantity*p},0)
  const kpis=[
    {label:"Productos",val:new Set(stockRows.map(r=>r.ProductId)).size,icon:"box",color:T.accent},
    {label:"Valor stock",val:"€"+valorTotal.toFixed(0),icon:"euro",color:T.brand},
    {label:"Agotados",val:agotados.length,icon:"alert",color:T.red,link:"alertas"},
    {label:"Bajo mínimo",val:bajoMin.length,icon:"alert",color:T.orange,link:"alertas"},
  ]
  const recentAlb=albaranes.slice(0,6)
  const fmtDate=(d)=>{if(!d)return"—";try{return new Date(d).toLocaleDateString("es-ES",{day:"2-digit",month:"2-digit"})}catch{return d}}
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h1 style={{fontSize:20,fontWeight:800,color:T.brand,margin:0}}>Dashboard</h1>
        {conn&&<div style={{fontSize:12,color:T.muted}}>{conn.name||conn.agoraUrl||"Conectado"}</div>}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:14,marginBottom:24}}>
        {kpis.map(k=>(
          <div key={k.label} onClick={k.link?()=>onNav(k.link):undefined} style={{...S.card,cursor:k.link?"pointer":"default",display:"flex",alignItems:"center",gap:14,padding:18,transition:"box-shadow 0.15s"}}
            onMouseEnter={e=>{if(k.link)e.currentTarget.style.boxShadow="0 4px 16px rgba(3,70,80,0.12)"}}
            onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 3px rgba(3,70,80,0.07)"}>
            <div style={{width:44,height:44,borderRadius:12,background:`${k.color}18`,display:"flex",alignItems:"center",justifyContent:"center",color:k.color,flexShrink:0}}>
              <Ic n={k.icon} s={22}/>
            </div>
            <div>
              <div style={{fontSize:22,fontWeight:800,color:k.color,lineHeight:1}}>{k.val}</div>
              <div style={{fontSize:12,color:T.muted,marginTop:3}}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div style={S.card}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <h3 style={{fontSize:14,fontWeight:700,color:T.brand,margin:0}}>Alertas activas</h3>
            <Btn small variant="secondary" onClick={()=>onNav("alertas")}><Ic n="alert" s={12}/>Ver todas</Btn>
          </div>
          {alertas.length===0?<Empty msg="Sin alertas activas" icon="check"/>:
          alertas.slice(0,5).map((r,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${T.border}`}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:r.Quantity<=0?T.red:T.orange,flexShrink:0}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:600,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.prod?.Name||r.ProductId}</div>
                <div style={{fontSize:11,color:T.muted}}>{r.whName} · stock: {r.Quantity} / mín: {r.minStock}</div>
              </div>
            </div>
          ))}
          {alertas.length>5&&<div style={{fontSize:11,color:T.muted,textAlign:"center",paddingTop:8}}>y {alertas.length-5} más…</div>}
        </div>
        <div style={S.card}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <h3 style={{fontSize:14,fontWeight:700,color:T.brand,margin:0}}>Últimas entradas</h3>
            <Btn small variant="secondary" onClick={()=>onNav("albaranes")}><Ic n="albaran" s={12}/>Ver todas</Btn>
          </div>
          {recentAlb.length===0?<Empty msg="Sin albaranes recientes" icon="albaran"/>:
          recentAlb.map((a,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${T.border}`}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:600,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.Supplier?.Name||a.SupplierId||"Proveedor"}</div>
                <div style={{fontSize:11,color:T.muted}}>{fmtDate(a.Date)} · {(a.Lines||[]).length} líneas</div>
              </div>
              <StatusBadge status={a.Status}/>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ALERTAS VIEW
// ═══════════════════════════════════════════════════════════════════════════════
function AlertasView({stockRows,alertas,warehouses,onIrInventario,role}) {
  const [tab,setTab]=useState("agotados")
  const agotados=stockRows.filter(r=>r.Quantity<=0&&r.minStock>0)
  const bajoMin=stockRows.filter(r=>r.minStock>0&&r.Quantity>0&&r.Quantity<r.minStock)
  const sobreMax=stockRows.filter(r=>r.maxStock>0&&r.Quantity>r.maxStock)
  const rows={agotados,bajoMin,sobreMax}
  const labels={agotados:`Agotados (${agotados.length})`,bajoMin:`Bajo mínimo (${bajoMin.length})`,sobreMax:`Sobre máximo (${sobreMax.length})`}
  const tabStyle=(t)=>({padding:"7px 14px",border:"none",cursor:"pointer",background:tab===t?T.accent:"transparent",color:tab===t?"#fff":T.muted,borderRadius:6,fontSize:12,fontWeight:600,fontFamily:"inherit"})
  const current=rows[tab]||[]
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <h1 style={{fontSize:20,fontWeight:800,color:T.brand,margin:0}}>Alertas de stock</h1>
        <Btn small variant="primary" onClick={onIrInventario}><Ic n="adjust" s={13}/>Ir a regularización</Btn>
      </div>
      <div style={{display:"flex",gap:4,marginBottom:16,background:T.bg,padding:4,borderRadius:9,width:"fit-content"}}>
        {Object.entries(labels).map(([k,v])=><button key={k} style={{...tabStyle(k),color:tab===k?"#fff":k==="agotados"?T.red:k==="bajoMin"?T.orange:T.yellow}} onClick={()=>setTab(k)}>{v}</button>)}
      </div>
      <div style={S.card}>
        {current.length===0?<Empty msg="Sin alertas en esta categoría" icon="check"/>:
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr>
            {["Producto","Familia","Almacén","Stock actual","Mín","Máx","Diferencia"].map(h=><th key={h} style={thSt}>{h}</th>)}
          </tr></thead>
          <tbody>
          {current.map((r,i)=>{
            const diff=tab==="agotados"?r.minStock:tab==="bajoMin"?r.minStock-r.Quantity:r.Quantity-r.maxStock
            const clr=tab==="agotados"?T.red:tab==="bajoMin"?T.orange:T.yellow
            return <tr key={i} style={{background:i%2?"#f8fbfb":"#fff"}}>
              <td style={{padding:"9px 14px",fontSize:13,fontWeight:600,color:T.text}}>{r.prod?.Name||r.ProductId}</td>
              <td style={{padding:"9px 14px",fontSize:12,color:T.muted}}>{r.prod?.FamilyName||"—"}</td>
              <td style={{padding:"9px 14px",fontSize:12,color:T.muted}}>{r.whName}</td>
              <td style={{padding:"9px 14px"}}><span style={{fontWeight:700,color:clr}}>{r.Quantity}</span></td>
              <td style={{padding:"9px 14px",fontSize:12,color:T.muted}}>{r.minStock||"—"}</td>
              <td style={{padding:"9px 14px",fontSize:12,color:T.muted}}>{r.maxStock||"—"}</td>
              <td style={{padding:"9px 14px"}}><span style={{color:clr,fontWeight:700,fontSize:12}}>+{diff}</span></td>
            </tr>
          })}
          </tbody>
        </table>}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  STOCK VIEW  (con rotación de stock)
// ═══════════════════════════════════════════════════════════════════════════════
function StockView({stockRows,warehouses,role,albaranes}) {
  const [search,setSearch]=useState("")
  const [whFilter,setWhFilter]=useState("")
  const [famFilter,setFamFilter]=useState("")
  const [sort,setSort]=useState({col:"prod",dir:1})
  const seePrices=PERMS.seeCostPrices(role)

  // Calcular consumo diario por producto a partir de albaranes (últimos 30 días)
  const consumoDiario=useMemo(()=>{
    const cutoff=new Date();cutoff.setDate(cutoff.getDate()-30)
    const map={}
    ;(albaranes||[]).forEach(alb=>{
      if(!alb.Date||new Date(alb.Date)<cutoff) return
      ;(alb.Lines||[]).forEach(l=>{
        const pid=l.ProductId
        if(!map[pid]) map[pid]=0
        map[pid]+=(l.DeliveredQuantity||l.OrderedQuantity||0)
      })
    })
    Object.keys(map).forEach(k=>{ map[k]=map[k]/30 })
    return map
  },[albaranes])

  const families=[...new Set(stockRows.map(r=>r.prod?.FamilyName||"—").filter(Boolean))].sort()

  const sortedRows=useMemo(()=>{
    let rows=[...stockRows]
    if(search) rows=rows.filter(r=>(r.prod?.Name||"").toLowerCase().includes(search.toLowerCase())||(r.prod?.Reference||"").toLowerCase().includes(search.toLowerCase()))
    if(whFilter) rows=rows.filter(r=>String(r.WarehouseId)===whFilter)
    if(famFilter) rows=rows.filter(r=>(r.prod?.FamilyName||"—")===famFilter)
    rows.sort((a,b)=>{
      let va,vb
      if(sort.col==="prod"){va=a.prod?.Name||"";vb=b.prod?.Name||""}
      else if(sort.col==="qty"){va=a.Quantity;vb=b.Quantity}
      else if(sort.col==="dias"){
        const ca=consumoDiario[a.ProductId]||0;const cb=consumoDiario[b.ProductId]||0
        va=ca>0?a.Quantity/ca:99999;vb=cb>0?b.Quantity/cb:99999
      }
      else{va=a[sort.col]||0;vb=b[sort.col]||0}
      return va<vb?-sort.dir:va>vb?sort.dir:0
    })
    return rows
  },[stockRows,search,whFilter,famFilter,sort,consumoDiario])

  const Th=({col,children})=>(
    <th style={{...thSt,cursor:"pointer",userSelect:"none"}} onClick={()=>setSort(s=>({col,dir:s.col===col?-s.dir:1}))}>
      {children}{sort.col===col?(sort.dir===1?" ↑":" ↓"):""}
    </th>
  )
  const diasRestantes=(row)=>{
    const c=consumoDiario[row.ProductId]||0
    if(c<=0) return null
    return Math.round(row.Quantity/c)
  }
  const diasColor=(d)=>d<7?T.red:d<14?T.orange:T.green

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18,flexWrap:"wrap",gap:12}}>
        <h1 style={{fontSize:20,fontWeight:800,color:T.brand,margin:0}}>Stock actual</h1>
        <div style={{fontSize:13,color:T.muted}}>{sortedRows.length} líneas</div>
      </div>
      <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
        <div style={{position:"relative",flex:"1 1 220px"}}>
          <Ic n="search" s={14} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:T.muted,pointerEvents:"none"}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar producto o referencia…" style={{...S.inp,paddingLeft:34}}/>
        </div>
        <select value={whFilter} onChange={e=>setWhFilter(e.target.value)} style={{...S.inp,width:"auto",flex:"0 0 auto"}}>
          <option value="">Todos los almacenes</option>
          {warehouses.map(w=><option key={w.Id} value={String(w.Id)}>{w.Name}</option>)}
        </select>
        <select value={famFilter} onChange={e=>setFamFilter(e.target.value)} style={{...S.inp,width:"auto",flex:"0 0 auto"}}>
          <option value="">Todas las familias</option>
          {families.map(f=><option key={f} value={f}>{f}</option>)}
        </select>
      </div>
      <div style={{...S.card,padding:0,overflow:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:700}}>
          <thead><tr>
            <Th col="prod">Producto</Th>
            <th style={thSt}>Ref</th>
            <th style={thSt}>Familia</th>
            <th style={thSt}>Almacén</th>
            <th style={thSt}>Ubicación</th>
            <Th col="qty">Stock</Th>
            <th style={thSt}>Mín</th>
            <th style={thSt}>Máx</th>
            <Th col="dias">Días restantes</Th>
            {seePrices&&<th style={thSt}>P. Coste</th>}
            <th style={thSt}>P. Venta</th>
          </tr></thead>
          <tbody>
          {sortedRows.length===0&&<tr><td colSpan={10} style={{padding:32,textAlign:"center",color:T.muted}}>Sin resultados</td></tr>}
          {sortedRows.map((r,i)=>{
            const dias=diasRestantes(r)
            const stockClr=r.Quantity<=0?T.red:r.minStock>0&&r.Quantity<r.minStock?T.orange:r.maxStock>0&&r.Quantity>r.maxStock?T.yellow:T.green
            return <tr key={i} style={{background:i%2?"#f8fbfb":"#fff",borderBottom:`1px solid ${T.border}`}}>
              <td style={{padding:"9px 14px",fontSize:13,fontWeight:600,color:T.text,maxWidth:220,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.prod?.Name||r.ProductId}</td>
              <td style={{padding:"9px 14px",fontSize:11,color:T.muted,fontFamily:"monospace"}}>{r.prod?.Reference||"—"}</td>
              <td style={{padding:"9px 14px",fontSize:12,color:T.muted}}>{r.prod?.FamilyName||"—"}</td>
              <td style={{padding:"9px 14px",fontSize:12,color:T.muted}}>{r.whName}</td>
              <td style={{padding:"9px 14px",fontSize:12,color:T.muted}}>{r.loc||"—"}</td>
              <td style={{padding:"9px 14px"}}><span style={{fontWeight:700,color:stockClr}}>{r.Quantity}</span></td>
              <td style={{padding:"9px 14px",fontSize:12,color:T.muted}}>{r.minStock||"—"}</td>
              <td style={{padding:"9px 14px",fontSize:12,color:T.muted}}>{r.maxStock||"—"}</td>
              <td style={{padding:"9px 14px"}}>{dias!==null
                ?<span style={{fontWeight:700,color:diasColor(dias),fontSize:12}}>{dias}d</span>
                :<span style={{color:T.muted,fontSize:12}}>—</span>
              }</td>
              {seePrices&&<td style={{padding:"9px 14px",fontSize:12,color:T.muted}}>{r.costPrice!=null?`€${fmt(r.costPrice)}`:"—"}</td>}
              <td style={{padding:"9px 14px",fontSize:12,color:T.muted}}>{r.salePrice!=null?`€${fmt(r.salePrice)}`:"—"}</td>
            </tr>
          })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  BARCODE SCANNER
// ═══════════════════════════════════════════════════════════════════════════════
function BarcodeScanner({onScan,onClose}) {
  const videoRef=useRef(null)
  const readerRef=useRef(null)
  const [err,setErr]=useState(null)
  const [ready,setReady]=useState(false)

  useEffect(()=>{
    let cancelled=false
    import('@zxing/browser').then(({BrowserMultiFormatReader})=>{
      if(cancelled) return
      readerRef.current=new BrowserMultiFormatReader()
      setReady(true)
      readerRef.current.decodeFromVideoDevice(undefined,videoRef.current,(result,error)=>{
        if(cancelled) return
        if(result){
          onScan(result.getText())
          onClose()
        }
      }).catch(e=>setErr(e.message))
    }).catch(()=>setErr("Instala @zxing/browser: npm install @zxing/browser"))
    return()=>{
      cancelled=true
      try{readerRef.current?.reset()}catch{}
    }
  },[])

  return (
    <Modal title="Escanear código de barras" onClose={onClose} maxW={480}>
      {err
        ?<div style={{padding:16,background:"#fff5f5",border:`1px solid ${T.red}`,borderRadius:8,color:T.red,fontSize:13}}>{err}</div>
        :<div>
          <video ref={videoRef} style={{width:"100%",borderRadius:8,background:"#000",minHeight:240}} muted autoPlay playsInline/>
          {!ready&&<div style={{textAlign:"center",padding:16,color:T.muted,fontSize:13}}>Iniciando cámara…</div>}
          <p style={{fontSize:12,color:T.muted,marginTop:10,textAlign:"center"}}>Enfoca el código de barras del producto</p>
        </div>
      }
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  REGULARIZACIÓN VIEW  (3 pasos)
// ═══════════════════════════════════════════════════════════════════════════════
function RegularizacionView({stockRows,products,warehouses,conn,onGuardar,toast,role}) {
  const [step,setStep]=useState(1)
  const [whId,setWhId]=useState("")
  const [search,setSearch]=useState("")
  const [selected,setSelected]=useState([]) // [{ProductId,productName,currentQty,cantidad,costPrice,loc}]
  const [motivo,setMotivo]=useState("")
  const [tipo,setTipo]=useState("entrada")
  const [sending,setSending]=useState(false)
  const [showScanner,setShowScanner]=useState(false)
  const seePrices=PERMS.seeCostPrices(role)

  const whRows=stockRows.filter(r=>!whId||String(r.WarehouseId)===whId)
  const filteredRows=whRows.filter(r=>(r.prod?.Name||"").toLowerCase().includes(search.toLowerCase())||(r.prod?.Reference||"").toLowerCase().includes(search.toLowerCase()))

  const isSelected=(pid)=>selected.some(s=>s.ProductId===pid)
  const toggleProduct=(row)=>{
    setSelected(prev=>{
      if(isSelected(row.ProductId)) return prev.filter(s=>s.ProductId!==row.ProductId)
      return [...prev,{ProductId:row.ProductId,productName:row.prod?.Name||String(row.ProductId),currentQty:row.Quantity,cantidad:"0",costPrice:row.costPrice!=null?String(row.costPrice):"0",loc:row.loc||""}]
    })
  }
  const updateLine=(pid,field,val)=>setSelected(prev=>prev.map(s=>s.ProductId===pid?{...s,[field]:val}:s))

  const handleScan=(barcode)=>{
    const row=stockRows.find(r=>r.prod?.Barcode===barcode||r.prod?.Reference===barcode)
    if(!row){toast("Código no encontrado: "+barcode,"err");return}
    if(!isSelected(row.ProductId)) toggleProduct(row)
    toast("Producto encontrado: "+row.prod?.Name)
  }

  const confirmar=async()=>{
    const lineas=selected.filter(s=>parseFloat(s.cantidad)!==0&&parseFloat(s.cantidad)!==s.currentQty)
    if(!lineas.length){toast("No hay cambios que registrar","err");return}
    setSending(true)
    try{
      await onGuardar({lineas,motivo,warehouseId:parseInt(whId)||null,tipo})
      toast("Regularización enviada a Ágora ✓")
      setStep(1);setSelected([]);setMotivo("");setSearch("")
    }catch(e){toast("Error: "+e.message,"err")}
    finally{setSending(false)}
  }

  const StepIndicator=()=>(
    <div style={{display:"flex",alignItems:"center",gap:0,marginBottom:24}}>
      {[1,2,3].map((s,i)=>(
        <div key={s} style={{display:"flex",alignItems:"center"}}>
          <div style={{width:28,height:28,borderRadius:"50%",background:step>=s?T.accent:T.border,color:step>=s?"#fff":"#999",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,flexShrink:0}}>{s}</div>
          {i<2&&<div style={{width:40,height:2,background:step>s?T.accent:T.border}}/>}
        </div>
      ))}
      <div style={{marginLeft:12,fontSize:13,color:T.muted}}>{step===1?"Seleccionar productos":step===2?"Introducir cantidades":"Confirmar"}</div>
    </div>
  )

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h1 style={{fontSize:20,fontWeight:800,color:T.brand,margin:0}}>Regularización de inventario</h1>
      </div>
      <StepIndicator/>

      {step===1&&<div style={S.card}>
        <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
          <select value={whId} onChange={e=>{setWhId(e.target.value);setSelected([])}} style={{...S.inp,width:"auto",flex:"0 0 auto"}}>
            <option value="">Todos los almacenes</option>
            {warehouses.map(w=><option key={w.Id} value={String(w.Id)}>{w.Name}</option>)}
          </select>
          <div style={{position:"relative",flex:"1 1 200px"}}>
            <Ic n="search" s={14} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:T.muted,pointerEvents:"none"}}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar producto…" style={{...S.inp,paddingLeft:34}}/>
          </div>
          <Btn small variant="secondary" onClick={()=>setShowScanner(true)}><Ic n="camera" s={13}/>Escanear</Btn>
        </div>
        {selected.length>0&&<div style={{marginBottom:10,fontSize:12,color:T.accent,fontWeight:600}}>{selected.length} producto{selected.length>1?"s":""} seleccionado{selected.length>1?"s":""}</div>}
        <div style={{maxHeight:420,overflowY:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>
              <th style={thSt}><input type="checkbox" onChange={e=>{if(e.target.checked)setSelected(filteredRows.map(r=>({ProductId:r.ProductId,productName:r.prod?.Name||String(r.ProductId),currentQty:r.Quantity,cantidad:"0",costPrice:String(r.costPrice??0),loc:r.loc||""})));else setSelected([])}} checked={filteredRows.length>0&&filteredRows.every(r=>isSelected(r.ProductId))} style={{accentColor:T.accent}}/></th>
              <th style={thSt}>Producto</th>
              <th style={thSt}>Almacén</th>
              <th style={thSt}>Stock actual</th>
              <th style={thSt}>Ubicación</th>
            </tr></thead>
            <tbody>
            {filteredRows.length===0&&<tr><td colSpan={5} style={{padding:24,textAlign:"center",color:T.muted}}>Sin productos</td></tr>}
            {filteredRows.map((r,i)=>(
              <tr key={i} style={{background:isSelected(r.ProductId)?"rgba(5,146,167,0.05)":i%2?"#f8fbfb":"#fff",cursor:"pointer"}} onClick={()=>toggleProduct(r)}>
                <td style={{padding:"9px 14px"}}><input type="checkbox" checked={isSelected(r.ProductId)} onChange={()=>{}} style={{accentColor:T.accent}}/></td>
                <td style={{padding:"9px 14px",fontSize:13,fontWeight:600,color:T.text}}>{r.prod?.Name||r.ProductId}</td>
                <td style={{padding:"9px 14px",fontSize:12,color:T.muted}}>{r.whName}</td>
                <td style={{padding:"9px 14px",fontWeight:700,color:r.Quantity<=0?T.red:T.text}}>{r.Quantity}</td>
                <td style={{padding:"9px 14px",fontSize:12,color:T.muted}}>{r.loc||"—"}</td>
              </tr>
            ))}
            </tbody>
          </table>
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",marginTop:16}}>
          <Btn variant="primary" disabled={selected.length===0} onClick={()=>setStep(2)}>Siguiente ({selected.length}) →</Btn>
        </div>
      </div>}

      {step===2&&<div style={S.card}>
        <div style={{display:"flex",gap:10,marginBottom:16,alignItems:"center"}}>
          <div>
            <label style={S.label}>Tipo de ajuste</label>
            <div style={{display:"flex",gap:6}}>
              {[{v:"entrada",l:"Entrada"},{v:"salida",l:"Salida"}].map(o=>(
                <button key={o.v} onClick={()=>setTipo(o.v)} style={{padding:"7px 14px",border:`2px solid ${tipo===o.v?T.accent:T.border}`,borderRadius:8,cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:600,color:tipo===o.v?T.accent:T.muted,background:tipo===o.v?"rgba(5,146,167,0.06)":"#fff"}}>{o.l}</button>
              ))}
            </div>
          </div>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse",marginBottom:16}}>
          <thead><tr>
            <th style={thSt}>Producto</th>
            <th style={thSt}>Stock actual</th>
            <th style={thSt}>Cantidad a {tipo==="entrada"?"añadir":"quitar"}</th>
            <th style={thSt}>Resultado</th>
            {seePrices&&<th style={thSt}>P. Coste</th>}
          </tr></thead>
          <tbody>
          {selected.map((s,i)=>{
            const qty=parseFloat(s.cantidad)||0
            const result=tipo==="entrada"?s.currentQty+qty:s.currentQty-qty
            return <tr key={i} style={{borderBottom:`1px solid ${T.border}`}}>
              <td style={{padding:"10px 14px",fontSize:13,fontWeight:600,color:T.text}}>{s.productName}</td>
              <td style={{padding:"10px 14px",fontWeight:600}}>{s.currentQty}</td>
              <td style={{padding:"10px 14px"}}>
                <input type="number" min="0" step="0.001" value={s.cantidad} onChange={e=>updateLine(s.ProductId,"cantidad",e.target.value)} style={{...S.inp,width:100,textAlign:"right"}}/>
              </td>
              <td style={{padding:"10px 14px"}}><span style={{fontWeight:700,color:result<0?T.red:result===0?T.muted:T.green}}>{result.toFixed(3)}</span></td>
              {seePrices&&<td style={{padding:"10px 14px"}}>
                <input type="number" step="0.01" value={s.costPrice} onChange={e=>updateLine(s.ProductId,"costPrice",e.target.value)} style={{...S.inp,width:90,textAlign:"right"}} placeholder="€"/>
              </td>}
            </tr>
          })}
          </tbody>
        </table>
        <Field label="Motivo de regularización">
          <input value={motivo} onChange={e=>setMotivo(e.target.value)} placeholder="Inventario periódico, merma, rotura…" style={S.inp}/>
        </Field>
        <div style={{display:"flex",gap:10,justifyContent:"space-between",marginTop:16}}>
          <Btn variant="secondary" onClick={()=>setStep(1)}>← Volver</Btn>
          <Btn variant="primary" onClick={()=>setStep(3)}>Revisar →</Btn>
        </div>
      </div>}

      {step===3&&<div style={S.card}>
        <h3 style={{fontSize:15,fontWeight:700,color:T.brand,marginBottom:16}}>Resumen — confirmar regularización</h3>
        <div style={{background:T.bg,borderRadius:8,padding:14,marginBottom:16}}>
          <div style={{fontSize:12,color:T.muted}}>Tipo: <strong style={{color:T.text}}>{tipo==="entrada"?"Entrada":"Salida"}</strong></div>
          {motivo&&<div style={{fontSize:12,color:T.muted,marginTop:4}}>Motivo: <strong style={{color:T.text}}>{motivo}</strong></div>}
        </div>
        <table style={{width:"100%",borderCollapse:"collapse",marginBottom:16}}>
          <thead><tr>
            <th style={thSt}>Producto</th>
            <th style={thSt}>Antes</th>
            <th style={thSt}>Ajuste</th>
            <th style={thSt}>Después</th>
          </tr></thead>
          <tbody>
          {selected.filter(s=>parseFloat(s.cantidad)!==0).map((s,i)=>{
            const qty=parseFloat(s.cantidad)||0
            const result=tipo==="entrada"?s.currentQty+qty:s.currentQty-qty
            return <tr key={i} style={{borderBottom:`1px solid ${T.border}`}}>
              <td style={{padding:"9px 14px",fontSize:13,fontWeight:600}}>{s.productName}</td>
              <td style={{padding:"9px 14px",color:T.muted}}>{s.currentQty}</td>
              <td style={{padding:"9px 14px",color:tipo==="entrada"?T.green:T.red,fontWeight:700}}>{tipo==="entrada"?"+":"-"}{qty}</td>
              <td style={{padding:"9px 14px",fontWeight:700,color:result<0?T.red:T.green}}>{result.toFixed(3)}</td>
            </tr>
          })}
          </tbody>
        </table>
        <div style={{display:"flex",gap:10,justifyContent:"space-between"}}>
          <Btn variant="secondary" onClick={()=>setStep(2)}>← Volver</Btn>
          <Btn variant="primary" disabled={sending} onClick={confirmar}><Ic n={sending?"sync":"check"} s={13} spin={sending}/>{sending?"Enviando…":"Confirmar y enviar a Ágora"}</Btn>
        </div>
      </div>}

      {showScanner&&<BarcodeScanner onScan={handleScan} onClose={()=>setShowScanner(false)}/>}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PEDIDOS REPOSICIÓN
// ═══════════════════════════════════════════════════════════════════════════════
function PedidosReposicionView({stockRows,products,warehouses,suppliers,conn,onCrear,toast,role}) {
  const [suppId,setSuppId]=useState("")
  const [whId,setWhId]=useState("")
  const [lines,setLines]=useState([])
  const [sending,setSending]=useState(false)
  const [search,setSearch]=useState("")
  const seePrices=PERMS.seeCostPrices(role)

  const bajoMin=stockRows.filter(r=>r.minStock>0&&r.Quantity<r.minStock)

  const addBajoMinimo=()=>{
    const toAdd=bajoMin.filter(r=>!whId||String(r.WarehouseId)===whId)
      .filter(r=>!lines.some(l=>l.ProductId===r.ProductId))
    if(!toAdd.length){toast("Todos los productos bajo mínimo ya están en el pedido","warn");return}
    setLines(prev=>[...prev,...toAdd.map(r=>({
      ProductId:r.ProductId,
      productName:r.prod?.Name||String(r.ProductId),
      qty:String(Math.max(r.minStock-r.Quantity,1)),
      costPrice:String(r.costPrice??0)
    }))])
    toast(`${toAdd.length} productos añadidos`)
  }

  const addProduct=(prod)=>{
    if(lines.some(l=>l.ProductId===prod.Id)) return
    setLines(prev=>[...prev,{ProductId:prod.Id,productName:prod.Name,qty:"1",costPrice:String(prod.CostPrice??0)}])
    setSearch("")
  }
  const updateLine=(pid,field,val)=>setLines(prev=>prev.map(l=>l.ProductId===pid?{...l,[field]:val}:l))
  const removeLine=(pid)=>setLines(prev=>prev.filter(l=>l.ProductId!==pid))

  const searchResults=products.filter(p=>search&&(p.Name||"").toLowerCase().includes(search.toLowerCase())).slice(0,5)

  const enviar=async()=>{
    if(!lines.length){toast("Añade productos al pedido","err");return}
    setSending(true)
    try{
      const pedido={
        SupplierId:parseInt(suppId)||null,
        WarehouseId:parseInt(whId)||null,
        ExpectedDeliveryDate:new Date(Date.now()+7*864e5).toISOString().slice(0,10),
        Notes:"Pedido de reposición StockIn",
        Lines:lines.map(l=>({ProductId:l.ProductId,OrderedQuantity:parseFloat(l.qty)||1,CostPrice:parseFloat(l.costPrice)||0}))
      }
      await onCrear(pedido)
      setLines([]);toast("Pedido enviado a Ágora ✓")
    }catch(e){toast("Error: "+e.message,"err")}
    finally{setSending(false)}
  }

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h1 style={{fontSize:20,fontWeight:800,color:T.brand,margin:0}}>Pedido de reposición</h1>
        <div style={{display:"flex",gap:8}}>
          <Btn small variant="secondary" onClick={addBajoMinimo}><Ic n="alert" s={13}/>Añadir todos bajo mínimo ({bajoMin.length})</Btn>
          <Btn small variant="primary" disabled={sending||!lines.length} onClick={enviar}><Ic n={sending?"sync":"cart"} s={13} spin={sending}/>{sending?"Enviando…":"Enviar a Ágora"}</Btn>
        </div>
      </div>
      <div style={{display:"flex",gap:14,marginBottom:14,flexWrap:"wrap"}}>
        <div style={{flex:"1 1 200px"}}>
          <label style={S.label}>Proveedor</label>
          <select value={suppId} onChange={e=>setSuppId(e.target.value)} style={S.inp}>
            <option value="">Sin proveedor específico</option>
            {suppliers.map(s=><option key={s.Id} value={String(s.Id)}>{s.Name}</option>)}
          </select>
        </div>
        <div style={{flex:"1 1 160px"}}>
          <label style={S.label}>Almacén destino</label>
          <select value={whId} onChange={e=>setWhId(e.target.value)} style={S.inp}>
            <option value="">Sin especificar</option>
            {warehouses.map(w=><option key={w.Id} value={String(w.Id)}>{w.Name}</option>)}
          </select>
        </div>
      </div>

      <div style={S.card}>
        <div style={{position:"relative",marginBottom:14}}>
          <Ic n="search" s={14} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:T.muted,pointerEvents:"none"}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Añadir producto por nombre…" style={{...S.inp,paddingLeft:34}}/>
          {searchResults.length>0&&<div style={{position:"absolute",top:"100%",left:0,right:0,background:"#fff",border:`1px solid ${T.border}`,borderRadius:8,boxShadow:"0 8px 24px rgba(3,70,80,0.12)",zIndex:50}}>
            {searchResults.map(p=><div key={p.Id} onClick={()=>addProduct(p)} style={{padding:"9px 14px",cursor:"pointer",fontSize:13,borderBottom:`1px solid ${T.border}`}}
              onMouseEnter={e=>e.currentTarget.style.background="#f5f9fa"}
              onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
              {p.Name}
            </div>)}
          </div>}
        </div>

        {lines.length===0
          ?<Empty msg="Añade productos o pulsa «Añadir todos bajo mínimo»" icon="cart"/>
          :<table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>
              <th style={thSt}>Producto</th>
              <th style={thSt}>Cantidad</th>
              {seePrices&&<th style={thSt}>P. Coste</th>}
              <th style={thSt}></th>
            </tr></thead>
            <tbody>
            {lines.map((l,i)=>(
              <tr key={i} style={{borderBottom:`1px solid ${T.border}`}}>
                <td style={{padding:"10px 14px",fontSize:13,fontWeight:600,color:T.text}}>{l.productName}</td>
                <td style={{padding:"10px 14px"}}>
                  <input type="number" min="0" step="0.001" value={l.qty} onChange={e=>updateLine(l.ProductId,"qty",e.target.value)} style={{...S.inp,width:90,textAlign:"right"}}/>
                </td>
                {seePrices&&<td style={{padding:"10px 14px"}}>
                  <input type="number" step="0.01" value={l.costPrice} onChange={e=>updateLine(l.ProductId,"costPrice",e.target.value)} style={{...S.inp,width:90,textAlign:"right"}} placeholder="€"/>
                </td>}
                <td style={{padding:"10px 14px"}}>
                  <Btn small variant="danger" onClick={()=>removeLine(l.ProductId)}><Ic n="trash" s={12}/></Btn>
                </td>
              </tr>
            ))}
            </tbody>
          </table>
        }
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  HISTORICO VIEW
// ═══════════════════════════════════════════════════════════════════════════════
function HistoricoView({albaranes,traspasos,warehouses}) {
  const [tab,setTab]=useState("albaranes")
  const [search,setSearch]=useState("")
  const fmtDate=(d)=>{if(!d)return"—";try{return new Date(d).toLocaleDateString("es-ES",{day:"2-digit",month:"2-digit",year:"numeric"})}catch{return d}}
  const tabStyle=(t)=>({padding:"7px 14px",border:"none",cursor:"pointer",background:tab===t?T.accent:"transparent",color:tab===t?"#fff":T.muted,borderRadius:6,fontSize:12,fontWeight:600,fontFamily:"inherit"})
  const wh=(id)=>warehouses.find(w=>w.Id===id)?.Name||`Almacén ${id}`

  const filtAlb=albaranes.filter(a=>!search||(a.Supplier?.Name||"").toLowerCase().includes(search.toLowerCase()))
  const filtTr=traspasos.filter(t=>!search||wh(t.SourceWarehouseId).toLowerCase().includes(search.toLowerCase())||wh(t.TargetWarehouseId).toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <h1 style={{fontSize:20,fontWeight:800,color:T.brand,margin:0}}>Historial de movimientos</h1>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:14,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:4,background:T.bg,padding:4,borderRadius:9}}>
          <button style={tabStyle("albaranes")} onClick={()=>setTab("albaranes")}>Albaranes ({albaranes.length})</button>
          <button style={tabStyle("traspasos")} onClick={()=>setTab("traspasos")}>Traspasos ({traspasos.length})</button>
        </div>
        <div style={{position:"relative",flex:"1 1 200px"}}>
          <Ic n="search" s={14} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:T.muted,pointerEvents:"none"}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar…" style={{...S.inp,paddingLeft:34}}/>
        </div>
      </div>

      {tab==="albaranes"&&<div style={{...S.card,padding:0,overflow:"auto"}}>
        {filtAlb.length===0?<Empty msg="Sin albaranes" icon="albaran"/>:
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:600}}>
          <thead><tr>
            {["Fecha","Proveedor","Almacén","Líneas","Total","Estado"].map(h=><th key={h} style={thSt}>{h}</th>)}
          </tr></thead>
          <tbody>
          {filtAlb.map((a,i)=>{
            const total=(a.Lines||[]).reduce((s,l)=>(s+(l.DeliveredQuantity||l.OrderedQuantity||0)*(l.CostPrice||0)),0)
            return <tr key={i} style={{background:i%2?"#f8fbfb":"#fff",borderBottom:`1px solid ${T.border}`}}>
              <td style={{padding:"9px 14px",fontSize:12,color:T.muted,whiteSpace:"nowrap"}}>{fmtDate(a.Date)}</td>
              <td style={{padding:"9px 14px",fontSize:13,fontWeight:600,color:T.text}}>{a.Supplier?.Name||a.SupplierId||"—"}</td>
              <td style={{padding:"9px 14px",fontSize:12,color:T.muted}}>{a.Warehouse?.Name||wh(a.WarehouseId)||"—"}</td>
              <td style={{padding:"9px 14px",fontSize:12,color:T.muted}}>{(a.Lines||[]).length}</td>
              <td style={{padding:"9px 14px",fontSize:12,fontWeight:600}}>€{fmt(total)}</td>
              <td style={{padding:"9px 14px"}}><StatusBadge status={a.Status}/></td>
            </tr>
          })}
          </tbody>
        </table>}
      </div>}

      {tab==="traspasos"&&<div style={{...S.card,padding:0,overflow:"auto"}}>
        {filtTr.length===0?<Empty msg="Sin traspasos" icon="transfer"/>:
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:500}}>
          <thead><tr>
            {["Fecha","Origen","Destino","Líneas","Estado"].map(h=><th key={h} style={thSt}>{h}</th>)}
          </tr></thead>
          <tbody>
          {filtTr.map((t,i)=>(
            <tr key={i} style={{background:i%2?"#f8fbfb":"#fff",borderBottom:`1px solid ${T.border}`}}>
              <td style={{padding:"9px 14px",fontSize:12,color:T.muted,whiteSpace:"nowrap"}}>{fmtDate(t.TransferDate||t._date)}</td>
              <td style={{padding:"9px 14px",fontSize:13,fontWeight:600,color:T.text}}>{wh(t.SourceWarehouseId)}</td>
              <td style={{padding:"9px 14px",fontSize:13,fontWeight:600,color:T.accent}}>{wh(t.TargetWarehouseId)}</td>
              <td style={{padding:"9px 14px",fontSize:12,color:T.muted}}>{(t.Lines||[]).length}</td>
              <td style={{padding:"9px 14px"}}>{t._local?<Badge color={T.yellow} label="Local"/>:<StatusBadge status={t.Status}/>}</td>
            </tr>
          ))}
          </tbody>
        </table>}
      </div>}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ALBARANES VIEW
// ═══════════════════════════════════════════════════════════════════════════════
function AlbaranForm({products,suppliers,warehouses,onSave,onCancel,toast}) {
  const [suppId,setSuppId]=useState("")
  const [whId,setWhId]=useState("")
  const [date,setDate]=useState(today())
  const [ref,setRef]=useState("")
  const [lines,setLines]=useState([])
  const [search,setSearch]=useState("")
  const [showScanner,setShowScanner]=useState(false)
  const [sending,setSending]=useState(false)

  const searchResults=products.filter(p=>search&&(p.Name||"").toLowerCase().includes(search.toLowerCase())).slice(0,6)

  const addProduct=(prod)=>{
    if(!lines.some(l=>l.ProductId===prod.Id)){
      setLines(prev=>[...prev,{ProductId:prod.Id,productName:prod.Name,qty:"1",costPrice:String(prod.CostPrice??0)}])
    }
    setSearch("")
  }

  const handleScan=(barcode)=>{
    const prod=products.find(p=>p.Barcode===barcode||p.Reference===barcode)
    if(!prod){toast("Código no encontrado: "+barcode,"err");return}
    addProduct(prod)
    toast("Producto añadido: "+prod.Name)
  }

  const updateLine=(pid,field,val)=>setLines(prev=>prev.map(l=>l.ProductId===pid?{...l,[field]:val}:l))
  const removeLine=(pid)=>setLines(prev=>prev.filter(l=>l.ProductId!==pid))

  const save=async()=>{
    if(!lines.length){toast("Añade al menos un producto","err");return}
    setSending(true)
    try{
      const albaran={
        SupplierId:parseInt(suppId)||null,
        WarehouseId:parseInt(whId)||null,
        Date:date,
        Reference:ref||null,
        Status:"Pending",
        Notes:"Albarán StockIn",
        Lines:lines.map(l=>({ProductId:l.ProductId,DeliveredQuantity:parseFloat(l.qty)||1,CostPrice:parseFloat(l.costPrice)||0}))
      }
      await onSave(albaran)
    }catch(e){toast("Error: "+e.message,"err")}
    finally{setSending(false)}
  }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Field label="Proveedor">
          <select value={suppId} onChange={e=>setSuppId(e.target.value)} style={S.inp}>
            <option value="">Sin proveedor</option>
            {suppliers.map(s=><option key={s.Id} value={String(s.Id)}>{s.Name}</option>)}
          </select>
        </Field>
        <Field label="Almacén">
          <select value={whId} onChange={e=>setWhId(e.target.value)} style={S.inp}>
            <option value="">Sin especificar</option>
            {warehouses.map(w=><option key={w.Id} value={String(w.Id)}>{w.Name}</option>)}
          </select>
        </Field>
        <Field label="Fecha">
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={S.inp}/>
        </Field>
        <Field label="Referencia (opcional)">
          <input value={ref} onChange={e=>setRef(e.target.value)} placeholder="Ej: ALB-2024-001" style={S.inp}/>
        </Field>
      </div>
      <div>
        <label style={S.label}>Productos</label>
        <div style={{position:"relative",marginBottom:8,display:"flex",gap:8}}>
          <div style={{position:"relative",flex:1}}>
            <Ic n="search" s={14} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:T.muted,pointerEvents:"none"}}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar y añadir producto…" style={{...S.inp,paddingLeft:34}}/>
            {searchResults.length>0&&<div style={{position:"absolute",top:"100%",left:0,right:0,background:"#fff",border:`1px solid ${T.border}`,borderRadius:8,boxShadow:"0 8px 24px rgba(3,70,80,0.12)",zIndex:50}}>
              {searchResults.map(p=><div key={p.Id} onClick={()=>addProduct(p)} style={{padding:"9px 14px",cursor:"pointer",fontSize:13,borderBottom:`1px solid ${T.border}`}}
                onMouseEnter={e=>e.currentTarget.style.background="#f5f9fa"}
                onMouseLeave={e=>e.currentTarget.style.background="#fff"}>{p.Name}</div>)}
            </div>}
          </div>
          <Btn small variant="secondary" onClick={()=>setShowScanner(true)}><Ic n="camera" s={13}/>Escanear</Btn>
        </div>
        {lines.length>0&&<table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr>
            <th style={thSt}>Producto</th>
            <th style={thSt}>Cantidad</th>
            <th style={thSt}>P. Coste</th>
            <th style={thSt}></th>
          </tr></thead>
          <tbody>
          {lines.map((l,i)=>(
            <tr key={i} style={{borderBottom:`1px solid ${T.border}`}}>
              <td style={{padding:"9px 14px",fontSize:13,fontWeight:600,color:T.text}}>{l.productName}</td>
              <td style={{padding:"9px 14px"}}><input type="number" min="0" step="0.001" value={l.qty} onChange={e=>updateLine(l.ProductId,"qty",e.target.value)} style={{...S.inp,width:90,textAlign:"right"}}/></td>
              <td style={{padding:"9px 14px"}}><input type="number" step="0.01" value={l.costPrice} onChange={e=>updateLine(l.ProductId,"costPrice",e.target.value)} style={{...S.inp,width:90,textAlign:"right"}} placeholder="€"/></td>
              <td style={{padding:"9px 14px"}}><Btn small variant="danger" onClick={()=>removeLine(l.ProductId)}><Ic n="trash" s={12}/></Btn></td>
            </tr>
          ))}
          </tbody>
        </table>}
      </div>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
        <Btn variant="ghost" onClick={onCancel}>Cancelar</Btn>
        <Btn variant="primary" disabled={sending||!lines.length} onClick={save}><Ic n={sending?"sync":"check"} s={13} spin={sending}/>{sending?"Enviando…":"Guardar albarán"}</Btn>
      </div>
      {showScanner&&<BarcodeScanner onScan={handleScan} onClose={()=>setShowScanner(false)}/>}
    </div>
  )
}

function AlbaranesView({albaranes,products,suppliers,warehouses,conn,onImportar,toast,role}) {
  const [showForm,setShowForm]=useState(false)
  const [search,setSearch]=useState("")
  const fmtDate=(d)=>{if(!d)return"—";try{return new Date(d).toLocaleDateString("es-ES",{day:"2-digit",month:"2-digit",year:"numeric"})}catch{return d}}
  const filtered=albaranes.filter(a=>!search||(a.Supplier?.Name||"").toLowerCase().includes(search.toLowerCase()))

  const handleSave=async(alb)=>{
    await onImportar(alb)
    setShowForm(false)
    toast("Albarán guardado ✓")
  }

  if(showForm) return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
        <Btn small variant="ghost" onClick={()=>setShowForm(false)}>← Volver</Btn>
        <h1 style={{fontSize:20,fontWeight:800,color:T.brand,margin:0}}>Nuevo albarán</h1>
      </div>
      <div style={S.card}>
        <AlbaranForm products={products} suppliers={suppliers} warehouses={warehouses} onSave={handleSave} onCancel={()=>setShowForm(false)} toast={toast}/>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <h1 style={{fontSize:20,fontWeight:800,color:T.brand,margin:0}}>Albaranes</h1>
        <Btn small variant="primary" onClick={()=>setShowForm(true)}><Ic n="plus" s={13}/>Nuevo albarán</Btn>
      </div>
      <div style={{position:"relative",marginBottom:14}}>
        <Ic n="search" s={14} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:T.muted,pointerEvents:"none"}}/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por proveedor…" style={{...S.inp,paddingLeft:34,maxWidth:360}}/>
      </div>
      <div style={{...S.card,padding:0,overflow:"auto"}}>
        {filtered.length===0?<Empty msg="Sin albaranes" icon="albaran"/>:
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:580}}>
          <thead><tr>
            {["Fecha","Proveedor","Almacén","Líneas","Estado"].map(h=><th key={h} style={thSt}>{h}</th>)}
          </tr></thead>
          <tbody>
          {filtered.map((a,i)=>(
            <tr key={i} style={{background:i%2?"#f8fbfb":"#fff",borderBottom:`1px solid ${T.border}`}}>
              <td style={{padding:"9px 14px",fontSize:12,color:T.muted,whiteSpace:"nowrap"}}>{fmtDate(a.Date)}</td>
              <td style={{padding:"9px 14px",fontSize:13,fontWeight:600,color:T.text}}>{a.Supplier?.Name||a.SupplierId||"—"}</td>
              <td style={{padding:"9px 14px",fontSize:12,color:T.muted}}>{a.Warehouse?.Name||`Almacén ${a.WarehouseId}`||"—"}</td>
              <td style={{padding:"9px 14px",fontSize:12,color:T.muted}}>{(a.Lines||[]).length}</td>
              <td style={{padding:"9px 14px"}}><StatusBadge status={a.Status}/></td>
            </tr>
          ))}
          </tbody>
        </table>}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TRASPASOS VIEW
// ═══════════════════════════════════════════════════════════════════════════════
function TraspasosView({traspasos,products,warehouses,conn,onImportar,toast,stockRows}) {
  const [srcId,setSrcId]=useState("")
  const [dstId,setDstId]=useState("")
  const [lines,setLines]=useState([])
  const [search,setSearch]=useState("")
  const [sending,setSending]=useState(false)

  const searchResults=products.filter(p=>search&&(p.Name||"").toLowerCase().includes(search.toLowerCase())).slice(0,6)
  const addProduct=(prod)=>{
    if(!lines.some(l=>l.ProductId===prod.Id)){
      const row=stockRows.find(r=>r.ProductId===prod.Id&&(!srcId||String(r.WarehouseId)===srcId))
      setLines(prev=>[...prev,{ProductId:prod.Id,productName:prod.Name,qty:"1",available:row?.Quantity??null}])
    }
    setSearch("")
  }
  const updateLine=(pid,val)=>setLines(prev=>prev.map(l=>l.ProductId===pid?{...l,qty:val}:l))
  const removeLine=(pid)=>setLines(prev=>prev.filter(l=>l.ProductId!==pid))

  const enviar=async()=>{
    if(!srcId||!dstId){toast("Selecciona almacén origen y destino","err");return}
    if(srcId===dstId){toast("Origen y destino deben ser distintos","err");return}
    if(!lines.length){toast("Añade productos al traspaso","err");return}
    setSending(true)
    try{
      const traspaso={
        SourceWarehouseId:parseInt(srcId),
        TargetWarehouseId:parseInt(dstId),
        TransferDate:today(),
        Notes:"Traspaso StockIn",
        Lines:lines.map(l=>({ProductId:l.ProductId,Quantity:parseFloat(l.qty)||1}))
      }
      await onImportar(traspaso)
      setLines([]);toast("Traspaso enviado ✓")
    }catch(e){toast("Error: "+e.message,"err")}
    finally{setSending(false)}
  }

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h1 style={{fontSize:20,fontWeight:800,color:T.brand,margin:0}}>Traspasos entre almacenes</h1>
        <Btn small variant="primary" disabled={sending||!lines.length} onClick={enviar}><Ic n={sending?"sync":"transfer"} s={13} spin={sending}/>{sending?"Enviando…":"Enviar traspaso"}</Btn>
      </div>
      <div style={{...S.card,marginBottom:16}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:12,alignItems:"center"}}>
          <div>
            <label style={S.label}>Almacén origen</label>
            <select value={srcId} onChange={e=>setSrcId(e.target.value)} style={S.inp}>
              <option value="">Seleccionar…</option>
              {warehouses.map(w=><option key={w.Id} value={String(w.Id)}>{w.Name}</option>)}
            </select>
          </div>
          <div style={{textAlign:"center",color:T.muted,fontSize:22}}>→</div>
          <div>
            <label style={S.label}>Almacén destino</label>
            <select value={dstId} onChange={e=>setDstId(e.target.value)} style={S.inp}>
              <option value="">Seleccionar…</option>
              {warehouses.filter(w=>String(w.Id)!==srcId).map(w=><option key={w.Id} value={String(w.Id)}>{w.Name}</option>)}
            </select>
          </div>
        </div>
      </div>
      <div style={S.card}>
        <div style={{position:"relative",marginBottom:14}}>
          <Ic n="search" s={14} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:T.muted,pointerEvents:"none"}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Añadir producto…" style={{...S.inp,paddingLeft:34}}/>
          {searchResults.length>0&&<div style={{position:"absolute",top:"100%",left:0,right:0,background:"#fff",border:`1px solid ${T.border}`,borderRadius:8,boxShadow:"0 8px 24px rgba(3,70,80,0.12)",zIndex:50}}>
            {searchResults.map(p=><div key={p.Id} onClick={()=>addProduct(p)} style={{padding:"9px 14px",cursor:"pointer",fontSize:13,borderBottom:`1px solid ${T.border}`}}
              onMouseEnter={e=>e.currentTarget.style.background="#f5f9fa"}
              onMouseLeave={e=>e.currentTarget.style.background="#fff"}>{p.Name}</div>)}
          </div>}
        </div>
        {lines.length===0
          ?<Empty msg="Busca y añade los productos a traspasar" icon="transfer"/>
          :<table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>
              <th style={thSt}>Producto</th>
              <th style={thSt}>Disponible en origen</th>
              <th style={thSt}>Cantidad a traspasar</th>
              <th style={thSt}></th>
            </tr></thead>
            <tbody>
            {lines.map((l,i)=>(
              <tr key={i} style={{borderBottom:`1px solid ${T.border}`}}>
                <td style={{padding:"10px 14px",fontSize:13,fontWeight:600,color:T.text}}>{l.productName}</td>
                <td style={{padding:"10px 14px",fontSize:12,color:T.muted}}>{l.available!=null?l.available:"—"}</td>
                <td style={{padding:"10px 14px"}}><input type="number" min="0" step="0.001" value={l.qty} onChange={e=>updateLine(l.ProductId,e.target.value)} style={{...S.inp,width:100,textAlign:"right"}}/></td>
                <td style={{padding:"10px 14px"}}><Btn small variant="danger" onClick={()=>removeLine(l.ProductId)}><Ic n="trash" s={12}/></Btn></td>
              </tr>
            ))}
            </tbody>
          </table>
        }
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PRODUCTOS VIEW
// ═══════════════════════════════════════════════════════════════════════════════
function ProductosView({products,warehouses,suppliers,conn,onSave,toast,role}) {
  const [search,setSearch]=useState("")
  const [editing,setEditing]=useState(null) // product object being edited
  const [saving,setSaving]=useState(false)
  const seePrices=PERMS.seeCostPrices(role)

  const filtered=products.filter(p=>!search||(p.Name||"").toLowerCase().includes(search.toLowerCase())||(p.Reference||"").toLowerCase().includes(search.toLowerCase()))

  const edit=(prod)=>{
    const p={...prod,
      StorageOptions:(prod.StorageOptions||[]).map(so=>({...so})),
      CostPrices:(prod.CostPrices||[]).map(cp=>({...cp}))
    }
    // Ensure every warehouse has a StorageOption entry
    warehouses.forEach(w=>{
      if(!p.StorageOptions.find(so=>so.WarehouseId===w.Id))
        p.StorageOptions.push({WarehouseId:w.Id,Location:"",MinStock:0,MaxStock:0})
      if(seePrices&&!p.CostPrices.find(cp=>cp.WarehouseId===w.Id))
        p.CostPrices.push({WarehouseId:w.Id,CostPrice:prod.CostPrice||0})
    })
    setEditing(p)
  }

  const updateSO=(whId,field,val)=>setEditing(prev=>({...prev,StorageOptions:prev.StorageOptions.map(so=>so.WarehouseId===whId?{...so,[field]:val}:so)}))
  const updateCP=(whId,val)=>setEditing(prev=>({...prev,CostPrices:prev.CostPrices.map(cp=>cp.WarehouseId===whId?{...cp,CostPrice:val}:cp)}))

  const save=async()=>{
    setSaving(true)
    try{
      await onSave(editing)
      toast("Producto actualizado ✓")
      setEditing(null)
    }catch(e){toast("Error: "+e.message,"err")}
    finally{setSaving(false)}
  }

  if(editing) return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
        <Btn small variant="ghost" onClick={()=>setEditing(null)}>← Volver</Btn>
        <h1 style={{fontSize:18,fontWeight:800,color:T.brand,margin:0,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{editing.Name}</h1>
        <Btn small variant="primary" disabled={saving} onClick={save}><Ic n={saving?"sync":"check"} s={13} spin={saving}/>{saving?"Guardando…":"Guardar"}</Btn>
      </div>
      <div style={S.card}>
        {seePrices&&<div style={{marginBottom:20}}>
          <div style={{fontSize:12,fontWeight:700,color:T.brand,marginBottom:10,textTransform:"uppercase",letterSpacing:"0.06em"}}>Precio de coste global</div>
          <input type="number" step="0.01" value={editing.CostPrice||0} onChange={e=>setEditing(p=>({...p,CostPrice:e.target.value}))} style={{...S.inp,maxWidth:160}} placeholder="€ Coste"/>
        </div>}
        <div style={{fontSize:12,fontWeight:700,color:T.brand,marginBottom:10,textTransform:"uppercase",letterSpacing:"0.06em"}}>Stock mínimo / máximo por almacén</div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {warehouses.map(w=>{
            const so=editing.StorageOptions?.find(s=>s.WarehouseId===w.Id)||{}
            const cp=editing.CostPrices?.find(c=>c.WarehouseId===w.Id)||{}
            return <div key={w.Id} style={{padding:14,borderRadius:10,border:`1px solid ${T.border}`,background:"#f8fbfb"}}>
              <div style={{fontWeight:600,color:T.brand,marginBottom:10,fontSize:13}}>{w.Name}</div>
              <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
                <Field label="Ubicación"><input value={so.Location||""} onChange={e=>updateSO(w.Id,"Location",e.target.value)} style={{...S.inp,width:120}} placeholder="Ej: A-1-2"/></Field>
                <Field label="Stock mínimo"><input type="number" step="0.001" value={so.MinStock||0} onChange={e=>updateSO(w.Id,"MinStock",e.target.value)} style={{...S.inp,width:90}}/></Field>
                <Field label="Stock máximo"><input type="number" step="0.001" value={so.MaxStock||0} onChange={e=>updateSO(w.Id,"MaxStock",e.target.value)} style={{...S.inp,width:90}}/></Field>
                {seePrices&&<Field label="P. Coste en este almacén"><input type="number" step="0.01" value={cp.CostPrice||0} onChange={e=>updateCP(w.Id,e.target.value)} style={{...S.inp,width:100}} placeholder="€"/></Field>}
              </div>
            </div>
          })}
        </div>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <h1 style={{fontSize:20,fontWeight:800,color:T.brand,margin:0}}>Productos</h1>
        <div style={{fontSize:13,color:T.muted}}>{filtered.length} productos</div>
      </div>
      <div style={{position:"relative",marginBottom:14}}>
        <Ic n="search" s={14} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:T.muted,pointerEvents:"none"}}/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nombre o referencia…" style={{...S.inp,paddingLeft:34,maxWidth:400}}/>
      </div>
      <div style={{...S.card,padding:0,overflow:"auto"}}>
        {filtered.length===0?<Empty msg="Sin productos" icon="box"/>:
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:520}}>
          <thead><tr>
            <th style={thSt}>Producto</th>
            <th style={thSt}>Ref</th>
            <th style={thSt}>Familia</th>
            {seePrices&&<th style={thSt}>P. Coste</th>}
            <th style={thSt}>P. Venta</th>
            <th style={thSt}></th>
          </tr></thead>
          <tbody>
          {filtered.map((p,i)=>(
            <tr key={p.Id} style={{background:i%2?"#f8fbfb":"#fff",borderBottom:`1px solid ${T.border}`}}>
              <td style={{padding:"9px 14px",fontSize:13,fontWeight:600,color:T.text,maxWidth:260,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.Name}</td>
              <td style={{padding:"9px 14px",fontSize:11,color:T.muted,fontFamily:"monospace"}}>{p.Reference||"—"}</td>
              <td style={{padding:"9px 14px",fontSize:12,color:T.muted}}>{p.FamilyName||"—"}</td>
              {seePrices&&<td style={{padding:"9px 14px",fontSize:12,color:T.muted}}>€{fmt(p.CostPrice??0)}</td>}
              <td style={{padding:"9px 14px",fontSize:12,color:T.muted}}>€{fmt(p.Prices?.[0]?.Price??0)}</td>
              <td style={{padding:"9px 14px"}}><Btn small variant="secondary" onClick={()=>edit(p)}><Ic n="settings" s={12}/>Editar</Btn></td>
            </tr>
          ))}
          </tbody>
        </table>}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PROVEEDORES VIEW
// ═══════════════════════════════════════════════════════════════════════════════
function ProveedoresView({suppliers,albaranes}) {
  const [search,setSearch]=useState("")
  const filtered=suppliers.filter(s=>!search||(s.Name||"").toLowerCase().includes(search.toLowerCase()))
  const countAlb=(suppId)=>albaranes.filter(a=>a.SupplierId===suppId||a.Supplier?.Id===suppId).length
  const lastAlb=(suppId)=>{
    const albs=albaranes.filter(a=>a.SupplierId===suppId||a.Supplier?.Id===suppId).sort((a,b)=>new Date(b.Date)-new Date(a.Date))
    if(!albs.length) return "—"
    try{return new Date(albs[0].Date).toLocaleDateString("es-ES",{day:"2-digit",month:"2-digit",year:"numeric"})}catch{return albs[0].Date}
  }
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <h1 style={{fontSize:20,fontWeight:800,color:T.brand,margin:0}}>Proveedores</h1>
        <div style={{fontSize:13,color:T.muted}}>{filtered.length} proveedores</div>
      </div>
      <div style={{position:"relative",marginBottom:14}}>
        <Ic n="search" s={14} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:T.muted,pointerEvents:"none"}}/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar proveedor…" style={{...S.inp,paddingLeft:34,maxWidth:360}}/>
      </div>
      <div style={S.card}>
        {filtered.length===0?<Empty msg="Sin proveedores" icon="proveedor"/>:
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
          {filtered.map(s=>(
            <div key={s.Id} style={{border:`1px solid ${T.border}`,borderRadius:10,padding:16}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                <div style={{width:38,height:38,borderRadius:9,background:T.brand,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700,color:"#fff",flexShrink:0}}>{(s.Name||"?")[0].toUpperCase()}</div>
                <div style={{fontWeight:700,color:T.text,fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.Name}</div>
              </div>
              {s.Email&&<div style={{fontSize:12,color:T.muted,marginBottom:3}}>✉ {s.Email}</div>}
              {s.Phone&&<div style={{fontSize:12,color:T.muted,marginBottom:3}}>📞 {s.Phone}</div>}
              {s.ContactName&&<div style={{fontSize:12,color:T.muted,marginBottom:3}}>👤 {s.ContactName}</div>}
              <div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${T.border}`,display:"flex",gap:14}}>
                <div style={{fontSize:11,color:T.muted}}>Albaranes: <strong style={{color:T.text}}>{countAlb(s.Id)}</strong></div>
                <div style={{fontSize:11,color:T.muted}}>Último: <strong style={{color:T.text}}>{lastAlb(s.Id)}</strong></div>
              </div>
            </div>
          ))}
        </div>}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  APP ROOT
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const [user,      setUser]      = useState(null)
  const [authLoading,setAuthLoading] = useState(true)

  // ── Connections ─────────────────────────────────────────────────────────────
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

  // ── Offline ──────────────────────────────────────────────────────────────────
  const [online,     setOnline]     =useState(navigator.onLine)
  const [queueCount, setQueueCount] =useState(0)
  const [showBanner, setShowBanner] =useState(false)

  // ── Auto-sync ────────────────────────────────────────────────────────────────
  const [autoSyncInterval,setAutoSyncInterval]=useState(()=>parseInt(localStorage.getItem("stockin_auto_sync")||"0"))
  const [syncCountdown,   setSyncCountdown]   =useState(0)

  // ── WhatsApp ─────────────────────────────────────────────────────────────────
  const [whatsappCfg,setWhatsappCfg]=useState(()=>{
    try{return JSON.parse(localStorage.getItem("stockin_whatsapp")||"{}")}catch{return{}}
  })

  const activeConn=connections.find(c=>c.id===activeId)||null
  const configured=!!(activeConn?.apiToken)
  const role=user?.role||"readonly"
  const canSeeNav=(id)=>(NAV_ACCESS[role]||[]).includes(id)

  // ── Auth check on mount ──────────────────────────────────────────────────────
  useEffect(()=>{
    const token=localStorage.getItem("stockin_token")
    if(!token){setAuthLoading(false);return}
    authAPI.me().then(u=>{setUser(u);setAuthLoading(false)}).catch(()=>{localStorage.removeItem("stockin_token");setAuthLoading(false)})
  },[])

  useEffect(()=>{
    if(!user) return
    if(configured){setView("dashboard");doSync(activeConn)}
    else if(connections.length===0){setView("setup")}
  },[user])

  // ── Online/offline ───────────────────────────────────────────────────────────
  useEffect(()=>{
    const goOnline=()=>{setOnline(true);setShowBanner(true);setTimeout(()=>setShowBanner(false),5000);processQueue()}
    const goOffline=()=>{setOnline(false);setShowBanner(false)}
    window.addEventListener("online",goOnline)
    window.addEventListener("offline",goOffline)
    getQueue().then(q=>setQueueCount(q.length))
    return()=>{window.removeEventListener("online",goOnline);window.removeEventListener("offline",goOffline)}
  },[])

  // ── Auto-sync countdown ──────────────────────────────────────────────────────
  useEffect(()=>{
    if(!autoSyncInterval||!configured) return
    setSyncCountdown(autoSyncInterval*60)
    const id=setInterval(()=>{
      setSyncCountdown(prev=>{
        if(prev<=1){doSync();return autoSyncInterval*60}
        return prev-1
      })
    },1000)
    return()=>clearInterval(id)
  },[autoSyncInterval,configured])

  const fmtCountdown=(s)=>{
    const m=Math.floor(s/60),sec=s%60
    return `${m}:${String(sec).padStart(2,"0")}`
  }

  const toast=(msg,type="ok")=>{setNotif({msg,type});setTimeout(()=>setNotif(null),5000)}

  // ── WhatsApp alerts ──────────────────────────────────────────────────────────
  const sendWhatsappAlerts=async(alertRows)=>{
    if(!whatsappCfg?.enabled||!whatsappCfg.phone||!whatsappCfg.apikey||!alertRows.length) return
    const text=`🚨 StockIn — ${alertRows.length} alerta${alertRows.length>1?"s":""} de stock:\n`+
      alertRows.slice(0,5).map(r=>`• ${r.prod?.Name||r.ProductId}: ${r.Quantity} ud (mín ${r.minStock})`).join("\n")+
      (alertRows.length>5?`\n…y ${alertRows.length-5} más.`:"")
    try{
      await fetch(`https://api.callmebot.com/whatsapp.php?phone=${whatsappCfg.phone}&text=${encodeURIComponent(text)}&apikey=${whatsappCfg.apikey}`)
    }catch{}
  }

  // ── Sync ─────────────────────────────────────────────────────────────────────
  const doSync=useCallback(async(conn=activeConn)=>{
    if(!conn?.apiToken||syncing) return
    setSyncing(true);setSyncErr(null)
    const api=createAPI(conn)
    const wpIds=conn.mode==="acms"&&conn.activeWorkplace?[conn.activeWorkplace]:[]
    try{
      const maestros=await api.getMaestros(wpIds)
      const prods=norm(maestros,"Products"),stks=norm(maestros,"Stocks"),sups=norm(maestros,"Suppliers"),whs=norm(maestros,"Warehouses")
      setProducts(prods);setStocks(stks);setSuppliers(sups);setWarehouses(whs)
      await cacheData(`maestros_${conn.id}`,{prods,stks,sups,whs})
      if(conn.mode==="acms"){try{const d=await api.getWpSummary();const wps=norm(d,"WorkplacesSummary");updateConn(conn.id,{workplaces:wps})}catch{}}
      try{const d=await api.getAlbaranes(wpIds);const albs=norm(d,"IncomingDeliveryNotes").map(a=>({...a,_synced:true}));setAlbaranes(albs);await cacheData(`albaranes_${conn.id}`,albs)}catch{setAlbaranes([])}
      try{const d=await api.getTraspasos(wpIds);setTraspasos(norm(d,"StockTransfers"))}catch{}
      setConnected(true)
      const ts=new Date().toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"})
      setLastSync(ts);setCachedAt(null)
      // WhatsApp alert check
      const builtRows=buildStockRows(prods,stks,whs)
      const newAlerts=builtRows.filter(r=>r.minStock>0&&r.Quantity<=r.minStock)
      await sendWhatsappAlerts(newAlerts)
      toast(`${prods.length} productos · ${stks.length} stocks cargados`)
    }catch(err){
      setConnected(false);setSyncErr(err.message)
      const cached=await getCachedData(`maestros_${conn?.id}`)
      if(cached){
        setProducts(cached.data.prods||[]);setStocks(cached.data.stks||[]);setSuppliers(cached.data.sups||[]);setWarehouses(cached.data.whs||[])
        setCachedAt(cached.cachedAt)
        const albCached=await getCachedData(`albaranes_${conn?.id}`)
        if(albCached) setAlbaranes(albCached.data||[])
        toast("Datos en caché (sin conexión)","warn")
      }else{toast("Error: "+err.message,"err")}
    }finally{setSyncing(false)}
  },[activeConn,syncing,whatsappCfg])

  // ── Connection helpers ────────────────────────────────────────────────────────
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

  // ── Offline queue ─────────────────────────────────────────────────────────────
  const processQueue=async()=>{
    const queue=await getQueue()
    if(!queue.length||!activeConn) return
    toast(`Reconectado · procesando ${queue.length} acción${queue.length>1?"es":""}…`)
    const api=createAPI(activeConn)
    let ok=0,fail=0
    for(const item of queue){
      try{await api.importar(item.payload);await removeFromQueue(item.id);ok++}catch{fail++}
    }
    const remaining=await getQueue();setQueueCount(remaining.length)
    if(ok) toast(`${ok} acción${ok>1?"es":""} sincronizada${ok>1?"s":""}${fail?` · ${fail} con error`:""}`)
    doSync()
  }
  const queueAction=async(payload,label)=>{
    await addToQueue({payload,label});const q=await getQueue();setQueueCount(q.length)
    toast(`Sin conexión — "${label}" guardada, se enviará al reconectar`,"warn")
  }
  const withOfflineSupport=async(payload,label,apiFn)=>{
    if(!online){await queueAction(payload,label);return}
    try{await apiFn()}catch(e){toast("Error: "+e.message,"err");throw e}
  }

  // ── Import helpers ────────────────────────────────────────────────────────────
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
    await withOfflineSupport({StockTransfers:[t]},"Traspaso",async()=>{
      const api=createAPI(activeConn)
      try{await api.importar({StockTransfers:[t]})}catch{}
      setTraspasos(prev=>[{...t,_local:true,_date:new Date().toISOString()},...prev])
      toast("Traspaso registrado ✓");doSync()
    })
  }
  const importarRegularizacion=async({lineas,motivo,warehouseId,tipo})=>{
    if(!activeConn) return
    const api=createAPI(activeConn)
    const ahora=new Date()
    const serie=tipo==="entrada"?"RE":"RM"
    const Lines=lineas.map(l=>({ProductId:l.ProductId,ProductName:l.productName,DeliveredQuantity:tipo==="entrada"?Math.abs(parseFloat(l.cantidad)):-Math.abs(parseFloat(l.cantidad)),OrderedQuantity:tipo==="entrada"?Math.abs(parseFloat(l.cantidad)):-Math.abs(parseFloat(l.cantidad)),CostPrice:parseFloat(l.costPrice)||0}))
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
    const payload={Products:[{Id:prod.Id,Name:prod.Name,VatId:prod.VatId,FamilyId:prod.FamilyId??null,CostPrice:parseFloat(prod.CostPrice)||0,StorageOptions:(prod.StorageOptions||[]).map(so=>({WarehouseId:so.WarehouseId,Location:so.Location||"",MinStock:parseFloat(so.MinStock)||0,MaxStock:parseFloat(so.MaxStock)||0})),CostPrices:(prod.CostPrices||[]).map(cp=>({WarehouseId:cp.WarehouseId,CostPrice:parseFloat(cp.CostPrice)||0}))}]}
    await api.importar(payload)
    setProducts(prev=>prev.map(p=>p.Id===prod.Id?{...p,...prod}:p))
    if(activeConn.mode==="acms")try{const a=createAPI(activeConn);await a.acmsHub(activeConn.activeWorkplace?[activeConn.activeWorkplace]:[])}catch{}
  }

  const handleAutoSyncChange=(val)=>{
    setAutoSyncInterval(val);localStorage.setItem("stockin_auto_sync",String(val))
    if(!val) setSyncCountdown(0)
  }
  const handleWhatsappSave=(cfg)=>{
    setWhatsappCfg(cfg);localStorage.setItem("stockin_whatsapp",JSON.stringify(cfg))
  }

  const syncColor=!configured?"rgba(255,255,255,0.25)":syncing?T.yellow:connected===false?T.red:connected===true?T.green:"rgba(255,255,255,0.4)"
  const stockRows=buildStockRows(products,stocks,warehouses)
  const alertas=stockRows.filter(r=>r.minStock>0&&r.Quantity<=r.minStock)

  const NAV_ITEMS=[
    {id:"dashboard",     label:"Dashboard",      icon:"dashboard"},
    {id:"alertas",       label:"Alertas",        icon:"alert",   badge:alertas.length||null,bc:T.red},
    {id:"stock",         label:"Stock",          icon:"stock"},
    {id:"regularizacion",label:"Regularización", icon:"adjust"},
    {id:"pedidos",       label:"Reposición",     icon:"cart"},
    {id:"historico",     label:"Historial",      icon:"history"},
    {id:"albaranes",     label:"Albaranes",      icon:"albaran"},
    {id:"traspasos",     label:"Traspasos",      icon:"transfer"},
    {id:"productos",     label:"Productos",      icon:"box"},
    {id:"proveedores",   label:"Proveedores",    icon:"proveedor"},
    {id:"informe",       label:"Informe mensual",icon:"mail"},
    {id:"usuarios",      label:"Usuarios",       icon:"users"},
    {id:"setup",         label:"Configuración",  icon:"settings",badge:!configured?"!":null,bc:T.yellow},
  ].filter(item=>canSeeNav(item.id))

  const navigate=(id)=>{setView(id);setSideOpen(false)}

  if(authLoading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#f0f5f6",fontFamily:"sans-serif",color:"#6b8f95"}}>Cargando…</div>
  if(!user) return <LoginScreen onLogin={async(u,p)=>{const d=await authAPI.login(u,p);localStorage.setItem("stockin_token",d.token);setUser(d.user);if(configured){setView("dashboard");doSync(activeConn)}else setView("setup")}}/>

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
      <div style={{padding:"10px 10px 4px",borderTop:"1px solid rgba(255,255,255,0.1)"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 6px",borderRadius:8,background:"rgba(255,255,255,0.07)",marginBottom:6}}>
          <div style={{width:32,height:32,borderRadius:8,background:ROLE_BADGE_COLOR[role]||T.muted,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:13,fontWeight:700,color:"#fff"}}>{user.fullName?.[0]?.toUpperCase()||"?"}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:12,fontWeight:600,color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.fullName}</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.5)"}}>{ROLE_BADGE_LABEL[role]||role}</div>
          </div>
          <button onClick={async()=>{try{await authAPI.logout()}catch{}localStorage.removeItem("stockin_token");setUser(null);setView("dashboard");setProducts([]);setStocks([]);setSuppliers([]);setWarehouses([]);setAlbaranes([]);setTraspasos([]);setConnected(null)}} title="Cerrar sesión" style={{background:"rgba(255,255,255,0.1)",border:"none",borderRadius:6,color:"rgba(255,255,255,0.6)",cursor:"pointer",padding:"5px",display:"flex"}}>
            <Ic n="logout" s={14}/>
          </button>
        </div>
        <button onClick={()=>{if(configured&&!syncing)doSync()}} disabled={!configured||syncing} style={{width:"100%",padding:"8px",borderRadius:8,fontFamily:"inherit",background:connected===true&&!syncing?"rgba(10,158,118,0.15)":connected===false?"rgba(220,53,69,0.15)":"rgba(255,255,255,0.05)",border:`1px solid ${syncColor}`,color:syncColor,cursor:!configured||syncing?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6,fontSize:12,fontWeight:600,opacity:!configured?0.4:1,marginBottom:autoSyncInterval>0&&syncCountdown>0?0:6}}>
          <Ic n="sync" s={13} spin={syncing}/>
          {syncing?"Sincronizando…":connected===false?"Reintentar":connected===true?`Sync · ${lastSync}`:"Sincronizar"}
        </button>
        {autoSyncInterval>0&&syncCountdown>0&&<div style={{fontSize:10,color:"rgba(255,255,255,0.4)",textAlign:"center",padding:"3px 0 6px",fontVariantNumeric:"tabular-nums"}}>Próxima sync en {fmtCountdown(syncCountdown)}</div>}
        {!online&&<div style={{fontSize:10,color:T.orange,textAlign:"center",padding:"4px 0",fontWeight:600}}>Sin conexión{queueCount>0?` · ${queueCount} pendiente${queueCount>1?"s":""}`:""}</div>}
        {syncErr&&<div style={{marginTop:2,fontSize:10,color:T.red,textAlign:"center",lineHeight:1.4,wordBreak:"break-word",marginBottom:6}}>{syncErr.slice(0,80)}</div>}
        {cachedAt&&<div style={{fontSize:10,color:T.yellow,textAlign:"center",lineHeight:1.4,marginBottom:6}}>Caché: {new Date(cachedAt).toLocaleString("es-ES",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</div>}
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
        <div className="topbar-mobile" style={{display:"none",alignItems:"center",gap:10,padding:"12px 16px",background:T.brand,position:"sticky",top:0,zIndex:100,borderBottom:"1px solid rgba(255,255,255,0.1)"}}>
          <button onClick={()=>setSideOpen(true)} style={{background:"rgba(255,255,255,0.1)",border:"none",borderRadius:8,color:"#fff",cursor:"pointer",padding:"7px",display:"flex"}}><Ic n="menu" s={18}/></button>
          <div style={{flex:1,fontSize:14,fontWeight:700,color:"#fff"}}><span style={{color:T.accent}}>rekor</span>.es StockIn</div>
          <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,fontWeight:600,color:online?T.green:T.orange}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:online?T.green:T.orange,animation:!online?"pulse 1.5s infinite":"none"}}/>
            {!online&&"Offline"}
          </div>
          <button onClick={()=>{if(configured&&!syncing)doSync()}} style={{background:"none",border:"none",cursor:"pointer",color:syncColor,display:"flex",padding:4}}><Ic n="sync" s={18} spin={syncing}/></button>
        </div>
        {!online&&<div style={{background:"rgba(234,108,0,0.1)",borderBottom:`2px solid ${T.orange}`,padding:"7px 20px",display:"flex",alignItems:"center",justifyContent:"center",gap:10,fontSize:12,fontWeight:600,color:T.orange}}>
          ⚠ Sin conexión — trabajando con datos en caché. Las acciones se sincronizarán al reconectar.
          {queueCount>0&&<span style={{background:T.orange,color:"#fff",borderRadius:12,padding:"2px 8px",fontSize:11}}>{queueCount} pendiente{queueCount>1?"s":""}</span>}
        </div>}
        {showBanner&&<div style={{background:T.green,color:"#fff",padding:"9px 20px",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontSize:13,fontWeight:600,animation:"slideDown 0.3s ease"}}>
          ✓ Conexión restaurada{queueCount>0?` · sincronizando ${queueCount} acción${queueCount>1?"es":""}…`:""}
        </div>}
        <div style={{padding:"24px 28px"}} className="main-pad">
          {notif&&<div style={{position:"fixed",top:16,right:16,zIndex:400,maxWidth:380,background:notif.type==="ok"?"#f0fdf8":notif.type==="warn"?"#fffbeb":"#fff5f5",border:`1px solid ${notif.type==="ok"?T.green:notif.type==="warn"?T.yellow:T.red}`,borderRadius:10,padding:"11px 16px",display:"flex",alignItems:"center",gap:10,color:notif.type==="ok"?T.green:notif.type==="warn"?T.yellow:T.red,fontSize:13,fontWeight:500,boxShadow:"0 4px 20px rgba(3,70,80,0.12)",animation:"slideIn 0.2s ease"}}>
            <Ic n={notif.type==="ok"?"check":"alert"} s={15}/>{notif.msg}
          </div>}
          {view==="setup"&&PERMS.canSeeSetup(role)&&<SetupView connections={connections} activeId={activeId} onNew={()=>setModal("new-conn")} onEdit={(c)=>{setEditConn(c);setModal("edit-conn")}} onSwitch={switchConn} onDelete={deleteConn} toast={toast} autoSyncInterval={autoSyncInterval} onAutoSyncChange={handleAutoSyncChange} whatsappCfg={whatsappCfg} onWhatsappSave={handleWhatsappSave}/>}
          {view==="usuarios"&&PERMS.canManageUsers(role)&&<UsersPanel currentUser={user} toast={toast}/>}
          {view==="informe"&&<MonthlyReport stockRows={stockRows} albaranes={albaranes} alertas={alertas} conn={activeConn} toast={toast}/>}
          {view!=="setup"&&view!=="usuarios"&&view!=="informe"&&!configured&&<NoConnection onSetup={()=>setView("setup")} onNew={()=>setModal("new-conn")}/>}
          {view!=="setup"&&view!=="usuarios"&&view!=="informe"&&configured&&<>
            {syncing&&!products.length&&<LoadingScreen/>}
            {!syncing&&connected===false&&!products.length&&!cachedAt&&<ErrorScreen error={syncErr} onRetry={()=>doSync()} onSetup={()=>setView("setup")}/>}
            {(products.length>0||(connected===true&&!syncing)||cachedAt)&&<>
              {view==="dashboard"&&<Dashboard stockRows={stockRows} alertas={alertas} albaranes={albaranes} traspasos={traspasos} conn={activeConn} onNav={navigate} role={role}/>}
              {view==="alertas"&&<AlertasView stockRows={stockRows} alertas={alertas} warehouses={warehouses} onIrInventario={()=>navigate("regularizacion")} role={role}/>}
              {view==="stock"&&<StockView stockRows={stockRows} warehouses={warehouses} role={role} albaranes={albaranes}/>}
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
        input:focus,select:focus{border-color:#0592A7 !important;box-shadow:0 0 0 3px rgba(5,146,167,0.12) !important;outline:none}
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
