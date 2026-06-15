// src/lib/supabase.js
// Supabase client singleton — import this everywhere you need DB or Auth.
// The two env vars are set in Vercel's dashboard (and in .env.local for dev).
//
// HOW TO GET THESE VALUES:
//   1. Go to supabase.com → New Project
//   2. Settings → API → copy "URL" and "anon public" key
//   3. In Vercel: Project → Settings → Environment Variables → add both
//   4. Locally: create .env.local at your project root (git-ignored):
//        VITE_SUPABASE_URL=https://xxxx.supabase.co
//        VITE_SUPABASE_ANON_KEY=eyJhbGci...

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Hard fail in dev so you never silently run without credentials.
  // In production this would surface as a build error on Vercel.
  console.error(
    "[Supabase] Missing env vars. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persist the session in localStorage so refreshes don't log users out
    persistSession: true,
    autoRefreshToken: true,
  },
});


