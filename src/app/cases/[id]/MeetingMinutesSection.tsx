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
    <section className="rounded-lg border border-card-border bg-card-bg p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
        Meeting minutes
      </h2>

      {!hasBankName && (
        <p className="text-sm text-muted">
          This case has no bank name. Add a bank name that matches (case-insensitive){" "}
          <code className="text-xs bg-section-bg px-1 rounded border border-card-border">
            main.tsfrt.meeting_analysis.bank_name
          </code>{" "}
          to load meeting audio and summaries.
        </p>
      )}

      {hasBankName && (
        <div className="mb-4 rounded-md border border-card-border bg-section-bg px-3 py-2 text-sm">
          <p className="text-foreground">
            <span className="font-medium">
              Case bank name:
            </span>{" "}
            {bankName?.trim()}
          </p>
          <p className="text-foreground mt-1">
            <span className="font-medium">
              Case bank ID:
            </span>{" "}
            <code className="text-xs">{bankId}</code>
          </p>
          <p className="text-xs text-muted mt-2">
            Warehouse rows are matched with{" "}
            <code className="text-[11px] bg-card-bg px-1 rounded border border-card-border">
              LOWER(TRIM(bank_name))
            </code>{" "}
            (case-insensitive). Full transcripts are not shown in the app.
          </p>
        </div>
      )}

      {hasBankName && loading && (
        <p className="text-sm text-muted">Loading…</p>
      )}

      {hasBankName && !loading && loadError && (
        <p className="text-sm text-error">{loadError}</p>
      )}

      {hasBankName && !loading && !loadError && meetings.length === 0 && (
        <p className="text-sm text-muted">
          No meeting minutes found in the warehouse for this bank name (case-insensitive match).
        </p>
      )}

      {hasBankName && !loading && !loadError && meetings.length > 0 && meeting && (
        <div className="space-y-4">
          {meetings.length > 1 && (
            <label className="block text-xs text-muted">
              Recording
              <select
                className="mt-1 block w-full max-w-xl rounded-md border-2 border-card-border bg-card-bg px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
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
              <p className="text-xs text-muted mb-1">Audio</p>
              <audio controls className="w-full max-w-xl" src={audioUrl} preload="metadata">
                Your browser does not support audio playback.
              </audio>
            </div>
          )}

          <div>
            <p className="text-xs text-muted mb-1">File</p>
            <p className="text-sm font-medium text-foreground break-all">
              {meeting.fileName ?? meeting.filePath}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted mb-1">Summary</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {meeting.summary?.trim() || (
                <span className="text-muted-light">—</span>
              )}
            </p>
          </div>

          <div className="space-y-3 rounded-md border border-card-border bg-section-bg p-4">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider">
              Details
            </p>
            {!meeting.details ? (
              <p className="text-sm text-muted-light">—</p>
            ) : (
              <>
                {meeting.details.people != null &&
                  meeting.details.people !== "" && (
                    <div>
                      <p className="text-xs text-muted mb-0.5">
                        People
                      </p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{meeting.details.people}</p>
                    </div>
                  )}
                {(meeting.details.main_topics != null &&
                  meeting.details.main_topics !== "") && (
                  <div>
                    <p className="text-xs text-muted mb-0.5">
                      Main topics
                    </p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {meeting.details.main_topics}
                    </p>
                  </div>
                )}
                {(meeting.details.action_items != null &&
                  meeting.details.action_items !== "") && (
                  <div>
                    <p className="text-xs text-muted mb-0.5">
                      Action items
                    </p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {meeting.details.action_items}
                    </p>
                  </div>
                )}
                {!meeting.details.people &&
                  !meeting.details.main_topics &&
                  !meeting.details.action_items && (
                    <p className="text-sm text-muted-light">—</p>
                  )}
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
