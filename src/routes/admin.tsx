import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { signOut, useAuthSession, type Role } from "@/lib/admin-auth";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Admin — Balaton Hills" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminLayout,
});

type NavItem = { to: string; label: string; exact?: boolean; requires?: Role };

const NAV_ITEMS: ReadonlyArray<NavItem> = [
  { to: "/admin", label: "Overview", exact: true },
  { to: "/admin/website", label: "Website", requires: "admin" },
  { to: "/admin/memberships", label: "Memberships" },
  { to: "/admin/members", label: "Members" },
  { to: "/admin/tee-times", label: "Tee times" },
  { to: "/admin/pricing", label: "Pricing" },
  { to: "/admin/expenses", label: "Expenses" },
];

/** Paths only admins are allowed to reach. Prefix-matched. */
const ADMIN_ONLY_PREFIXES = ["/admin/website"];

function requiresAdmin(pathname: string): boolean {
  return ADMIN_ONLY_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

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

  const role = auth.role ?? "staff";
  const blocked = requiresAdmin(pathname) && role !== "admin";

  return (
    <div className="min-h-screen bg-background">
      <AdminNav pathname={pathname} role={role} email={auth.session?.user.email ?? null} />
      {blocked ? <Forbidden /> : <Outlet />}
    </div>
  );
}

function AdminNav({
  pathname,
  role,
  email,
}: {
  pathname: string;
  role: Role;
  email: string | null;
}) {
  const visible = NAV_ITEMS.filter((it) => !it.requires || it.requires === role);
  return (
    <header className="border-b border-input bg-background">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <nav className="flex flex-wrap items-center gap-1">
          {visible.map((it) => {
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
          {email && (
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {email}
              {role === "admin" && (
                <span className="ml-2 inline-block rounded-sm bg-gold/15 px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.2em] text-foreground">
                  admin
                </span>
              )}
            </span>
          )}
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

function Forbidden() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24 text-center">
      <h1 className="font-display text-3xl text-foreground">Not for staff</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        This section is admin-only. If you think you should have access, ask an admin to update your
        role.
      </p>
      <Link
        to="/admin"
        className="mt-8 inline-block text-xs uppercase tracking-[0.2em] text-foreground underline decoration-muted-foreground underline-offset-4 hover:decoration-foreground"
      >
        ← Back to overview
      </Link>
    </main>
  );
}
