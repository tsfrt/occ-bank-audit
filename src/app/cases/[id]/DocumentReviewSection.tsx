"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type BankStatementDetails = {
  bank_name?: string;
  customer_name?: string;
  total_balance?: string;
};

type BboxPixels = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type ParsedElement = {
  id: string;
  sourceId: number;
  type?: string;
  contentSnippet: string;
  description: string | null;
  pageId: number;
  bbox: BboxPixels | null;
};

type DocumentRow = {
  filePath: string;
  fileName: string | null;
  fileSize: string | null;
  bankName: string | null;
  details: BankStatementDetails | null;
  summary: string | null;
  parsedElements: ParsedElement[];
};

function toBase64UrlClient(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function isPdfPath(path: string): boolean {
  return path.toLowerCase().endsWith(".pdf");
}

function isRasterImagePath(path: string): boolean {
  const lower = path.toLowerCase();
  return (
    lower.endsWith(".png") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".gif") ||
    lower.endsWith(".webp") ||
    lower.endsWith(".tif") ||
    lower.endsWith(".tiff")
  );
}

function getFullscreenElement(): Element | null {
  const d = document as Document & {
    webkitFullscreenElement?: Element | null;
  };
  return document.fullscreenElement ?? d.webkitFullscreenElement ?? null;
}

type Props = {
  caseId: string;
  bankName: string | null | undefined;
  bankId: string;
};

