import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";

type AuthState = { status: "loading" | "authed" | "anon"; session: Session | null };

export function useAuthSession(): AuthState {
  const [state, setState] = useState<AuthState>({ status: "loading", session: null });

  useEffect(() => {
    let mounted = true;
    const sb = getSupabase();

    sb.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setState({ status: data.session ? "authed" : "anon", session: data.session });
    });

    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setState({ status: session ? "authed" : "anon", session });
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}

export async function signIn(email: string, password: string) {
  const { error } = await getSupabase().auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut() {
  await getSupabase().auth.signOut();
}
