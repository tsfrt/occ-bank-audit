"use client";

import { useEffect, useMemo, useState } from "react";

type MeetingMinuteDetails = {
  people?: string;
  main_topics?: string;
  action_items?: string;
};

type MeetingRow = {
  filePath: string;
  fileName: string | null;
  bankName: string | null;
  summary: string | null;
  details: MeetingMinuteDetails | null;
};

function toBase64UrlClient(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

type Props = {
  caseId: string;
  bankName: string | null | undefined;
  bankId: string;
};

export function MeetingMinutesSection({ caseId, bankName, bankId }: Props) {
  const [meetings, setMeetings] = useState<MeetingRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [meetingIndex, setMeetingIndex] = useState(0);

  const hasBankName = Boolean(bankName?.trim());

  useEffect(() => {
    if (!hasBankName) {
      setLoading(false);
      setMeetings([]);
      setLoadError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(`/api/cases/${caseId}/meeting-minutes`);
        const data = (await res.json()) as {
          meetings?: MeetingRow[];
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error ?? res.statusText);
        }
        if (data.error && !(data.meetings?.length)) {
          throw new Error(data.error);
        }
        if (!cancelled) {
          setMeetings(data.meetings ?? []);
          setMeetingIndex(0);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Failed to load");
          setMeetings([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [caseId, hasBankName]);

  const meeting = meetings[meetingIndex] ?? null;

  const audioUrl = useMemo(() => {
    if (!meeting?.filePath) return null;
    const p = toBase64UrlClient(meeting.filePath);
    return `/api/cases/${caseId}/meeting-minutes/file?p=${encodeURIComponent(p)}`;
  }, [caseId, meeting?.filePath]);

  return (
    <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
        Meeting minutes
      </h2>

      {!hasBankName && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          This case has no bank name. Add a bank name that matches (case-insensitive){" "}
          <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1 rounded">
            main.tsfrt.meeting_analysis.bank_name
          </code>{" "}
          to load meeting audio and summaries.
        </p>
      )}

      {hasBankName && (
        <div className="mb-4 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 px-3 py-2 text-sm">
          <p className="text-zinc-600 dark:text-zinc-300">
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              Case bank name:
            </span>{" "}
            {bankName?.trim()}
          </p>
          <p className="text-zinc-600 dark:text-zinc-300 mt-1">
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              Case bank ID:
            </span>{" "}
            <code className="text-xs">{bankId}</code>
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
            Warehouse rows are matched with{" "}
            <code className="text-[11px] bg-zinc-100 dark:bg-zinc-800 px-1 rounded">
              LOWER(TRIM(bank_name))
            </code>{" "}
            (case-insensitive). Full transcripts are not shown in the app.
          </p>
        </div>
      )}

      {hasBankName && loading && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
      )}

      {hasBankName && !loading && loadError && (
        <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
      )}

      {hasBankName && !loading && !loadError && meetings.length === 0 && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No meeting minutes found in the warehouse for this bank name (case-insensitive match).
        </p>
      )}

      {hasBankName && !loading && !loadError && meetings.length > 0 && meeting && (
        <div className="space-y-4">
          {meetings.length > 1 && (
            <label className="block text-xs text-zinc-500 dark:text-zinc-400">
              Recording
              <select
                className="mt-1 block w-full max-w-xl rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-950 px-2 py-1.5 text-sm"
                value={meetingIndex}
                onChange={(e) => setMeetingIndex(Number(e.target.value))}
              >
                {meetings.map((m, i) => (
                  <option key={`${m.filePath}-${i}`} value={i}>
                    {[m.fileName || m.filePath, m.bankName ? ` · ${m.bankName}` : ""]
                      .filter(Boolean)
                      .join("")}
                  </option>
                ))}
              </select>
            </label>
          )}

          {audioUrl && meeting.filePath && (
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Audio</p>
              <audio controls className="w-full max-w-xl" src={audioUrl} preload="metadata">
                Your browser does not support audio playback.
              </audio>
            </div>
          )}

          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">File</p>
            <p className="text-sm font-medium break-all">
              {meeting.fileName ?? meeting.filePath}
            </p>
          </div>

          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Summary</p>
            <p className="text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">
              {meeting.summary?.trim() || (
                <span className="text-zinc-400">—</span>
              )}
            </p>
          </div>

          <div className="space-y-3 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50/80 dark:bg-zinc-950/50 p-4">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Details
            </p>
            {!meeting.details ? (
              <p className="text-sm text-zinc-400">—</p>
            ) : (
              <>
                {meeting.details.people != null &&
                  meeting.details.people !== "" && (
                    <div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">
                        People
                      </p>
                      <p className="text-sm whitespace-pre-wrap">{meeting.details.people}</p>
                    </div>
                  )}
                {(meeting.details.main_topics != null &&
                  meeting.details.main_topics !== "") && (
                  <div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">
                      Main topics
                    </p>
                    <p className="text-sm whitespace-pre-wrap">
                      {meeting.details.main_topics}
                    </p>
                  </div>
                )}
                {(meeting.details.action_items != null &&
                  meeting.details.action_items !== "") && (
                  <div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">
                      Action items
                    </p>
                    <p className="text-sm whitespace-pre-wrap">
                      {meeting.details.action_items}
                    </p>
                  </div>
                )}
                {!meeting.details.people &&
                  !meeting.details.main_topics &&
                  !meeting.details.action_items && (
                    <p className="text-sm text-zinc-400">—</p>
                  )}
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
