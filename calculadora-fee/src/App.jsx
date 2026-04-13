import { useState } from "react";

// Aquí empieza tu app — todo lo que hay dentro de "function App()" es lo que se ve en pantalla
export default function App() {

  // useState = una caja que guarda un valor y actualiza la pantalla cuando cambia
  const [desarrollo, setDesarrollo] = useState(3000);   // precio desarrollo inicial
  const [fee, setFee] = useState(200);                  // fee mensual
  const [meses, setMeses] = useState(12);               // meses de contrato
  const [margen, setMargen] = useState(70);             // % de margen sobre costes

  // Cálculos — se recalculan solos cada vez que cambia cualquier valor
  const costeInfra = 5;                                 // coste real infraestructura/mes
  const ingresoAnual = desarrollo + (fee * meses);
  const costeAnual = costeInfra * meses;
  const beneficioAnual = ingresoAnual - costeAnual;
  const roiPorcentaje = ((beneficioAnual / ingresoAnual) * 100).toFixed(1);
  const precioFeeMinimo = (costeInfra / (1 - margen / 100)).toFixed(0);

  // Lo que devuelve esta función ES lo que aparece en el navegador
  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: 600, margin: "40px auto", padding: "0 20px" }}>

      <h1 style={{ fontSize: 24, marginBottom: 8 }}>💰 Calculadora de fee mensual</h1>
      <p style={{ color: "#666", marginBottom: 32 }}>Calcula cuánto cobrar a tus clientes</p>

      {/* INPUTS — cada input actualiza su useState cuando el usuario escribe */}
      <div style={{ display: "grid", gap: 16, marginBottom: 32 }}>

        <div>
          <label style={{ display: "block", fontWeight: "bold", marginBottom: 4 }}>
            Precio desarrollo inicial (€)
          </label>
          <input
            type="number"
            value={desarrollo}
            onChange={e => setDesarrollo(Number(e.target.value))}  // actualiza el useState
            style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 16 }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontWeight: "bold", marginBottom: 4 }}>
            Fee mensual que cobras (€)
          </label>
          <input
            type="number"
            value={fee}
            onChange={e => setFee(Number(e.target.value))}
            style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 16 }}
          />
          <p style={{ color: "#888", fontSize: 13, marginTop: 4 }}>
            Fee mínimo recomendado: <strong>{precioFeeMinimo}€/mes</strong> (con {margen}% de margen)
          </p>
        </div>

        <div>
          <label style={{ display: "block", fontWeight: "bold", marginBottom: 4 }}>
            Meses de contrato: <span style={{ color: "#3b82f6" }}>{meses} meses</span>
          </label>
          <input
            type="range"
            min="1" max="24" value={meses}
            onChange={e => setMeses(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontWeight: "bold", marginBottom: 4 }}>
            Margen objetivo: <span style={{ color: "#3b82f6" }}>{margen}%</span>
          </label>
          <input
            type="range"
            min="10" max="95" value={margen}
            onChange={e => setMargen(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>

      </div>

      {/* RESULTADOS — se actualizan solos porque usan los valores de useState */}
      <div style={{ background: "#f8fafc", borderRadius: 12, padding: 24, border: "1px solid #e2e8f0" }}>
        <h2 style={{ fontSize: 18, marginBottom: 16 }}>📊 Resumen del proyecto</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

          <div style={{ background: "white", borderRadius: 8, padding: 16, border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Ingreso año 1</div>
            <div style={{ fontSize: 28, fontWeight: "bold", color: "#16a34a" }}>
              {ingresoAnual.toLocaleString()}€
            </div>
            <div style={{ fontSize: 12, color: "#888" }}>desarrollo + {meses} cuotas</div>
          </div>

          <div style={{ background: "white", borderRadius: 8, padding: 16, border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Beneficio neto</div>
            <div style={{ fontSize: 28, fontWeight: "bold", color: "#2563eb" }}>
              {beneficioAnual.toLocaleString()}€
            </div>
            <div style={{ fontSize: 12, color: "#888" }}>después de costes infra</div>
          </div>

          <div style={{ background: "white", borderRadius: 8, padding: 16, border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Margen real</div>
            <div style={{ fontSize: 28, fontWeight: "bold", color: roiPorcentaje > 80 ? "#16a34a" : "#f59e0b" }}>
              {roiPorcentaje}%
            </div>
            <div style={{ fontSize: 12, color: "#888" }}>sobre ingresos totales</div>
          </div>

          <div style={{ background: "white", borderRadius: 8, padding: 16, border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Coste infra/mes</div>
            <div style={{ fontSize: 28, fontWeight: "bold", color: "#6b7280" }}>
              {costeInfra}€
            </div>
            <div style={{ fontSize: 12, color: "#888" }}>Vercel + Supabase</div>
          </div>

        </div>

        {/* Proyección a 3 años */}
        <div style={{ marginTop: 16, background: "#eff6ff", borderRadius: 8, padding: 16 }}>
          <div style={{ fontWeight: "bold", marginBottom: 8 }}>📈 Proyección recurrente</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, fontSize: 14 }}>
            <div>
              <div style={{ color: "#666" }}>Año 1</div>
              <div style={{ fontWeight: "bold" }}>{ingresoAnual.toLocaleString()}€</div>
            </div>
            <div>
              <div style={{ color: "#666" }}>Año 2</div>
              <div style={{ fontWeight: "bold" }}>{(fee * 12).toLocaleString()}€</div>
            </div>
            <div>
              <div style={{ color: "#666" }}>Año 3</div>
              <div style={{ fontWeight: "bold" }}>{(fee * 12).toLocaleString()}€</div>
            </div>
          </div>
        </div>

      </div>

      <p style={{ color: "#888", fontSize: 12, marginTop: 16, textAlign: "center" }}>
        Coste real infraestructura: {costeInfra}€/mes · Margen bruto estimado
      </p>

    </div>
  );
}