// utils/perfumeStorage.js — Fallback con localStorage para perfumes y ventas.
// Se usa cuando NO hay sesión de Supabase (modo invitado) o si Supabase falla,
// replicando el patrón de utils/storage.js para los workouts.

const PERFUMES_KEY = "vp_perfumes";
const VENTAS_KEY = "vp_ventas";
const PEDIDOS_KEY = "vp_pedidos";

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** Genera un id local (no choca con los uuid de Supabase) */
function localId() {
  return "local_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
}

// ── Perfumes ─────────────────────────────────────────────────
export function localGetPerfumes() {
  // Más reciente primero
  return read(PERFUMES_KEY).sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
}

export function localAddPerfume(perfume) {
  const all = read(PERFUMES_KEY);
  const nuevo = { ...perfume, id: perfume.id || localId(), created_at: Date.now() };
  write(PERFUMES_KEY, [nuevo, ...all]);
  return nuevo;
}

export function localUpdatePerfume(id, cambios) {
  const updated = read(PERFUMES_KEY).map((p) => (p.id === id ? { ...p, ...cambios } : p));
  write(PERFUMES_KEY, updated);
  return updated.find((p) => p.id === id) || null;
}

export function localDeletePerfume(id) {
  write(PERFUMES_KEY, read(PERFUMES_KEY).filter((p) => p.id !== id));
}

// ── Ventas ───────────────────────────────────────────────────
export function localGetVentas() {
  return read(VENTAS_KEY).sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
}

export function localAddVenta(venta) {
  const all = read(VENTAS_KEY);
  const nueva = { ...venta, id: venta.id || localId(), created_at: venta.created_at || Date.now() };
  write(VENTAS_KEY, [nueva, ...all]);
  return nueva;
}

// ── Pedidos (solicitudes de cliente) ─────────────────────────
export function localGetPedidos() {
  return read(PEDIDOS_KEY).sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
}

export function localCreatePedido(pedido) {
  const all = read(PEDIDOS_KEY);
  const nuevo = {
    ...pedido,
    id: pedido.id || localId(),
    estado: pedido.estado || "Pendiente",
    created_at: pedido.created_at || Date.now(),
  };
  write(PEDIDOS_KEY, [nuevo, ...all]);
  return nuevo;
}

export function localUpdatePedido(id, cambios) {
  const updated = read(PEDIDOS_KEY).map((p) => (p.id === id ? { ...p, ...cambios } : p));
  write(PEDIDOS_KEY, updated);
  return updated.find((p) => p.id === id) || null;
}
