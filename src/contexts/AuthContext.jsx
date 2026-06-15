// src/contexts/AuthContext.jsx
// Wraps the entire app and exposes { user, session, loading, login, register, logout }
// via useAuth(). Any component can call useAuth() without prop-drilling.
//
// SUPABASE AUTH FLOW:
//   supabase.auth.onAuthStateChange fires on:
//     - Page load (restores persisted session)
//     - Login / logout / token refresh
//   We listen once in this Provider and never poll manually.

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // Supabase User object | null
  const [session, setSession] = useState(null); // Full session (contains access_token)
  const [loading, setLoading] = useState(true); // true until first auth check completes

  useEffect(() => {
    // 1. Get the current session on first mount (handles page refresh)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 2. Subscribe to future auth events (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Auth actions ─────────────────────────────────────────
  /**
   * Sign in with email + password.
   * Returns { error } — let the UI handle the message.
   */
  const login = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  /**
   * Register a new account.
   * Supabase sends a confirmation email by default.
   * To skip email confirmation during dev: Supabase dashboard → Auth → Settings → disable "Enable email confirmations"
   */
  const register = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    return { data, error };
  };

  /**
   * Sign out. Clears the local session; onAuthStateChange fires and resets user to null.
   */
  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Convenience hook — use this everywhere instead of importing AuthContext directly */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}


