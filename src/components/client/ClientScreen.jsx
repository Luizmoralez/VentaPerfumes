// src/components/client/ClientScreen.jsx
// Interfaz de cliente (no admin): catálogo de perfumes en solo lectura +
// solicitud de compra (método de pago y entrega). Registra un pedido
// "Pendiente" para que el moderador lo revise. Sin editar/borrar/historial.
// Pestaña "Mis pedidos": el cliente ve el estado de sus propias solicitudes
// (la RLS de Supabase ya limita fetchPedidos a las suyas).

import { useEffect, useState, useCallback } from "react";
import { Boxes, ShoppingBag, ClipboardList, LogOut, X, Wallet, Truck, MapPin, Search } from "lucide-react";
import { toast } from "sonner";
import { usePerfumes } from "../../hooks/usePerfumes";

const PAGOS = ["Efectivo", "Transferencia"];
const ENTREGAS = ["Retiro", "Envío"];

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

export default function ClientScreen({ onLogout }) {
  const { fetchPerfumes, createPedido, fetchPedidos } = usePerfumes();

  const [tab, setTab] = useState("catalogo"); // "catalogo" | "pedidos"
  const [perfumes, setPerfumes] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [selected, setSelected] = useState(null); // perfume del modal
  const [pago, setPago] = useState("");
  const [entrega, setEntrega] = useState("");
  const [direccion, setDireccion] = useState(""); // solo cuando entrega === "Envío"
  const [busy, setBusy] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  // Filtro client-side por nombre o "similar a"
  const q = busqueda.trim().toLowerCase();
  const visibles = q
    ? perfumes.filter(
        (p) =>
          (p.nombre || "").toLowerCase().includes(q) ||
          (p.similar_a || "").toLowerCase().includes(q)
      )
    : perfumes;

  const load = useCallback(async () => {
    setPerfumes(await fetchPerfumes());
  }, [fetchPerfumes]);

  const loadPedidos = useCallback(async () => {
    setPedidos(await fetchPedidos());
  }, [fetchPedidos]);

  useEffect(() => {
    load();
  }, [load]);

  // Refresca los pedidos cada vez que se entra a la pestaña
  useEffect(() => {
    if (tab === "pedidos") loadPedidos();
  }, [tab, loadPedidos]);

  const openRequest = (p) => {
    setSelected(p);
    setPago("");
    setEntrega("");
    setDireccion("");
  };
  const closeRequest = () => setSelected(null);

  const submitRequest = async () => {
    if (!pago || !entrega) {
      toast.error("Selecciona método de pago y de entrega.");
      return;
    }
    if (entrega === "Envío" && !direccion.trim()) {
      toast.error("Indica la dirección de envío.");
      return;
    }
    setBusy(true);
    const { error } = await createPedido({
      perfume_id: selected.id,
      nombre: selected.nombre,
      precio: Number(selected.precio) || 0,
      metodo_pago: pago,
      metodo_entrega: entrega,
      direccion_envio: entrega === "Envío" ? direccion.trim() : null,
    });
    setBusy(false);
    if (error) {
      toast.error("No se pudo enviar la solicitud: " + error);
      return;
    }
    toast.success("¡Solicitud enviada! Te contactaremos pronto.");
    closeRequest();
  };

  return (
    <div className="screen">
      <div className="topbar">
        <div className="logo-mark">
          <Boxes size={20} strokeWidth={2.5} />
        </div>
        <div className="topbar-title">
          <span className="step-label">Venta Perfumes</span>
          <h2>{tab === "catalogo" ? "Perfumes disponibles" : "Mis pedidos"}</h2>
        </div>
        {onLogout && (
          <button className="back-btn" onClick={onLogout} aria-label="Cerrar sesión" title="Cerrar sesión">
            <LogOut size={18} />
          </button>
        )}
      </div>

      {/* Pestañas Catálogo / Mis pedidos */}
      <div className="tab-bar">
        <button
          className={`tab-btn${tab === "catalogo" ? " tab-btn--active" : ""}`}
          onClick={() => setTab("catalogo")}
        >
          <ShoppingBag size={15} strokeWidth={2.4} />
          Catálogo
        </button>
        <button
          className={`tab-btn${tab === "pedidos" ? " tab-btn--active" : ""}`}
          onClick={() => setTab("pedidos")}
        >
          <ClipboardList size={15} strokeWidth={2.4} />
          Mis pedidos
        </button>
      </div>

      <div className="form-scroll">
        {/* ── Catálogo ── */}
        {tab === "catalogo" && perfumes.length > 0 && (
          <div className="search-wrap" style={{ marginTop: 16 }}>
            <Search size={16} className="search-icon" />
            <input
              className="field-input search-input"
              placeholder="Buscar por nombre o similar a…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        )}
        {tab === "catalogo" && (
          perfumes.length === 0 ? (
            <div className="empty-state">
              <p>No hay perfumes disponibles por ahora.</p>
              <p>Vuelve más tarde.</p>
            </div>
          ) : visibles.length === 0 ? (
            <div className="empty-state">
              <p>Sin resultados para “{busqueda}”.</p>
            </div>
          ) : (
            <div className="catalog-list">
              {visibles.map((p) => (
                <div key={p.id} className="catalog-card">
                  <div className="catalog-card-body">
                    <span className="catalog-name">{p.nombre}</span>
                    <span className="catalog-meta">
                      {p.ml} ml{p.similar_a ? ` · Similar a: ${p.similar_a}` : ""}
                    </span>
                    <span className="catalog-price">${Number(p.precio).toLocaleString("es-CL")}</span>
                  </div>
                  <button
                    className="catalog-buy-btn"
                    onClick={() => openRequest(p)}
                    disabled={Number(p.stock) <= 0}
                  >
                    <ShoppingBag size={16} strokeWidth={2.4} />
                    {Number(p.stock) <= 0 ? "Sin stock" : "Solicitar"}
                  </button>
                </div>
              ))}
            </div>
          )
        )}

        {/* ── Mis pedidos ── */}
        {tab === "pedidos" && (
          pedidos.length === 0 ? (
            <div className="empty-state">
              <ClipboardList size={28} style={{ opacity: 0.4, marginBottom: 8 }} />
              <p>Aún no has solicitado compras.</p>
              <p>Explora el catálogo y haz tu primer pedido.</p>
            </div>
          ) : (
            <div className="sale-list">
              {pedidos.map((p) => {
                const estado = p.estado || "Pendiente";
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
                    <div className="pedido-foot">
                      <span>{estado === "Pendiente" ? "En revisión" : `Estado: ${estado}`}</span>
                      <span>{formatFecha(p)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Modal de solicitud de compra */}
      {selected && (
        <div className="modal-overlay" onClick={closeRequest}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <span className="step-label">Solicitar compra</span>
                <h3 className="modal-title">{selected.nombre}</h3>
              </div>
              <button className="back-btn" onClick={closeRequest} aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>

            <p className="modal-price">
              ${Number(selected.precio).toLocaleString("es-CL")} · {selected.ml} ml
            </p>

            {/* Método de pago */}
            <div className="choice-group">
              <span className="field-label">
                <Wallet size={13} style={{ marginRight: 6, verticalAlign: "-2px" }} />
                Método de pago
              </span>
              <div className="choice-row">
                {PAGOS.map((opt) => (
                  <button
                    key={opt}
                    className={`choice-chip${pago === opt ? " choice-chip--active" : ""}`}
                    onClick={() => setPago(opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Método de entrega */}
            <div className="choice-group">
              <span className="field-label">
                <Truck size={13} style={{ marginRight: 6, verticalAlign: "-2px" }} />
                Método de entrega
              </span>
              <div className="choice-row">
                {ENTREGAS.map((opt) => (
                  <button
                    key={opt}
                    className={`choice-chip${entrega === opt ? " choice-chip--active" : ""}`}
                    onClick={() => setEntrega(opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Dirección: solo si eligió Envío */}
            {entrega === "Envío" && (
              <label className="field field--full" style={{ marginBottom: 18 }}>
                <span className="field-label">
                  <MapPin size={13} style={{ marginRight: 6, verticalAlign: "-2px" }} />
                  Dirección de envío
                </span>
                <textarea
                  className="field-input"
                  rows={2}
                  placeholder="Calle, número, comuna, referencia…"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  style={{ resize: "vertical" }}
                />
              </label>
            )}

            <button className="cta-button" onClick={submitRequest} disabled={busy} style={{ marginTop: 10 }}>
              <ShoppingBag size={20} strokeWidth={2.5} />
              Enviar solicitud
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
