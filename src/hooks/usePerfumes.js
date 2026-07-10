// src/hooks/usePerfumes.js
// Capa de acceso a datos para PERFUMES (inventario) y VENTAS.
// Mismo patrón que useWorkouts.js: usa Supabase cuando hay sesión y cae a
// localStorage como fallback (modo invitado / Supabase no disponible), para que
// la app funcione offline y en la nube desde Android / iPhone vía web.
//
// ─────────────────────────────────────────────────────────────
// ESQUEMA SUPABASE (ejecutar en el SQL editor de Supabase):
// ─────────────────────────────────────────────────────────────
//   create table public.perfumes (
//     id          uuid primary key default gen_random_uuid(),
//     user_id     uuid not null references auth.users(id) on delete cascade,
//     nombre      text not null,
//     ml          numeric not null default 0,
//     precio      numeric not null default 0,
//     similar_a   text default '',
//     stock       integer not null default 0,
//     created_at  timestamptz default now()
//   );
//   alter table public.perfumes enable row level security;
//   -- Cualquier usuario autenticado LEE el catálogo; solo el admin escribe.
//   create policy "perfumes select all" on public.perfumes
//     for select to authenticated using (true);
//   create policy "perfumes admin insert" on public.perfumes
//     for insert to authenticated
//     with check ((auth.jwt() ->> 'email') = 'l.morales64@alumnos.santotomas.cl');
//   create policy "perfumes admin update" on public.perfumes
//     for update to authenticated
//     using ((auth.jwt() ->> 'email') = 'l.morales64@alumnos.santotomas.cl');
//   create policy "perfumes admin delete" on public.perfumes
//     for delete to authenticated
//     using ((auth.jwt() ->> 'email') = 'l.morales64@alumnos.santotomas.cl');
//
//   create table public.ventas (
//     id          uuid primary key default gen_random_uuid(),
//     user_id     uuid not null references auth.users(id) on delete cascade,
//     perfume_id  uuid references public.perfumes(id) on delete set null,
//     nombre      text not null,
//     cantidad    integer not null default 1,
//     precio_unit numeric not null,
//     subtotal    numeric not null,
//     created_at  timestamptz default now()
//   );
//   alter table public.ventas enable row level security;
//   create policy "own ventas" on public.ventas for all
//     using (auth.uid() = user_id) with check (auth.uid() = user_id);
//
//   -- Solicitudes de compra de clientes (estado "Pendiente" por defecto).
//   create table public.pedidos (
//     id             uuid primary key default gen_random_uuid(),
//     user_id        uuid not null references auth.users(id) on delete cascade,
//     perfume_id     uuid references public.perfumes(id) on delete set null,
//     nombre         text not null,
//     precio         numeric not null default 0,
//     metodo_pago     text not null,     -- 'Efectivo' | 'Transferencia'
//     metodo_entrega  text not null,     -- 'Retiro' | 'Envío'
//     direccion_envio text,              -- solo cuando metodo_entrega = 'Envío'
//     cliente_email   text,
//     estado         text not null default 'Pendiente',
//     created_at     timestamptz default now()
//   );
//   alter table public.pedidos enable row level security;
//   -- El cliente gestiona los suyos; el admin (por email) los ve todos.
//   create policy "pedidos select" on public.pedidos for select
//     using (auth.uid() = user_id
//            or (auth.jwt() ->> 'email') = 'l.morales64@alumnos.santotomas.cl');
//   create policy "pedidos insert" on public.pedidos for insert
//     with check (auth.uid() = user_id);
//   create policy "pedidos update admin" on public.pedidos for update
//     using ((auth.jwt() ->> 'email') = 'l.morales64@alumnos.santotomas.cl');
//
// ─────────────────────────────────────────────────────────────
// PENDIENTE (fotos de perfumes) — NO ejecutar todavía, esperando
// tener las imágenes. Cuando llegue el momento:
//
//   1. Columna para la URL pública de la foto:
//      alter table public.perfumes add column if not exists foto_url text;
//
//   2. Bucket de Storage "perfumes" (Dashboard → Storage → New bucket,
//      marcar "Public bucket") y políticas: lectura pública, escritura
//      solo del admin. En SQL:
//      create policy "fotos lectura publica" on storage.objects
//        for select using (bucket_id = 'perfumes');
//      create policy "fotos escribe admin" on storage.objects
//        for insert to authenticated
//        with check (bucket_id = 'perfumes'
//          and (auth.jwt() ->> 'email') = 'l.morales64@alumnos.santotomas.cl');
//      create policy "fotos borra admin" on storage.objects
//        for delete to authenticated
//        using (bucket_id = 'perfumes'
//          and (auth.jwt() ->> 'email') = 'l.morales64@alumnos.santotomas.cl');
//
//   3. Flujo en la app (a implementar): subir con
//      supabase.storage.from('perfumes').upload(`${id}.jpg`, file),
//      obtener la URL con getPublicUrl y guardarla en foto_url; mostrar
//      la miniatura en PerfumeManager y en el catálogo del cliente.
// ─────────────────────────────────────────────────────────────

import { useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import {
  localGetPerfumes,
  localAddPerfume,
  localUpdatePerfume,
  localDeletePerfume,
  localGetVentas,
  localAddVenta,
  localGetPedidos,
  localCreatePedido,
  localUpdatePedido,
} from "../utils/perfumeStorage";

const PERFUMES = "perfumes";
const VENTAS = "ventas";
const PEDIDOS = "pedidos";

export function usePerfumes() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ── PERFUMES ───────────────────────────────────────────────

  /**
   * Trae el catálogo de perfumes (más reciente primero).
   * NO filtra por user_id: la RLS de Supabase permite a cualquier usuario
   * autenticado LEER el catálogo (los clientes ven los perfumes del admin),
   * mientras que crear/editar/borrar queda restringido al admin por email.
   */
  const fetchPerfumes = useCallback(async () => {
    if (!user) return localGetPerfumes();

    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from(PERFUMES)
      .select("*")
      .order("created_at", { ascending: false });
    setLoading(false);

    if (err) {
      console.warn("[usePerfumes] fetch perfumes falló, uso localStorage:", err.message);
      setError(err.message);
      return localGetPerfumes();
    }
    return data ?? [];
  }, [user]);

  /** Agrega un perfume. Devuelve { data, error } */
  const addPerfume = useCallback(async (perfume) => {
    if (!user) return { data: localAddPerfume(perfume), error: null };

    const payload = { ...perfume, user_id: user.id };
    const { data, error: err } = await supabase
      .from(PERFUMES)
      .insert(payload)
      .select()
      .single();

    if (err) {
      console.warn("[usePerfumes] add perfume falló:", err.message);
      return { data: null, error: err.message };
    }
    return { data, error: null };
  }, [user]);

  /** Edita un perfume por id. Devuelve { data, error } */
  const updatePerfume = useCallback(async (id, cambios) => {
    if (!user) return { data: localUpdatePerfume(id, cambios), error: null };

    const { data, error: err } = await supabase
      .from(PERFUMES)
      .update(cambios)
      .eq("user_id", user.id)
      .eq("id", id)
      .select()
      .single();

    if (err) {
      console.warn("[usePerfumes] update perfume falló:", err.message);
      return { data: null, error: err.message };
    }
    return { data, error: null };
  }, [user]);

  /** Elimina un perfume por id */
  const deletePerfume = useCallback(async (id) => {
    if (!user) {
      localDeletePerfume(id);
      return { error: null };
    }
    const { error: err } = await supabase
      .from(PERFUMES)
      .delete()
      .eq("user_id", user.id)
      .eq("id", id);

    if (err) {
      console.warn("[usePerfumes] delete perfume falló:", err.message);
      return { error: err.message };
    }
    return { error: null };
  }, [user]);

  // ── VENTAS ─────────────────────────────────────────────────

  /** Trae el historial de ventas (más reciente primero) */
  const fetchVentas = useCallback(async () => {
    if (!user) return localGetVentas();

    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from(VENTAS)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setLoading(false);

    if (err) {
      console.warn("[usePerfumes] fetch ventas falló, uso localStorage:", err.message);
      setError(err.message);
      return localGetVentas();
    }
    return data ?? [];
  }, [user]);

  /**
   * Registra una venta: valida stock, descuenta el stock del perfume e
   * inserta la transacción en el historial usando el precio vigente.
   * Devuelve { data, error }.
   */
  const sellPerfume = useCallback(async (perfume, cantidad) => {
    const qty = Number(cantidad) || 0;
    if (qty <= 0) return { data: null, error: "La cantidad debe ser mayor a 0." };
    if (qty > Number(perfume.stock || 0)) {
      return { data: null, error: "Stock insuficiente." };
    }

    const precioUnit = Number(perfume.precio) || 0;
    const venta = {
      perfume_id: perfume.id,
      nombre: perfume.nombre,
      cantidad: qty,
      precio_unit: precioUnit,
      subtotal: precioUnit * qty,
    };
    const nuevoStock = Number(perfume.stock || 0) - qty;

    // Modo invitado → localStorage
    if (!user) {
      localUpdatePerfume(perfume.id, { stock: nuevoStock });
      const data = localAddVenta(venta);
      return { data, error: null };
    }

    // Supabase: descuenta stock y luego registra la venta (secuencial).
    const { error: stockErr } = await supabase
      .from(PERFUMES)
      .update({ stock: nuevoStock })
      .eq("user_id", user.id)
      .eq("id", perfume.id);

    if (stockErr) {
      console.warn("[usePerfumes] descuento de stock falló:", stockErr.message);
      return { data: null, error: stockErr.message };
    }

    const { data, error: ventaErr } = await supabase
      .from(VENTAS)
      .insert({ ...venta, user_id: user.id })
      .select()
      .single();

    if (ventaErr) {
      console.warn("[usePerfumes] registro de venta falló:", ventaErr.message);
      // Intento de revertir el stock para no perder consistencia.
      await supabase
        .from(PERFUMES)
        .update({ stock: Number(perfume.stock || 0) })
        .eq("user_id", user.id)
        .eq("id", perfume.id);
      return { data: null, error: ventaErr.message };
    }
    return { data, error: null };
  }, [user]);

  // ── PEDIDOS (solicitudes de cliente) ───────────────────────

  /** Crea una solicitud de compra (estado "Pendiente"). Devuelve { data, error } */
  const createPedido = useCallback(async (pedido) => {
    const base = { ...pedido, estado: "Pendiente" };
    if (!user) return { data: localCreatePedido(base), error: null };

    const payload = { ...base, user_id: user.id, cliente_email: user.email };
    const { data, error: err } = await supabase
      .from(PEDIDOS)
      .insert(payload)
      .select()
      .single();

    if (err) {
      console.warn("[usePerfumes] createPedido falló:", err.message);
      return { data: null, error: err.message };
    }
    return { data, error: null };
  }, [user]);

  /**
   * Trae pedidos (más reciente primero). El admin ve todos (gracias a la
   * política RLS por email); el cliente ve solo los suyos.
   */
  const fetchPedidos = useCallback(async () => {
    if (!user) return localGetPedidos();

    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from(PEDIDOS)
      .select("*")
      .order("created_at", { ascending: false });
    setLoading(false);

    if (err) {
      console.warn("[usePerfumes] fetchPedidos falló, uso localStorage:", err.message);
      setError(err.message);
      return localGetPedidos();
    }
    return data ?? [];
  }, [user]);

  /**
   * Cambia el estado de un pedido ('Pendiente' | 'Confirmado' | 'Rechazado'
   * | 'Completado'). Solo el admin puede hacerlo en Supabase (RLS por email).
   * Devuelve { data, error }.
   */
  const updatePedidoEstado = useCallback(async (id, estado) => {
    if (!user) return { data: localUpdatePedido(id, { estado }), error: null };

    const { data, error: err } = await supabase
      .from(PEDIDOS)
      .update({ estado })
      .eq("id", id)
      .select()
      .single();

    if (err) {
      console.warn("[usePerfumes] updatePedidoEstado falló:", err.message);
      return { data: null, error: err.message };
    }
    return { data, error: null };
  }, [user]);

  return {
    loading,
    error,
    fetchPerfumes,
    addPerfume,
    updatePerfume,
    deletePerfume,
    fetchVentas,
    sellPerfume,
    createPedido,
    fetchPedidos,
    updatePedidoEstado,
  };
}
