"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { AUDIT_TYPES } from "@/lib/auditTypes";
import type { AuditType } from "@/generated/prisma";

type Auditor = { id: string; name: string; email: string };

export default function NewCasePage() {
  const router = useRouter();
  const [bankId, setBankId] = useState("");
  const [bankName, setBankName] = useState("");
  const [reference, setReference] = useState("");
  const [auditType, setAuditType] = useState<AuditType | "">("");
  const [auditorId, setAuditorId] = useState("");
  const [auditors, setAuditors] = useState<Auditor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auditors")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setAuditors(data);
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankId: bankId.trim(),
          bankName: bankName.trim() || undefined,
          reference: reference.trim() || undefined,
          auditType: auditType || undefined,
          auditorId: auditorId.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create case");
      router.push(`/cases/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-lg mx-auto px-6 py-8">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-sm text-accent hover:text-accent-hover hover:underline"
        >
          ← Back to cases
        </Link>
        <h1 className="text-xl font-semibold mt-2 text-foreground">New audit case</h1>
      </div>
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-card-border bg-card-bg p-6 space-y-4 shadow-sm"
        >
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 text-error px-4 py-2 text-sm">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="bankId" className="block text-sm font-medium text-foreground mb-1">
              Bank ID *
            </label>
            <input
              id="bankId"
              type="text"
              required
              value={bankId}
              onChange={(e) => setBankId(e.target.value)}
              className="w-full rounded-md border-2 border-card-border bg-card-bg px-3 py-2.5 text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-colors"
            />
          </div>
          <div>
            <label htmlFor="bankName" className="block text-sm font-medium text-foreground mb-1">
              Bank name
            </label>
            <input
              id="bankName"
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full rounded-md border-2 border-card-border bg-card-bg px-3 py-2.5 text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-colors"
            />
          </div>
          <div>
            <label htmlFor="reference" className="block text-sm font-medium text-foreground mb-1">
              Reference
            </label>
            <input
              id="reference"
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full rounded-md border-2 border-card-border bg-card-bg px-3 py-2.5 text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-colors"
            />
          </div>
          <div>
            <label htmlFor="auditType" className="block text-sm font-medium text-foreground mb-1">
              Audit type *
            </label>
            <select
              id="auditType"
              required
              value={auditType}
              onChange={(e) => setAuditType((e.target.value || "") as AuditType | "")}
              className="w-full rounded-md border-2 border-card-border bg-card-bg px-3 py-2.5 text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-colors"
            >
              <option value="">Select audit type…</option>
              {AUDIT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="auditor" className="block text-sm font-medium text-foreground mb-1">
              Auditor *
            </label>
            <select
              id="auditor"
              required
              value={auditorId}
              onChange={(e) => setAuditorId(e.target.value)}
              className="w-full rounded-md border-2 border-card-border bg-card-bg px-3 py-2.5 text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-colors"
            >
              <option value="">Select auditor…</option>
              {auditors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.email})
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-primary text-white px-5 py-2.5 text-sm font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors shadow-sm"
            >
              {loading ? "Creating…" : "Create case"}
            </button>
            <Link
              href="/dashboard"
              className="rounded-md border-2 border-card-border px-5 py-2.5 text-sm font-medium text-muted hover:bg-section-bg transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
    </main>
  );
}