export function DocumentReviewSection({ caseId, bankName, bankId }: Props) {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [docIndex, setDocIndex] = useState(0);
  const [selectedElId, setSelectedElId] = useState<string | null>(null);
  const [imgNatural, setImgNatural] = useState<{ w: number; h: number } | null>(
    null
  );
  const [rasterObjectUrl, setRasterObjectUrl] = useState<string | null>(null);
  const [rasterFetchError, setRasterFetchError] = useState<string | null>(null);
  const [rasterFetchLoading, setRasterFetchLoading] = useState(false);
  const rasterObjectUrlRef = useRef<string | null>(null);
  const previewFullscreenRef = useRef<HTMLDivElement | null>(null);
  const [isDocFullscreen, setIsDocFullscreen] = useState(false);

  const hasBankName = Boolean(bankName?.trim());

  useEffect(() => {
    const sync = () => {
      const el = previewFullscreenRef.current;
      setIsDocFullscreen(Boolean(el && getFullscreenElement() === el));
    };
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
    };
  }, []);

  const toggleDocFullscreen = useCallback(async () => {
    const el = previewFullscreenRef.current;
    if (!el) return;
    try {
      if (getFullscreenElement() === el) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else {
          const d = document as Document & {
            webkitExitFullscreen?: () => Promise<void>;
          };
          await d.webkitExitFullscreen?.();
        }
      } else if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else {
        const w = el as HTMLDivElement & {
          webkitRequestFullscreen?: () => Promise<void>;
        };
        await w.webkitRequestFullscreen?.();
      }
    } catch {
      // User gesture / browser policy; ignore.
    }
  }, []);

  const revokeRasterObjectUrl = useCallback((): void => {
    if (rasterObjectUrlRef.current) {
      URL.revokeObjectURL(rasterObjectUrlRef.current);
      rasterObjectUrlRef.current = null;
    }
    setRasterObjectUrl(null);
  }, []);

  useEffect(() => {
    if (!hasBankName) {
      setLoading(false);
      setDocuments([]);
      setLoadError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(`/api/cases/${caseId}/documents`);
        const data = (await res.json()) as {
          documents?: DocumentRow[];
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error ?? res.statusText);
        }
        if (data.error && !(data.documents?.length)) {
          throw new Error(data.error);
        }
        if (!cancelled) {
          setDocuments(data.documents ?? []);
          setDocIndex(0);
          setSelectedElId(null);
          setImgNatural(null);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Failed to load");
          setDocuments([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [caseId, hasBankName]);

  const doc = documents[docIndex] ?? null;

  const fileUrl = useMemo(() => {
    if (!doc?.filePath) return null;
    const p = toBase64UrlClient(doc.filePath);
    return `/api/cases/${caseId}/documents/file?p=${encodeURIComponent(p)}`;
  }, [caseId, doc?.filePath]);

  /** Raster previews: fetch explicitly so 403 JSON bodies surface in UI (img onError often hides details). */
  useEffect(() => {
    revokeRasterObjectUrl();
    setRasterFetchError(null);
    setRasterFetchLoading(false);
    setImgNatural(null);

    if (!fileUrl || !doc || !isRasterImagePath(doc.filePath)) {
      return;
    }

    let cancelled = false;
    setRasterFetchLoading(true);

    (async () => {
      console.info("[document-review] raster_fetch_start", {
        caseId,
        filePath: doc.filePath,
        fileUrl,
      });
      try {
        const res = await fetch(fileUrl);
        const ct = res.headers.get("content-type") ?? "";
        if (!res.ok) {
          const text = await res.text();
          const msg = `HTTP ${res.status} ${res.statusText}: ${text.slice(0, 600)}`;
          console.error("[document-review] raster_fetch_failed", {
            caseId,
            filePath: doc.filePath,
            fileUrl,
            status: res.status,
            bodySnippet: text.slice(0, 400),
          });
          if (!cancelled) setRasterFetchError(msg);
          return;
        }
        if (!ct.startsWith("image/")) {
          const text = await res.text();
          const msg = `Expected image/*; got "${ct}". ${text.slice(0, 400)}`;
          console.error("[document-review] raster_fetch_wrong_type", {
            caseId,
            filePath: doc.filePath,
            contentType: ct,
            bodySnippet: text.slice(0, 300),
          });
          if (!cancelled) setRasterFetchError(msg);
          return;
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        rasterObjectUrlRef.current = url;
        setRasterObjectUrl(url);
        console.info("[document-review] raster_fetch_ok", {
          caseId,
          filePath: doc.filePath,
          bytes: blob.size,
          contentType: ct,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load image";
        console.error("[document-review] raster_fetch_error", {
          caseId,
          filePath: doc.filePath,
          fileUrl,
          error: msg,
        });
        if (!cancelled) setRasterFetchError(msg);
      } finally {
        if (!cancelled) setRasterFetchLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      revokeRasterObjectUrl();
    };
  }, [caseId, doc?.filePath, fileUrl, revokeRasterObjectUrl]);

  const onImgLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const el = e.currentTarget;
      setImgNatural({ w: el.naturalWidth, h: el.naturalHeight });
      console.info("[document-review] image_decode_success", {
        caseId,
        filePath: doc?.filePath ?? null,
        naturalWidth: el.naturalWidth,
        naturalHeight: el.naturalHeight,
      });
    },
    [caseId, doc?.filePath]
  );

  const onImgDecodeError = useCallback(() => {
    console.error("[document-review] image_decode_error", {
      caseId,
      filePath: doc?.filePath ?? null,
      rasterObjectUrlPresent: Boolean(rasterObjectUrl),
    });
    setRasterFetchError(
      (prev) =>
        prev ??
        "Image failed to decode after download (corrupt file or unsupported format)."
    );
  }, [caseId, doc?.filePath, rasterObjectUrl]);

  return (
    <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
        Document review
      </h2>

      {!hasBankName && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          This case has no bank name. Add a bank name that matches (case-insensitive){" "}
          <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1 rounded">
            main.tsfrt.bank_statement_analysis.bank_name
          </code>{" "}
          to load statement files.
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
            (case-insensitive).
          </p>
        </div>
      )}

      {hasBankName && loading && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
      )}

      {hasBankName && !loading && loadError && (
        <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
      )}

      {hasBankName && !loading && !loadError && documents.length === 0 && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No bank statement files found in the warehouse for this bank name (case-insensitive match).
        </p>
      )}

      {hasBankName && !loading && !loadError && documents.length > 0 && doc && (
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-1/2 space-y-3 min-w-0">
            {documents.length > 1 && (
              <label className="block text-xs text-zinc-500 dark:text-zinc-400">
                Statement file
                <select
                  className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-950 px-2 py-1.5 text-sm"
                  value={docIndex}
                  onChange={(e) => {
                    setDocIndex(Number(e.target.value));
                    setSelectedElId(null);
                    setImgNatural(null);
                    setRasterFetchError(null);
                  }}
                >
                  {documents.map((d, i) => (
                    <option key={`${d.filePath}-${i}`} value={i}>
                      {[d.fileName || d.filePath, d.bankName ? ` · ${d.bankName}` : ""]
                        .filter(Boolean)
                        .join("")}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div
              ref={previewFullscreenRef}
              className="group/preview relative flex max-h-[70vh] min-h-[160px] flex-col overflow-hidden rounded-md border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 [&:fullscreen]:fixed [&:fullscreen]:inset-0 [&:fullscreen]:z-[100] [&:fullscreen]:max-h-none [&:fullscreen]:min-h-0 [&:fullscreen]:h-screen [&:fullscreen]:w-screen [&:fullscreen]:rounded-none [&:fullscreen]:border-0 [&:fullscreen]:bg-zinc-950 [&:fullscreen_.document-review-img]:max-h-[min(calc(100dvh-5rem),100%)] [&:fullscreen_.document-review-img]:w-auto [&:fullscreen_.document-review-img]:object-contain"
            >
              {fileUrl && (
                <div className="pointer-events-none absolute right-2 top-2 z-20 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    title={
                      isDocFullscreen
                        ? "Exit full screen (Esc)"
                        : "View document full screen"
                    }
                    onClick={() => void toggleDocFullscreen()}
                    className="pointer-events-auto rounded-md border border-zinc-300 bg-white/95 px-2.5 py-1 text-xs font-medium text-zinc-800 shadow-sm backdrop-blur-sm hover:bg-white dark:border-zinc-600 dark:bg-zinc-900/95 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  >
                    {isDocFullscreen ? "Exit full screen" : "Full screen"}
                  </button>
                </div>
              )}
              <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-2 pt-10">
              {fileUrl && isRasterImagePath(doc.filePath) && (
                <div className="relative inline-block max-w-full w-full">
                  {rasterFetchLoading && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 py-8 text-center">
                      Loading image…
                    </p>
                  )}
                  {rasterFetchError && !rasterFetchLoading && (
                    <div
                      className="rounded-md border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-800 dark:text-red-200 whitespace-pre-wrap break-words"
                      role="alert"
                    >
                      <p className="font-medium">Could not load image</p>
                      <p className="mt-1 text-xs opacity-90">{rasterFetchError}</p>
                      <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                        Open DevTools → Console for lines tagged{" "}
                        <code className="text-[11px]">[document-review]</code>.
                        Server logs use{" "}
                        <code className="text-[11px]">[documents/file]</code>.
                      </p>
                    </div>
                  )}
                  {!rasterFetchLoading && !rasterFetchError && rasterObjectUrl && (
                    <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={rasterObjectUrl}
                    alt={doc.fileName ?? "Statement"}
                    className="document-review-img max-h-full max-w-full h-auto object-contain"
                    onLoad={onImgLoad}
                    onError={onImgDecodeError}
                  />
                    </>
                  )}
                  {imgNatural &&
                    doc.parsedElements
                      .filter((pe) => pe.pageId === 0 && pe.bbox)
                      .map((pe) => {
                        const b = pe.bbox!;
                        const leftPct = (b.left / imgNatural.w) * 100;
                        const topPct = (b.top / imgNatural.h) * 100;
                        const wPct = (b.width / imgNatural.w) * 100;
                        const hPct = (b.height / imgNatural.h) * 100;
                        const active = selectedElId === pe.id;
                        return (
                          <button
                            key={pe.id}
                            type="button"
                            title={pe.contentSnippet}
                            className={`absolute z-10 box-border border-2 pointer-events-auto cursor-pointer transition-colors ${
                              active
                                ? "border-sky-500 bg-sky-500/25"
                                : "border-amber-500/80 bg-amber-400/15 hover:bg-amber-400/25"
                            }`}
                            style={{
                              left: `${leftPct}%`,
                              top: `${topPct}%`,
                              width: `${wPct}%`,
                              height: `${hPct}%`,
                            }}
                            onClick={() => setSelectedElId(pe.id)}
                          />
                        );
                      })}
                </div>
              )}

              {fileUrl && isPdfPath(doc.filePath) && (
                <div className="p-4 text-center text-sm">
                  <p className="text-zinc-600 dark:text-zinc-300 mb-2">
                    PDF preview is not embedded in this version.
                  </p>
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-600 dark:text-sky-400 underline"
                  >
                    Open PDF in new tab
                  </a>
                </div>
              )}

              {fileUrl &&
                !isPdfPath(doc.filePath) &&
                !isRasterImagePath(doc.filePath) && (
                  <div className="p-4 text-center text-sm">
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-600 dark:text-sky-400 underline"
                    >
                      Download file
                    </a>
                  </div>
                )}
              </div>
            </div>
            {doc.fileSize != null && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Size: {doc.fileSize} bytes
              </p>
            )}
          </div>

          <div className="lg:w-1/2 min-w-0 space-y-4">
            {doc.bankName && (
              <div>
                <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                  Warehouse bank name
                </h3>
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  {doc.bankName}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Value from{" "}
                  <code className="text-[11px] bg-zinc-100 dark:bg-zinc-800 px-1 rounded">
                    bank_statement_analysis.bank_name
                  </code>{" "}
                  for this file.
                </p>
              </div>
            )}

            {doc.details && (
              <div>
                <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                  Extracted details
                </h3>
                <dl className="grid grid-cols-1 gap-2 text-sm">
                  {doc.details.bank_name != null && (
                    <>
                      <dt className="text-zinc-500 dark:text-zinc-400">
                        Bank (details struct)
                      </dt>
                      <dd>{doc.details.bank_name || "—"}</dd>
                    </>
                  )}
                  {doc.details.customer_name != null && (
                    <>
                      <dt className="text-zinc-500 dark:text-zinc-400">
                        Customer
                      </dt>
                      <dd>{doc.details.customer_name || "—"}</dd>
                    </>
                  )}
                  {doc.details.total_balance != null && (
                    <>
                      <dt className="text-zinc-500 dark:text-zinc-400">
                        Total balance
                      </dt>
                      <dd>{doc.details.total_balance || "—"}</dd>
                    </>
                  )}
                </dl>
              </div>
            )}

            {doc.summary && (
              <div>
                <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                  Summary
                </h3>
                <p className="text-sm whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">
                  {doc.summary}
                </p>
              </div>
            )}

            {doc.parsedElements.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                  Parsed elements
                </h3>
                <ul className="space-y-2 max-h-64 overflow-y-auto text-sm border border-zinc-200 dark:border-zinc-700 rounded-md p-2">
                  {doc.parsedElements.map((pe) => (
                    <li key={pe.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedElId(pe.id)}
                        className={`w-full text-left rounded px-2 py-1.5 transition-colors ${
                          selectedElId === pe.id
                            ? "bg-sky-100 dark:bg-sky-900/40"
                            : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        }`}
                      >
                        <span className="text-xs font-mono text-zinc-500">
                          #{pe.sourceId}
                          {pe.type ? ` · ${pe.type}` : ""}
                        </span>
                        <div className="text-zinc-800 dark:text-zinc-200 line-clamp-3">
                          {pe.contentSnippet}
                        </div>
                        {pe.description && (
                          <div className="text-xs text-zinc-500 mt-0.5 line-clamp-2">
                            {pe.description}
                          </div>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
