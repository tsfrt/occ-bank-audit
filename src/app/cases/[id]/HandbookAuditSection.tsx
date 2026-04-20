"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const HANDBOOK_DOMAINS = [
  { value: "bsa_aml", label: "BSA/AML", code: "00" },
  { value: "loan_portfolio_management", label: "Loan Portfolio Management", code: "01" },
  { value: "rating_credit_risk", label: "Rating Credit Risk", code: "02" },
  { value: "allowances_credit_losses", label: "Allowances for Credit Losses", code: "03" },
  { value: "corporate_risk_governance", label: "Corporate & Risk Governance", code: "04" },
  { value: "internal_external_audits", label: "Internal & External Audits", code: "05" },
  { value: "liquidity", label: "Liquidity", code: "06" },
  { value: "interest_rate_risk", label: "Interest Rate Risk", code: "07" },
  { value: "capital_dividends", label: "Capital & Dividends", code: "08" },
  { value: "commercial_real_estate", label: "Commercial Real Estate", code: "09" },
  { value: "commercial_loans", label: "Commercial Loans", code: "10" },
  { value: "residential_real_estate", label: "Residential Real Estate", code: "11" },
  { value: "concentrations_of_credit", label: "Concentrations of Credit", code: "12" },
  { value: "leveraged_lending", label: "Leveraged Lending", code: "13" },
  { value: "credit_card_lending", label: "Credit Card Lending", code: "14" },
];

type DomainValue = (typeof HANDBOOK_DOMAINS)[number]["value"];

type ChatMessage = {
  id: string;
  role: string;
  content: string;
  domain: string;
  createdAt: string;
};

