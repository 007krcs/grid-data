import React, {
  useEffect, useRef, useState, useCallback, useMemo,
} from 'react';
import {
  createPdfEngine,
  type PdfEngine,
  type PdfAnnotation,
  type PdfPageState,
  rgba,
  rgbaToCss,
  createDefaultFlags,
} from '@gridstorm/pdf-core';
import {
  PageRenderer,
  computePageLayouts,
  computeTotalHeight,
  type PageViewport,
} from '@gridstorm/pdf-renderer';
import { createTextPlugin } from '@gridstorm/pdf-plugin-text';

// ─────────────────────────────────────────────────────────────────────────────
// Futuristic SVG Icons
// ─────────────────────────────────────────────────────────────────────────────

const IC = {
  ChevFirst: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
      <path d="M18 6l-6 6 6 6"/><path d="M12 6l-6 6 6 6"/>
    </svg>
  ),
  ChevPrev: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
      <path d="M15 6l-6 6 6 6"/>
    </svg>
  ),
  ChevNext: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
      <path d="M9 6l6 6-6 6"/>
    </svg>
  ),
  ChevLast: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
      <path d="M6 6l6 6-6 6"/><path d="M12 6l6 6-6 6"/>
    </svg>
  ),
  ZoomIn: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
      <circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/><path d="M11 8v6M8 11h6"/>
    </svg>
  ),
  ZoomOut: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
      <circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/><path d="M8 11h6"/>
    </svg>
  ),
  FitWidth: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
      <path d="M4 12h16M4 8l-2 4 2 4M20 8l2 4-2 4"/>
    </svg>
  ),
  FitPage: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
      <rect x="4" y="3" width="16" height="18"/><path d="M9 3v18M15 3v18"/>
    </svg>
  ),
  Plus: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
      <path d="M12 5v14M5 12h14"/>
    </svg>
  ),
  Undo: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
      <path d="M9 14H4V9"/><path d="M4 14a9 9 0 1 1 2.12 5.88"/>
    </svg>
  ),
  Redo: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
      <path d="M15 14h5V9"/><path d="M20 14a9 9 0 1 0-2.12 5.88"/>
    </svg>
  ),
  Delete: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
    </svg>
  ),
  Search: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
      <circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/>
    </svg>
  ),
  Events: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  Cursor: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
      <path d="M5 3l14 9-7 1-4 7z"/>
    </svg>
  ),
  Hand: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
      <path d="M18 11V8a2 2 0 0 0-4 0v3M14 11V6a2 2 0 0 0-4 0v5M10 11V8a2 2 0 0 0-4 0v7l4 4h4a4 4 0 0 0 4-4v-4"/>
    </svg>
  ),
  Text: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
      <polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>
    </svg>
  ),
  Dot: ({ color }: { color: string }) => (
    <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />
  ),
};

// ─────────────────────────────────────────────────────────────────────────────
// Sample Document
// ─────────────────────────────────────────────────────────────────────────────

function loadSampleDocument(engine: PdfEngine) {
  const pages = [0, 1, 2].map((i) => ({
    index: i,
    width: 612,
    height: 792,
    rotation: 0 as const,
    annotationIds: [] as string[],
    rendered: false,
    textContent: null,
  }));

  engine.store.setState((prev) => ({
    ...prev,
    loaded: true,
    documentBytes: new Uint8Array(0),
    metadata: {
      ...prev.metadata,
      title: 'GridStorm PDF Toolkit — Demo',
      author: 'GridStorm Team',
      pageCount: pages.length,
      creator: 'GridStorm PDF Engine',
      producer: 'GridStorm v0.2.0',
    },
    pages,
  }));

  engine.eventBus.emit('document:loaded', {
    pageCount: pages.length,
    metadata: engine.store.getState().metadata,
  });

  const flags = createDefaultFlags();
  const anno = (
    type: 'highlight' | 'text' | 'rectangle',
    pageIndex: number,
    rect: [number, number, number, number],
    color: ReturnType<typeof rgba>,
    bw: number,
    contents: string,
  ) => engine.commandBus.dispatch('annotation:create', {
    annotation: { type, pageIndex, rect, color, opacity: 1, borderWidth: bw, subject: type, author: 'Demo', contents, flags, customData: {} },
  });

  anno('highlight',  0, [72, 620, 540, 640],  rgba(255, 235, 59, 0.4), 0, 'Key feature highlight');
  anno('highlight',  0, [72, 560, 400, 578],  rgba(134, 239, 172, 0.4), 0, 'Secondary highlight');
  anno('text',       1, [450, 700, 470, 720],  rgba(59, 130, 246, 0.9), 1, 'Architecture note: headless core + DOM renderer');
  anno('rectangle',  1, [72,  450, 320, 540],  rgba(168, 85, 247, 0.25), 2, 'Component boundary');
  anno('rectangle',  2, [72,  400, 300, 500],  rgba(239, 68,  68,  0.3),  2, 'Redaction area');
  anno('highlight',  2, [72,  560, 540, 578],  rgba(251, 146, 60, 0.4), 0, 'Important API note');
}

