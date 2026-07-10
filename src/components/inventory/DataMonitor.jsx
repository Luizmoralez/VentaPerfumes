// src/components/inventory/DataMonitor.jsx
// Menú "Monitoreo de Datos" — equivalente web de MonitoreoDatosActivity (Huertisur).
// Lista de tarjetas tipo fila: tile de ícono + título + subtítulo + chevron.
// Incluye la métrica "Ingreso Total Potencial" = Σ(precio × stock).

import { useEffect, useState, useCallback } from "react";
import { Boxes, ShoppingCart, ClipboardList, Inbox, ChevronRight, LogOut, TrendingUp, AlertTriangle, BarChart3 } from "lucide-react";
import { usePerfumes } from "../../hooks/usePerfumes";

// Umbral de aviso: perfumes con stock igual o menor a esto aparecen en la alerta.
export const LOW_STOCK_THRESHOLD = 3;

const ITEMS = [
  {
    key: "perfumes",
    icon: Boxes,
    title: "Inventario de perfumes",
    subtitle: "Agregar, editar y eliminar perfumes",
  },
  {
    key: "sell",
    icon: ShoppingCart,
    title: "Vender perfume",
    subtitle: "Registrar una venta y descontar stock",
  },
  {
    key: "history",
    icon: ClipboardList,
    title: "Historial de ventas",
    subtitle: "Ver todas las ventas realizadas",
  },
  {
    key: "pedidos",
    icon: Inbox,
    title: "Pedidos de clientes",
    subtitle: "Revisar solicitudes de compra",
  },
  {
    key: "report",
    icon: BarChart3,
    title: "Reportes de ventas",
    subtitle: "Ventas por día y perfumes más vendidos",
  },
];

export default function DataMonitor({ onNavigate, onLogout }) {
  const { fetchPerfumes } = usePerfumes();
  const [ingresoPotencial, setIngresoPotencial] = useState(0);
  const [stockBajo, setStockBajo] = useState([]);

  const load = useCallback(async () => {
    const perfumes = await fetchPerfumes();
    const total = perfumes.reduce(
      (acc, p) => acc + (Number(p.precio) || 0) * (Number(p.stock) || 0),
      0
    );
    setIngresoPotencial(total);
    setStockBajo(
      perfumes
        .filter((p) => Number(p.stock) <= LOW_STOCK_THRESHOLD)
        .sort((a, b) => Number(a.stock) - Number(b.stock))
    );
  }, [fetchPerfumes]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="screen">
      {/* Topbar estilo Huertisur */}
      <div className="topbar">
        <div className="logo-mark">
          <Boxes size={20} strokeWidth={2.5} />
        </div>
        <div className="topbar-title">
          <span className="step-label">Venta Perfumes</span>
          <h2>Monitoreo de Datos</h2>
        </div>
        {onLogout && (
          <button
            className="back-btn"
            onClick={onLogout}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <LogOut size={18} />
          </button>
        )}
      </div>

      {/* Métrica: ingreso potencial */}
      <div className="metric-card">
        <div className="metric-icon">
          <TrendingUp size={20} strokeWidth={2.4} />
        </div>
        <div className="metric-body">
          <span className="metric-label">Ingreso Total Potencial</span>
          <span className="metric-value">${ingresoPotencial.toLocaleString("es-CL")}</span>
          <span className="metric-note">
            Ingreso total si se vende la totalidad del stock: ${ingresoPotencial.toLocaleString("es-CL")}
          </span>
        </div>
      </div>

      {/* Alerta de stock bajo */}
      {stockBajo.length > 0 && (
        <div className="lowstock-card">
          <div className="lowstock-head">
            <AlertTriangle size={16} strokeWidth={2.4} />
            <span>
              Stock bajo ({stockBajo.length}) — {LOW_STOCK_THRESHOLD} unidades o menos
            </span>
          </div>
          <div className="lowstock-list">
            {stockBajo.map((p) => (
              <span key={p.id} className="lowstock-chip">
                {p.nombre}: <strong>{Number(p.stock) <= 0 ? "agotado" : `${p.stock} u.`}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="menu-list">
        {ITEMS.map(({ key, icon: Icon, title, subtitle }) => (
          <button key={key} className="menu-card" onClick={() => onNavigate(key)}>
            <span className="menu-card-icon">
              <Icon size={20} strokeWidth={2.2} />
            </span>
            <span className="menu-card-body">
              <span className="menu-card-title">{title}</span>
              <span className="menu-card-sub">{subtitle}</span>
            </span>
            <ChevronRight size={20} className="menu-card-chevron" />
          </button>
        ))}
      </div>
    </div>
  );
}
