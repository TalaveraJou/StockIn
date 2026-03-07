import { SpeedInsights } from '@vercel/speed-insights/react'
import './App.css'

function App() {
  return (
    <>
      <div className="app">
        <header>
          <h1>StockIn · rekor.es</h1>
          <p>Control de stock para Ágora TPV</p>
        </header>
        <main>
          <section className="welcome">
            <h2>Bienvenido a StockIn</h2>
            <p>Gestión de inventario, albaranes, regularizaciones y pedidos de reposición con sincronización en tiempo real.</p>
          </section>
        </main>
      </div>
      <SpeedInsights />
    </>
  )
}

export default App
