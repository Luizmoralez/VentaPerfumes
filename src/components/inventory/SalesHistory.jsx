// src/components/inventory/SalesHistory.jsx
// Historial de ventas ordenado por fecha desc (Perfume, Cantidad, Subtotal,
// Fecha/Hora) + total acumulado.

import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { usePerfumes } from "../../hooks/usePerfumes";

function formatFecha(venta) {
  // Soporta created_at de Supabase (ISO string) o el timestamp local (number)
  const raw = venta.created_at;
  const d = typeof raw === "number" ? new Date(raw) : new Date(raw);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SalesHistory({ onBack }) {
  const { fetchVentas } = usePerfumes();
  const [ventas, setVentas] = useState([]);

  const load = useCallback(async () => {
    setVentas(await fetchVentas());
  }, [fetchVentas]);

  useEffect(() => {
    load();
  }, [load]);

  const total = ventas.reduce((acc, v) => acc + (Number(v.subtotal) || 0), 0);

  return (
    <div className="screen">
      <div className="topbar">
        <button className="back-btn" onClick={onBack} aria-label="Volver">
          <ArrowLeft size={18} />
        </button>
        <div className="topbar-title">
          <span className="step-label">Ventas</span>
          <h2>Historial de ventas</h2>
        </div>
      </div>

      <div className="form-scroll">
        {/* Total acumulado */}
        <div className="sale-summary" style={{ marginTop: 16 }}>
          <div className="sale-summary-row sale-summary-row--total">
            <span>Total vendido ({ventas.length})</span>
            <span>${total.toLocaleString("es-CL")}</span>
          </div>
        </div>

        {ventas.length === 0 ? (
          <div className="empty-state">
            <ClipboardList size={28} style={{ opacity: 0.4, marginBottom: 8 }} />
            <p>Aún no hay ventas registradas.</p>
          </div>
        ) : (
          <div className="sale-list">
            {ventas.map((v) => (
              <div key={v.id} className="sale-row">
                <div className="sale-row-main">
                  <span className="sale-row-name">{v.nombre}</span>
                  <span className="sale-row-date">{formatFecha(v)}</span>
                </div>
                <span className="sale-row-qty">×{v.cantidad}</span>
                <span className="sale-row-subtotal">
                  ${Number(v.subtotal).toLocaleString("es-CL")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
