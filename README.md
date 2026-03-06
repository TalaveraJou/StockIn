# StockIn · rekor.es

Control de stock para Ágora TPV. Gestión de inventario, albaranes, regularizaciones y pedidos de reposición con sincronización en tiempo real.

## Requisitos

- Node.js 18+
- Ágora TPV con módulo API HTTP activado

## Desarrollo local

```bash
npm install
npm run dev
```

Abre http://localhost:5173 en el navegador.

## Configuración de conexión

En la app, ve a **Configuración** y añade una conexión:

- **URL de Ágora**: `http://IP-DEL-PC:8984`
- **API Token**: obténlo en Monitor Ágora → Herramientas → Activar Módulos Adicionales → API HTTP

### Acceso desde fuera de la red local (CORS)

Si accedes desde casa o desde otro equipo, necesitas un proxy. Opciones:

**Opción 1 — Proxy local rápido (para pruebas):**
```bash
npm install -g local-cors-proxy
lcp --proxyUrl http://IP-AGORA:8984 --port 8010
# Usa http://localhost:8010 como URL en la app
```

**Opción 2 — Cloudflare Tunnel (recomendado para acceso remoto):**
```bash
# Instalar cloudflared y autenticarse
cloudflared tunnel --url http://IP-AGORA:8984
# Cloudflare te da una URL pública HTTPS
```

**Opción 3 — nginx como proxy inverso (producción):**
```nginx
location / {
  proxy_pass http://IP-AGORA:8984;
  add_header Access-Control-Allow-Origin *;
  add_header Access-Control-Allow-Headers *;
  if ($request_method = OPTIONS) { return 204; }
}
```

## Build para producción

```bash
npm run build
# Sirve la carpeta dist con cualquier servidor estático
```

## Funcionalidades

- 📊 **Dashboard** — resumen de stock, alertas y movimientos recientes
- 🔴 **Alertas** — productos agotados y bajo mínimo con acceso rápido
- 📦 **Stock** — vista agrupada por familias con búsqueda y filtros
- 🔄 **Regularización** — inventario guiado en 3 pasos, genera albaranes en Ágora
- 🛒 **Reposición** — pedidos a proveedor con pre-relleno automático de alertas
- 📋 **Historial** — albaranes y traspasos agrupados por fecha
- 📄 **Albaranes** — gestión de entradas de mercancía
- ↔️ **Traspasos** — movimientos entre almacenes
- 🗂️ **Productos** — configuración de stock mínimo/máximo por almacén
- 🏭 **Proveedores** — directorio con estadísticas de compras
- 🔗 **Multi-conexión** — gestiona varios locales desde una sola app
- 🏢 **ACMS** — soporte para instalaciones multi-local
