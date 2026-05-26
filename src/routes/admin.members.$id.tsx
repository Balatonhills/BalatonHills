import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useIsAdmin } from "@/lib/admin-auth";
import { listAllTiers, type MembershipTier } from "@/lib/membership-tiers";
import {
  createMember,
  deleteMember,
  getMember,
  MEMBER_STATUSES,
  updateMember,
  type Member,
  type MemberInput,
  type MemberStatus,
} from "@/lib/members";

export const Route = createFileRoute("/admin/members/$id")({
  head: () => ({
    meta: [{ title: "Member — Admin" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: MemberEditPage,
});

type FormState = {
  full_name: string;
  email: string;
  phone: string;
  tier_id: string;
  status: MemberStatus;
  joined_at: string;
  renewal_due: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  full_name: "",
  email: "",
  phone: "",
  tier_id: "",
  status: "active",
  joined_at: "",
  renewal_due: "",
  notes: "",
};

function memberToForm(m: Member): FormState {
  return {
    full_name: m.full_name,
    email: m.email ?? "",
    phone: m.phone ?? "",
    tier_id: m.tier_id ?? "",
    status: m.status,
    joined_at: m.joined_at ?? "",
    renewal_due: m.renewal_due ?? "",
    notes: m.notes ?? "",
  };
}

function formToInput(f: FormState): MemberInput {
  return {
    full_name: f.full_name.trim(),
    email: f.email.trim() || null,
    phone: f.phone.trim() || null,
    tier_id: f.tier_id || null,
    status: f.status,
    joined_at: f.joined_at || null,
    renewal_due: f.renewal_due || null,
    notes: f.notes.trim() || null,
  };
}

function MemberEditPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const isNew = id === "new";

  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    listAllTiers()
      .then(setTiers)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isNew) {
      setForm(EMPTY_FORM);
      setLoading(false);
      setNotFound(false);
      return;
    }
    setLoading(true);
    getMember(id)
      .then((m) => {
        if (!m) {
          setNotFound(true);
        } else {
          setForm(memberToForm(m));
        }
      })
      .catch((e) => setStatus({ kind: "err", msg: e instanceof Error ? e.message : "Failed" }))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    if (!form.full_name.trim()) {
      setStatus({ kind: "err", msg: "Name is required." });
      return;
    }
    setSaving(true);
    try {
      const input = formToInput(form);
      if (isNew) {
        const created = await createMember(input);
        navigate({ to: "/admin/members/$id", params: { id: created.id }, replace: true });
      } else {
        await updateMember(id, input);
        setStatus({ kind: "ok", msg: "Saved" });
      }
    } catch (err) {
      setStatus({ kind: "err", msg: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (isNew) return;
    if (!window.confirm(`Delete member "${form.full_name}"? This cannot be undone.`)) return;
    setSaving(true);
    setStatus(null);
    try {
      await deleteMember(id);
      navigate({ to: "/admin/members" });
    } catch (err) {
      setStatus({ kind: "err", msg: err instanceof Error ? err.message : "Delete failed" });
      setSaving(false);
    }
  }

  if (notFound) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-sm text-muted-foreground">Member not found.</p>
        <Link
          to="/admin/members"
          className="mt-4 inline-block text-xs uppercase tracking-[0.2em] text-foreground underline"
        >
          ← Back to members
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link
        to="/admin/members"
        className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
      >
        ← Back to members
      </Link>
      <header className="mt-4 border-b border-input pb-6">
        <h1 className="font-display text-3xl text-foreground">
          {isNew ? "New member" : form.full_name || "Edit member"}
        </h1>
      </header>

      {loading ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
      ) : (
        <form onSubmit={onSave} className="mt-8 space-y-6">
          <Field
            label="Full name"
            value={form.full_name}
            onChange={(v) => setForm({ ...form, full_name: v })}
          />
          <div className="grid gap-6 sm:grid-cols-2">
            <Field
              label="Email"
              type="email"
              value={form.email}
              onChange={(v) => setForm({ ...form, email: v })}
            />
            <Field
              label="Phone"
              type="tel"
              value={form.phone}
              onChange={(v) => setForm({ ...form, phone: v })}
            />
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Tier</span>
              <select
                value={form.tier_id}
                onChange={(e) => setForm({ ...form, tier_id: e.target.value })}
                className="mt-2 w-full border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">— none —</option>
                {tiers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Status
              </span>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as MemberStatus })}
                className="mt-2 w-full border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {MEMBER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field
              label="Joined at"
              type="date"
              value={form.joined_at}
              onChange={(v) => setForm({ ...form, joined_at: v })}
            />
            <Field
              label="Renewal due"
              type="date"
              value={form.renewal_due}
              onChange={(v) => setForm({ ...form, renewal_due: v })}
            />
          </div>
          <Field
            label="Notes"
            value={form.notes}
            onChange={(v) => setForm({ ...form, notes: v })}
            multiline
            rows={4}
          />

          <div className="flex items-center gap-4 border-t border-input pt-6">
            <button
              type="submit"
              disabled={saving}
              className="bg-primary px-6 py-3 text-xs uppercase tracking-[0.25em] text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Saving…" : isNew ? "Create member" : "Save"}
            </button>
            {!isNew && isAdmin && (
              <button
                type="button"
                onClick={onDelete}
                disabled={saving}
                className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-red-700 disabled:opacity-50"
              >
                Delete
              </button>
            )}
            {status && (
              <p
                className={status.kind === "ok" ? "text-sm text-green-700" : "text-sm text-red-700"}
                role="status"
              >
                {status.msg}
              </p>
            )}
          </div>
        </form>
      )}
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type,
  multiline,
  rows,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  multiline?: boolean;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows ?? 3}
          className="mt-2 w-full border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      ) : (
        <input
          type={type ?? "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-2 w-full border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      )}
    </label>
  );
}
