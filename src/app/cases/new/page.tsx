"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { AUDIT_TYPES } from "@/lib/auditTypes";
import type { AuditType } from "@/generated/prisma";

export default function NewCasePage() {
  const router = useRouter();
  const [bankId, setBankId] = useState("");
  const [bankName, setBankName] = useState("");
  const [reference, setReference] = useState("");
  const [auditType, setAuditType] = useState<AuditType | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          href="/"
          className="text-sm text-zinc-500 dark:text-zinc-400 hover:underline"
        >
          ← Back to cases
        </Link>
        <h1 className="text-xl font-semibold mt-2">New audit case</h1>
      </div>
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4"
        >
          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-4 py-2 text-sm">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="bankId" className="block text-sm font-medium mb-1">
              Bank ID *
            </label>
            <input
              id="bankId"
              type="text"
              required
              value={bankId}
              onChange={(e) => setBankId(e.target.value)}
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100"
            />
          </div>
          <div>
            <label htmlFor="bankName" className="block text-sm font-medium mb-1">
              Bank name
            </label>
            <input
              id="bankName"
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100"
            />
          </div>
          <div>
            <label htmlFor="reference" className="block text-sm font-medium mb-1">
              Reference
            </label>
            <input
              id="reference"
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100"
            />
          </div>
          <div>
            <label htmlFor="auditType" className="block text-sm font-medium mb-1">
              Audit type *
            </label>
            <select
              id="auditType"
              required
              value={auditType}
              onChange={(e) => setAuditType((e.target.value || "") as AuditType | "")}
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100"
            >
              <option value="">Select audit type…</option>
              {AUDIT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Creating…" : "Create case"}
            </button>
            <Link
              href="/"
              className="rounded-md border border-zinc-300 dark:border-zinc-600 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Cancel
            </Link>
          </div>
        </form>
    </main>
  );
}
