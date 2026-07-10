// src/index.jsx
// Entry point — wraps the app tree with all Providers.
// Order matters: ThemeProvider first (no auth dependency), then AuthProvider.
// Toaster is placed here so toasts work across all views.

import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "sonner";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import App from "./app";
import "./styles.css";

// ── PWA: registra el service worker solo en producción ─────
// (en dev interferiría con el hot-reload de Vite)
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("[PWA] No se pudo registrar el service worker:", err);
    });
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        {/* Toaster lives outside App so it renders above all views */}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              color: "var(--text-1)",
              borderRadius: "12px",
              fontSize: "14px",
              fontWeight: "500",
            },
            // Success toasts get a green left border
            classNames: {
              success: "toast-success",
              error: "toast-error",
            },
          }}
          richColors
        />
        <App />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);