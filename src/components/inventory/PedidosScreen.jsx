// src/components/inventory/PedidosScreen.jsx
// Vista del moderador: solicitudes de compra de los clientes (pedidos).
// Muestra cliente, perfume, método de pago/entrega, estado y fecha.
// Ciclo del pedido: Pendiente → Confirmado → Completado (o Rechazado).
// Al completar se descuenta stock y se registra la venta vía sellPerfume.

import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, Inbox, Check, X, PackageCheck } from "lucide-react";
import { toast } from "sonner";
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
  const { fetchPedidos, fetchPerfumes, sellPerfume, updatePedidoEstado } = usePerfumes();
  const [pedidos, setPedidos] = useState([]);
  const [busyId, setBusyId] = useState(null); // pedido en proceso (deshabilita sus botones)

  const load = useCallback(async () => {
    setPedidos(await fetchPedidos());
  }, [fetchPedidos]);

  useEffect(() => {
    load();
  }, [load]);

  // Cambio simple de estado (Confirmar / Rechazar)
  const cambiarEstado = async (pedido, estado) => {
    setBusyId(pedido.id);
    const { error } = await updatePedidoEstado(pedido.id, estado);
    setBusyId(null);
    if (error) {
      toast.error("No se pudo actualizar: " + error);
      return;
    }
    toast.success(`Pedido ${estado.toLowerCase()}.`);
    load();
  };

  // Completar: descuenta stock y registra la venta reutilizando sellPerfume.
  const completar = async (pedido) => {
    setBusyId(pedido.id);

    const perfumes = await fetchPerfumes();
    const perfume = perfumes.find((x) => String(x.id) === String(pedido.perfume_id));
    if (!perfume) {
      setBusyId(null);
      toast.error("El perfume de este pedido ya no existe en el inventario.");
      return;
    }

    // sellPerfume valida stock, lo descuenta e inserta la venta.
    const { error: ventaErr } = await sellPerfume(perfume, 1);
    if (ventaErr) {
      setBusyId(null);
      toast.error(ventaErr); // incluye "Stock insuficiente."
      return;
    }

    const { error: estadoErr } = await updatePedidoEstado(pedido.id, "Completado");
    setBusyId(null);
    if (estadoErr) {
      // La venta ya quedó registrada; avisa que el estado no se pudo guardar.
      toast.error("Venta registrada, pero no se pudo marcar el pedido: " + estadoErr);
    } else {
      toast.success("Pedido completado: stock descontado y venta registrada.");
    }
    load();
  };

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
            {pedidos.map((p) => {
              const estado = p.estado || "Pendiente";
              const busy = busyId === p.id;
              return (
                <div key={p.id} className="pedido-row">
                  <div className="pedido-row-head">
                    <span className="pedido-name">{p.nombre}</span>
                    <span className={`pedido-estado pedido-estado--${estado.toLowerCase()}`}>
                      {estado}
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

                  {/* Acciones según el estado */}
                  {estado === "Pendiente" && (
                    <div className="pedido-actions">
                      <button
                        className="pedido-btn pedido-btn--confirm"
                        onClick={() => cambiarEstado(p, "Confirmado")}
                        disabled={busy}
                      >
                        <Check size={15} strokeWidth={2.5} />
                        Confirmar
                      </button>
                      <button
                        className="pedido-btn pedido-btn--reject"
                        onClick={() => cambiarEstado(p, "Rechazado")}
                        disabled={busy}
                      >
                        <X size={15} strokeWidth={2.5} />
                        Rechazar
                      </button>
                    </div>
                  )}
                  {estado === "Confirmado" && (
                    <div className="pedido-actions">
                      <button
                        className="pedido-btn pedido-btn--complete"
                        onClick={() => completar(p)}
                        disabled={busy}
                      >
                        <PackageCheck size={15} strokeWidth={2.5} />
                        Completar (descuenta stock)
                      </button>
                      <button
                        className="pedido-btn pedido-btn--reject"
                        onClick={() => cambiarEstado(p, "Rechazado")}
                        disabled={busy}
                      >
                        <X size={15} strokeWidth={2.5} />
                        Rechazar
                      </button>
                    </div>
                  )}

                  <div className="pedido-foot">
                    <span>{p.cliente_email || "—"}</span>
                    <span>{formatFecha(p)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
