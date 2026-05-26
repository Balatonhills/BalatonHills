import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";

export type Role = "staff" | "admin";

type AuthState = {
  status: "loading" | "authed" | "anon";
  session: Session | null;
  role: Role | null;
};

const SESSION_PROBE_TIMEOUT_MS = 5_000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("getSession timed out")), ms);
    p.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/** Default to "staff" when the JWT doesn't carry an explicit role. */
function roleFromSession(s: Session | null): Role | null {
  if (!s) return null;
  const claimed = s.user.app_metadata?.role;
  return claimed === "admin" ? "admin" : "staff";
}

export function useAuthSession(): AuthState {
  const [state, setState] = useState<AuthState>({
    status: "loading",
    session: null,
    role: null,
  });

  useEffect(() => {
    let mounted = true;
    let sb;
    try {
      sb = getSupabase();
    } catch (err) {
      console.error("admin-auth: getSupabase() failed", err);
      setState({ status: "anon", session: null, role: null });
      return;
    }

    withTimeout(sb.auth.getSession(), SESSION_PROBE_TIMEOUT_MS)
      .then(({ data }) => {
        if (!mounted) return;
        setState({
          status: data.session ? "authed" : "anon",
          session: data.session,
          role: roleFromSession(data.session),
        });
      })
      .catch((err) => {
        if (!mounted) return;
        console.error("admin-auth: getSession() failed", err);
        setState({ status: "anon", session: null, role: null });
      });

    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setState({
        status: session ? "authed" : "anon",
        session,
        role: roleFromSession(session),
      });
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}

/** Convenience: true only when the current session's role is admin. */
export function useIsAdmin(): boolean {
  return useAuthSession().role === "admin";
}

export async function signIn(email: string, password: string) {
  const { error } = await getSupabase().auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut() {
  await getSupabase().auth.signOut();
}