// ─────────────────────────────────────────────────────────────────────────────
// Annotation Overlay
// ─────────────────────────────────────────────────────────────────────────────

function annotationCss(ann: PdfAnnotation, page: PdfPageState, vp: PageViewport) {
  const sx = vp.width / page.width;
  const sy = vp.height / page.height;
  const [x1, y1, x2, y2] = ann.rect;
  return {
    left:   x1 * sx,
    top:    (page.height - y2) * sy,
    width:  (x2 - x1) * sx,
    height: (y2 - y1) * sy,
  };
}

function AnnotationOverlay({
  ann, page, vp, selected, onClick,
}: {
  ann: PdfAnnotation; page: PdfPageState; vp: PageViewport;
  selected: boolean; onClick: (id: string) => void;
}) {
  const pos = annotationCss(ann, page, vp);
  const cssColor = rgbaToCss(ann.color);

  const base: React.CSSProperties = {
    position: 'absolute',
    ...pos,
    cursor: 'pointer',
    boxSizing: 'border-box',
    transition: 'outline-color 0.1s',
    outline: selected ? '2px solid #3b82f6' : '2px solid transparent',
    outlineOffset: 1,
  };

  if (ann.type === 'highlight') {
    return (
      <div
        style={{ ...base, background: cssColor, mixBlendMode: 'multiply' }}
        title={ann.contents}
        onClick={() => onClick(ann.id)}
      />
    );
  }

  if (ann.type === 'rectangle') {
    return (
      <div
        style={{
          ...base,
          background: cssColor,
          border: `${ann.borderWidth || 2}px solid ${rgbaToCss({ ...ann.color, a: Math.min(1, ann.color.a * 2.5) })}`,
        }}
        title={ann.contents}
        onClick={() => onClick(ann.id)}
      />
    );
  }

  if (ann.type === 'text') {
    return (
      <div
        style={{
          ...base,
          background: cssColor,
          borderRadius: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          color: '#fff',
          fontWeight: 700,
          boxShadow: `0 0 8px ${cssColor}`,
        }}
        title={ann.contents}
        onClick={() => onClick(ann.id)}
      >
        📝
      </div>
    );
  }

  // fallback
  return (
    <div
      style={{ ...base, border: `2px solid ${cssColor}`, background: rgbaToCss({ ...ann.color, a: 0.1 }) }}
      title={ann.contents}
      onClick={() => onClick(ann.id)}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Single Page View
// ─────────────────────────────────────────────────────────────────────────────

const PR = new PageRenderer({ devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1 });

function PdfPageView({
  page, vp, annotations, selectedIds, isActive, onAnnotationClick, isDark,
}: {
  page: PdfPageState; vp: PageViewport;
  annotations: PdfAnnotation[]; selectedIds: string[];
  isActive: boolean; onAnnotationClick: (id: string) => void;
  isDark: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width  = vp.width  * dpr;
    canvas.height = vp.height * dpr;
    canvas.style.width  = `${vp.width}px`;
    canvas.style.height = `${vp.height}px`;
    PR.renderPlaceholder(canvas, page, vp);
  }, [page, vp, dpr, isDark]);

  return (
    <div
      style={{
        position: 'absolute',
        left: vp.offsetX,
        top:  vp.offsetY,
        width: vp.width,
        height: vp.height,
        boxShadow: isActive
          ? '0 0 0 2px #3b82f6, 0 4px 24px rgba(0,0,0,0.5)'
          : '0 4px 16px rgba(0,0,0,0.45)',
        borderRadius: 2,
        overflow: 'hidden',
      }}
      data-page-index={page.index}
    >
      {/* Canvas layer */}
      <canvas ref={canvasRef} style={{ display: 'block', position: 'absolute', top: 0, left: 0 }} />

      {/* Annotation layer */}
      {annotations.map(ann => (
        <AnnotationOverlay
          key={ann.id}
          ann={ann}
          page={page}
          vp={vp}
          selected={selectedIds.includes(ann.id)}
          onClick={onAnnotationClick}
        />
      ))}

      {/* Page number badge */}
      <div style={{
        position: 'absolute', bottom: 6, right: 8,
        fontSize: 10, color: 'rgba(0,0,0,0.35)',
        fontFamily: 'monospace', pointerEvents: 'none',
        userSelect: 'none',
      }}>
        {page.index + 1}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility Button
// ─────────────────────────────────────────────────────────────────────────────

interface BtnProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
  accent?: string;
  style?: React.CSSProperties;
}

function Btn({ onClick, active, disabled, title, children, accent, style }: BtnProps) {
  const DARK = '#0d1117';
  const BORDER = '#30363d';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 500,
        border: `1px solid ${active ? (accent ?? '#3b82f6') : BORDER}`,
        background: active ? `rgba(${accent ? '59,130,246' : '59,130,246'},0.15)` : 'transparent',
        color: active ? (accent ?? '#58a6ff') : disabled ? '#484f58' : '#c9d1d9',
        cursor: disabled ? 'default' : 'pointer',
        transition: 'all 0.12s',
        opacity: disabled ? 0.5 : 1,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div style={{ width: 1, height: 20, background: '#21262d', margin: '0 4px', flexShrink: 0 }} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface LogEntry { id: number; time: string; event: string; detail: string }

// ─────────────────────────────────────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const engineRef = useRef<PdfEngine | null>(null);
  const scrollRef  = useRef<HTMLDivElement>(null);
  const logIdRef   = useRef(0);

  const [currentPage,         setCurrentPage]         = useState(0);
  const [pageCount,           setPageCount]           = useState(0);
  const [zoom,                setZoom]                = useState(1.0);
  const [toolMode,            setToolMode]            = useState('select');
  const [theme,               setTheme]               = useState<'light'|'dark'|'high-contrast'>('dark');
  const [version,             setVersion]             = useState(0);
  const [selectedAnnotationIds, setSelectedAnnotationIds] = useState<string[]>([]);
  const [eventLog,            setEventLog]            = useState<LogEntry[]>([]);
  const [showSearch,          setShowSearch]          = useState(false);
  const [showLog,             setShowLog]             = useState(true);
  const [searchQuery,         setSearchQuery]         = useState('');
  const [searchResults,       setSearchResults]       = useState(-1);
  const [containerW,          setContainerW]          = useState(800);

  const isDark = theme !== 'light';

  // colour palette
  const C = useMemo(() => ({
    bg:      isDark ? '#0d1117' : '#f6f8fa',
    panel:   isDark ? '#161b22' : '#ffffff',
    border:  isDark ? '#30363d' : '#d0d7de',
    fg:      isDark ? '#c9d1d9' : '#1f2328',
    muted:   isDark ? '#8b949e' : '#656d76',
    accent:  '#58a6ff',
    accentBg: isDark ? 'rgba(56,139,253,0.15)' : 'rgba(37,99,235,0.08)',
  }), [isDark]);

  const bumpVersion = useCallback(() => setVersion(v => v + 1), []);

  const addLog = useCallback((event: string, detail: string) => {
    const id = ++logIdRef.current;
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}.${String(now.getMilliseconds()).padStart(3,'0')}`;
    setEventLog(prev => [{ id, time, event, detail }, ...prev].slice(0, 100));
  }, []);

  // ── Engine init ──
  useEffect(() => {
    const engine = createPdfEngine({
      initialZoom: 1.0,
      initialPage: 0,
      plugins: [createTextPlugin()],
    });

    const unsubs: (() => void)[] = [];

    unsubs.push(engine.api.addEventListener('document:loaded', (e) => {
      setPageCount(e.pageCount);
      addLog('document:loaded', `${e.pageCount} pages loaded`);
      bumpVersion();
    }));
    unsubs.push(engine.api.addEventListener('page:changed', (e) => {
      setCurrentPage(e.pageIndex);
      addLog('page:changed', `→ Page ${e.pageIndex + 1}`);
    }));
    unsubs.push(engine.api.addEventListener('zoom:changed', (e) => {
      setZoom(e.zoom);
      addLog('zoom:changed', `${Math.round(e.zoom * 100)}%`);
    }));
    unsubs.push(engine.api.addEventListener('tool:changed', (e) => {
      setToolMode(e.mode);
      addLog('tool:changed', e.mode);
    }));
    unsubs.push(engine.api.addEventListener('annotation:created', (e) => {
      addLog('annotation:created', `${e.annotation.type} on page ${e.annotation.pageIndex + 1}`);
      bumpVersion();
    }));
    unsubs.push(engine.api.addEventListener('annotation:updated', () => {
      addLog('annotation:updated', 'annotation modified');
      bumpVersion();
    }));
    unsubs.push(engine.api.addEventListener('annotation:deleted', (e) => {
      addLog('annotation:deleted', e.annotationId);
      bumpVersion();
    }));
    unsubs.push(engine.api.addEventListener('annotation:selected', (e) => {
      setSelectedAnnotationIds(e.annotationIds);
      addLog('annotation:selected', `${e.annotationIds.length} selected`);
    }));
    unsubs.push(engine.api.addEventListener('annotation:deselected', () => {
      setSelectedAnnotationIds([]);
    }));
    unsubs.push(engine.api.addEventListener('search:found', (e) => {
      setSearchResults(e.total);
      addLog('search:found', `${e.total} matches for "${e.query}"`);
    }));

    loadSampleDocument(engine);
    engineRef.current = engine;

    return () => {
      unsubs.forEach(f => f());
      engine.destroy();
      engineRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Measure scroll container ──
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContainerW(el.clientWidth));
    ro.observe(el);
    setContainerW(el.clientWidth);
    return () => ro.disconnect();
  }, [showSearch, showLog]); // recompute when panels open/close

  // ── Page layouts (computed) ──
  const pages  = engineRef.current?.api.getState().pages ?? [];
  const allAnn = engineRef.current?.api.getState().annotations ?? {};
  const layouts = useMemo(
    () => computePageLayouts(pages, zoom, containerW),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pages.length, zoom, containerW, version],
  );
  const totalHeight = useMemo(() => {
    if (layouts.length === 0) return 0;
    const last = layouts[layouts.length - 1]!;
    return last.offsetY + last.height + 8;
  }, [layouts]);

  // ── Scroll to current page ──
  useEffect(() => {
    const layout = layouts[currentPage];
    if (layout && scrollRef.current) {
      scrollRef.current.scrollTo({ top: layout.offsetY - 12, behavior: 'smooth' });
    }
  }, [currentPage, layouts]);

  // ── Ctrl+Wheel zoom ──
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      engineRef.current?.api.setZoom(Math.max(0.25, Math.min(4, (engineRef.current?.api.getZoom() ?? 1) + delta)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // ── Handlers ──
  const goToPage     = (n: number)    => engineRef.current?.api.goToPage(Math.max(0, Math.min(n, pageCount - 1)));
  const doZoom       = (z: number)    => engineRef.current?.api.setZoom(Math.max(0.25, Math.min(4, z)));
  const doTool       = (m: string)    => engineRef.current?.api.setToolMode(m);
  const doUndo       = ()             => { engineRef.current?.api.undo(); addLog('history:undo', ''); };
  const doRedo       = ()             => { engineRef.current?.api.redo(); addLog('history:redo', ''); };

  const fitWidth = () => {
    if (!scrollRef.current || !pages[currentPage]) return;
    const page = pages[currentPage]!;
    const w = scrollRef.current.clientWidth - 40;
    doZoom(w / (page.width * (96 / 72)));
  };
  const fitPage = () => {
    if (!scrollRef.current || !pages[currentPage]) return;
    const page = pages[currentPage]!;
    const w = scrollRef.current.clientWidth  - 40;
    const h = scrollRef.current.clientHeight - 40;
    const csu = 96 / 72;
    doZoom(Math.min(w / (page.width * csu), h / (page.height * csu)));
  };

  const addAnnotation = () => {
    if (!engineRef.current) return;
    const colors = [
      rgba(255, 235, 59, 0.4),
      rgba(134, 239, 172, 0.4),
      rgba(251, 146, 60, 0.4),
      rgba(167, 139, 250, 0.4),
      rgba(249, 115, 22, 0.35),
    ];
    engineRef.current.commandBus.dispatch('annotation:create', {
      annotation: {
        type: 'highlight',
        pageIndex: currentPage,
        rect: [
          80 + Math.random() * 160, 400 + Math.random() * 250,
          280 + Math.random() * 200, 420 + Math.random() * 250,
        ] as [number, number, number, number],
        color: colors[Math.floor(Math.random() * colors.length)]!,
        opacity: 1, borderWidth: 0,
        subject: 'Highlight', author: 'User',
        contents: `Added at ${new Date().toLocaleTimeString()}`,
        flags: createDefaultFlags(),
        customData: {},
      },
    });
  };

  const deleteSelected = () => {
    if (!engineRef.current || selectedAnnotationIds.length === 0) return;
    selectedAnnotationIds.forEach(id =>
      engineRef.current!.commandBus.dispatch('annotation:delete', { annotationId: id })
    );
    setSelectedAnnotationIds([]);
  };

  const selectAnnotation = (id: string) => {
    if (!engineRef.current) return;
    const newSel = selectedAnnotationIds.includes(id) ? [] : [id];
    engineRef.current.commandBus.dispatch('annotation:select', { annotationIds: newSel });
  };

  const doSearch = () => {
    if (!searchQuery.trim() || !engineRef.current) return;
    engineRef.current.commandBus.dispatch('text:search', { query: searchQuery, caseSensitive: false });
  };
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(-1);
    engineRef.current?.commandBus.dispatch('text:clearSearch', {});
  };

  const annotationCount = Object.keys(allAnn).length;

  // ── Styles ──
  const S = {
    root: {
      display: 'flex', flexDirection: 'column' as const,
      height: '100vh', background: C.bg, color: C.fg,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", monospace',
      fontSize: 13, overflow: 'hidden',
    } as React.CSSProperties,
    header: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 16px', height: 48, background: C.panel,
      borderBottom: `1px solid ${C.border}`, flexShrink: 0,
      gap: 12,
    } as React.CSSProperties,
    controls: {
      display: 'flex', alignItems: 'center', gap: 4, padding: '0 12px',
      height: 40, background: C.panel, borderBottom: `1px solid ${C.border}`,
      flexShrink: 0, flexWrap: 'wrap' as const, overflow: 'hidden',
    } as React.CSSProperties,
    body: {
      display: 'flex', flex: 1, overflow: 'hidden',
    } as React.CSSProperties,
    sidebar: {
      width: 270, borderRight: `1px solid ${C.border}`, background: C.panel,
      display: 'flex', flexDirection: 'column' as const, flexShrink: 0, overflow: 'hidden',
    } as React.CSSProperties,
    logPanel: {
      width: 300, borderLeft: `1px solid ${C.border}`, background: C.panel,
      display: 'flex', flexDirection: 'column' as const, flexShrink: 0,
    } as React.CSSProperties,
    scroll: {
      flex: 1, overflow: 'auto', position: 'relative' as const,
      background: isDark ? '#010409' : '#e6edf3',
    } as React.CSSProperties,
    status: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 16px', height: 26, background: C.panel,
      borderTop: `1px solid ${C.border}`, flexShrink: 0,
      fontSize: 11, color: C.muted,
    } as React.CSSProperties,
    panelHead: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 12px', borderBottom: `1px solid ${C.border}`,
      fontWeight: 600, fontSize: 12, flexShrink: 0,
    } as React.CSSProperties,
  };

  const zoomPresets = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  return (
    <div style={S.root}>

      {/* ── Header ── */}
      <header style={S.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8, flexShrink: 0,
            background: 'linear-gradient(135deg,#ef4444,#b91c1c)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: 12, letterSpacing: '-0.5px',
            boxShadow: '0 0 12px rgba(239,68,68,0.4)',
          }}>PDF</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.3px' }}>GridStorm PDF Viewer</div>
            <div style={{ fontSize: 10, color: C.muted, fontFamily: 'monospace' }}>@gridstorm/pdf-core v0.2.0</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Theme */}
          <select
            value={theme}
            onChange={e => setTheme(e.target.value as typeof theme)}
            style={{
              padding: '3px 8px', borderRadius: 4, fontSize: 12,
              border: `1px solid ${C.border}`, background: C.panel, color: C.fg,
              cursor: 'pointer',
            }}
          >
            <option value="light">☀ Light</option>
            <option value="dark">🌙 Dark</option>
            <option value="high-contrast">◑ High Contrast</option>
          </select>

          <Btn onClick={() => setShowSearch(s => !s)} active={showSearch} title="Toggle search panel">
            <IC.Search /> Search
          </Btn>
          <Btn onClick={() => setShowLog(s => !s)} active={showLog} title="Toggle event log">
            <IC.Events /> Events
          </Btn>
        </div>
      </header>

      {/* ── Controls ── */}
      <div style={S.controls}>

        {/* Page navigation */}
        <Btn onClick={() => goToPage(0)} disabled={currentPage === 0} title="First page">
          <IC.ChevFirst />
        </Btn>
        <Btn onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 0} title="Previous page">
          <IC.ChevPrev /> Prev
        </Btn>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px',
          border: `1px solid ${C.border}`, borderRadius: 4,
          fontSize: 12, fontFamily: 'monospace', color: C.muted, userSelect: 'none',
        }}>
          <span style={{ color: C.accent, fontWeight: 700 }}>{currentPage + 1}</span>
          <span style={{ color: '#484f58' }}>/</span>
          <span>{pageCount}</span>
        </div>
        <Btn onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= pageCount - 1} title="Next page">
          Next <IC.ChevNext />
        </Btn>
        <Btn onClick={() => goToPage(pageCount - 1)} disabled={currentPage >= pageCount - 1} title="Last page">
          <IC.ChevLast />
        </Btn>

        <Divider />

        {/* Zoom */}
        <Btn onClick={() => doZoom(zoom - 0.25)} disabled={zoom <= 0.25} title="Zoom out">
          <IC.ZoomOut />
        </Btn>
        <select
          value={zoomPresets.find(z => Math.abs(z - zoom) < 0.01) ?? 'custom'}
          onChange={e => { if (e.target.value !== 'custom') doZoom(Number(e.target.value)); }}
          style={{
            padding: '3px 6px', borderRadius: 4, fontSize: 11, fontFamily: 'monospace',
            border: `1px solid ${C.border}`, background: C.panel, color: C.accent,
            cursor: 'pointer', minWidth: 58, textAlign: 'center',
          }}
        >
          {zoomPresets.map(z => (
            <option key={z} value={z}>{Math.round(z * 100)}%</option>
          ))}
          {!zoomPresets.find(z => Math.abs(z - zoom) < 0.01) && (
            <option value="custom">{Math.round(zoom * 100)}%</option>
          )}
        </select>
        <Btn onClick={() => doZoom(zoom + 0.25)} disabled={zoom >= 4} title="Zoom in">
          <IC.ZoomIn />
        </Btn>
        <Btn onClick={fitWidth} title="Fit width">
          <IC.FitWidth /> FW
        </Btn>
        <Btn onClick={fitPage} title="Fit page">
          <IC.FitPage /> FP
        </Btn>

        <Divider />

        {/* Tool modes */}
        {([
          ['select',      <IC.Cursor />, 'Select tool'],
          ['hand',        <IC.Hand />,   'Pan tool'],
          ['text-select', <IC.Text />,   'Text selection'],
        ] as [string, React.ReactNode, string][]).map(([mode, icon, tip]) => (
          <Btn key={mode} onClick={() => doTool(mode)} active={toolMode === mode} title={tip}>
            {icon} {mode === 'select' ? 'Select' : mode === 'hand' ? 'Pan' : 'Text'}
          </Btn>
        ))}

        <Divider />

        {/* Annotation actions */}
        <Btn onClick={addAnnotation} title="Add random highlight to current page">
          <IC.Plus /> Add Anno
        </Btn>
        <Btn
          onClick={deleteSelected}
          disabled={selectedAnnotationIds.length === 0}
          title={`Delete ${selectedAnnotationIds.length} selected annotation(s)`}
        >
          <IC.Delete /> Del{selectedAnnotationIds.length > 0 ? ` (${selectedAnnotationIds.length})` : ''}
        </Btn>
        <Btn onClick={doUndo} title="Undo">
          <IC.Undo /> Undo
        </Btn>
        <Btn onClick={doRedo} title="Redo">
          <IC.Redo /> Redo
        </Btn>

        <div style={{ flex: 1 }} />

        <div style={{ fontSize: 11, color: C.muted, display: 'flex', gap: 12, paddingRight: 4 }}>
          <span style={{ color: annotationCount > 0 ? C.accent : C.muted }}>{annotationCount} ann.</span>
          <span>{toolMode}</span>
          <span style={{ fontFamily: 'monospace' }}>{Math.round(zoom * 100)}%</span>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={S.body}>

        {/* ── Search / Info Panel ── */}
        {showSearch && (
          <div style={S.sidebar}>
            <div style={S.panelHead}>
              <span style={{ color: C.accent }}>⌕ Search & Info</span>
              <button
                onClick={() => setShowSearch(false)}
                style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 16, lineHeight: 1 }}
              >×</button>
            </div>

            {/* Search */}
            <div style={{ padding: 12, borderBottom: `1px solid ${C.border}` }}>
              <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Text Search</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && doSearch()}
                  placeholder="Search in document..."
                  style={{
                    flex: 1, padding: '5px 8px', borderRadius: 4, fontSize: 12,
                    border: `1px solid ${C.border}`, background: isDark ? '#0d1117' : '#f6f8fa',
                    color: C.fg, outline: 'none',
                  }}
                />
                <Btn onClick={doSearch}><IC.Search /></Btn>
              </div>
              {searchResults >= 0 && (
                <div style={{ marginTop: 8, fontSize: 11, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: searchResults > 0 ? '#3fb950' : C.muted }}>
                    {searchResults > 0 ? `✓ ${searchResults} match${searchResults !== 1 ? 'es' : ''}` : 'No matches'}
                  </span>
                  <button onClick={clearSearch} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 11, textDecoration: 'underline' }}>Clear</button>
                </div>
              )}
            </div>

            {/* Document Info */}
            <div style={{ padding: 12, borderBottom: `1px solid ${C.border}` }}>
              <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Document</div>
              {[
                ['Title',    'GridStorm PDF Toolkit'],
                ['Author',   'GridStorm Team'],
                ['Pages',    String(pageCount)],
                ['Zoom',     `${Math.round(zoom * 100)}%`],
                ['Tool',     toolMode],
                ['Annotations', String(annotationCount)],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 12 }}>
                  <span style={{ color: C.muted }}>{k}</span>
                  <span style={{ color: C.fg, fontFamily: k === 'Zoom' || k === 'Pages' ? 'monospace' : 'inherit' }}>{v}</span>
                </div>
              ))}
            </div>

            {/* API Demo commands */}
            <div style={{ padding: 12, flex: 1, overflow: 'auto' }}>
              <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>API Commands</div>
              {[
                ['page:goTo → Page 1',       () => goToPage(0)],
                ['page:goTo → Page 2',       () => goToPage(1)],
                ['page:goTo → Page 3',       () => goToPage(2)],
                ['zoom:set → 75%',           () => doZoom(0.75)],
                ['zoom:set → 100%',          () => doZoom(1.0)],
                ['zoom:set → 150%',          () => doZoom(1.5)],
                ['tool:set → select',        () => doTool('select')],
                ['tool:set → hand',          () => doTool('hand')],
                ['annotation:create → hl',   addAnnotation],
                ['text:search → "GridStorm"', () => { setSearchQuery('GridStorm'); doSearch(); }],
              ].map(([label, fn]) => (
                <button
                  key={label as string}
                  onClick={fn as () => void}
                  style={{
                    display: 'block', width: '100%', marginBottom: 4, padding: '5px 8px',
                    borderRadius: 4, fontSize: 11, cursor: 'pointer', textAlign: 'left',
                    border: `1px solid ${C.border}`, background: isDark ? '#0d1117' : '#f6f8fa',
                    color: C.accent, fontFamily: 'monospace',
                    transition: 'background 0.1s',
                  }}
                >
                  {label as string}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── PDF Scroll Area ── */}
        <div ref={scrollRef} style={S.scroll}>
          {/* Ctrl+Scroll hint */}
          <div style={{
            position: 'sticky', top: 0, left: 0, right: 0, zIndex: 10,
            fontSize: 10, color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)',
            textAlign: 'center', padding: '4px 0',
            pointerEvents: 'none', userSelect: 'none',
          }}>
            Ctrl + Scroll to zoom  ·  Click annotations to select
          </div>

          {/* Pages */}
          <div style={{ position: 'relative', minHeight: totalHeight + 20, minWidth: '100%' }}>
            {layouts.map((vp) => {
              const page = pages[vp.pageIndex];
              if (!page) return null;
              const pageAnns = (page.annotationIds ?? [])
                .map(id => allAnn[id])
                .filter((a): a is PdfAnnotation => a != null);
              return (
                <PdfPageView
                  key={vp.pageIndex}
                  page={page}
                  vp={vp}
                  annotations={pageAnns}
                  selectedIds={selectedAnnotationIds}
                  isActive={vp.pageIndex === currentPage}
                  onAnnotationClick={selectAnnotation}
                  isDark={isDark}
                />
              );
            })}
          </div>
        </div>

        {/* ── Event Log ── */}
        {showLog && (
          <div style={S.logPanel}>
            <div style={S.panelHead}>
              <span style={{ color: C.accent }}>⚡ Event Stream</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  onClick={() => setEventLog([])}
                  style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 11 }}
                >
                  Clear
                </button>
                <button
                  onClick={() => setShowLog(false)}
                  style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 16, lineHeight: 1 }}
                >×</button>
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 6 }}>
              {eventLog.length === 0 ? (
                <div style={{ fontSize: 11, color: C.muted, padding: 16, textAlign: 'center' }}>
                  Events appear here as you interact.<br/>Try clicking a button above!
                </div>
              ) : (
                eventLog.map(e => (
                  <div key={e.id} style={{
                    padding: '3px 6px', marginBottom: 2, borderRadius: 3, fontSize: 10,
                    background: isDark ? '#0d1117' : '#f6f8fa',
                    border: `1px solid ${C.border}`,
                    fontFamily: 'monospace',
                    display: 'grid', gridTemplateColumns: '60px 1fr', gap: 4,
                  }}>
                    <span style={{ color: '#484f58' }}>{e.time.slice(0, 8)}</span>
                    <div>
                      <span style={{ color: C.accent, fontWeight: 600 }}>{e.event}</span>
                      {e.detail && <span style={{ color: C.muted }}> {e.detail}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Status Bar ── */}
      <footer style={S.status}>
        <div style={{ display: 'flex', gap: 16, fontFamily: 'monospace' }}>
          <span>Page <strong style={{ color: C.fg }}>{currentPage + 1}</strong> of {pageCount}</span>
          <span>Zoom <strong style={{ color: C.fg }}>{Math.round(zoom * 100)}%</strong></span>
          <span>Tool <strong style={{ color: C.fg }}>{toolMode}</strong></span>
          <span><strong style={{ color: C.fg }}>{annotationCount}</strong> annotations
            {selectedAnnotationIds.length > 0 && <span style={{ color: C.accent }}> · {selectedAnnotationIds.length} selected</span>}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <IC.Dot color="#3fb950" />
          <span>Engine Ready</span>
          <span style={{ color: C.border }}>·</span>
          <span style={{ fontFamily: 'monospace' }}>GridStorm v0.2.0</span>
        </div>
      </footer>
    </div>
  );
}
