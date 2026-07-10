// src/components/inventory/PerfumeManager.jsx
// CRUD de perfumes: formulario "Agregar perfume" (Nombre, Ml, Precio, Similar a,
// Stock) + lista con edición inline y eliminación. Usa usePerfumes (Supabase
// con fallback a localStorage).

import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, Plus, Pencil, Trash2, Check, X, Search } from "lucide-react";
import { toast } from "sonner";
import { usePerfumes } from "../../hooks/usePerfumes";

const EMPTY = { nombre: "", ml: "", precio: "", similar_a: "", stock: "" };

export default function PerfumeManager({ onBack }) {
  const { fetchPerfumes, addPerfume, updatePerfume, deletePerfume } = usePerfumes();

  const [perfumes, setPerfumes] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  // Filtro client-side por nombre o "similar a" (sin llamadas extra a Supabase)
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

  useEffect(() => {
    load();
  }, [load]);

  // Normaliza los campos del formulario a tipos correctos
  const toPayload = (f) => ({
    nombre: f.nombre.trim(),
    ml: Number(f.ml) || 0,
    precio: Number(f.precio) || 0,
    similar_a: (f.similar_a || "").trim(),
    stock: parseInt(f.stock, 10) || 0,
  });

  // ── Agregar ──────────────────────────────────────────────
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) {
      toast.error("El nombre es obligatorio.");
      return;
    }
    setBusy(true);
    const { error } = await addPerfume(toPayload(form));
    setBusy(false);
    if (error) {
      toast.error("No se pudo agregar: " + error);
      return;
    }
    toast.success("Perfume agregado.");
    setForm(EMPTY);
    load();
  };

  // ── Editar ───────────────────────────────────────────────
  const startEdit = (p) => {
    setEditingId(p.id);
    setEditForm({
      nombre: p.nombre ?? "",
      ml: String(p.ml ?? ""),
      precio: String(p.precio ?? ""),
      similar_a: p.similar_a ?? "",
      stock: String(p.stock ?? ""),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(EMPTY);
  };

  const saveEdit = async (id) => {
    if (!editForm.nombre.trim()) {
      toast.error("El nombre es obligatorio.");
      return;
    }
    setBusy(true);
    const { error } = await updatePerfume(id, toPayload(editForm));
    setBusy(false);
    if (error) {
      toast.error("No se pudo guardar: " + error);
      return;
    }
    toast.success("Perfume actualizado.");
    cancelEdit();
    load();
  };

  // ── Eliminar ─────────────────────────────────────────────
  const handleDelete = async (p) => {
    if (!window.confirm(`¿Eliminar "${p.nombre}"? Esta acción no se puede deshacer.`)) return;
    const { error } = await deletePerfume(p.id);
    if (error) {
      toast.error("No se pudo eliminar: " + error);
      return;
    }
    toast.success("Perfume eliminado.");
    load();
  };

  return (
    <div className="screen">
      <div className="topbar">
        <button className="back-btn" onClick={onBack} aria-label="Volver">
          <ArrowLeft size={18} />
        </button>
        <div className="topbar-title">
          <span className="step-label">Inventario</span>
          <h2>Gestión de perfumes</h2>
        </div>
      </div>

      <div className="form-scroll">
        {/* Formulario agregar */}
        <form className="perfume-form" onSubmit={handleAdd}>
          <div className="perfume-form-grid">
            <label className="field field--full">
              <span className="field-label">Nombre</span>
              <input
                className="field-input"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Ej. Aroma Intenso"
              />
            </label>
            <label className="field">
              <span className="field-label">Ml</span>
              <input
                className="field-input"
                type="number"
                inputMode="decimal"
                value={form.ml}
                onChange={(e) => setForm({ ...form, ml: e.target.value })}
                placeholder="100"
              />
            </label>
            <label className="field">
              <span className="field-label">Precio</span>
              <input
                className="field-input"
                type="number"
                inputMode="decimal"
                value={form.precio}
                onChange={(e) => setForm({ ...form, precio: e.target.value })}
                placeholder="0"
              />
            </label>
            <label className="field field--full">
              <span className="field-label">Similar a</span>
              <input
                className="field-input"
                value={form.similar_a}
                onChange={(e) => setForm({ ...form, similar_a: e.target.value })}
                placeholder="Ej. equivalencia / referencia"
              />
            </label>
            <label className="field">
              <span className="field-label">Stock</span>
              <input
                className="field-input"
                type="number"
                inputMode="numeric"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                placeholder="0"
              />
            </label>
          </div>
          <button type="submit" className="cta-button" disabled={busy}>
            <Plus size={20} strokeWidth={2.5} />
            Agregar perfume
          </button>
        </form>

        {/* Lista de perfumes */}
        <div className="recent-header" style={{ marginTop: 28 }}>
          <span>Perfumes registrados ({visibles.length}{q ? ` de ${perfumes.length}` : ""})</span>
        </div>

        {/* Búsqueda */}
        {perfumes.length > 0 && (
          <div className="search-wrap">
            <Search size={16} className="search-icon" />
            <input
              className="field-input search-input"
              placeholder="Buscar por nombre o similar a…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        )}

        {perfumes.length === 0 && (
          <div className="empty-state">
            <p>Aún no hay perfumes.</p>
            <p>Agrega el primero arriba.</p>
          </div>
        )}

        {perfumes.length > 0 && visibles.length === 0 && (
          <div className="empty-state">
            <p>Sin resultados para “{busqueda}”.</p>
          </div>
        )}

        <div className="perfume-list">
          {visibles.map((p) =>
            editingId === p.id ? (
              // ── Modo edición ──
              <div key={p.id} className="perfume-row perfume-row--editing">
                <div className="perfume-form-grid">
                  <label className="field field--full">
                    <span className="field-label">Nombre</span>
                    <input
                      className="field-input"
                      value={editForm.nombre}
                      onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">Ml</span>
                    <input
                      className="field-input"
                      type="number"
                      value={editForm.ml}
                      onChange={(e) => setEditForm({ ...editForm, ml: e.target.value })}
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">Precio</span>
                    <input
                      className="field-input"
                      type="number"
                      value={editForm.precio}
                      onChange={(e) => setEditForm({ ...editForm, precio: e.target.value })}
                    />
                  </label>
                  <label className="field field--full">
                    <span className="field-label">Similar a</span>
                    <input
                      className="field-input"
                      value={editForm.similar_a}
                      onChange={(e) => setEditForm({ ...editForm, similar_a: e.target.value })}
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">Stock</span>
                    <input
                      className="field-input"
                      type="number"
                      value={editForm.stock}
                      onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })}
                    />
                  </label>
                </div>
                <div className="perfume-row-actions">
                  <button className="icon-btn" onClick={() => saveEdit(p.id)} disabled={busy} aria-label="Guardar">
                    <Check size={18} />
                  </button>
                  <button className="icon-btn" onClick={cancelEdit} aria-label="Cancelar">
                    <X size={18} />
                  </button>
                </div>
              </div>
            ) : (
              // ── Modo lectura ──
              <div key={p.id} className="perfume-row">
                <div className="perfume-row-main">
                  <span className="perfume-name">{p.nombre}</span>
                  <span className="perfume-meta">
                    {p.ml} ml · ${Number(p.precio).toLocaleString("es-CL")}
                    {p.similar_a ? ` · Similar a: ${p.similar_a}` : ""}
                  </span>
                </div>
                <span className={`perfume-stock${Number(p.stock) <= 0 ? " perfume-stock--out" : ""}`}>
                  {Number(p.stock) <= 0 ? "Sin stock" : `${p.stock} u.`}
                </span>
                <div className="perfume-row-actions">
                  <button className="icon-btn" onClick={() => startEdit(p)} aria-label="Editar">
                    <Pencil size={16} />
                  </button>
                  <button className="icon-btn icon-btn--danger" onClick={() => handleDelete(p)} aria-label="Eliminar">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
