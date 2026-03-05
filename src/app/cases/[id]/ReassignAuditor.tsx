"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Auditor = { id: string; name: string; email: string };

interface Props {
  caseId: string;
  currentAuditorId: string;
}

export function ReassignAuditor({ caseId, currentAuditorId }: Props) {
  const router = useRouter();
  const [auditors, setAuditors] = useState<Auditor[]>([]);
  const [selectedId, setSelectedId] = useState(currentAuditorId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auditors")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setAuditors(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setSelectedId(currentAuditorId);
  }, [currentAuditorId]);

  async function handleReassign() {
    if (selectedId === currentAuditorId) return;
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auditorId: selectedId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reassign");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reassign");
    } finally {
      setSaving(false);
    }
  }

  const hasChanged = selectedId !== currentAuditorId;

  return (
    <div className="space-y-2">
      <dt className="text-xs text-zinc-500 dark:text-zinc-400">Reassign auditor</dt>
      <dd className="mt-0.5 flex flex-wrap items-center gap-2">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
        >
          {auditors.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.email})
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleReassign}
          disabled={!hasChanged || saving}
          className="rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-3 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none"
        >
          {saving ? "Saving…" : "Reassign"}
        </button>
        {error && (
          <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
        )}
      </dd>
    </div>
  );
}
