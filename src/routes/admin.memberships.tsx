import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { invalidateTiersCache, listAllTiers, type MembershipTier } from "@/lib/membership-tiers";

export const Route = createFileRoute("/admin/memberships")({
  head: () => ({
    meta: [{ title: "Memberships — Admin" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: MembershipsPage,
});

const NEW_TIER_ID = "__new__";

type FormState = {
  slug: string;
  name: string;
  price_display: string;
  perks_text: string;
  sort_order: string;
  active: boolean;
};

const EMPTY_FORM: FormState = {
  slug: "",
  name: "",
  price_display: "",
  perks_text: "",
  sort_order: "0",
  active: true,
};

function tierToForm(t: MembershipTier): FormState {
  return {
    slug: t.slug,
    name: t.name,
    price_display: t.price_display ?? "",
    perks_text: t.perks.join("\n"),
    sort_order: String(t.sort_order),
    active: t.active,
  };
}

function MembershipsPage() {
  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [activeId, setActiveId] = useState<string>(NEW_TIER_ID);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  async function refresh(selectId?: string) {
    setLoading(true);
    try {
      const rows = await listAllTiers();
      setTiers(rows);
      if (selectId && rows.find((r) => r.id === selectId)) {
        setActiveId(selectId);
      } else if (rows.length > 0 && activeId === NEW_TIER_ID) {
        setActiveId(rows[0].id);
      }
    } catch (err) {
      setStatus({ kind: "err", msg: err instanceof Error ? err.message : "Failed to load tiers" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeId === NEW_TIER_ID) {
      setForm(EMPTY_FORM);
    } else {
      const t = tiers.find((x) => x.id === activeId);
      if (t) setForm(tierToForm(t));
    }
    setStatus(null);
  }, [activeId, tiers]);

  const isNew = activeId === NEW_TIER_ID;

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    if (!form.slug.trim() || !form.name.trim()) {
      setStatus({ kind: "err", msg: "Slug and name are required." });
      return;
    }
    setSaving(true);
    const perks = form.perks_text
      .split("\n")
      .map((p) => p.trim())
      .filter(Boolean);
    const sortOrder = Number.parseInt(form.sort_order, 10);
    const payload = {
      slug: form.slug.trim(),
      name: form.name.trim(),
      price_display: form.price_display.trim() || null,
      perks,
      sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
      active: form.active,
    };

    const sb = getSupabase();
    const result = isNew
      ? await sb.from("membership_tiers").insert(payload).select("id").single()
      : await sb.from("membership_tiers").update(payload).eq("id", activeId).select("id").single();

    setSaving(false);
    if (result.error) {
      setStatus({ kind: "err", msg: result.error.message });
      return;
    }
    invalidateTiersCache();
    setStatus({ kind: "ok", msg: "Saved" });
    refresh(result.data?.id);
  }

  async function onDelete() {
    if (isNew) return;
    const current = tiers.find((t) => t.id === activeId);
    if (!current) return;
    if (!window.confirm(`Delete tier "${current.name}"? This cannot be undone.`)) return;
    setSaving(true);
    setStatus(null);
    const { error } = await getSupabase().from("membership_tiers").delete().eq("id", activeId);
    setSaving(false);
    if (error) {
      setStatus({ kind: "err", msg: error.message });
      return;
    }
    invalidateTiersCache();
    setActiveId(NEW_TIER_ID);
    refresh();
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="border-b border-input pb-6">
        <h1 className="font-display text-3xl text-foreground">Memberships</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Edit the tiers shown on the public /membership page. Changes go live within 60 seconds.
        </p>
      </header>

      <section className="mt-8">
        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Tier</span>
          <select
            value={activeId}
            onChange={(e) => setActiveId(e.target.value)}
            className="mt-2 w-full border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value={NEW_TIER_ID}>+ New tier</option>
            {tiers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.slug}){!t.active ? " — inactive" : ""}
              </option>
            ))}
          </select>
        </label>
      </section>

      {loading ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
      ) : (
        <form onSubmit={onSave} className="mt-8 space-y-6">
          <Field
            label="Slug"
            value={form.slug}
            onChange={(v) => setForm({ ...form, slug: v })}
            hint="URL-friendly identifier, e.g. estate, country, junior. Lowercase, no spaces."
          />
          <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Field
            label="Price display"
            value={form.price_display}
            onChange={(v) => setForm({ ...form, price_display: v })}
            hint="Free text: 'On Application', '€2,500 / year', etc."
          />
          <Field
            label="Perks (one per line)"
            value={form.perks_text}
            onChange={(v) => setForm({ ...form, perks_text: v })}
            multiline
            rows={6}
          />
          <Field
            label="Sort order"
            value={form.sort_order}
            onChange={(v) => setForm({ ...form, sort_order: v })}
            hint="Lower numbers appear first. 1, 2, 3, …"
          />

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="h-4 w-4 border border-input"
            />
            <span className="text-sm text-foreground">Active (visible on public site)</span>
          </label>

          <div className="flex items-center gap-4 border-t border-input pt-6">
            <button
              type="submit"
              disabled={saving}
              className="bg-primary px-6 py-3 text-xs uppercase tracking-[0.25em] text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Saving…" : isNew ? "Create tier" : "Save"}
            </button>
            {!isNew && (
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
  multiline,
  rows,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  rows?: number;
  hint?: string;
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
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-2 w-full border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      )}
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}
