import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  createExpense,
  deleteExpense,
  deleteReceipt,
  EXPENSE_CATEGORIES,
  getExpense,
  getReceiptSignedUrl,
  isImageReceipt,
  RECEIPT_ACCEPTED_TYPES,
  RECEIPT_MAX_BYTES,
  updateExpense,
  uploadReceipt,
  type Expense,
  type ExpenseCategory,
  type ExpenseInput,
} from "@/lib/expenses";

export const Route = createFileRoute("/admin/expenses/$id")({
  head: () => ({
    meta: [{ title: "Expense — Admin" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: ExpenseEditPage,
});

type FormState = {
  date: string;
  category: ExpenseCategory;
  vendor: string;
  amount: string;
  currency: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  date: new Date().toISOString().slice(0, 10),
  category: "other",
  vendor: "",
  amount: "",
  currency: "HUF",
  notes: "",
};

function expenseToForm(e: Expense): FormState {
  return {
    date: e.date,
    category: e.category,
    vendor: e.vendor ?? "",
    amount: String(e.amount),
    currency: e.currency,
    notes: e.notes ?? "",
  };
}

function formToInput(f: FormState, receiptPath: string | null): ExpenseInput | null {
  const amount = Number.parseFloat(f.amount);
  if (!Number.isFinite(amount) || amount < 0) return null;
  if (!f.date) return null;
  return {
    date: f.date,
    category: f.category,
    vendor: f.vendor.trim() || null,
    amount,
    currency: f.currency.trim().toUpperCase() || "HUF",
    notes: f.notes.trim() || null,
    receipt_url: receiptPath,
  };
}

function ExpenseEditPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const isNew = id === "new";

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [existingReceiptPath, setExistingReceiptPath] = useState<string | null>(null);
  const [existingReceiptUrl, setExistingReceiptUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [shouldRemove, setShouldRemove] = useState(false);

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (isNew) {
      setForm(EMPTY_FORM);
      setExistingReceiptPath(null);
      setExistingReceiptUrl(null);
      setPendingFile(null);
      setShouldRemove(false);
      setLoading(false);
      setNotFound(false);
      return;
    }
    setLoading(true);
    setShouldRemove(false);
    setPendingFile(null);
    getExpense(id)
      .then(async (e) => {
        if (!e) {
          setNotFound(true);
          return;
        }
        setForm(expenseToForm(e));
        setExistingReceiptPath(e.receipt_url);
        if (e.receipt_url) {
          const url = await getReceiptSignedUrl(e.receipt_url);
          setExistingReceiptUrl(url);
        } else {
          setExistingReceiptUrl(null);
        }
      })
      .catch((err) =>
        setStatus({ kind: "err", msg: err instanceof Error ? err.message : "Failed" }),
      )
      .finally(() => setLoading(false));
  }, [id, isNew]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);

    let nextReceiptPath: string | null = existingReceiptPath;
    if (shouldRemove) nextReceiptPath = null;
    if (pendingFile) {
      try {
        nextReceiptPath = await uploadReceipt(pendingFile);
      } catch (err) {
        setStatus({
          kind: "err",
          msg: err instanceof Error ? err.message : "Receipt upload failed",
        });
        return;
      }
    }

    const input = formToInput(form, nextReceiptPath);
    if (!input) {
      setStatus({ kind: "err", msg: "Date and a non-negative amount are required." });
      return;
    }

    setSaving(true);
    try {
      // Best-effort cleanup of the previous file if it was replaced/removed.
      const removedOld =
        existingReceiptPath && existingReceiptPath !== nextReceiptPath ? existingReceiptPath : null;

      if (isNew) {
        const created = await createExpense(input);
        if (removedOld) await deleteReceipt(removedOld).catch(() => {});
        navigate({ to: "/admin/expenses/$id", params: { id: created.id }, replace: true });
      } else {
        await updateExpense(id, input);
        if (removedOld) await deleteReceipt(removedOld).catch(() => {});
        setStatus({ kind: "ok", msg: "Saved" });
        // Re-sync receipt state to match what we just wrote.
        setExistingReceiptPath(nextReceiptPath);
        setPendingFile(null);
        setShouldRemove(false);
        if (nextReceiptPath) {
          const url = await getReceiptSignedUrl(nextReceiptPath);
          setExistingReceiptUrl(url);
        } else {
          setExistingReceiptUrl(null);
        }
      }
    } catch (err) {
      setStatus({ kind: "err", msg: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (isNew) return;
    if (!window.confirm("Delete this expense?")) return;
    setSaving(true);
    setStatus(null);
    try {
      // Soft-delete: row is marked deleted, receipt blob is kept so an
      // undelete restores the expense exactly as it was.
      await deleteExpense(id);
      navigate({ to: "/admin/expenses" });
    } catch (err) {
      setStatus({ kind: "err", msg: err instanceof Error ? err.message : "Delete failed" });
      setSaving(false);
    }
  }

  if (notFound) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-sm text-muted-foreground">Expense not found.</p>
        <Link
          to="/admin/expenses"
          className="mt-4 inline-block text-xs uppercase tracking-[0.2em] text-foreground underline"
        >
          ← Back to expenses
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link
        to="/admin/expenses"
        className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
      >
        ← Back to expenses
      </Link>
      <header className="mt-4 border-b border-input pb-6">
        <h1 className="font-display text-3xl text-foreground">
          {isNew ? "New expense" : "Edit expense"}
        </h1>
      </header>

      {loading ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
      ) : (
        <form onSubmit={onSave} className="mt-8 space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Date</span>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="mt-2 w-full border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Category
              </span>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}
                className="mt-2 w-full border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <Field
            label="Vendor"
            value={form.vendor}
            onChange={(v) => setForm({ ...form, vendor: v })}
          />

          <div className="grid gap-6 sm:grid-cols-2">
            <Field
              label="Amount"
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(v) => setForm({ ...form, amount: v })}
            />
            <Field
              label="Currency"
              value={form.currency}
              onChange={(v) => setForm({ ...form, currency: v })}
            />
          </div>

          <ReceiptDropzone
            existingPath={shouldRemove ? null : existingReceiptPath}
            existingSignedUrl={shouldRemove ? null : existingReceiptUrl}
            pendingFile={pendingFile}
            onFileSelected={(f) => {
              setPendingFile(f);
              setShouldRemove(false);
              setStatus(null);
            }}
            onRemove={() => {
              setPendingFile(null);
              setShouldRemove(true);
              setStatus(null);
            }}
            onClearPending={() => setPendingFile(null)}
          />

          <Field
            label="Notes"
            value={form.notes}
            onChange={(v) => setForm({ ...form, notes: v })}
            multiline
            rows={3}
          />

          <div className="flex items-center gap-4 border-t border-input pt-6">
            <button
              type="submit"
              disabled={saving}
              className="bg-primary px-6 py-3 text-xs uppercase tracking-[0.25em] text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Saving…" : isNew ? "Create expense" : "Save"}
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

function ReceiptDropzone({
  existingPath,
  existingSignedUrl,
  pendingFile,
  onFileSelected,
  onRemove,
  onClearPending,
}: {
  existingPath: string | null;
  existingSignedUrl: string | null;
  pendingFile: File | null;
  onFileSelected: (file: File) => void;
  onRemove: () => void;
  onClearPending: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingFile) {
      setPendingPreview(null);
      return;
    }
    if (!pendingFile.type.startsWith("image/")) {
      setPendingPreview(null);
      return;
    }
    const url = URL.createObjectURL(pendingFile);
    setPendingPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  function acceptFile(file: File | null | undefined) {
    setError(null);
    if (!file) return;
    if (file.size > RECEIPT_MAX_BYTES) {
      setError(
        `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max ${RECEIPT_MAX_BYTES / 1024 / 1024} MB.`,
      );
      return;
    }
    if (
      file.type &&
      !RECEIPT_ACCEPTED_TYPES.includes(file.type as (typeof RECEIPT_ACCEPTED_TYPES)[number])
    ) {
      setError(`Unsupported file type: ${file.type}. Use JPEG, PNG, WebP, HEIC, or PDF.`);
      return;
    }
    onFileSelected(file);
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    acceptFile(file);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    acceptFile(file);
    // Clear so re-selecting the same file fires onChange again.
    e.target.value = "";
  }

  const hasContent = pendingFile || (existingPath && existingSignedUrl);

  return (
    <div>
      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Receipt</div>

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={
          "mt-2 flex cursor-pointer flex-col items-center justify-center gap-3 border border-dashed p-6 text-center transition-colors " +
          (dragging
            ? "border-gold bg-gold/5"
            : "border-input hover:border-gold/60 hover:bg-secondary/30")
        }
      >
        {pendingFile ? (
          <PendingPreview file={pendingFile} previewUrl={pendingPreview} />
        ) : existingPath && existingSignedUrl ? (
          <ExistingPreview path={existingPath} signedUrl={existingSignedUrl} />
        ) : (
          <EmptyState />
        )}

        <input
          ref={inputRef}
          type="file"
          accept={RECEIPT_ACCEPTED_TYPES.join(",")}
          onChange={onInputChange}
          className="hidden"
        />
      </div>

      {hasContent && (
        <div className="mt-2 flex items-center gap-4 text-xs">
          {pendingFile && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClearPending();
              }}
              className="uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
            >
              Cancel selection
            </button>
          )}
          {existingPath && !pendingFile && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="uppercase tracking-[0.2em] text-muted-foreground hover:text-red-700"
            >
              Remove receipt
            </button>
          )}
          {existingPath && existingSignedUrl && !pendingFile && (
            <a
              href={existingSignedUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
            >
              Open in new tab
            </a>
          )}
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-700" role="alert">
          {error}
        </p>
      )}

      <p className="mt-2 text-xs text-muted-foreground">
        Drop a photo or PDF here, or click to choose a file. Max 10 MB.
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <>
      <span aria-hidden className="text-3xl text-muted-foreground">
        ⤓
      </span>
      <span className="text-sm text-foreground">Drop receipt here or click to upload</span>
      <span className="text-xs text-muted-foreground">JPEG, PNG, WebP, HEIC, or PDF</span>
    </>
  );
}

function PendingPreview({ file, previewUrl }: { file: File; previewUrl: string | null }) {
  return (
    <>
      {previewUrl ? (
        <img
          src={previewUrl}
          alt="Receipt preview"
          className="max-h-56 max-w-full object-contain"
        />
      ) : (
        <span className="text-3xl">📄</span>
      )}
      <span className="text-xs text-foreground">{file.name}</span>
      <span className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
        Pending upload · {(file.size / 1024).toFixed(0)} KB
      </span>
    </>
  );
}

function ExistingPreview({ path, signedUrl }: { path: string; signedUrl: string }) {
  const isImage = isImageReceipt(path);
  return (
    <>
      {isImage ? (
        <img src={signedUrl} alt="Receipt" className="max-h-56 max-w-full object-contain" />
      ) : (
        <span className="text-3xl">📄</span>
      )}
      <span className="text-xs text-muted-foreground">{path.split("/").pop()}</span>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  type,
  step,
  multiline,
  rows,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  step?: string;
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
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-2 w-full border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      )}
    </label>
  );
}
