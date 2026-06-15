// src/components/inventory/SellPerfume.jsx
// Vender perfume: elegir perfume, cantidad, ver subtotal en vivo y confirmar.
// Descuenta stock; si es insuficiente, bloquea y avisa.

import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { usePerfumes } from "../../hooks/usePerfumes";

export default function SellPerfume({ onBack, onSold }) {
  const { fetchPerfumes, sellPerfume } = usePerfumes();

  const [perfumes, setPerfumes] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setPerfumes(await fetchPerfumes());
  }, [fetchPerfumes]);

  useEffect(() => {
    load();
  }, [load]);

  const selected = perfumes.find((p) => String(p.id) === String(selectedId)) || null;
  const qty = parseInt(cantidad, 10) || 0;
  const subtotal = selected ? (Number(selected.precio) || 0) * qty : 0;
  const stockOk = selected ? qty > 0 && qty <= Number(selected.stock || 0) : false;

  const handleSell = async () => {
    if (!selected) {
      toast.error("Selecciona un perfume.");
      return;
    }
    setBusy(true);
    const { error } = await sellPerfume(selected, qty);
    setBusy(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(`Venta registrada: ${selected.nombre} ×${qty}`);
    setCantidad("1");
    setSelectedId("");
    await load();
    onSold?.();
  };

  return (
    <div className="screen">
      <div className="topbar">
        <button className="back-btn" onClick={onBack} aria-label="Volver">
          <ArrowLeft size={18} />
        </button>
        <div className="topbar-title">
          <span className="step-label">Ventas</span>
          <h2>Vender perfume</h2>
        </div>
      </div>

      <div className="form-scroll">
        {perfumes.length === 0 ? (
          <div className="empty-state">
            <p>No hay perfumes en el inventario.</p>
            <p>Agrega perfumes antes de vender.</p>
          </div>
        ) : (
          <>
            <label className="field field--full" style={{ marginTop: 16 }}>
              <span className="field-label">Perfume</span>
              <select
                className="field-input"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                <option value="">— Selecciona un perfume —</option>
                {perfumes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} · ${Number(p.precio).toLocaleString("es-CL")} · {p.stock} u.
                  </option>
                ))}
              </select>
            </label>

            <label className="field field--full">
              <span className="field-label">Cantidad</span>
              <input
                className="field-input"
                type="number"
                inputMode="numeric"
                min="1"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
              />
            </label>

            {/* Resumen de la venta */}
            <div className="sale-summary">
              <div className="sale-summary-row">
                <span>Precio unitario</span>
                <span>${selected ? Number(selected.precio).toLocaleString("es-CL") : "0"}</span>
              </div>
              <div className="sale-summary-row">
                <span>Stock disponible</span>
                <span>{selected ? `${selected.stock} u.` : "—"}</span>
              </div>
              <div className="sale-summary-row sale-summary-row--total">
                <span>Subtotal</span>
                <span>${subtotal.toLocaleString("es-CL")}</span>
              </div>
            </div>

            {selected && !stockOk && qty > 0 && (
              <p className="sale-warning">Stock insuficiente para esa cantidad.</p>
            )}

            <button
              className="cta-button"
              onClick={handleSell}
              disabled={busy || !stockOk}
              style={{ marginTop: 18 }}
            >
              <ShoppingCart size={20} strokeWidth={2.5} />
              Confirmar venta
            </button>
          </>
        )}
      </div>
    </div>
  );
}
