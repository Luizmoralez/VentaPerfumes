// src/components/auth/AuthScreen.jsx
// Pantalla de acceso real con Supabase: iniciar sesión / registrarse.
// Usa useAuth() (login/register de AuthContext). Al autenticar, onAuthStateChange
// actualiza el usuario y App deja pasar automáticamente.

import { useState } from "react";
import { Boxes, Mail, Lock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";

export default function AuthScreen() {
  const { login, register } = useAuth();

  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const isLogin = mode === "login";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Completa email y contraseña.");
      return;
    }
    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);
    if (isLogin) {
      const { error } = await login(email.trim(), password);
      setLoading(false);
      if (error) {
        toast.error(error.message || "No se pudo iniciar sesión.");
        return;
      }
      toast.success("¡Bienvenido!");
    } else {
      const { data, error } = await register(email.trim(), password);
      setLoading(false);
      if (error) {
        toast.error(error.message || "No se pudo registrar.");
        return;
      }
      // Si Supabase tiene confirmación por email activada, no hay sesión todavía.
      if (data?.user && !data?.session) {
        toast.success("Cuenta creada. Revisa tu email para confirmar.");
        setMode("login");
      } else {
        toast.success("¡Cuenta creada!");
      }
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="logo-mark">
            <Boxes size={22} strokeWidth={2.5} />
          </div>
          <span className="logo-text">VENTA PERFUMES</span>
        </div>

        <h2 className="auth-title">{isLogin ? "Iniciar sesión" : "Crear cuenta"}</h2>
        <p className="auth-sub">
          {isLogin
            ? "Accede para gestionar tu inventario y ventas."
            : "Regístrate para sincronizar tus datos en la nube."}
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="field field--full">
            <span className="field-label">Email</span>
            <div className="auth-input-wrap">
              <Mail size={16} className="auth-input-icon" />
              <input
                className="field-input auth-input"
                type="email"
                autoComplete="email"
                placeholder="tucorreo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </label>

          <label className="field field--full">
            <span className="field-label">Contraseña</span>
            <div className="auth-input-wrap">
              <Lock size={16} className="auth-input-icon" />
              <input
                className="field-input auth-input"
                type="password"
                autoComplete={isLogin ? "current-password" : "new-password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </label>

          <button type="submit" className="cta-button" disabled={loading} style={{ marginTop: 6 }}>
            {loading ? "Cargando..." : isLogin ? "Entrar" : "Registrarme"}
          </button>
        </form>

        <button
          type="button"
          className="auth-switch"
          onClick={() => setMode(isLogin ? "register" : "login")}
        >
          {isLogin ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
        </button>
      </div>
    </div>
  );
}
