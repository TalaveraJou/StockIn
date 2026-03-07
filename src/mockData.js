/**
 * mockData.js — Datos de demostración para Tpvrent Bistró
 * Simula respuestas reales de Ágora TPV para un bar-restaurante
 */

const daysAgo = (n) => {
  const dt = new Date()
  dt.setDate(dt.getDate() - n)
  return dt.toISOString().slice(0, 10)
}

// ── Demo users (email → password for auto-login) ──────────────────────────────
export const DEMO_CREDENTIALS = {
  'admin@tpvrent.es':     'admin123',
  'encargado@tpvrent.es': 'encargado123',
  'camarero@tpvrent.es':  'camarero123',
  'superadmin':           'super123',
}

export const DEMO_USER_LIST = [
  { username: 'admin@tpvrent.es',     fullName: 'María Gómez',   roleLabel: 'Admin' },
  { username: 'encargado@tpvrent.es', fullName: 'Carlos Martín', roleLabel: 'Encargado' },
  { username: 'camarero@tpvrent.es',  fullName: 'Ana López',     roleLabel: 'Camarero' },
]

export const isDemoUser = (username) =>
  Object.prototype.hasOwnProperty.call(DEMO_CREDENTIALS, username)

// ── Warehouses ─────────────────────────────────────────────────────────────────
const WAREHOUSES = [
  { Id: 1, Name: 'Bodega principal' },
  { Id: 2, Name: 'Barra' },
  { Id: 3, Name: 'Cocina' },
]

// ── Suppliers ──────────────────────────────────────────────────────────────────
const SUPPLIERS = [
  { Id: 1, Name: 'Makro España' },
  { Id: 2, Name: 'Cervezas Damm' },
  { Id: 3, Name: 'Mahou San Miguel' },
  { Id: 4, Name: 'Koch Foods' },
  { Id: 5, Name: 'ProcoLim' },
]

