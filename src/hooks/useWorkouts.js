// src/hooks/useWorkouts.js
// Data access layer — wraps Supabase queries for workouts.
// Keeps localStorage as a FALLBACK so the app keeps working
// even before you run the Supabase migrations (offline-first during dev).
//
// SUPABASE TABLE SCHEMA (run this SQL in Supabase SQL editor):
// ─────────────────────────────────────────────────────────────
//   create table public.workouts (
//     id          uuid primary key default gen_random_uuid(),
//     user_id     uuid not null references auth.users(id) on delete cascade,
//     day         text not null,
//     date        text not null,
//     timestamp   bigint not null,
//     exercises   jsonb not null default '[]',
//     categories  jsonb not null default '[]',
//     created_at  timestamptz default now()
//   );
//
//   -- Row Level Security: users can only see/edit their own rows
//   alter table public.workouts enable row level security;
//
//   create policy "Users manage own workouts"
//     on public.workouts
//     for all
//     using  (auth.uid() = user_id)
//     with check (auth.uid() = user_id);
// ─────────────────────────────────────────────────────────────

import { useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import {
  getAllWorkouts as localGetAll,
  saveWorkout as localSave,
  deleteWorkout as localDelete,
} from "../utils/storage";

const TABLE = "workouts";

export function useWorkouts() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /** Fetch all workouts for the current user (newest first) */
  const fetchWorkouts = useCallback(async () => {
    if (!user) return localGetAll(); // not logged in → local only

    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from(TABLE)
      .select("*")
      .eq("user_id", user.id)
      .order("timestamp", { ascending: false });

    setLoading(false);

    if (err) {
      console.warn("[useWorkouts] Supabase fetch failed, using localStorage:", err.message);
      setError(err.message);
      return localGetAll(); // graceful fallback
    }

    return data ?? [];
  }, [user]);

  /** Save a workout to Supabase (and locally as backup) */
  const saveWorkout = useCallback(async (workout) => {
    // Always save locally first (instant, works offline)
    localSave(workout);

    if (!user) return { error: null }; // guest mode: local only

    const payload = {
      ...workout,
      user_id: user.id,
      timestamp: workout.timestamp || Date.now(),
    };

    const { error: err } = await supabase.from(TABLE).insert(payload);

    if (err) {
      console.warn("[useWorkouts] Supabase save failed:", err.message);
      return { error: err.message };
    }

    return { error: null };
  }, [user]);

  /** Delete a workout by timestamp */
  const deleteWorkout = useCallback(async (timestamp) => {
    localDelete(timestamp); // remove locally

    if (!user) return;

    const { error: err } = await supabase
      .from(TABLE)
      .delete()
      .eq("user_id", user.id)
      .eq("timestamp", timestamp);

    if (err) {
      console.warn("[useWorkouts] Supabase delete failed:", err.message);
    }
  }, [user]);

  return { fetchWorkouts, saveWorkout, deleteWorkout, loading, error };
}