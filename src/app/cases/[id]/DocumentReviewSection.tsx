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

/**
 * Where the bitmap is drawn inside a laid-out <img> with object-fit: contain
 * (same math as CSS object-fit: contain). Coordinates are relative to the
 * element's content box (clientWidth × clientHeight).
 */
function objectFitContainContentRect(
  clientW: number,
  clientH: number,
  naturalW: number,
  naturalH: number
): { ox: number; oy: number; rw: number; rh: number } {
  if (naturalW <= 0 || naturalH <= 0 || clientW <= 0 || clientH <= 0) {
    return { ox: 0, oy: 0, rw: clientW, rh: clientH };
  }
  const ir = naturalW / naturalH;
  const cr = clientW / clientH;
  if (ir > cr) {
    const rw = clientW;
    const rh = clientW / ir;
    return { ox: 0, oy: (clientH - rh) / 2, rw, rh };
  }
  const rh = clientH;
  const rw = clientH * ir;
  return { ox: (clientW - rw) / 2, oy: 0, rw, rh };
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
  /** Laid-out size of the statement <img> (for bbox math with object-contain). */
  const [imgLayoutSize, setImgLayoutSize] = useState<{
    cw: number;
    ch: number;
  } | null>(null);
  const statementImgRef = useRef<HTMLImageElement | null>(null);
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

  const syncStatementImgLayout = useCallback(() => {
    const el = statementImgRef.current;
    if (!el || el.naturalWidth <= 0) return;
    const cw = el.clientWidth;
    const ch = el.clientHeight;
    if (cw > 0 && ch > 0) {
      setImgLayoutSize({ cw, ch });
    }
  }, []);

  useEffect(() => {
    const bump = () => {
      requestAnimationFrame(() => {
        syncStatementImgLayout();
        requestAnimationFrame(() => syncStatementImgLayout());
      });
    };
    document.addEventListener("fullscreenchange", bump);
    document.addEventListener("webkitfullscreenchange", bump);
    return () => {
      document.removeEventListener("fullscreenchange", bump);
      document.removeEventListener("webkitfullscreenchange", bump);
    };
  }, [syncStatementImgLayout]);

  useEffect(() => {
    const el = statementImgRef.current;
    if (!el || !rasterObjectUrl) return;
    const ro = new ResizeObserver(() => syncStatementImgLayout());
    ro.observe(el);
    return () => ro.disconnect();
  }, [rasterObjectUrl, syncStatementImgLayout]);

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
          setImgLayoutSize(null);
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
    setImgLayoutSize(null);

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
      requestAnimationFrame(() => {
        const img = statementImgRef.current;
        if (img && img.naturalWidth > 0) {
          const cw = img.clientWidth;
          const ch = img.clientHeight;
          if (cw > 0 && ch > 0) setImgLayoutSize({ cw, ch });
        }
      });
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
    <section className="rounded-lg border border-card-border bg-card-bg p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
        Document review
      </h2>

      {!hasBankName && (
        <p className="text-sm text-muted">
          This case has no bank name. Add a bank name that matches (case-insensitive){" "}
          <code className="text-xs bg-section-bg px-1 rounded">
            main.tsfrt.bank_statement_analysis.bank_name
          </code>{" "}
          to load statement files.
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
            (case-insensitive).
          </p>
        </div>
      )}

      {hasBankName && loading && (
        <p className="text-sm text-muted">Loading…</p>
      )}

      {hasBankName && !loading && loadError && (
        <p className="text-sm text-error">{loadError}</p>
      )}

      {hasBankName && !loading && !loadError && documents.length === 0 && (
        <p className="text-sm text-muted">
          No bank statement files found in the warehouse for this bank name (case-insensitive match).
        </p>
      )}

      {hasBankName && !loading && !loadError && documents.length > 0 && doc && (
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-1/2 space-y-3 min-w-0">
            {documents.length > 1 && (
              <label className="block text-xs text-muted">
                Statement file
                <select
                  className="mt-1 block w-full rounded-md border-2 border-card-border bg-card-bg px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
                  value={docIndex}
                  onChange={(e) => {
                    setDocIndex(Number(e.target.value));
                    setSelectedElId(null);
                    setImgNatural(null);
                    setImgLayoutSize(null);
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
              className="group/preview relative flex max-h-[70vh] min-h-[160px] flex-col overflow-hidden rounded-md border border-card-border bg-section-bg [&:fullscreen]:fixed [&:fullscreen]:inset-0 [&:fullscreen]:z-[100] [&:fullscreen]:max-h-none [&:fullscreen]:min-h-0 [&:fullscreen]:h-screen [&:fullscreen]:w-screen [&:fullscreen]:rounded-none [&:fullscreen]:border-0 [&:fullscreen]:bg-gray-900 [&:fullscreen_.document-review-img]:max-h-[min(calc(100dvh-5rem),100%)] [&:fullscreen_.document-review-img]:w-auto [&:fullscreen_.document-review-img]:object-contain"
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
                    className="pointer-events-auto rounded-md border border-card-border bg-card-bg/95 px-2.5 py-1 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm hover:bg-card-bg"
                  >
                    {isDocFullscreen ? "Exit full screen" : "Full screen"}
                  </button>
                </div>
              )}
              <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-2 pt-10">
              {fileUrl && isRasterImagePath(doc.filePath) && (
                <div className="relative inline-block max-w-full">
                  {rasterFetchLoading && (
                    <p className="text-sm text-muted py-8 text-center">
                      Loading image…
                    </p>
                  )}
                  {rasterFetchError && !rasterFetchLoading && (
                    <div
                      className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-error whitespace-pre-wrap break-words"
                      role="alert"
                    >
                      <p className="font-medium">Could not load image</p>
                      <p className="mt-1 text-xs opacity-90">{rasterFetchError}</p>
                      <p className="mt-2 text-xs text-muted">
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
                    ref={statementImgRef}
                    src={rasterObjectUrl}
                    alt={doc.fileName ?? "Statement"}
                    className="document-review-img max-h-full max-w-full h-auto object-contain"
                    onLoad={onImgLoad}
                    onError={onImgDecodeError}
                  />
                    </>
                  )}
                  {imgNatural &&
                    imgLayoutSize &&
                    imgLayoutSize.cw > 0 &&
                    imgLayoutSize.ch > 0 &&
                    doc.parsedElements
                      .filter((pe) => pe.pageId === 0 && pe.bbox)
                      .map((pe) => {
                        const b = pe.bbox!;
                        const { ox, oy, rw, rh } = objectFitContainContentRect(
                          imgLayoutSize.cw,
                          imgLayoutSize.ch,
                          imgNatural.w,
                          imgNatural.h
                        );
                        const cw = imgLayoutSize.cw;
                        const ch = imgLayoutSize.ch;
                        const leftPct =
                          ((ox + (b.left / imgNatural.w) * rw) / cw) * 100;
                        const topPct =
                          ((oy + (b.top / imgNatural.h) * rh) / ch) * 100;
                        const wPct = ((b.width / imgNatural.w) * rw) / cw * 100;
                        const hPct =
                          ((b.height / imgNatural.h) * rh) / ch * 100;
                        const active = selectedElId === pe.id;
                        return (
                          <button
                            key={pe.id}
                            type="button"
                            title={pe.contentSnippet}
                            className={`absolute z-10 box-border border-2 pointer-events-auto cursor-pointer transition-colors ${
                              active
                                ? "border-accent bg-accent/20"
                                : "border-warning/80 bg-warning/10 hover:bg-warning/20"
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
                  <p className="text-foreground mb-2">
                    PDF preview is not embedded in this version.
                  </p>
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:text-accent-hover underline"
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
                      className="text-accent hover:text-accent-hover underline"
                    >
                      Download file
                    </a>
                  </div>
                )}
              </div>
            </div>
            {doc.fileSize != null && (
              <p className="text-xs text-muted">
                Size: {doc.fileSize} bytes
              </p>
            )}
          </div>

          <div className="lg:w-1/2 min-w-0 space-y-4">
            {doc.bankName && (
              <div>
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                  Warehouse bank name
                </h3>
                <p className="text-sm font-medium text-foreground">
                  {doc.bankName}
                </p>
                <p className="text-xs text-muted mt-1">
                  Value from{" "}
                  <code className="text-[11px] bg-section-bg px-1 rounded border border-card-border">
                    bank_statement_analysis.bank_name
                  </code>{" "}
                  for this file.
                </p>
              </div>
            )}

            {doc.details && (
              <div>
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                  Extracted details
                </h3>
                <dl className="grid grid-cols-1 gap-2 text-sm">
                  {doc.details.bank_name != null && (
                    <>
                      <dt className="text-muted">
                        Bank (details struct)
                      </dt>
                      <dd className="text-foreground">{doc.details.bank_name || "—"}</dd>
                    </>
                  )}
                  {doc.details.customer_name != null && (
                    <>
                      <dt className="text-muted">
                        Customer
                      </dt>
                      <dd className="text-foreground">{doc.details.customer_name || "—"}</dd>
                    </>
                  )}
                  {doc.details.total_balance != null && (
                    <>
                      <dt className="text-muted">
                        Total balance
                      </dt>
                      <dd className="text-foreground">{doc.details.total_balance || "—"}</dd>
                    </>
                  )}
                </dl>
              </div>
            )}

            {doc.summary && (
              <div>
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                  Summary
                </h3>
                <p className="text-sm whitespace-pre-wrap text-foreground">
                  {doc.summary}
                </p>
              </div>
            )}

            {doc.parsedElements.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                  Parsed elements
                </h3>
                <ul className="space-y-2 max-h-64 overflow-y-auto text-sm border border-card-border rounded-md p-2">
                  {doc.parsedElements.map((pe) => (
                    <li key={pe.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedElId(pe.id)}
                        className={`w-full text-left rounded px-2 py-1.5 transition-colors ${
                          selectedElId === pe.id
                            ? "bg-blue-100 ring-1 ring-accent/30"
                            : "hover:bg-section-bg"
                        }`}
                      >
                        <span className="text-xs font-mono text-muted">
                          #{pe.sourceId}
                          {pe.type ? ` · ${pe.type}` : ""}
                        </span>
                        <div className="text-foreground line-clamp-3">
                          {pe.contentSnippet}
                        </div>
                        {pe.description && (
                          <div className="text-xs text-muted mt-0.5 line-clamp-2">
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
