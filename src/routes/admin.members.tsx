import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { listAllTiers, type MembershipTier } from "@/lib/membership-tiers";
import { listMembers, MEMBER_STATUSES, type Member, type MemberStatus } from "@/lib/members";

export const Route = createFileRoute("/admin/members")({
  head: () => ({
    meta: [{ title: "Members — Admin" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: MembersPage,
});

function MembersPage() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onIndex = pathname === "/admin/members" || pathname === "/admin/members/";
  if (!onIndex) return <Outlet />;
  return <MembersListPage />;
}

function MembersListPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<MemberStatus | "">("");
  const [tierFilter, setTierFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listAllTiers()
      .then(setTiers)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      setLoading(true);
      setError(null);
      listMembers({ q, status: statusFilter, tier_id: tierFilter })
        .then((rows) => setMembers(rows))
        .catch((e) => setError(e instanceof Error ? e.message : "Failed to load members"))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [q, statusFilter, tierFilter]);

  const tierById = useMemo(() => {
    const m = new Map<string, MembershipTier>();
    for (const t of tiers) m.set(t.id, t);
    return m;
  }, [tiers]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-input pb-6">
        <div>
          <h1 className="font-display text-3xl text-foreground">Members</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? "Loading…" : `${members.length} member${members.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <Link
          to="/admin/members/$id"
          params={{ id: "new" }}
          className="bg-primary px-6 py-3 text-xs uppercase tracking-[0.25em] text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Add member
        </Link>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Search</span>
          <input
            type="search"
            placeholder="Name…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="mt-2 w-full border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Status</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as MemberStatus | "")}
            className="mt-2 w-full border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">All</option>
            {MEMBER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Tier</span>
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="mt-2 w-full border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">All</option>
            {tiers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      </section>

      {error && (
        <p className="mt-6 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <section className="mt-8 overflow-x-auto border border-input">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40">
            <tr>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Phone</Th>
              <Th>Tier</Th>
              <Th>Status</Th>
              <Th>Renewal due</Th>
              <Th className="text-right">Edit</Th>
            </tr>
          </thead>
          <tbody>
            {!loading && members.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No members yet. Click "Add member" to create the first one.
                </td>
              </tr>
            )}
            {members.map((m) => (
              <tr key={m.id} className="border-t border-input">
                <Td className="font-medium text-foreground">{m.full_name}</Td>
                <Td>{m.email ?? "—"}</Td>
                <Td>{m.phone ?? "—"}</Td>
                <Td>{m.tier_id ? (tierById.get(m.tier_id)?.name ?? "—") : "—"}</Td>
                <Td>
                  <StatusBadge status={m.status} />
                </Td>
                <Td>{m.renewal_due ?? "—"}</Td>
                <Td className="text-right">
                  <Link
                    to="/admin/members/$id"
                    params={{ id: m.id }}
                    className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
                  >
                    Edit →
                  </Link>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={
        "px-4 py-3 text-left text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground " +
        (className ?? "")
      }
    >
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={"px-4 py-3 text-foreground " + (className ?? "")}>{children}</td>;
}

function StatusBadge({ status }: { status: MemberStatus }) {
  const color =
    status === "active"
      ? "text-green-700"
      : status === "suspended"
        ? "text-amber-700"
        : status === "expired"
          ? "text-red-700"
          : "text-muted-foreground";
  return <span className={"text-xs uppercase tracking-[0.2em] " + color}>{status}</span>;
}