// ── Products ───────────────────────────────────────────────────────────────────
const PRODUCTS = [
  // BEBIDAS (FamilyId: 1)
  {
    Id: 101, Name: 'Cerveza Estrella Damm Barril 30L', FamilyId: 1, VatId: 1, CostPrice: 65.50,
    StorageOptions: [{ WarehouseId: 1, Location: 'B-01', MinStock: 2, MaxStock: 10 }, { WarehouseId: 2, Location: 'BAR-01', MinStock: 1, MaxStock: 3 }],
    CostPrices: [{ WarehouseId: 1, CostPrice: 65.50 }, { WarehouseId: 2, CostPrice: 65.50 }],
    Prices: [{ Price: 95.00 }],
  },
  {
    Id: 102, Name: 'Cerveza Mahou 5★ Barril 30L', FamilyId: 1, VatId: 1, CostPrice: 62.00,
    StorageOptions: [{ WarehouseId: 1, Location: 'B-02', MinStock: 2, MaxStock: 8 }, { WarehouseId: 2, Location: 'BAR-02', MinStock: 1, MaxStock: 3 }],
    CostPrices: [{ WarehouseId: 1, CostPrice: 62.00 }, { WarehouseId: 2, CostPrice: 62.00 }],
    Prices: [{ Price: 92.00 }],
  },
  {
    Id: 103, Name: 'Agua Bezoya 1.5L (caja 12)', FamilyId: 1, VatId: 1, CostPrice: 4.80,
    StorageOptions: [{ WarehouseId: 1, Location: 'B-10', MinStock: 3, MaxStock: 10 }, { WarehouseId: 2, Location: 'BAR-10', MinStock: 2, MaxStock: 5 }],
    CostPrices: [{ WarehouseId: 1, CostPrice: 4.80 }, { WarehouseId: 2, CostPrice: 4.80 }],
    Prices: [{ Price: 9.00 }],
  },
  {
    Id: 104, Name: 'Coca-Cola 33cl (pack 24)', FamilyId: 1, VatId: 1, CostPrice: 9.60,
    StorageOptions: [{ WarehouseId: 1, Location: 'B-11', MinStock: 4, MaxStock: 12 }, { WarehouseId: 2, Location: 'BAR-11', MinStock: 2, MaxStock: 6 }],
    CostPrices: [{ WarehouseId: 1, CostPrice: 9.60 }, { WarehouseId: 2, CostPrice: 9.60 }],
    Prices: [{ Price: 16.00 }],
  },
  {
    Id: 105, Name: 'Fanta Naranja 33cl (pack 24)', FamilyId: 1, VatId: 1, CostPrice: 9.20,
    StorageOptions: [{ WarehouseId: 1, Location: 'B-12', MinStock: 3, MaxStock: 10 }, { WarehouseId: 2, Location: 'BAR-12', MinStock: 1, MaxStock: 4 }],
    CostPrices: [{ WarehouseId: 1, CostPrice: 9.20 }, { WarehouseId: 2, CostPrice: 9.20 }],
    Prices: [{ Price: 15.00 }],
  },
  {
    Id: 106, Name: 'Vino Tinto Rioja Reserva 75cl', FamilyId: 1, VatId: 1, CostPrice: 5.50,
    StorageOptions: [{ WarehouseId: 1, Location: 'B-20', MinStock: 6, MaxStock: 20 }, { WarehouseId: 2, Location: 'BAR-20', MinStock: 3, MaxStock: 8 }],
    CostPrices: [{ WarehouseId: 1, CostPrice: 5.50 }, { WarehouseId: 2, CostPrice: 5.50 }],
    Prices: [{ Price: 12.00 }],
  },
  {
    Id: 107, Name: 'Vino Blanco Verdejo 75cl', FamilyId: 1, VatId: 1, CostPrice: 4.80,
    StorageOptions: [{ WarehouseId: 1, Location: 'B-21', MinStock: 4, MaxStock: 16 }, { WarehouseId: 2, Location: 'BAR-21', MinStock: 2, MaxStock: 6 }],
    CostPrices: [{ WarehouseId: 1, CostPrice: 4.80 }, { WarehouseId: 2, CostPrice: 4.80 }],
    Prices: [{ Price: 10.00 }],
  },
  {
    Id: 108, Name: 'Ron Brugal Añejo 1L', FamilyId: 1, VatId: 1, CostPrice: 12.50,
    StorageOptions: [{ WarehouseId: 1, Location: 'B-30', MinStock: 2, MaxStock: 6 }, { WarehouseId: 2, Location: 'BAR-30', MinStock: 1, MaxStock: 3 }],
    CostPrices: [{ WarehouseId: 1, CostPrice: 12.50 }, { WarehouseId: 2, CostPrice: 12.50 }],
    Prices: [{ Price: 22.00 }],
  },
  {
    Id: 109, Name: 'Ginebra Beefeater 1L', FamilyId: 1, VatId: 1, CostPrice: 14.00,
    StorageOptions: [{ WarehouseId: 1, Location: 'B-31', MinStock: 2, MaxStock: 6 }, { WarehouseId: 2, Location: 'BAR-31', MinStock: 1, MaxStock: 3 }],
    CostPrices: [{ WarehouseId: 1, CostPrice: 14.00 }, { WarehouseId: 2, CostPrice: 14.00 }],
    Prices: [{ Price: 24.00 }],
  },
  {
    Id: 110, Name: 'Whisky J&B 1L', FamilyId: 1, VatId: 1, CostPrice: 16.50,
    StorageOptions: [{ WarehouseId: 1, Location: 'B-32', MinStock: 2, MaxStock: 5 }, { WarehouseId: 2, Location: 'BAR-32', MinStock: 1, MaxStock: 2 }],
    CostPrices: [{ WarehouseId: 1, CostPrice: 16.50 }, { WarehouseId: 2, CostPrice: 16.50 }],
    Prices: [{ Price: 28.00 }],
  },

  // COCINA (FamilyId: 2)
  {
    Id: 201, Name: 'Aceite Oliva Virgen Extra 5L', FamilyId: 2, VatId: 1, CostPrice: 22.50,
    StorageOptions: [{ WarehouseId: 3, Location: 'C-01', MinStock: 2, MaxStock: 6 }],
    CostPrices: [{ WarehouseId: 3, CostPrice: 22.50 }], Prices: [{ Price: 0 }],
  },
  {
    Id: 202, Name: 'Sal Gruesa 25kg', FamilyId: 2, VatId: 1, CostPrice: 4.50,
    StorageOptions: [{ WarehouseId: 3, Location: 'C-02', MinStock: 1, MaxStock: 3 }],
    CostPrices: [{ WarehouseId: 3, CostPrice: 4.50 }], Prices: [{ Price: 0 }],
  },
  {
    Id: 203, Name: 'Azúcar Blanquilla 5kg', FamilyId: 2, VatId: 1, CostPrice: 2.80,
    StorageOptions: [{ WarehouseId: 3, Location: 'C-03', MinStock: 1, MaxStock: 4 }],
    CostPrices: [{ WarehouseId: 3, CostPrice: 2.80 }], Prices: [{ Price: 0 }],
  },
  {
    Id: 204, Name: 'Harina de Trigo T-55 5kg', FamilyId: 2, VatId: 1, CostPrice: 3.20,
    StorageOptions: [{ WarehouseId: 3, Location: 'C-04', MinStock: 2, MaxStock: 6 }],
    CostPrices: [{ WarehouseId: 3, CostPrice: 3.20 }], Prices: [{ Price: 0 }],
  },
  {
    Id: 205, Name: 'Café Molido Bonka 1kg', FamilyId: 2, VatId: 1, CostPrice: 7.90,
    StorageOptions: [{ WarehouseId: 3, Location: 'C-10', MinStock: 3, MaxStock: 8 }, { WarehouseId: 2, Location: 'BAR-40', MinStock: 2, MaxStock: 4 }],
    CostPrices: [{ WarehouseId: 3, CostPrice: 7.90 }, { WarehouseId: 2, CostPrice: 7.90 }], Prices: [{ Price: 0 }],
  },
  {
    Id: 206, Name: 'Leche Entera Asturiana 1L (caja 12)', FamilyId: 2, VatId: 1, CostPrice: 9.60,
    StorageOptions: [{ WarehouseId: 3, Location: 'C-11', MinStock: 4, MaxStock: 12 }, { WarehouseId: 2, Location: 'BAR-41', MinStock: 2, MaxStock: 4 }],
    CostPrices: [{ WarehouseId: 3, CostPrice: 9.60 }, { WarehouseId: 2, CostPrice: 9.60 }], Prices: [{ Price: 0 }],
  },
  {
    Id: 207, Name: 'Pan Precocido Baguette (ud)', FamilyId: 2, VatId: 1, CostPrice: 0.35,
    StorageOptions: [{ WarehouseId: 3, Location: 'C-20', MinStock: 12, MaxStock: 48 }],
    CostPrices: [{ WarehouseId: 3, CostPrice: 0.35 }], Prices: [{ Price: 0 }],
  },
  {
    Id: 208, Name: 'Pollo Entero Fresco (kg)', FamilyId: 2, VatId: 1, CostPrice: 3.20,
    StorageOptions: [{ WarehouseId: 3, Location: 'C-21', MinStock: 3, MaxStock: 12 }],
    CostPrices: [{ WarehouseId: 3, CostPrice: 3.20 }], Prices: [{ Price: 0 }],
  },
  {
    Id: 209, Name: 'Patatas Fritas 5kg', FamilyId: 2, VatId: 1, CostPrice: 4.50,
    StorageOptions: [{ WarehouseId: 3, Location: 'C-22', MinStock: 3, MaxStock: 10 }],
    CostPrices: [{ WarehouseId: 3, CostPrice: 4.50 }], Prices: [{ Price: 0 }],
  },
  {
    Id: 210, Name: 'Tomate Frito Orlando 3.15kg', FamilyId: 2, VatId: 1, CostPrice: 5.90,
    StorageOptions: [{ WarehouseId: 3, Location: 'C-23', MinStock: 2, MaxStock: 6 }],
    CostPrices: [{ WarehouseId: 3, CostPrice: 5.90 }], Prices: [{ Price: 0 }],
  },

  // LIMPIEZA (FamilyId: 3)
  {
    Id: 301, Name: 'Lavavajillas Industrial 5L', FamilyId: 3, VatId: 1, CostPrice: 9.80,
    StorageOptions: [{ WarehouseId: 1, Location: 'L-01', MinStock: 2, MaxStock: 8 }],
    CostPrices: [{ WarehouseId: 1, CostPrice: 9.80 }], Prices: [{ Price: 0 }],
  },
  {
    Id: 302, Name: 'Lejía Desinfectante 5L', FamilyId: 3, VatId: 1, CostPrice: 3.50,
    StorageOptions: [{ WarehouseId: 1, Location: 'L-02', MinStock: 2, MaxStock: 6 }],
    CostPrices: [{ WarehouseId: 1, CostPrice: 3.50 }], Prices: [{ Price: 0 }],
  },
  {
    Id: 303, Name: 'Limpiacristales KH7 1L', FamilyId: 3, VatId: 1, CostPrice: 3.90,
    StorageOptions: [{ WarehouseId: 1, Location: 'L-03', MinStock: 1, MaxStock: 4 }],
    CostPrices: [{ WarehouseId: 1, CostPrice: 3.90 }], Prices: [{ Price: 0 }],
  },
  {
    Id: 304, Name: 'Papel Cocina 6 rollos', FamilyId: 3, VatId: 1, CostPrice: 4.20,
    StorageOptions: [{ WarehouseId: 1, Location: 'L-10', MinStock: 3, MaxStock: 8 }],
    CostPrices: [{ WarehouseId: 1, CostPrice: 4.20 }], Prices: [{ Price: 0 }],
  },
  {
    Id: 305, Name: 'Guantes Látex (caja 100)', FamilyId: 3, VatId: 1, CostPrice: 5.80,
    StorageOptions: [{ WarehouseId: 1, Location: 'L-11', MinStock: 2, MaxStock: 5 }],
    CostPrices: [{ WarehouseId: 1, CostPrice: 5.80 }], Prices: [{ Price: 0 }],
  },

  // VARIOS (FamilyId: 4)
  {
    Id: 401, Name: 'Film Transparente Alimentario 300m', FamilyId: 4, VatId: 1, CostPrice: 3.40,
    StorageOptions: [{ WarehouseId: 1, Location: 'V-01', MinStock: 1, MaxStock: 4 }],
    CostPrices: [{ WarehouseId: 1, CostPrice: 3.40 }], Prices: [{ Price: 0 }],
  },
  {
    Id: 402, Name: 'Papel de Aluminio 150m', FamilyId: 4, VatId: 1, CostPrice: 4.50,
    StorageOptions: [{ WarehouseId: 1, Location: 'V-02', MinStock: 1, MaxStock: 3 }],
    CostPrices: [{ WarehouseId: 1, CostPrice: 4.50 }], Prices: [{ Price: 0 }],
  },
  {
    Id: 403, Name: 'Bolsas Basura 55L (30 uds)', FamilyId: 4, VatId: 1, CostPrice: 2.90,
    StorageOptions: [{ WarehouseId: 1, Location: 'V-03', MinStock: 3, MaxStock: 8 }],
    CostPrices: [{ WarehouseId: 1, CostPrice: 2.90 }], Prices: [{ Price: 0 }],
  },
  {
    Id: 404, Name: 'Palillos Dientes (caja 1000)', FamilyId: 4, VatId: 1, CostPrice: 1.20,
    StorageOptions: [{ WarehouseId: 1, Location: 'V-10', MinStock: 5, MaxStock: 15 }],
    CostPrices: [{ WarehouseId: 1, CostPrice: 1.20 }], Prices: [{ Price: 0 }],
  },
  {
    Id: 405, Name: 'Pajitas Papel (250 uds)', FamilyId: 4, VatId: 1, CostPrice: 2.50,
    StorageOptions: [{ WarehouseId: 1, Location: 'V-11', MinStock: 5, MaxStock: 15 }],
    CostPrices: [{ WarehouseId: 1, CostPrice: 2.50 }], Prices: [{ Price: 0 }],
  },
]

