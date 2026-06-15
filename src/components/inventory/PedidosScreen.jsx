// src/components/inventory/PedidosScreen.jsx
// Vista del moderador: solicitudes de compra de los clientes (pedidos).
// Muestra cliente, perfume, método de pago/entrega, estado y fecha.

import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, Inbox } from "lucide-react";
import { usePerfumes } from "../../hooks/usePerfumes";

function formatFecha(p) {
  const raw = p.created_at;
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

export default function PedidosScreen({ onBack }) {
  const { fetchPedidos } = usePerfumes();
  const [pedidos, setPedidos] = useState([]);

  const load = useCallback(async () => {
    setPedidos(await fetchPedidos());
  }, [fetchPedidos]);

  useEffect(() => {
    load();
  }, [load]);

  const pendientes = pedidos.filter((p) => (p.estado || "Pendiente") === "Pendiente").length;

  return (
    <div className="screen">
      <div className="topbar">
        <button className="back-btn" onClick={onBack} aria-label="Volver">
          <ArrowLeft size={18} />
        </button>
        <div className="topbar-title">
          <span className="step-label">Moderador</span>
          <h2>Pedidos de clientes</h2>
        </div>
      </div>

      <div className="form-scroll">
        <div className="sale-summary" style={{ marginTop: 16 }}>
          <div className="sale-summary-row sale-summary-row--total">
            <span>Pendientes</span>
            <span>{pendientes}</span>
          </div>
        </div>

        {pedidos.length === 0 ? (
          <div className="empty-state">
            <Inbox size={28} style={{ opacity: 0.4, marginBottom: 8 }} />
            <p>Aún no hay solicitudes de clientes.</p>
          </div>
        ) : (
          <div className="sale-list">
            {pedidos.map((p) => (
              <div key={p.id} className="pedido-row">
                <div className="pedido-row-head">
                  <span className="pedido-name">{p.nombre}</span>
                  <span className={`pedido-estado pedido-estado--${(p.estado || "Pendiente").toLowerCase()}`}>
                    {p.estado || "Pendiente"}
                  </span>
                </div>
                <div className="pedido-tags">
                  <span className="pedido-tag">💳 {p.metodo_pago}</span>
                  <span className="pedido-tag">📦 {p.metodo_entrega}</span>
                  <span className="pedido-tag">${Number(p.precio).toLocaleString("es-CL")}</span>
                </div>
                {p.metodo_entrega === "Envío" && p.direccion_envio && (
                  <div className="pedido-direccion">📍 {p.direccion_envio}</div>
                )}
                <div className="pedido-foot">
                  <span>{p.cliente_email || "—"}</span>
                  <span>{formatFecha(p)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
