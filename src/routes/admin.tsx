import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { signOut, useAuthSession } from "@/lib/admin-auth";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Admin — Balaton Hills" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminLayout,
});

const NAV_ITEMS: ReadonlyArray<{ to: string; label: string; exact?: boolean }> = [
  { to: "/admin", label: "Overview", exact: true },
  { to: "/admin/website", label: "Website" },
  { to: "/admin/memberships", label: "Memberships" },
  { to: "/admin/members", label: "Members" },
  { to: "/admin/tee-times", label: "Tee times" },
  { to: "/admin/pricing", label: "Pricing" },
];

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const auth = useAuthSession();
  const navigate = useNavigate();
  const onLoginRoute = pathname === "/admin/login";

  useEffect(() => {
    if (!onLoginRoute && auth.status === "anon") {
      navigate({ to: "/admin/login", replace: true });
    }
  }, [onLoginRoute, auth.status, navigate]);

  if (onLoginRoute) return <Outlet />;

  if (auth.status !== "authed") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <p className="text-sm text-muted-foreground">
          {auth.status === "loading" ? "Loading…" : "Redirecting…"}
        </p>
        <a
          href="/admin/login"
          className="text-xs uppercase tracking-[0.2em] text-foreground underline decoration-muted-foreground underline-offset-4 hover:decoration-foreground"
        >
          Go to sign in →
        </a>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav pathname={pathname} email={auth.session?.user.email ?? null} />
      <Outlet />
    </div>
  );
}

function AdminNav({ pathname, email }: { pathname: string; email: string | null }) {
  return (
    <header className="border-b border-input bg-background">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <nav className="flex flex-wrap items-center gap-1">
          {NAV_ITEMS.map((it) => {
            const active = it.exact ? pathname === it.to : pathname.startsWith(it.to);
            return (
              <Link
                key={it.to}
                to={it.to}
                className={
                  "px-3 py-2 text-xs uppercase tracking-[0.2em] transition-colors " +
                  (active ? "text-foreground" : "text-muted-foreground hover:text-foreground")
                }
              >
                {it.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-4">
          {email && <span className="hidden text-xs text-muted-foreground sm:inline">{email}</span>}
          <button
            type="button"
            onClick={signOut}
            className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