function renderMarkdown(md: string): React.ReactNode[] {
  const lines = md.split("\n");
  const nodes: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let olItems: React.ReactNode[] = [];
  let key = 0;

  const flushUl = () => {
    if (listItems.length > 0) {
      nodes.push(<ul key={key++} className="list-disc pl-5 my-1.5 space-y-0.5 text-sm">{listItems}</ul>);
      listItems = [];
    }
  };
  const flushOl = () => {
    if (olItems.length > 0) {
      nodes.push(<ol key={key++} className="list-decimal pl-5 my-1.5 space-y-0.5 text-sm">{olItems}</ol>);
      olItems = [];
    }
  };

  const inlineFormat = (text: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    const re = /(\*\*\[.*?\].*?\*\*|\*\*.*?\*\*|`[^`]+`)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    let i = 0;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) parts.push(text.slice(last, m.index));
      const seg = m[0];
      if (seg.startsWith("**") && seg.endsWith("**")) {
        parts.push(<strong key={i++} className="font-semibold">{seg.slice(2, -2)}</strong>);
      } else if (seg.startsWith("`") && seg.endsWith("`")) {
        parts.push(<code key={i++} className="text-xs bg-section-bg px-1 py-0.5 rounded">{seg.slice(1, -1)}</code>);
      } else {
        parts.push(seg);
      }
      last = m.index + seg.length;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts.length === 1 ? parts[0] : <>{parts}</>;
  };

  for (const raw of lines) {
    const line = raw;

    if (/^#{3}\s/.test(line)) {
      flushUl(); flushOl();
      nodes.push(<h3 key={key++} className="text-sm font-semibold text-foreground mt-3 mb-1">{inlineFormat(line.replace(/^#{3}\s+/, ""))}</h3>);
    } else if (/^#{2}\s/.test(line)) {
      flushUl(); flushOl();
      nodes.push(<h2 key={key++} className="text-base font-semibold text-foreground mt-4 mb-1.5">{inlineFormat(line.replace(/^#{2}\s+/, ""))}</h2>);
    } else if (/^[-*]\s/.test(line.trimStart())) {
      flushOl();
      listItems.push(<li key={key++}>{inlineFormat(line.replace(/^\s*[-*]\s+/, ""))}</li>);
    } else if (/^\d+\.\s/.test(line.trimStart())) {
      flushUl();
      olItems.push(<li key={key++}>{inlineFormat(line.replace(/^\s*\d+\.\s+/, ""))}</li>);
    } else if (line.trim() === "") {
      flushUl(); flushOl();
    } else {
      flushUl(); flushOl();
      nodes.push(<p key={key++} className="text-sm my-1.5">{inlineFormat(line)}</p>);
    }
  }
  flushUl(); flushOl();
  return nodes;
}

type Props = {
  caseId: string;
};

export function HandbookAuditSection({ caseId }: Props) {
  const [domain, setDomain] = useState<DomainValue>(HANDBOOK_DOMAINS[0].value);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    let cancelled = false;
    setHistoryLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch(
          `/api/cases/${caseId}/handbook-audit?domain=${domain}`
        );
        const data = await res.json();
        if (!cancelled) {
          setMessages(data.messages ?? []);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load history");
        }
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [caseId, domain]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = input.trim();
      if (!trimmed || loading) return;

      setLoading(true);
      setError(null);
      setInput("");

      try {
        const res = await fetch(`/api/cases/${caseId}/handbook-audit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain, message: trimmed }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error ?? `Request failed (${res.status})`);
        }

        setMessages((prev) => [
          ...prev,
          data.userMessage,
          data.assistantMessage,
        ]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to send message");
      } finally {
        setLoading(false);
        textareaRef.current?.focus();
      }
    },
    [caseId, domain, input, loading]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
      }
    },
    [handleSubmit]
  );

  const domainLabel =
    HANDBOOK_DOMAINS.find((d) => d.value === domain)?.label ?? domain;

  return (
    <section className="rounded-lg border border-card-border bg-card-bg p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
        Comptroller&apos;s Handbook Audit
      </h2>

      <div className="mb-4">
        <label className="block text-xs text-muted mb-1">Audit Domain</label>
        <select
          className="block w-full max-w-md rounded-md border-2 border-card-border bg-card-bg px-3 py-2 text-sm focus:border-accent focus:outline-none"
          value={domain}
          onChange={(e) => {
            setDomain(e.target.value as DomainValue);
            setError(null);
          }}
          disabled={loading}
        >
          {HANDBOOK_DOMAINS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.code} — {d.label}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-md border border-card-border bg-section-bg flex flex-col" style={{ height: "36rem" }}>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {historyLoading && (
            <p className="text-sm text-muted text-center py-8">Loading history…</p>
          )}

          {!historyLoading && messages.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-muted">
                No messages yet for <span className="font-medium">{domainLabel}</span>.
              </p>
              <p className="text-xs text-muted-light mt-1">
                Ask a question about this audit domain to get started.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "user" ? (
                <div className="max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm bg-accent text-white">
                  <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                  <div className="text-[10px] mt-1.5 text-white/60">
                    {new Date(msg.createdAt).toLocaleString()}
                  </div>
                </div>
              ) : (
                <div className="max-w-[95%] rounded-lg px-4 py-3 bg-card-bg border border-card-border text-foreground">
                  <div className="break-words">{renderMarkdown(msg.content)}</div>
                  <div className="text-[10px] mt-2 text-muted-light">
                    {new Date(msg.createdAt).toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-card-bg border border-card-border rounded-lg px-3.5 py-2.5 text-sm text-muted">
                <span className="inline-flex gap-1">
                  <span className="animate-bounce" style={{ animationDelay: "0ms" }}>●</span>
                  <span className="animate-bounce" style={{ animationDelay: "150ms" }}>●</span>
                  <span className="animate-bounce" style={{ animationDelay: "300ms" }}>●</span>
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {error && (
          <div className="mx-4 mb-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="border-t border-card-border p-3 flex gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask about ${domainLabel}…`}
            disabled={loading}
            rows={2}
            className="flex-1 resize-none rounded-md border-2 border-card-border bg-card-bg px-3 py-2 text-sm placeholder:text-muted-light focus:border-accent focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="self-end rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Sending…" : "Send"}
          </button>
        </form>
      </div>
    </section>
  );
}
