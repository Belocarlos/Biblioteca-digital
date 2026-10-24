"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";

type PdfJs = typeof import("pdfjs-dist");

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;

/**
 * Visualizador de PDF integrado. O JavaScript incorporado nos documentos não é
 * executado: não é carregado o gestor de scripts do pdf.js.
 */
export function PdfViewer({ url, title, downloadUrl }: { url: string; title: string; downloadUrl?: string | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const [pdfjs, setPdfjs] = useState<PdfJs | null>(null);
  const [rootEl, setRootEl] = useState<HTMLDivElement | null>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(0);
  const [scale, setScale] = useState<number | null>(null);
  const [baseSize, setBaseSize] = useState<{ width: number; height: number } | null>(null);
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");

  // Carregamento do documento.
  useEffect(() => {
    let cancelled = false;
    let loadingTask: { destroy: () => Promise<void> } | null = null;
    (async () => {
      try {
        const lib = await import("pdfjs-dist");
        lib.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
        const task = lib.getDocument({
          url,
          cMapUrl: "/pdfjs/cmaps/",
          cMapPacked: true,
          standardFontDataUrl: "/pdfjs/standard_fonts/",
          wasmUrl: "/pdfjs/wasm/",
          iccUrl: "/pdfjs/iccs/",
          enableXfa: false,
        });
        loadingTask = task;
        task.onProgress = ({ loaded: l, total }: { loaded: number; total: number }) => {
          if (total) setProgress(Math.round((l / total) * 100));
        };
        const loaded = await task.promise;
        if (cancelled) return;
        const first = await loaded.getPage(1);
        const vp = first.getViewport({ scale: 1 });
        setBaseSize({ width: vp.width, height: vp.height });
        setPdfjs(lib);
        setDoc(loaded);
        setProgress(null);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("Não foi possível carregar o documento. Tente novamente mais tarde.");
      }
    })();
    return () => {
      cancelled = true;
      void loadingTask?.destroy();
    };
  }, [url]);

  const fitWidth = useCallback(() => {
    const el = containerRef.current;
    if (!el || !baseSize) return;
    const available = el.clientWidth - 32;
    // Ajusta à largura, com um limite de 150% para manter a página legível no ecrã.
    setScale(Math.min(1.5, Math.max(MIN_SCALE, available / baseSize.width)));
  }, [baseSize]);

  useEffect(() => {
    if (baseSize && scale === null) fitWidth();
  }, [baseSize, scale, fitWidth]);

  // Página atual em função da posição de leitura.
  useEffect(() => {
    const root = containerRef.current;
    if (!root || !doc || !scale) return;
    const onScroll = () => {
      const pages = Array.from(root.querySelectorAll<HTMLElement>("[data-page]"));
      const mid = root.scrollTop + root.clientHeight / 3;
      let current = 1;
      for (const p of pages) {
        if (p.offsetTop <= mid) current = Number(p.dataset.page);
      }
      setPage(current);
      setPageInput(String(current));
    };
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => root.removeEventListener("scroll", onScroll);
  }, [doc, scale]);

  const goTo = (n: number) => {
    if (!doc) return;
    const target = Math.min(doc.numPages, Math.max(1, n));
    const el = pagesRef.current?.querySelector<HTMLElement>(`[data-page="${target}"]`);
    if (el && containerRef.current) {
      containerRef.current.scrollTo({ top: el.offsetTop - 8 });
      setPage(target);
      setPageInput(String(target));
    }
  };

  const zoom = (factor: number) => setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round((s ?? 1) * factor * 100) / 100)));

  const toolbarBtn =
    "inline-flex h-9 w-9 items-center justify-center rounded-md border border-line-strong bg-white text-brand-blue hover:bg-brand-blue-50 disabled:opacity-40";

  return (
    <div className="flex h-[calc(100vh-10rem)] min-h-[32rem] flex-col overflow-hidden rounded-md border border-line bg-white">
      <div role="toolbar" aria-label="Controlos do documento" className="flex flex-wrap items-center gap-2 border-b border-line bg-surface px-3 py-2">
        <button type="button" className={toolbarBtn} onClick={() => goTo(page - 1)} disabled={!doc || page <= 1} aria-label="Página anterior">
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
        </button>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            goTo(Number(pageInput));
          }}
          className="flex items-center gap-1.5 text-sm"
        >
          <label htmlFor="pdf-page" className="sr-only">
            Página
          </label>
          <input
            id="pdf-page"
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            className="h-9 w-14 rounded-md border border-line-strong bg-white text-center text-sm"
            disabled={!doc}
          />
          <span className="text-muted">de {doc?.numPages ?? "..."}</span>
        </form>
        <button type="button" className={toolbarBtn} onClick={() => goTo(page + 1)} disabled={!doc || page >= (doc?.numPages ?? 1)} aria-label="Página seguinte">
          <ChevronRight aria-hidden="true" className="h-4 w-4" />
        </button>
        <span className="mx-1 h-6 w-px bg-line-strong" aria-hidden="true" />
        <button type="button" className={toolbarBtn} onClick={() => zoom(1 / 1.2)} disabled={!doc} aria-label="Reduzir">
          <ZoomOut aria-hidden="true" className="h-4 w-4" />
        </button>
        <span className="w-14 text-center text-sm tabular-nums text-ink" aria-live="polite">
          {scale ? `${Math.round(scale * 100)}%` : ""}
        </span>
        <button type="button" className={toolbarBtn} onClick={() => zoom(1.2)} disabled={!doc} aria-label="Ampliar">
          <ZoomIn aria-hidden="true" className="h-4 w-4" />
        </button>
        <button type="button" className={toolbarBtn} onClick={fitWidth} disabled={!doc} aria-label="Ajustar à largura">
          <Maximize2 aria-hidden="true" className="h-4 w-4" />
        </button>
        {downloadUrl ? (
          <a href={downloadUrl} className="ml-auto inline-flex h-9 items-center gap-2 rounded-md bg-brand-blue px-3 text-sm font-medium text-white hover:bg-brand-blue-dark">
            <Download aria-hidden="true" className="h-4 w-4" />
            Descarregar
          </a>
        ) : null}
      </div>

      <div
        ref={(el) => {
          containerRef.current = el;
          setRootEl(el);
        }}
        className="relative flex-1 overflow-auto bg-[#e9edf1]" tabIndex={0} aria-label={`Documento: ${title}`}>
        {error ? (
          <p role="alert" className="m-6 rounded-md border border-[#f7c9c4] bg-danger-50 p-4 text-sm text-danger">
            {error}
          </p>
        ) : !doc || !scale || !baseSize || !pdfjs ? (
          <p role="status" className="m-6 text-sm text-muted">
            A carregar o documento{progress ? ` (${progress}%)` : ""}...
          </p>
        ) : (
          <div ref={pagesRef} className="flex flex-col items-center gap-4 p-4">
            {Array.from({ length: doc.numPages }, (_, i) => (
              <PdfPage key={i + 1} doc={doc} pdfjs={pdfjs} pageNumber={i + 1} scale={scale} baseSize={baseSize} root={rootEl} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PdfPage({
  doc,
  pdfjs,
  pageNumber,
  scale,
  baseSize,
  root,
}: {
  doc: PDFDocumentProxy;
  pdfjs: PdfJs;
  pageNumber: number;
  scale: number;
  baseSize: { width: number; height: number };
  root: HTMLElement | null;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(pageNumber <= 2);
  const [size, setSize] = useState({ width: baseSize.width * scale, height: baseSize.height * scale });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && setVisible(true)), {
      root,
      rootMargin: "800px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [root]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    let renderTask: { cancel: () => void; promise: Promise<void> } | null = null;
    let textLayer: { cancel: () => void } | null = null;
    (async () => {
      const pdfPage = await doc.getPage(pageNumber);
      if (cancelled) return;
      const viewport = pdfPage.getViewport({ scale });
      setSize({ width: viewport.width, height: viewport.height });
      const wrap = wrapRef.current;
      if (!wrap) return;
      wrap.style.setProperty("--scale-factor", String(viewport.scale));
      wrap.style.setProperty("--total-scale-factor", String(viewport.scale));
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width * ratio);
      canvas.height = Math.floor(viewport.height * ratio);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      canvas.setAttribute("aria-hidden", "true");
      renderTask = pdfPage.render({ canvas, viewport, transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : undefined });
      try {
        await renderTask.promise;
      } catch {
        return;
      }
      if (cancelled) return;
      const layer = document.createElement("div");
      layer.className = "textLayer";
      wrap.replaceChildren(canvas, layer);
      const tl = new pdfjs.TextLayer({ textContentSource: pdfPage.streamTextContent(), container: layer, viewport });
      textLayer = tl;
      await tl.render().catch(() => {});
    })();
    return () => {
      cancelled = true;
      renderTask?.cancel();
      textLayer?.cancel();
    };
  }, [visible, doc, pageNumber, scale, pdfjs]);

  return (
    <div
      ref={wrapRef}
      data-page={pageNumber}
      role="region"
      aria-label={`Página ${pageNumber}`}
      className="pdf-page relative shrink-0 bg-white shadow-[0_1px_3px_rgba(15,43,71,0.15)]"
      style={{ width: Math.floor(size.width), height: Math.floor(size.height) }}
    />
  );
}