// ── Stock ──────────────────────────────────────────────────────────────────────
// Note: qty <= minStock → alert (9 alerts total for demo)
const STOCKS = [
  // Bodega principal (WH1)
  { ProductId: 101, WarehouseId: 1, Quantity: 8 },
  { ProductId: 102, WarehouseId: 1, Quantity: 6 },
  { ProductId: 103, WarehouseId: 1, Quantity: 5 },
  { ProductId: 104, WarehouseId: 1, Quantity: 8 },
  { ProductId: 105, WarehouseId: 1, Quantity: 6 },
  { ProductId: 106, WarehouseId: 1, Quantity: 12 },
  { ProductId: 107, WarehouseId: 1, Quantity: 8 },
  { ProductId: 108, WarehouseId: 1, Quantity: 4 },
  { ProductId: 109, WarehouseId: 1, Quantity: 3 },
  { ProductId: 110, WarehouseId: 1, Quantity: 3 },
  { ProductId: 301, WarehouseId: 1, Quantity: 4 },
  { ProductId: 302, WarehouseId: 1, Quantity: 0 },  // AGOTADO (min=2) → ALERTA
  { ProductId: 303, WarehouseId: 1, Quantity: 1 },  // = min (1) → ALERTA
  { ProductId: 304, WarehouseId: 1, Quantity: 3 },  // = min (3) → ALERTA
  { ProductId: 305, WarehouseId: 1, Quantity: 2 },  // = min (2) → ALERTA
  { ProductId: 401, WarehouseId: 1, Quantity: 2 },
  { ProductId: 402, WarehouseId: 1, Quantity: 1 },  // = min (1) → ALERTA
  { ProductId: 403, WarehouseId: 1, Quantity: 5 },
  { ProductId: 404, WarehouseId: 1, Quantity: 9 },
  { ProductId: 405, WarehouseId: 1, Quantity: 7 },
  // Barra (WH2)
  { ProductId: 101, WarehouseId: 2, Quantity: 2 },
  { ProductId: 102, WarehouseId: 2, Quantity: 1 },
  { ProductId: 103, WarehouseId: 2, Quantity: 3 },
  { ProductId: 104, WarehouseId: 2, Quantity: 4 },
  { ProductId: 105, WarehouseId: 2, Quantity: 2 },
  { ProductId: 106, WarehouseId: 2, Quantity: 6 },
  { ProductId: 107, WarehouseId: 2, Quantity: 3 },
  { ProductId: 108, WarehouseId: 2, Quantity: 2 },
  { ProductId: 109, WarehouseId: 2, Quantity: 2 },
  { ProductId: 110, WarehouseId: 2, Quantity: 1 },  // = min (1) → ALERTA
  { ProductId: 205, WarehouseId: 2, Quantity: 2 },
  { ProductId: 206, WarehouseId: 2, Quantity: 1 },  // < min (2) → ALERTA
  // Cocina (WH3)
  { ProductId: 201, WarehouseId: 3, Quantity: 3 },
  { ProductId: 202, WarehouseId: 3, Quantity: 1 },  // = min (1) → ALERTA
  { ProductId: 203, WarehouseId: 3, Quantity: 2 },
  { ProductId: 204, WarehouseId: 3, Quantity: 4 },
  { ProductId: 205, WarehouseId: 3, Quantity: 5 },
  { ProductId: 206, WarehouseId: 3, Quantity: 8 },
  { ProductId: 207, WarehouseId: 3, Quantity: 24 },
  { ProductId: 208, WarehouseId: 3, Quantity: 8 },
  { ProductId: 209, WarehouseId: 3, Quantity: 6 },
  { ProductId: 210, WarehouseId: 3, Quantity: 2 },  // = min (2) → ALERTA
]

