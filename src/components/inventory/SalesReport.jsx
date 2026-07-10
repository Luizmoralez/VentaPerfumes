// src/components/inventory/SalesReport.jsx
// Reportes del admin: KPIs (total, nº ventas, unidades), ventas por día
// (últimos 14 días) y top 5 perfumes por unidades vendidas.
// Gráficos de una sola serie → hue único (#A78BFA, contraste 6.3:1 sobre
// --surface, validado), sin leyenda; marcas finas con extremo redondeado.

import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, BarChart3 } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { usePerfumes } from "../../hooks/usePerfumes";

const MARK = "#A78BFA";      // --accent: única serie, validado sobre superficie
const GRID = "#2E2E40";      // --border: rejilla recesiva
const TICK = "#475569";      // --text-3: texto de ejes

const DIAS_VENTANA = 14;

/** Fecha de una venta como objeto Date (soporta ISO de Supabase y timestamp local) */
function fechaVenta(v) {
  const d = typeof v.created_at === "number" ? new Date(v.created_at) : new Date(v.created_at);
  return isNaN(d.getTime()) ? null : d;
}

/** Clave YYYY-MM-DD en hora local */
function dayKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Serie continua de los últimos N días (rellena con 0 los días sin ventas) */
function ventasPorDia(ventas) {
  const porDia = new Map();
  for (const v of ventas) {
    const d = fechaVenta(v);
    if (!d) continue;
    const k = dayKey(d);
    porDia.set(k, (porDia.get(k) || 0) + (Number(v.subtotal) || 0));
  }

  const out = [];
  const hoy = new Date();
  for (let i = DIAS_VENTANA - 1; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - i);
    out.push({
      dia: d.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit" }),
      total: porDia.get(dayKey(d)) || 0,
    });
  }
  return out;
}

/** Top N perfumes por unidades vendidas */
function topPerfumes(ventas, n = 5) {
  const porPerfume = new Map();
  for (const v of ventas) {
    const prev = porPerfume.get(v.nombre) || { nombre: v.nombre, unidades: 0, total: 0 };
    prev.unidades += Number(v.cantidad) || 0;
    prev.total += Number(v.subtotal) || 0;
    porPerfume.set(v.nombre, prev);
  }
  return [...porPerfume.values()]
    .sort((a, b) => b.unidades - a.unidades)
    .slice(0, n);
}

const fmtCLP = (n) => "$" + Number(n).toLocaleString("es-CL");

/** Tooltip oscuro consistente con el sistema */
function ChartTooltip({ active, payload, label, money }) {
  if (!active || !payload?.length) return null;
  const v = payload[0].value;
  return (
    <div className="chart-tooltip">
      <span className="chart-tooltip-label">{label}</span>
      <span className="chart-tooltip-value">{money ? fmtCLP(v) : `${v} u.`}</span>
    </div>
  );
}

export default function SalesReport({ onBack }) {
  const { fetchVentas } = usePerfumes();
  const [ventas, setVentas] = useState([]);

  const load = useCallback(async () => {
    setVentas(await fetchVentas());
  }, [fetchVentas]);

  useEffect(() => {
    load();
  }, [load]);

  const total = ventas.reduce((acc, v) => acc + (Number(v.subtotal) || 0), 0);
  const unidades = ventas.reduce((acc, v) => acc + (Number(v.cantidad) || 0), 0);
  const serieDias = ventasPorDia(ventas);
  const top = topPerfumes(ventas);

  return (
    <div className="screen">
      <div className="topbar">
        <button className="back-btn" onClick={onBack} aria-label="Volver">
          <ArrowLeft size={18} />
        </button>
        <div className="topbar-title">
          <span className="step-label">Moderador</span>
          <h2>Reportes de ventas</h2>
        </div>
      </div>

      <div className="form-scroll">
        {ventas.length === 0 ? (
          <div className="empty-state">
            <BarChart3 size={28} style={{ opacity: 0.4, marginBottom: 8 }} />
            <p>Aún no hay ventas para graficar.</p>
            <p>Registra la primera y vuelve aquí.</p>
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="stats-row" style={{ marginTop: 16 }}>
              <div className="stat-card">
                <span className="stat-num">{fmtCLP(total)}</span>
                <span className="stat-label">Total vendido</span>
              </div>
              <div className="stat-card">
                <span className="stat-num">{ventas.length}</span>
                <span className="stat-label">Ventas</span>
              </div>
              <div className="stat-card">
                <span className="stat-num">{unidades}</span>
                <span className="stat-label">Unidades</span>
              </div>
            </div>

            {/* Ventas por día (últimos 14 días) */}
            <div className="chart-block">
              <div className="chart-title">Ventas por día · últimos {DIAS_VENTANA} días</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={serieDias} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                  <CartesianGrid stroke={GRID} strokeWidth={1} vertical={false} />
                  <XAxis
                    dataKey="dia"
                    tick={{ fill: TICK, fontSize: 10 }}
                    tickLine={false}
                    axisLine={{ stroke: GRID }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: TICK, fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                    tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(167, 139, 250, 0.08)" }}
                    content={<ChartTooltip money />}
                  />
                  <Bar dataKey="total" fill={MARK} barSize={14} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top perfumes por unidades */}
            <div className="chart-block">
              <div className="chart-title">Top perfumes · unidades vendidas</div>
              <ResponsiveContainer width="100%" height={Math.max(64, top.length * 44 + 24)}>
                <BarChart data={top} layout="vertical" margin={{ top: 4, right: 36, left: 4, bottom: 0 }}>
                  <CartesianGrid stroke={GRID} strokeWidth={1} horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: TICK, fontSize: 10 }}
                    tickLine={false}
                    axisLine={{ stroke: GRID }}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="nombre"
                    tick={{ fill: "#94A3B8", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={110}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(167, 139, 250, 0.08)" }}
                    content={<ChartTooltip />}
                  />
                  <Bar
                    dataKey="unidades"
                    fill={MARK}
                    barSize={16}
                    radius={[0, 4, 4, 0]}
                    label={{ position: "right", fill: "#94A3B8", fontSize: 11 }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Vista de tabla (accesibilidad: los datos nunca solo en el gráfico) */}
            <div className="chart-block">
              <div className="chart-title">Detalle por perfume</div>
              <div className="report-table">
                {top.map((t) => (
                  <div key={t.nombre} className="report-table-row">
                    <span className="report-table-name">{t.nombre}</span>
                    <span className="report-table-qty">{t.unidades} u.</span>
                    <span className="report-table-total">{fmtCLP(t.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
