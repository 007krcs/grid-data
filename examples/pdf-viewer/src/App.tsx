import { useEffect, useRef, useState, useCallback } from 'react';
import {
  createPdfEngine,
  type PdfEngine,
  rgba,
} from '@gridstorm/pdf-core';
import { PdfRenderer } from '@gridstorm/pdf-renderer';
import { createTextPlugin } from '@gridstorm/pdf-plugin-text';
import { applyPdfTheme, type PdfTheme } from '@gridstorm/pdf-theme';
import '@gridstorm/pdf-theme';

// ── Simulated Document ──

const SAMPLE_PAGES = [
  { width: 612, height: 792, title: 'GridStorm PDF Toolkit', subtitle: 'Technical Overview' },
  { width: 612, height: 792, title: 'Architecture', subtitle: 'Headless Engine + Plugin System' },
  { width: 612, height: 792, title: 'API Reference', subtitle: 'Commands, Events & Extensions' },
];

function loadSampleDocument(engine: PdfEngine) {
  const pages = SAMPLE_PAGES.map((p, i) => ({
    index: i,
    width: p.width,
    height: p.height,
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

  // Add sample annotations
  engine.commandBus.dispatch('annotation:create', {
    annotation: {
      type: 'highlight',
      pageIndex: 0,
      rect: [72, 620, 540, 640] as [number, number, number, number],
      color: rgba(255, 235, 59, 0.4),
      opacity: 1,
      borderWidth: 0,
      subject: 'Highlight',
      author: 'Demo',
      contents: 'Key feature highlight',
      flags: { invisible: false, hidden: false, print: true, noZoom: false, noRotate: false, noView: false, readOnly: false, locked: false, lockedContents: false },
      customData: {},
    },
  });

  engine.commandBus.dispatch('annotation:create', {
    annotation: {
      type: 'text',
      pageIndex: 1,
      rect: [450, 700, 470, 720] as [number, number, number, number],
      color: rgba(59, 130, 246, 0.8),
      opacity: 1,
      borderWidth: 1,
      subject: 'Note',
      author: 'Demo',
      contents: 'Architecture note: headless core + DOM renderer pattern',
      flags: { invisible: false, hidden: false, print: true, noZoom: false, noRotate: false, noView: false, readOnly: false, locked: false, lockedContents: false },
      customData: {},
    },
  });

  engine.commandBus.dispatch('annotation:create', {
    annotation: {
      type: 'rectangle',
      pageIndex: 2,
      rect: [72, 400, 300, 500] as [number, number, number, number],
      color: rgba(239, 68, 68, 0.3),
      opacity: 1,
      borderWidth: 2,
      subject: 'Redaction Area',
      author: 'Demo',
      contents: 'Sensitive content area',
      flags: { invisible: false, hidden: false, print: true, noZoom: false, noRotate: false, noView: false, readOnly: false, locked: false, lockedContents: false },
      customData: {},
    },
  });
}

// ── Event Log Entry ──

interface LogEntry {
  id: number;
  time: string;
  event: string;
  detail: string;
}

// ── App Component ──

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<PdfEngine | null>(null);
  const rendererRef = useRef<PdfRenderer | null>(null);

  const [theme, setTheme] = useState<PdfTheme>('light');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [zoom, setZoom] = useState(1.0);
  const [toolMode, setToolMode] = useState('select');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<number>(0);
  const [eventLog, setEventLog] = useState<LogEntry[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [annotationCount, setAnnotationCount] = useState(0);

  const logIdRef = useRef(0);

  const addLog = useCallback((event: string, detail: string) => {
    const id = ++logIdRef.current;
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setEventLog((prev) => [{ id, time, event, detail }, ...prev].slice(0, 50));
  }, []);

  // ── Initialize Engine ──
  useEffect(() => {
    if (!containerRef.current) return;

    const engine = createPdfEngine({
      initialZoom: 1.0,
      initialPage: 0,
      plugins: [createTextPlugin()],
    });

    const renderer = new PdfRenderer({
      api: engine.api,
      container: containerRef.current,
      enableToolbar: true,
      enableTextLayer: true,
      enableAnnotationLayer: true,
    });

    renderer.mount();
    applyPdfTheme(containerRef.current, 'light');

    // Subscribe to events
    const unsubs: (() => void)[] = [];

    unsubs.push(engine.api.addEventListener('document:loaded', (e) => {
      setPageCount(e.pageCount);
      setAnnotationCount(0);
      addLog('document:loaded', `${e.pageCount} pages`);
    }));

    unsubs.push(engine.api.addEventListener('page:changed', (e) => {
      setCurrentPage(e.pageIndex);
      addLog('page:changed', `Page ${e.pageIndex + 1}`);
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
      setAnnotationCount((c) => c + 1);
      addLog('annotation:created', `${e.annotation.type} on page ${e.annotation.pageIndex + 1}`);
    }));

    unsubs.push(engine.api.addEventListener('annotation:selected', (e) => {
      addLog('annotation:selected', `${e.annotationIds.length} selected`);
    }));

    unsubs.push(engine.api.addEventListener('search:found', (e) => {
      setSearchResults(e.total);
      addLog('search:found', `${e.total} matches for "${e.query}"`);
    }));

    // Load sample document
    loadSampleDocument(engine);

    engineRef.current = engine;
    rendererRef.current = renderer;

    return () => {
      unsubs.forEach((fn) => fn());
      renderer.destroy();
      engine.destroy();
      engineRef.current = null;
      rendererRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Theme Changes ──
  useEffect(() => {
    if (!containerRef.current) return;
    applyPdfTheme(containerRef.current, theme);
  }, [theme]);

  // ── Handlers ──

  const handlePageNav = (delta: number) => {
    const engine = engineRef.current;
    if (!engine) return;
    const next = Math.max(0, Math.min(currentPage + delta, pageCount - 1));
    engine.api.goToPage(next);
  };

  const handleZoom = (level: number) => {
    engineRef.current?.api.setZoom(level);
  };

  const handleToolChange = (mode: string) => {
    engineRef.current?.api.setToolMode(mode);
  };

  const handleSearch = () => {
    if (!searchQuery.trim() || !engineRef.current) return;
    engineRef.current.commandBus.dispatch('text:search', {
      query: searchQuery,
      caseSensitive: false,
    });
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults(0);
    engineRef.current?.commandBus.dispatch('text:clearSearch', {});
  };

  const handleUndo = () => engineRef.current?.api.undo();
  const handleRedo = () => engineRef.current?.api.redo();

  const handleAddAnnotation = () => {
    if (!engineRef.current) return;
    engineRef.current.commandBus.dispatch('annotation:create', {
      annotation: {
        type: 'highlight',
        pageIndex: currentPage,
        rect: [100 + Math.random() * 200, 300 + Math.random() * 300, 350 + Math.random() * 100, 330 + Math.random() * 300] as [number, number, number, number],
        color: rgba(
          Math.floor(Math.random() * 200 + 55),
          Math.floor(Math.random() * 200 + 55),
          Math.floor(Math.random() * 200 + 55),
          0.3,
        ),
        opacity: 1,
        borderWidth: 0,
        subject: 'Highlight',
        author: 'User',
        contents: `Annotation added at ${new Date().toLocaleTimeString()}`,
        flags: { invisible: false, hidden: false, print: true, noZoom: false, noRotate: false, noView: false, readOnly: false, locked: false, lockedContents: false },
        customData: {},
      },
    });
  };

  // ── Styles ──

  const isDark = theme === 'dark';

  const panelBg = isDark ? '#1e293b' : '#ffffff';
  const panelBorder = isDark ? '#334155' : '#e2e8f0';
  const panelFg = isDark ? '#e2e8f0' : '#1e293b';
  const dimFg = isDark ? '#94a3b8' : '#64748b';
  const accentBg = isDark ? '#1e3a5f' : '#eff6ff';
  const accentFg = isDark ? '#60a5fa' : '#2563eb';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: isDark ? '#0f172a' : '#f1f5f9', color: panelFg }}>
      {/* ── Header ── */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 16px', background: panelBg, borderBottom: `1px solid ${panelBorder}`,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 14,
          }}>PDF</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>GridStorm PDF Viewer</div>
            <div style={{ fontSize: 11, color: dimFg }}>Powered by @gridstorm/pdf-core</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Theme selector */}
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as PdfTheme)}
            style={{
              padding: '4px 8px', borderRadius: 6, fontSize: 12,
              border: `1px solid ${panelBorder}`, background: panelBg, color: panelFg,
              cursor: 'pointer',
            }}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="high-contrast">High Contrast</option>
          </select>

          {/* Toggle buttons */}
          <ToolbarBtn label="Search" active={showSearch} onClick={() => setShowSearch(!showSearch)} fg={panelFg} border={panelBorder} accent={accentBg} />
          <ToolbarBtn label="Events" active={showLog} onClick={() => setShowLog(!showLog)} fg={panelFg} border={panelBorder} accent={accentBg} />
        </div>
      </header>

      {/* ── Controls Bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 16px',
        background: panelBg, borderBottom: `1px solid ${panelBorder}`, flexShrink: 0,
        flexWrap: 'wrap',
      }}>
        {/* Page nav */}
        <BtnGroup>
          <SmallBtn onClick={() => handlePageNav(-1)} disabled={currentPage === 0} fg={panelFg} border={panelBorder}>Prev</SmallBtn>
          <span style={{ fontSize: 12, padding: '0 8px', color: dimFg }}>
            {currentPage + 1} / {pageCount}
          </span>
          <SmallBtn onClick={() => handlePageNav(1)} disabled={currentPage >= pageCount - 1} fg={panelFg} border={panelBorder}>Next</SmallBtn>
        </BtnGroup>

        <Divider color={panelBorder} />

        {/* Zoom */}
        <BtnGroup>
          <SmallBtn onClick={() => handleZoom(zoom - 0.25)} fg={panelFg} border={panelBorder}>-</SmallBtn>
          <span style={{ fontSize: 12, padding: '0 6px', minWidth: 40, textAlign: 'center', color: dimFg }}>
            {Math.round(zoom * 100)}%
          </span>
          <SmallBtn onClick={() => handleZoom(zoom + 0.25)} fg={panelFg} border={panelBorder}>+</SmallBtn>
        </BtnGroup>

        <Divider color={panelBorder} />

        {/* Tool modes */}
        <BtnGroup>
          {['select', 'hand', 'text-select'].map((mode) => (
            <SmallBtn
              key={mode}
              onClick={() => handleToolChange(mode)}
              active={toolMode === mode}
              fg={panelFg}
              border={panelBorder}
              accentBg={accentBg}
              accentFg={accentFg}
            >
              {mode === 'select' ? 'Select' : mode === 'hand' ? 'Pan' : 'Text'}
            </SmallBtn>
          ))}
        </BtnGroup>

        <Divider color={panelBorder} />

        {/* Actions */}
        <BtnGroup>
          <SmallBtn onClick={handleAddAnnotation} fg={panelFg} border={panelBorder}>+ Annotation</SmallBtn>
          <SmallBtn onClick={handleUndo} fg={panelFg} border={panelBorder}>Undo</SmallBtn>
          <SmallBtn onClick={handleRedo} fg={panelFg} border={panelBorder}>Redo</SmallBtn>
        </BtnGroup>

        <div style={{ flex: 1 }} />

        {/* Stats */}
        <div style={{ display: 'flex', gap: 12, fontSize: 11, color: dimFg }}>
          <span>{annotationCount} annotations</span>
          <span>Tool: {toolMode}</span>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Search Panel */}
        {showSearch && (
          <div style={{
            width: 280, borderRight: `1px solid ${panelBorder}`, background: panelBg,
            display: 'flex', flexDirection: 'column', flexShrink: 0,
          }}>
            <div style={{ padding: 12, borderBottom: `1px solid ${panelBorder}` }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Text Search</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search in document..."
                  style={{
                    flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 12,
                    border: `1px solid ${panelBorder}`, background: isDark ? '#0f172a' : '#f8fafc',
                    color: panelFg, outline: 'none',
                  }}
                />
                <SmallBtn onClick={handleSearch} fg={panelFg} border={panelBorder}>Go</SmallBtn>
              </div>
              {searchResults > 0 && (
                <div style={{ marginTop: 6, fontSize: 11, color: accentFg }}>
                  {searchResults} match{searchResults !== 1 ? 'es' : ''} found
                  <button onClick={handleClearSearch} style={{
                    marginLeft: 8, background: 'none', border: 'none', color: dimFg,
                    cursor: 'pointer', fontSize: 11, textDecoration: 'underline',
                  }}>Clear</button>
                </div>
              )}
            </div>

            {/* Document Info */}
            <div style={{ padding: 12, fontSize: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Document Info</div>
              <InfoRow label="Title" value="GridStorm PDF Toolkit" fg={dimFg} />
              <InfoRow label="Author" value="GridStorm Team" fg={dimFg} />
              <InfoRow label="Pages" value={String(pageCount)} fg={dimFg} />
              <InfoRow label="Engine" value="@gridstorm/pdf-core" fg={dimFg} />
              <InfoRow label="Renderer" value="Canvas + DOM" fg={dimFg} />
              <InfoRow label="Text Plugin" value="Active" fg={dimFg} />
            </div>

            {/* API Demo */}
            <div style={{ padding: 12, borderTop: `1px solid ${panelBorder}`, fontSize: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>API Commands</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <DemoBtn
                  label="page:goTo → Page 2"
                  onClick={() => engineRef.current?.api.goToPage(1)}
                  bg={accentBg} fg={accentFg}
                />
                <DemoBtn
                  label="zoom:set → 150%"
                  onClick={() => engineRef.current?.api.setZoom(1.5)}
                  bg={accentBg} fg={accentFg}
                />
                <DemoBtn
                  label="tool:set → hand"
                  onClick={() => engineRef.current?.api.setToolMode('hand')}
                  bg={accentBg} fg={accentFg}
                />
                <DemoBtn
                  label="annotation:create → highlight"
                  onClick={handleAddAnnotation}
                  bg={accentBg} fg={accentFg}
                />
                <DemoBtn
                  label="text:search → 'gridstorm'"
                  onClick={() => {
                    setSearchQuery('gridstorm');
                    engineRef.current?.commandBus.dispatch('text:search', {
                      query: 'gridstorm', caseSensitive: false,
                    });
                  }}
                  bg={accentBg} fg={accentFg}
                />
              </div>
            </div>
          </div>
        )}

        {/* PDF Viewer Area */}
        <div ref={containerRef} style={{ flex: 1, overflow: 'hidden', position: 'relative' }} />

        {/* Event Log Panel */}
        {showLog && (
          <div style={{
            width: 320, borderLeft: `1px solid ${panelBorder}`, background: panelBg,
            display: 'flex', flexDirection: 'column', flexShrink: 0,
          }}>
            <div style={{
              padding: '8px 12px', borderBottom: `1px solid ${panelBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>Event Log</span>
              <button
                onClick={() => setEventLog([])}
                style={{
                  background: 'none', border: 'none', color: dimFg,
                  cursor: 'pointer', fontSize: 11, textDecoration: 'underline',
                }}
              >Clear</button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
              {eventLog.length === 0 ? (
                <div style={{ fontSize: 12, color: dimFg, padding: 12, textAlign: 'center' }}>
                  Events will appear here as you interact with the viewer.
                </div>
              ) : (
                eventLog.map((entry) => (
                  <div key={entry.id} style={{
                    padding: '4px 8px', marginBottom: 2, borderRadius: 4, fontSize: 11,
                    background: isDark ? '#1e293b' : '#f8fafc',
                    fontFamily: 'monospace',
                  }}>
                    <span style={{ color: dimFg }}>{entry.time}</span>{' '}
                    <span style={{ color: accentFg, fontWeight: 600 }}>{entry.event}</span>{' '}
                    <span style={{ color: panelFg }}>{entry.detail}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Status Bar ── */}
      <footer style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '4px 16px', fontSize: 11, color: dimFg,
        background: panelBg, borderTop: `1px solid ${panelBorder}`, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <span>Page {currentPage + 1} of {pageCount}</span>
          <span>Zoom: {Math.round(zoom * 100)}%</span>
          <span>Tool: {toolMode}</span>
          <span>Annotations: {annotationCount}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{
            display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
            background: '#22c55e',
          }} />
          <span>Engine Ready</span>
          <span style={{ color: panelBorder }}>|</span>
          <span>GridStorm v0.2.0</span>
        </div>
      </footer>
    </div>
  );
}

// ── Utility Components ──

function ToolbarBtn({ label, active, onClick, fg, border, accent }: {
  label: string; active: boolean; onClick: () => void;
  fg: string; border: string; accent: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
        border: `1px solid ${active ? 'transparent' : border}`,
        background: active ? accent : 'transparent',
        color: fg, fontWeight: active ? 600 : 400,
      }}
    >{label}</button>
  );
}

function SmallBtn({ children, onClick, disabled, active, fg, border, accentBg, accentFg }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean;
  active?: boolean; fg: string; border: string; accentBg?: string; accentFg?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '3px 8px', borderRadius: 4, fontSize: 11, cursor: disabled ? 'default' : 'pointer',
        border: `1px solid ${active ? 'transparent' : border}`,
        background: active ? (accentBg || '#eff6ff') : 'transparent',
        color: active ? (accentFg || '#2563eb') : disabled ? '#94a3b8' : fg,
        fontWeight: active ? 600 : 400, opacity: disabled ? 0.5 : 1,
      }}
    >{children}</button>
  );
}

function BtnGroup({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>{children}</div>;
}

function Divider({ color }: { color: string }) {
  return <div style={{ width: 1, height: 20, background: color, margin: '0 4px' }} />;
}

function InfoRow({ label, value, fg }: { label: string; value: string; fg: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
      <span style={{ color: fg }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function DemoBtn({ label, onClick, bg, fg }: { label: string; onClick: () => void; bg: string; fg: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
        border: 'none', background: bg, color: fg, textAlign: 'left',
        fontFamily: 'monospace',
      }}
    >{label}</button>
  );
}