// ── Albaranes ──────────────────────────────────────────────────────────────────
const ALBARANES = [
  {
    Id: 'ALB-0001', Number: '0001', Serie: 'ALB', Date: daysAgo(28), Status: 'Invoiced',
    Supplier: { Id: 2, Name: 'Cervezas Damm' }, Warehouse: { Id: 1, Name: 'Bodega principal' }, Notes: '',
    Lines: [{ ProductId: 101, ProductName: 'Cerveza Estrella Damm Barril 30L', DeliveredQuantity: 6, OrderedQuantity: 6, Price: 65.50, CostPrice: 65.50 }],
    _synced: true,
  },
  {
    Id: 'ALB-0002', Number: '0002', Serie: 'ALB', Date: daysAgo(22), Status: 'Invoiced',
    Supplier: { Id: 1, Name: 'Makro España' }, Warehouse: { Id: 3, Name: 'Cocina' }, Notes: 'Pedido semanal cocina',
    Lines: [
      { ProductId: 201, ProductName: 'Aceite Oliva Virgen Extra 5L', DeliveredQuantity: 3, OrderedQuantity: 3, Price: 22.50, CostPrice: 22.50 },
      { ProductId: 204, ProductName: 'Harina de Trigo T-55 5kg', DeliveredQuantity: 5, OrderedQuantity: 5, Price: 3.20, CostPrice: 3.20 },
      { ProductId: 205, ProductName: 'Café Molido Bonka 1kg', DeliveredQuantity: 4, OrderedQuantity: 4, Price: 7.90, CostPrice: 7.90 },
    ],
    _synced: true,
  },
  {
    Id: 'ALB-0003', Number: '0003', Serie: 'ALB', Date: daysAgo(18), Status: 'Served',
    Supplier: { Id: 3, Name: 'Mahou San Miguel' }, Warehouse: { Id: 1, Name: 'Bodega principal' }, Notes: '',
    Lines: [{ ProductId: 102, ProductName: 'Cerveza Mahou 5★ Barril 30L', DeliveredQuantity: 4, OrderedQuantity: 4, Price: 62.00, CostPrice: 62.00 }],
    _synced: true,
  },
  {
    Id: 'ALB-0004', Number: '0004', Serie: 'ALB', Date: daysAgo(15), Status: 'Invoiced',
    Supplier: { Id: 1, Name: 'Makro España' }, Warehouse: { Id: 3, Name: 'Cocina' }, Notes: '',
    Lines: [
      { ProductId: 206, ProductName: 'Leche Entera Asturiana 1L (caja 12)', DeliveredQuantity: 4, OrderedQuantity: 4, Price: 9.60, CostPrice: 9.60 },
      { ProductId: 202, ProductName: 'Sal Gruesa 25kg', DeliveredQuantity: 1, OrderedQuantity: 1, Price: 4.50, CostPrice: 4.50 },
      { ProductId: 203, ProductName: 'Azúcar Blanquilla 5kg', DeliveredQuantity: 3, OrderedQuantity: 3, Price: 2.80, CostPrice: 2.80 },
    ],
    _synced: true,
  },
  {
    Id: 'ALB-0005', Number: '0005', Serie: 'ALB', Date: daysAgo(10), Status: 'Pending',
    Supplier: { Id: 5, Name: 'ProcoLim' }, Warehouse: { Id: 1, Name: 'Bodega principal' }, Notes: 'Pedido limpieza mensual',
    Lines: [
      { ProductId: 301, ProductName: 'Lavavajillas Industrial 5L', DeliveredQuantity: 4, OrderedQuantity: 4, Price: 9.80, CostPrice: 9.80 },
      { ProductId: 302, ProductName: 'Lejía Desinfectante 5L', DeliveredQuantity: 6, OrderedQuantity: 6, Price: 3.50, CostPrice: 3.50 },
      { ProductId: 303, ProductName: 'Limpiacristales KH7 1L', DeliveredQuantity: 3, OrderedQuantity: 3, Price: 3.90, CostPrice: 3.90 },
    ],
    _synced: true,
  },
  {
    Id: 'ALB-0006', Number: '0006', Serie: 'ALB', Date: daysAgo(7), Status: 'Served',
    Supplier: { Id: 1, Name: 'Makro España' }, Warehouse: { Id: 3, Name: 'Cocina' }, Notes: '',
    Lines: [
      { ProductId: 209, ProductName: 'Patatas Fritas 5kg', DeliveredQuantity: 6, OrderedQuantity: 6, Price: 4.50, CostPrice: 4.50 },
      { ProductId: 208, ProductName: 'Pollo Entero Fresco (kg)', DeliveredQuantity: 8, OrderedQuantity: 8, Price: 3.20, CostPrice: 3.20 },
      { ProductId: 210, ProductName: 'Tomate Frito Orlando 3.15kg', DeliveredQuantity: 4, OrderedQuantity: 4, Price: 5.90, CostPrice: 5.90 },
    ],
    _synced: true,
  },
  {
    Id: 'ALB-0007', Number: '0007', Serie: 'ALB', Date: daysAgo(3), Status: 'Served',
    Supplier: { Id: 1, Name: 'Makro España' }, Warehouse: { Id: 1, Name: 'Bodega principal' }, Notes: '',
    Lines: [
      { ProductId: 104, ProductName: 'Coca-Cola 33cl (pack 24)', DeliveredQuantity: 5, OrderedQuantity: 5, Price: 9.60, CostPrice: 9.60 },
      { ProductId: 103, ProductName: 'Agua Bezoya 1.5L (caja 12)', DeliveredQuantity: 2, OrderedQuantity: 2, Price: 4.80, CostPrice: 4.80 },
      { ProductId: 105, ProductName: 'Fanta Naranja 33cl (pack 24)', DeliveredQuantity: 3, OrderedQuantity: 3, Price: 9.20, CostPrice: 9.20 },
    ],
    _synced: true,
  },
  {
    Id: 'ALB-0008', Number: '0008', Serie: 'ALB', Date: daysAgo(1), Status: 'Pending',
    Supplier: { Id: 4, Name: 'Koch Foods' }, Warehouse: { Id: 3, Name: 'Cocina' }, Notes: 'Entrega urgente',
    Lines: [
      { ProductId: 207, ProductName: 'Pan Precocido Baguette (ud)', DeliveredQuantity: 48, OrderedQuantity: 48, Price: 0.35, CostPrice: 0.35 },
      { ProductId: 208, ProductName: 'Pollo Entero Fresco (kg)', DeliveredQuantity: 5, OrderedQuantity: 5, Price: 3.20, CostPrice: 3.20 },
    ],
    _synced: true,
  },
]

