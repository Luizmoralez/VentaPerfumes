// src/app.jsx
// App de Venta de Perfumes — inventario + ventas sobre Supabase.
// Pantalla de inicio: menú "Monitoreo de Datos" (estilo Huertisur).
// El antiguo flujo de entrenamiento (treino) permanece en disco pero ya no se renderiza.

import { useState } from "react";
import { useAuth } from "./contexts/AuthContext";

// ── Auth ───────────────────────────────────────────────────
import AuthScreen from "./components/auth/AuthScreen";

// ── Módulo de perfumes (admin) ────────────────────────────
import DataMonitor from "./components/inventory/DataMonitor";
import PerfumeManager from "./components/inventory/PerfumeManager";
import SellPerfume from "./components/inventory/SellPerfume";
import SalesHistory from "./components/inventory/SalesHistory";
import PedidosScreen from "./components/inventory/PedidosScreen";
import SalesReport from "./components/inventory/SalesReport";

// ── Cliente ────────────────────────────────────────────────
import ClientScreen from "./components/client/ClientScreen";

// Correo del administrador/moderador. El resto de cuentas ven la interfaz de cliente.
const ADMIN_EMAIL = "l.morales64@alumnos.santotomas.cl";

// ── Vistas (admin) ─────────────────────────────────────────
const VIEWS = {
  MONITOR: "monitor",
  PERFUMES: "perfumes",
  SELL: "sell",
  HISTORY: "history",
  PEDIDOS: "pedidos",
  REPORT: "report",
};

export default function App() {
  const { user, loading, logout } = useAuth();

  const [view, setView] = useState(VIEWS.MONITOR);

  const navigate = (next) => setView(next);
  const goMonitor = () => navigate(VIEWS.MONITOR);

  // Cierra sesión y vuelve a la pantalla de acceso.
  const handleLogout = async () => {
    await logout();
    setView(VIEWS.MONITOR);
  };

  // Mapea las claves del menú DataMonitor a vistas
  const handleMenuNavigate = (key) => {
    if (key === "perfumes") navigate(VIEWS.PERFUMES);
    else if (key === "sell") navigate(VIEWS.SELL);
    else if (key === "history") navigate(VIEWS.HISTORY);
    else if (key === "pedidos") navigate(VIEWS.PEDIDOS);
    else if (key === "report") navigate(VIEWS.REPORT);
  };

  // ── Splash de carga de auth ────────────────────────────
  if (loading) {
    return (
      <div className="app-root" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#0F0F14" }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: "3px solid #2E2E40",
          borderTopColor: "#7C3AED",
          animation: "spin 0.8s linear infinite",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Gate de auth: requiere sesión real ─────────────────
  if (!user) {
    return (
      <div className="app-root" style={{ minHeight: "100vh", background: "#0F0F14" }}>
        <AuthScreen />
      </div>
    );
  }

  const isAdmin = user.email === ADMIN_EMAIL;

  // ── Cliente (no admin): solo catálogo + solicitud de compra ──
  if (!isAdmin) {
    return (
      <div className="app-root" style={{ minHeight: "100vh", background: "#0F0F14" }}>
        <ClientScreen onLogout={handleLogout} />
      </div>
    );
  }

  // ── Admin / moderador ──────────────────────────────────
  return (
    <div className="app-root" style={{ minHeight: "100vh", background: "#0F0F14" }}>
      {view === VIEWS.MONITOR && (
        <DataMonitor onNavigate={handleMenuNavigate} onLogout={handleLogout} />
      )}

      {view === VIEWS.PERFUMES && <PerfumeManager onBack={goMonitor} />}

      {view === VIEWS.SELL && (
        <SellPerfume onBack={goMonitor} onSold={() => navigate(VIEWS.HISTORY)} />
      )}

      {view === VIEWS.HISTORY && <SalesHistory onBack={goMonitor} />}

      {view === VIEWS.PEDIDOS && <PedidosScreen onBack={goMonitor} />}

      {view === VIEWS.REPORT && <SalesReport onBack={goMonitor} />}
    </div>
  );
}