// ── Traspasos ──────────────────────────────────────────────────────────────────
const TRASPASOS = [
  {
    Id: 'TRS-001', Date: daysAgo(14), Status: 'Completed',
    OriginWarehouse: { Id: 1, Name: 'Bodega principal' },
    DestinationWarehouse: { Id: 2, Name: 'Barra' },
    Notes: 'Reposición barra semanal',
    Lines: [
      { ProductId: 106, ProductName: 'Vino Tinto Rioja Reserva 75cl', Quantity: 3 },
      { ProductId: 107, ProductName: 'Vino Blanco Verdejo 75cl', Quantity: 2 },
    ],
  },
  {
    Id: 'TRS-002', Date: daysAgo(7), Status: 'Completed',
    OriginWarehouse: { Id: 1, Name: 'Bodega principal' },
    DestinationWarehouse: { Id: 2, Name: 'Barra' },
    Notes: 'Reposición refrescos',
    Lines: [
      { ProductId: 103, ProductName: 'Agua Bezoya 1.5L (caja 12)', Quantity: 2 },
      { ProductId: 104, ProductName: 'Coca-Cola 33cl (pack 24)', Quantity: 2 },
    ],
  },
  {
    Id: 'TRS-003', Date: daysAgo(3), Status: 'Completed',
    OriginWarehouse: { Id: 3, Name: 'Cocina' },
    DestinationWarehouse: { Id: 2, Name: 'Barra' },
    Notes: 'Café y leche para barra',
    Lines: [
      { ProductId: 205, ProductName: 'Café Molido Bonka 1kg', Quantity: 1 },
      { ProductId: 206, ProductName: 'Leche Entera Asturiana 1L (caja 12)', Quantity: 1 },
    ],
  },
]

// ── Public API ─────────────────────────────────────────────────────────────────
export const getMockMaestros = () => ({
  Products: PRODUCTS,
  Stocks:   STOCKS,
  Suppliers: SUPPLIERS,
  Warehouses: WAREHOUSES,
})

export const getMockAlbaranes = () => ({ IncomingDeliveryNotes: ALBARANES })
export const getMockTraspasos  = () => ({ StockTransfers: TRASPASOS })

export const MOCK_CONN_NAME = 'Tpvrent Bistró (Demo)'
