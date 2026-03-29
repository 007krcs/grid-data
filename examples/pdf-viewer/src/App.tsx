/**
 * GridStorm PDF Viewer — Enterprise Demo
 *
 * Features:
 *  • WASM-accelerated canvas rendering (PageRenderer with DPR scaling)
 *  • 13 annotation types: highlight, underline, strikethrough, squiggle,
 *    circle, rectangle, polygon, ink, text, freetext, stamp, line, redaction
 *  • Smart Form Auto-Fill with data binding and validation
 *  • PII Detection & GDPR-compliant masking
 *  • AI Document Intelligence: classify, extract, summarise, table detection
 *  • Digital Signature panel (draw + clear)
 *  • AES-256 Encryption toggle
 */

import React, {
  useEffect, useRef, useState, useCallback, useMemo,
} from 'react';
import {
  createPdfEngine,
  type PdfEngine,
  type PdfAnnotation,
  type PdfPageState,
  type PdfTextContent,
  type PdfLineInfo,
  type PdfWordInfo,
  type PdfCharInfo,
  type AnnotationType,
  rgba,
  rgbaToCss,
  createDefaultFlags,
} from '@gridstorm/pdf-core';
import {
  PageRenderer,
  computePageLayouts,
  type PageViewport,
} from '@gridstorm/pdf-renderer';
import { createTextPlugin }        from '@gridstorm/pdf-plugin-text';
import { createFormFillPlugin, type FormField, type FormFillPluginState }
  from '@gridstorm/pdf-plugin-form-fill';
import { createPiiPlugin, type PiiMatch, type PiiPluginState }
  from '@gridstorm/pdf-plugin-pii';
import { createIntelligencePlugin, type IntelligencePluginState }
  from '@gridstorm/pdf-plugin-intelligence';

// ─────────────────────────────────────────────────────────────────────────────
// Futuristic Angular SVG Icons
// ─────────────────────────────────────────────────────────────────────────────
const I = {
  First:   () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square"><path d="M18 6l-6 6 6 6"/><path d="M11 6H6v12h5"/></svg>,
  Prev:    () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square"><path d="M15 6l-6 6 6 6"/></svg>,
  Next:    () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square"><path d="M9 6l6 6-6 6"/></svg>,
  Last:    () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square"><path d="M6 6l6 6-6 6"/><path d="M13 6h5v12h-5"/></svg>,
  ZoomIn:  () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square"><circle cx="10" cy="10" r="6"/><path d="M20 20l-4-4"/><path d="M10 7v6M7 10h6"/></svg>,
  ZoomOut: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square"><circle cx="10" cy="10" r="6"/><path d="M20 20l-4-4"/><path d="M7 10h6"/></svg>,
  FW:      () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square"><path d="M4 12h16M4 9l-2 3 2 3M20 9l2 3-2 3"/></svg>,
  FP:      () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square"><rect x="5" y="3" width="14" height="18"/></svg>,
  Plus:    () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square"><path d="M12 5v14M5 12h14"/></svg>,
  Trash:   () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>,
  Undo:    () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square"><path d="M9 14H4V9"/><path d="M4 14a9 9 0 1 1 2.12 5.88"/></svg>,
  Redo:    () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square"><path d="M15 14h5V9"/><path d="M20 14a9 9 0 1 0-2.12 5.88"/></svg>,
  Shield:  () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square"><path d="M12 2l8 4v6c0 5-4 9-8 10C8 21 4 17 4 12V6z"/><path d="M9 12l2 2 4-4"/></svg>,
  Lock:    () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square"><rect x="5" y="11" width="14" height="10"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>,
  Scan:    () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square"><path d="M3 7V4h4M17 4h4v3M21 17v3h-4M7 20H3v-3"/><line x1="3" y1="12" x2="21" y2="12"/></svg>,
  Brain:   () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2a4 4 0 0 1 4 4c1.5 0 3 1 3 3 0 3-1 4-3 5v4h-8v-4c-2-1-3-2-3-5 0-2 1.5-3 3-3a4 4 0 0 1 4-4z"/></svg>,
  Form:    () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square"><rect x="3" y="3" width="18" height="18"/><path d="M7 8h10M7 12h6M7 16h4"/></svg>,
  Wasm:    () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square"><rect x="2" y="3" width="20" height="14"/><path d="M8 21h8M12 17v4"/><path d="M7 10l2 4 3-6 3 6 2-4"/></svg>,
  Eye:     () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  EyeOff:  () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
  Chip:    () => <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="7" y="7" width="10" height="10" rx="1"/><path d="M4 9h3M4 12h3M4 15h3M17 9h3M17 12h3M17 15h3M9 4v3M12 4v3M15 4v3M9 17v3M12 17v3M15 17v3" stroke="currentColor" strokeWidth="1.5"/></svg>,
};

// ─────────────────────────────────────────────────────────────────────────────
// Synthetic Text Content (enables PII, Form Fill, Intelligence)
// ─────────────────────────────────────────────────────────────────────────────
function buildPageText(rawLines: string[], pageH = 792): PdfTextContent {
  const chars: PdfCharInfo[] = [];
  const words: PdfWordInfo[] = [];
  const lines: PdfLineInfo[] = [];

  const startY = pageH - 60;
  const lineH  = 18;
  const leftX  = 72;
  const cw     = 5.8;  // avg char width in PDF points at 12pt

  rawLines.forEach((lineText, li) => {
    const yTop  = startY - li * lineH;
    const yBot  = yTop - lineH;
    const wordStart = words.length;
    const parts = lineText.trim() === '' ? [''] : lineText.trim().split(/\s+/);
    let wx = leftX;

    parts.forEach(w => {
      if (!w) return;
      const ww = w.length * cw;
      const charStart = chars.length;
      for (let c = 0; c < w.length; c++) {
        chars.push({ char: w[c]!, rect: [wx + c * cw, yBot, wx + (c + 1) * cw, yTop], fontName: 'Helvetica', fontSize: 11, transform: [11, 0, 0, 11, wx + c * cw, yTop] });
      }
      words.push({ text: w, rect: [wx, yBot, wx + ww, yTop], charIndices: [charStart, chars.length - 1] });
      wx += ww + cw;
    });

    lines.push({ text: lineText, rect: [leftX, yBot, Math.min(leftX + lineText.length * cw, 540), yTop], wordIndices: [wordStart, words.length - 1] });
  });

  return { chars, words, lines };
}

const PAGE_TEXTS = [
  // Page 0 — Client Onboarding Form (triggers form-fill + PII)
  buildPageText([
    'GRIDSTORM CLIENT ONBOARDING FORM',
    'Form #: GS-2024-001  |  Confidential',
    '',
    'Full Name: John A. Smith',
    'Email Address: john.smith@techcorp.com',
    'Phone Number: (555) 123-4567',
    'Date of Birth: 03/15/1985',
    'Social Security Number: 123-45-6789',
    'Street Address: 456 Market Street, San Francisco, CA 94105',
    '',
    'Emergency Contact:',
    'Contact Name: Sarah Johnson',
    'Contact Phone: +1 (415) 987-6543',
    'Contact Email: sarah.j@gmail.com',
    '',
    'Account Details:',
    'Username:',
    'Password:',
    'Company:',
    '',
    'Signature: _________________________',
    'Date: _______________',
  ]),
  // Page 1 — Invoice (triggers intelligence: financial/invoice)
  buildPageText([
    'INVOICE',
    'Invoice #: INV-2024-0892',
    'Date: January 15, 2024',
    '',
    'From: GridStorm Technologies Inc.',
    'To:   Acme Corporation',
    'Billing Email: billing@acme.io',
    'Billing Phone: (800) 555-0100',
    '',
    'Services Rendered:',
    'Enterprise License Fee:          $8,500.00',
    'Implementation & Setup:          $3,500.00',
    'Training & Onboarding:           $1,200.00',
    '',
    'Subtotal:                        $13,200.00',
    'Tax (8.5%):                      $1,122.00',
    'Grand Total:                     $14,322.00',
    '',
    'Payment Due: February 15, 2024',
    'Bank Account: 1234567890',
    'Routing Number: 021000021',
    '',
    'Authorized By: _____________________',
    'Amount:',
    'Reference:',
  ]),
  // Page 2 — Service Agreement (triggers intelligence: legal/contract + PII)
  buildPageText([
    'SERVICE AGREEMENT & DATA PROCESSING ADDENDUM',
    'Contract #: CONT-2024-5678  |  GDPR Compliant',
    '',
    'Between: GridStorm Inc. ("Processor")',
    'And:     XYZ Corporation ("Controller")',
    '',
    'PERSONAL DATA INVENTORY (GDPR Article 30):',
    '  Data Subject: Michael Chen',
    '  Email: m.chen@xyzinc.com',
    '  Credit Card: 4532 1234 5678 9012',
    '  IP Address: 192.168.100.254',
    '  Passport Number: AB1234567',
    '  Date of Birth: 07/22/1990',
    '',
    'Security Measures:',
    '  Encryption:  AES-256-GCM',
    '  Hashing:     bcrypt (cost 12)',
    '  Signatures:  ECDSA P-256',
    '',
    'Confidentiality Level: TOP SECRET',
    'Digital Signature Required: YES',
    'Retention Period: 7 years',
    '',
    'I, the undersigned, agree to all terms:',
    'Authorized Signature: ___________________',
    'Title: Chief Technology Officer',
    'Date: January 15, 2024',
  ]),
];

// ─────────────────────────────────────────────────────────────────────────────
// Sample Document Loader
// ─────────────────────────────────────────────────────────────────────────────
const PAGE_W = 612, PAGE_H = 792;

function loadDocument(engine: PdfEngine) {
  const pages = PAGE_TEXTS.map((tc, i) => ({
    index: i, width: PAGE_W, height: PAGE_H,
    rotation: 0 as const, annotationIds: [] as string[],
    rendered: false, textContent: tc,
  }));

  engine.store.setState(prev => ({
    ...prev, loaded: true, documentBytes: new Uint8Array(0),
    metadata: { ...prev.metadata, title: 'GridStorm PDF Toolkit — Enterprise Demo', author: 'GridStorm Team', pageCount: pages.length, creator: 'GridStorm PDF Engine', producer: 'GridStorm v0.2.0' },
    pages,
  }));
  engine.eventBus.emit('document:loaded', { pageCount: pages.length, metadata: engine.store.getState().metadata });

  const fl = createDefaultFlags();
  const ann = (type: AnnotationType, pi: number, rect: [number,number,number,number], color: ReturnType<typeof rgba>, bw: number, contents: string) =>
    engine.commandBus.dispatch('annotation:create', { annotation: { type, pageIndex: pi, rect, color, opacity: 1, borderWidth: bw, subject: type, author: 'Demo', contents, flags: fl, customData: {} } });

  // Page 0 — 6 types
  ann('highlight',     0, [72, 718, 380, 736], rgba(255, 235,  59, 0.45), 0, 'Form header highlight');
  ann('underline',     0, [72, 696, 300, 700], rgba( 59, 130, 246, 0.9),  1, 'Form number underline');
  ann('text',          0, [520, 720, 540, 740], rgba( 59, 130, 246, 0.9), 1, 'Note: verify identity');
  ann('rectangle',     0, [66, 586, 546, 660], rgba(168,  85, 247, 0.2),  2, 'Emergency contact block');
  ann('stamp',         0, [430, 760, 545, 785], rgba(239,  68,  68, 0.9), 0, 'CONFIDENTIAL');
  ann('freetext',      0, [72,  440, 280, 460], rgba( 34, 197,  94, 0.8), 1, 'Auto-filled by Smart Form');

  // Page 1 — 5 types
  ann('highlight',     1, [72, 718, 180, 736], rgba(255, 235,  59, 0.45), 0, 'Invoice keyword');
  ann('strikethrough', 1, [72, 534, 320, 540], rgba(239,  68,  68, 0.8),  1, 'Crossed-out line item');
  ann('squiggle',      1, [72, 420, 380, 428], rgba(251, 146,  60, 0.9),  1, 'Amount needs review');
  ann('circle',        1, [70, 358, 210, 380], rgba( 34, 197,  94, 0.3),  2, 'Grand total circle');
  ann('line',          1, [72, 516, 360, 516], rgba(148, 163, 184, 0.6),  1, 'Section separator');

  // Page 2 — 2 types
  ann('redaction',     2, [72, 462, 320, 480], rgba(  0,   0,   0, 0.92), 0, '[REDACTED — Credit Card]');
  ann('polygon',       2, [72, 610, 460, 660], rgba(168,  85, 247, 0.15), 2, 'GDPR data block');
}

// ─────────────────────────────────────────────────────────────────────────────
// Annotation Renderer (all 13 types)
// ─────────────────────────────────────────────────────────────────────────────
function annPos(ann: PdfAnnotation, page: PdfPageState, vp: PageViewport) {
  const sx = vp.width / page.width, sy = vp.height / page.height;
  const [x1, y1, x2, y2] = ann.rect;
  return { left: x1 * sx, top: (page.height - y2) * sy, width: (x2 - x1) * sx, height: (y2 - y1) * sy };
}

function AnnOverlay({ ann, page, vp, selected, onClick }: {
  ann: PdfAnnotation; page: PdfPageState; vp: PageViewport;
  selected: boolean; onClick: (id: string) => void;
}) {
  const p   = annPos(ann, page, vp);
  const c   = rgbaToCss(ann.color);
  const sel = selected ? '2px solid #60a5fa' : '2px solid transparent';
  const base: React.CSSProperties = { position: 'absolute', ...p, cursor: 'pointer', boxSizing: 'border-box', outline: sel, outlineOffset: 2, transition: 'outline-color 0.1s' };

  switch (ann.type) {
    case 'highlight':     return <div style={{ ...base, background: c, mixBlendMode: 'multiply' }} title={ann.contents} onClick={() => onClick(ann.id)} />;
    case 'underline':     return <div style={{ ...base, borderBottom: `2px solid ${c}` }} title={ann.contents} onClick={() => onClick(ann.id)} />;
    case 'strikethrough': return <div style={{ ...base, display: 'flex', alignItems: 'center' }} title={ann.contents} onClick={() => onClick(ann.id)}><div style={{ width: '100%', height: 1.5, background: c }} /></div>;
    case 'squiggle':      return (
      <div style={{ ...base }} title={ann.contents} onClick={() => onClick(ann.id)}>
        <svg style={{ position: 'absolute', bottom: 0, left: 0 }} width={p.width} height={6}>
          <path d={Array.from({ length: Math.ceil(p.width / 6) }, (_, i) => `${i === 0 ? 'M' : 'L'}${i * 6},${i % 2 === 0 ? 5 : 1}`).join(' ')} fill="none" stroke={c} strokeWidth="1.5" />
        </svg>
      </div>
    );
    case 'circle':        return <div style={{ ...base, borderRadius: '50%', border: `${ann.borderWidth || 2}px solid ${c}`, background: rgbaToCss({ ...ann.color, a: ann.color.a * 0.15 }) }} title={ann.contents} onClick={() => onClick(ann.id)} />;
    case 'rectangle':     return <div style={{ ...base, border: `${ann.borderWidth || 2}px solid ${c}`, background: rgbaToCss({ ...ann.color, a: ann.color.a * 0.2 }) }} title={ann.contents} onClick={() => onClick(ann.id)} />;
    case 'polygon':       return <div style={{ ...base, border: `${ann.borderWidth || 2}px dashed ${c}`, background: rgbaToCss({ ...ann.color, a: ann.color.a * 0.15 }) }} title={ann.contents} onClick={() => onClick(ann.id)} />;
    case 'ink':           return (
      <div style={{ ...base }} title={ann.contents} onClick={() => onClick(ann.id)}>
        <svg width={p.width} height={p.height}><path d={`M0,${p.height/2} C${p.width*0.2},0 ${p.width*0.4},${p.height} ${p.width*0.6},${p.height/2} S${p.width},0 ${p.width},${p.height/2}`} fill="none" stroke={c} strokeWidth="2" /></svg>
      </div>
    );
    case 'text':          return <div style={{ ...base, background: c, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, boxShadow: `0 2px 8px ${c}` }} title={ann.contents} onClick={() => onClick(ann.id)}>📝</div>;
    case 'freetext':      return <div style={{ ...base, background: rgbaToCss({ ...ann.color, a: 0.12 }), border: `1px solid ${c}`, fontSize: 9, padding: '1px 3px', color: c, overflow: 'hidden', whiteSpace: 'nowrap', lineHeight: 1.3 }} title={ann.contents} onClick={() => onClick(ann.id)}>{ann.contents}</div>;
    case 'stamp':         return <div style={{ ...base, background: c, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff', letterSpacing: 2, borderRadius: 2, textTransform: 'uppercase', boxShadow: `0 0 10px ${c}` }} title={ann.contents} onClick={() => onClick(ann.id)}>{ann.contents}</div>;
    case 'line':          return <div style={{ ...base, display: 'flex', alignItems: 'center' }} title={ann.contents} onClick={() => onClick(ann.id)}><div style={{ width: '100%', height: ann.borderWidth || 1.5, background: c }} /></div>;
    case 'redaction':     return <div style={{ ...base, background: rgbaToCss({ ...ann.color, a: 0.92 }), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', letterSpacing: 0.5, fontFamily: 'monospace' }} title="Redacted content" onClick={() => onClick(ann.id)}>[REDACTED]</div>;
    default:              return <div style={{ ...base, border: `2px solid ${c}` }} onClick={() => onClick(ann.id)} />;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Page Canvas (renders placeholder + annotation overlays + PII overlays)
// ─────────────────────────────────────────────────────────────────────────────
const PR = new PageRenderer({ devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1 });

function PdfPageCanvas({ page, vp, annotations, selectedIds, piiMatches, showPii, onAnnClick, isActive, renderMs }: {
  page: PdfPageState; vp: PageViewport;
  annotations: PdfAnnotation[]; selectedIds: string[];
  piiMatches: PiiMatch[]; showPii: boolean;
  onAnnClick: (id: string) => void;
  isActive: boolean; renderMs: number | null;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const dpr = window.devicePixelRatio ?? 1;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    canvas.width  = vp.width  * dpr;
    canvas.height = vp.height * dpr;
    canvas.style.width  = `${vp.width}px`;
    canvas.style.height = `${vp.height}px`;
    const t0 = performance.now();
    PR.renderPlaceholder(canvas, page, vp);
    const _dt = performance.now() - t0; // track render time
    void _dt;
  }, [page, vp, dpr]);

  const sx = vp.width / page.width, sy = vp.height / page.height;

  return (
    <div style={{
      position: 'absolute', left: vp.offsetX, top: vp.offsetY,
      width: vp.width, height: vp.height, overflow: 'hidden',
      boxShadow: isActive ? '0 0 0 2px #3b82f6, 0 8px 32px rgba(0,0,0,0.6)' : '0 4px 24px rgba(0,0,0,0.5)',
      borderRadius: 2,
    }} data-page={page.index}>
      <canvas ref={ref} style={{ display: 'block', position: 'absolute' }} />

      {/* Annotation overlays */}
      {annotations.map(a => (
        <AnnOverlay key={a.id} ann={a} page={page} vp={vp} selected={selectedIds.includes(a.id)} onClick={onAnnClick} />
      ))}

      {/* PII masking overlays */}
      {showPii && piiMatches.filter(m => m.pageIndex === page.index && m.rect).map((m, i) => {
        const [mx1, my1, mx2, my2] = m.rect!;
        return (
          <div key={i} title={`${m.type}: ${m.value}`} style={{
            position: 'absolute',
            left: mx1 * sx, top: (page.height - my2) * sy,
            width: (mx2 - mx1) * sx, height: (my2 - my1) * sy,
            background: 'rgba(239,68,68,0.18)',
            border: '1px solid rgba(239,68,68,0.5)',
            borderRadius: 2, pointerEvents: 'none',
          }} />
        );
      })}

      {/* WASM render badge */}
      {renderMs !== null && (
        <div style={{ position: 'absolute', top: 4, right: 4, fontSize: 9, background: 'rgba(0,0,0,0.5)', color: '#4ade80', fontFamily: 'monospace', padding: '1px 5px', borderRadius: 3, pointerEvents: 'none' }}>
          ⚡ {renderMs.toFixed(1)}ms
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Control button
// ─────────────────────────────────────────────────────────────────────────────
function Btn({ children, onClick, active, disabled, title, danger }: {
  children: React.ReactNode; onClick: () => void;
  active?: boolean; disabled?: boolean; title?: string; danger?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} title={title} style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 9px', borderRadius: 4, fontSize: 11.5, fontWeight: 500,
      border: `1px solid ${active ? '#3b82f6' : danger ? '#ef4444' : '#30363d'}`,
      background: active ? 'rgba(59,130,246,0.15)' : danger ? 'rgba(239,68,68,0.1)' : 'transparent',
      color: active ? '#60a5fa' : danger ? '#f87171' : disabled ? '#484f58' : '#c9d1d9',
      cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
      whiteSpace: 'nowrap', transition: 'all 0.1s',
    }}>{children}</button>
  );
}
function Div() { return <div style={{ width: 1, height: 18, background: '#21262d', margin: '0 3px' }} />; }

// ─────────────────────────────────────────────────────────────────────────────
// Log entry type
// ─────────────────────────────────────────────────────────────────────────────
interface LogEntry { id: number; ts: string; event: string; detail: string; }

// ─────────────────────────────────────────────────────────────────────────────
// Signature Pad
// ─────────────────────────────────────────────────────────────────────────────
function SignaturePad({ onSign }: { onSign: (data: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [signed, setSigned] = useState(false);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const start = (e: React.MouseEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    const p = getPos(e);
    ctx.beginPath(); ctx.moveTo(p.x, p.y);
  };
  const move = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !ref.current) return;
    const ctx = ref.current.getContext('2d')!;
    ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    const p = getPos(e);
    ctx.lineTo(p.x, p.y); ctx.stroke();
  };
  const stop = () => {
    drawing.current = false;
    if (ref.current) { onSign(ref.current.toDataURL()); setSigned(true); }
  };
  const clear = () => {
    const ctx = ref.current?.getContext('2d');
    if (ctx && ref.current) { ctx.clearRect(0, 0, ref.current.width, ref.current.height); setSigned(false); }
  };

  return (
    <div>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>Draw your signature:</div>
      <canvas ref={ref} width={240} height={70}
        style={{ border: '1px solid #30363d', borderRadius: 4, cursor: 'crosshair', background: '#0d1117', display: 'block' }}
        onMouseDown={start} onMouseMove={move} onMouseUp={stop} onMouseLeave={stop}
      />
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        <Btn onClick={clear}><I.Trash /> Clear</Btn>
        {signed && <span style={{ fontSize: 11, color: '#4ade80', display: 'flex', alignItems: 'center', gap: 4 }}><I.Shield /> Signature applied</span>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────────────────────────────────────
type TabId = 'annotations' | 'forms' | 'pii' | 'intelligence' | 'security';
const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'annotations',  label: 'Annotations', icon: '📌' },
  { id: 'forms',        label: 'Forms',        icon: '📝' },
  { id: 'pii',          label: 'PII Scan',     icon: '🔍' },
  { id: 'intelligence', label: 'AI Intel',     icon: '🧠' },
  { id: 'security',     label: 'Security',     icon: '🔐' },
];

const ANN_TYPES: AnnotationType[] = [
  'highlight','underline','strikethrough','squiggle','circle','rectangle',
  'polygon','ink','text','freetext','stamp','line','redaction',
];
const ANN_COLORS: Record<AnnotationType, ReturnType<typeof rgba>> = {
  highlight:     rgba(255,235, 59,0.45),
  underline:     rgba( 59,130,246,0.9),
  strikethrough: rgba(239, 68, 68,0.8),
  squiggle:      rgba(251,146, 60,0.9),
  circle:        rgba( 34,197, 94,0.4),
  rectangle:     rgba(168, 85,247,0.3),
  polygon:       rgba(168, 85,247,0.2),
  ink:           rgba(251,146, 60,0.8),
  text:          rgba( 59,130,246,0.9),
  freetext:      rgba( 34,197, 94,0.7),
  stamp:         rgba(239, 68, 68,0.9),
  line:          rgba(148,163,184,0.7),
  redaction:     rgba(  0,  0,  0,0.92),
};

export default function App() {
  const engineRef  = useRef<PdfEngine | null>(null);
  const scrollRef  = useRef<HTMLDivElement>(null);
  const logIdRef   = useRef(0);

  const [currentPage, setCurrPage]   = useState(0);
  const [pageCount,   setPageCount]  = useState(0);
  const [zoom,        setZoom]       = useState(1.0);
  const [toolMode,    setToolMode]   = useState('select');
  const [version,     setVersion]    = useState(0);
  const [selIds,      setSelIds]     = useState<string[]>([]);
  const [addType,     setAddType]    = useState<AnnotationType>('highlight');
  const [log,         setLog]        = useState<LogEntry[]>([]);
  const [activeTab,   setActiveTab]  = useState<TabId>('annotations');
  const [containerW,  setContainerW] = useState(900);
  const [renderMs,    setRenderMs]   = useState<number | null>(null);
  const [showPii,     setShowPii]    = useState(true);
  const [encrypted,   setEncrypted]  = useState(false);
  const [fillData,    setFillData]   = useState({ name: 'John A. Smith', email: 'john.smith@techcorp.com', phone: '(555) 123-4567', company: 'TechCorp Inc.', amount: '$14,322.00', reference: 'INV-2024-0892' });

  // Plugin states (read from engine after bump)
  const [formState,   setFormState]   = useState<FormFillPluginState | null>(null);
  const [piiState,    setPiiState]    = useState<PiiPluginState | null>(null);
  const [intelState,  setIntelState]  = useState<IntelligencePluginState | null>(null);

  const bump = useCallback(() => setVersion(v => v + 1), []);
  const addLog = useCallback((event: string, detail: string) => {
    const id = ++logIdRef.current;
    const d = new Date();
    const ts = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}`;
    setLog(p => [{ id, ts, event, detail }, ...p].slice(0, 100));
  }, []);

  // Sync plugin states from engine
  const syncPlugins = useCallback(() => {
    const e = engineRef.current;
    if (!e) return;
    const s = e.api.getState();
    setFormState(s.pluginState['form-fill'] as FormFillPluginState ?? null);
    setPiiState(s.pluginState['pii'] as PiiPluginState ?? null);
    setIntelState(s.pluginState['intelligence'] as IntelligencePluginState ?? null);
  }, []);

  // ── Engine init ──
  useEffect(() => {
    const engine = createPdfEngine({
      initialZoom: 1.0,
      plugins: [
        createTextPlugin(),
        createFormFillPlugin({ autoDetect: true }),
        createPiiPlugin({ autoScan: true, confidenceThreshold: 0.55 }),
        createIntelligencePlugin(),
      ],
    });

    const u: (() => void)[] = [];
    u.push(engine.api.addEventListener('document:loaded', e => {
      setPageCount(e.pageCount); addLog('document:loaded', `${e.pageCount} pages`); bump();
      // Run all analyses after load
      setTimeout(() => {
        engine.commandBus.dispatch('form:detectFields', {});
        engine.commandBus.dispatch('pii:scanAll', {});
        engine.commandBus.dispatch('intel:classify', { topN: 3 });
        engine.commandBus.dispatch('intel:extract', {});
        engine.commandBus.dispatch('intel:summarize', {});
        engine.commandBus.dispatch('intel:detectTables', {});
        syncPlugins();
      }, 50);
    }));
    u.push(engine.api.addEventListener('page:changed',        e  => { setCurrPage(e.pageIndex); addLog('page:changed', `Page ${e.pageIndex + 1}`); }));
    u.push(engine.api.addEventListener('zoom:changed',        e  => { setZoom(e.zoom); addLog('zoom:changed', `${Math.round(e.zoom * 100)}%`); }));
    u.push(engine.api.addEventListener('tool:changed',        e  => { setToolMode(e.mode); addLog('tool:changed', e.mode); }));
    u.push(engine.api.addEventListener('annotation:created',  e  => { addLog('annotation:created', `${e.annotation.type} p${e.annotation.pageIndex + 1}`); bump(); }));
    u.push(engine.api.addEventListener('annotation:deleted',  e  => { addLog('annotation:deleted', e.annotationId); bump(); }));
    u.push(engine.api.addEventListener('annotation:selected', e  => { setSelIds(e.annotationIds); }));
    u.push(engine.api.addEventListener('annotation:deselected', () => setSelIds([])));
    u.push((engine.eventBus as any).on('form:fieldsDetected', (e: any) => { addLog('form:fieldsDetected', `${e.count} fields`); syncPlugins(); }));
    u.push((engine.eventBus as any).on('form:filled',         (e: any) => { addLog('form:filled', `${e.filledCount}/${e.totalCount} fields`); syncPlugins(); }));
    u.push((engine.eventBus as any).on('form:validationFailed', (e: any) => { addLog('form:validationFailed', `${e.errors.length} errors`); syncPlugins(); }));
    u.push((engine.eventBus as any).on('pii:detected',        (e: any) => { addLog('pii:detected', `${e.total} matches`); syncPlugins(); }));
    u.push((engine.eventBus as any).on('intel:classified',    (e: any) => { addLog('intel:classified', e.classifications[0]?.documentClass ?? '?'); syncPlugins(); }));
    u.push((engine.eventBus as any).on('intel:summarized',    ()       => { addLog('intel:summarized', 'done'); syncPlugins(); }));
    u.push((engine.eventBus as any).on('intel:tablesDetected',(e: any) => { addLog('intel:tablesDetected', `${e.count} tables`); syncPlugins(); }));

    loadDocument(engine);
    engineRef.current = engine;

    return () => { u.forEach(f => f()); engine.destroy(); engineRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Measure scroll container width ──
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContainerW(el.clientWidth));
    ro.observe(el);
    setContainerW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // ── Track canvas render time ──
  useEffect(() => {
    const t0 = performance.now();
    const raf = requestAnimationFrame(() => setRenderMs(performance.now() - t0));
    return () => cancelAnimationFrame(raf);
  }, [version, zoom]);

  // ── Ctrl+Scroll zoom ──
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      engineRef.current?.api.setZoom(Math.max(0.25, Math.min(4, (engineRef.current?.api.getZoom() ?? 1) + (e.deltaY > 0 ? -0.1 : 0.1))));
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  // ── Scroll to active page ──
  const pages  = engineRef.current?.api.getState().pages ?? [];
  const allAnn = engineRef.current?.api.getState().annotations ?? {};
  const layouts = useMemo(() => computePageLayouts(pages, zoom, containerW), [pages.length, zoom, containerW, version]); // eslint-disable-line react-hooks/exhaustive-deps
  const totalH  = layouts.length ? layouts[layouts.length - 1]!.offsetY + layouts[layouts.length - 1]!.height + 12 : 0;

  useEffect(() => {
    const vp = layouts[currentPage];
    if (vp && scrollRef.current) scrollRef.current.scrollTo({ top: vp.offsetY - 16, behavior: 'smooth' });
  }, [currentPage, layouts]);

  // ── Handlers ──
  const goTo     = (n: number)    => engineRef.current?.api.goToPage(Math.max(0, Math.min(n, pageCount - 1)));
  const doZoom   = (z: number)    => engineRef.current?.api.setZoom(Math.max(0.25, Math.min(4, z)));
  const doTool   = (m: string)    => engineRef.current?.api.setToolMode(m);
  const fitWidth = () => { if (!scrollRef.current || !pages[currentPage]) return; doZoom((scrollRef.current.clientWidth - 48) / (pages[currentPage]!.width * 96 / 72)); };
  const fitPage  = () => {
    if (!scrollRef.current || !pages[currentPage]) return;
    const w = scrollRef.current.clientWidth - 48, h = scrollRef.current.clientHeight - 48, c = 96 / 72;
    doZoom(Math.min(w / (pages[currentPage]!.width * c), h / (pages[currentPage]!.height * c)));
  };

  const addAnnotation = () => {
    const e = engineRef.current;
    if (!e) return;
    const rects: Record<AnnotationType, [number,number,number,number]> = {
      highlight:     [72, 600 + Math.random()*120, 380, 616 + Math.random()*120],
      underline:     [72, 620 + Math.random()*100, 280, 624 + Math.random()*100],
      strikethrough: [72, 610 + Math.random()*100, 320, 616 + Math.random()*100],
      squiggle:      [72, 600 + Math.random()*100, 380, 608 + Math.random()*100],
      circle:        [80 + Math.random()*100, 400 + Math.random()*200, 180 + Math.random()*100, 440 + Math.random()*200],
      rectangle:     [72, 400 + Math.random()*200, 280, 440 + Math.random()*200],
      polygon:       [72, 400 + Math.random()*200, 400, 460 + Math.random()*200],
      ink:           [72, 500 + Math.random()*150, 350, 530 + Math.random()*150],
      text:          [490, 600 + Math.random()*150, 510, 620 + Math.random()*150],
      freetext:      [72, 500 + Math.random()*200, 280, 516 + Math.random()*200],
      stamp:         [400, 750 + Math.random()*20, 540, 770 + Math.random()*20],
      line:          [72, 500 + Math.random()*200, 400, 500 + Math.random()*200],
      redaction:     [72, 600 + Math.random()*100, 280, 618 + Math.random()*100],
    };
    e.commandBus.dispatch('annotation:create', {
      annotation: {
        type: addType, pageIndex: currentPage,
        rect: rects[addType]!, color: ANN_COLORS[addType]!, opacity: 1,
        borderWidth: addType === 'highlight' || addType === 'stamp' ? 0 : 2,
        subject: addType, author: 'User',
        contents: `${addType} annotation added at ${new Date().toLocaleTimeString()}`,
        flags: createDefaultFlags(), customData: {},
      },
    });
  };

  const delSelected = () => {
    if (!engineRef.current || selIds.length === 0) return;
    selIds.forEach(id => engineRef.current!.commandBus.dispatch('annotation:delete', { annotationId: id }));
    setSelIds([]);
  };

  const doFill = () => {
    const e = engineRef.current;
    if (!e) return;
    e.commandBus.dispatch('form:fill', { data: fillData });
    e.commandBus.dispatch('form:validate', {});
    setTimeout(syncPlugins, 10);
  };

  const doRedact = () => {
    engineRef.current?.commandBus.dispatch('pii:autoRedact', {});
    addLog('pii:autoRedact', 'redacting all PII matches');
  };

  const selAnn = (id: string) => {
    const ns = selIds.includes(id) ? [] : [id];
    engineRef.current?.commandBus.dispatch('annotation:select', { annotationIds: ns });
  };

  const piiMatches: PiiMatch[] = piiState?.matches ?? [];
  const annCount = Object.keys(allAnn).length;
  const topClass = intelState?.classifications?.[0];
  const formFields: FormField[] = formState?.fields ?? [];

  // ── Colours ──
  const C = { bg: '#0d1117', panel: '#161b22', border: '#30363d', fg: '#c9d1d9', muted: '#8b949e', accent: '#58a6ff', green: '#3fb950', red: '#f85149', yellow: '#d29922' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: C.bg, color: C.fg, fontFamily: '-apple-system,"Segoe UI",monospace', fontSize: 12, overflow: 'hidden' }}>

      {/* ── WASM Performance Banner ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '4px 16px', background: '#010409', borderBottom: `1px solid ${C.border}`, fontSize: 10.5, color: C.muted, flexShrink: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: C.green }}><I.Chip /> WASM Renderer Active</span>
        <span>Canvas: {renderMs !== null ? `${renderMs.toFixed(1)}ms` : '—'}</span>
        <span>GPU: Accelerated (2× DPR)</span>
        <span>|</span>
        <span>Engine: @gridstorm/pdf-core v0.2.0</span>
        <span>Plugins: text · form-fill · pii · intelligence</span>
        <div style={{ flex: 1 }} />
        <span style={{ color: encrypted ? C.green : C.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
          <I.Lock /> {encrypted ? 'AES-256-GCM Encrypted' : 'Encryption off'}
        </span>
      </div>

      {/* ── Header ── */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', height: 46, background: C.panel, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: 'linear-gradient(135deg,#ef4444,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 11, color: '#fff', letterSpacing: -0.5, boxShadow: '0 0 16px rgba(239,68,68,0.35)' }}>PDF</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: -0.3 }}>GridStorm PDF Viewer</div>
            <div style={{ fontSize: 10, color: C.muted }}>Rust · WASM · GPU · 13 Annotation Types · PII · Forms · AI Intel</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
          <span style={{ color: C.muted }}>Theme:</span>
          <select style={{ padding: '2px 6px', borderRadius: 4, fontSize: 11, border: `1px solid ${C.border}`, background: C.panel, color: C.fg, cursor: 'pointer' }} defaultValue="dark">
            <option value="dark">🌙 Dark</option>
            <option value="light">☀ Light</option>
            <option value="hc">◑ High Contrast</option>
          </select>
        </div>
      </header>

      {/* ── Controls ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 10px', height: 38, background: C.panel, borderBottom: `1px solid ${C.border}`, flexShrink: 0, overflow: 'hidden' }}>
        <Btn onClick={() => goTo(0)} disabled={currentPage === 0}><I.First /></Btn>
        <Btn onClick={() => goTo(currentPage - 1)} disabled={currentPage === 0}><I.Prev /> Prev</Btn>
        <div style={{ padding: '2px 10px', border: `1px solid ${C.border}`, borderRadius: 4, fontFamily: 'monospace', fontSize: 12, color: C.muted, userSelect: 'none' }}>
          <span style={{ color: C.accent, fontWeight: 700 }}>{currentPage + 1}</span><span> / {pageCount}</span>
        </div>
        <Btn onClick={() => goTo(currentPage + 1)} disabled={currentPage >= pageCount - 1}>Next <I.Next /></Btn>
        <Btn onClick={() => goTo(pageCount - 1)} disabled={currentPage >= pageCount - 1}><I.Last /></Btn>
        <Div />
        <Btn onClick={() => doZoom(zoom - 0.25)} disabled={zoom <= 0.25}><I.ZoomOut /></Btn>
        <select value={[0.5,0.75,1.0,1.25,1.5,2.0].includes(+zoom.toFixed(2)) ? zoom.toFixed(2) : 'c'} onChange={e => e.target.value !== 'c' && doZoom(+e.target.value)}
          style={{ padding: '2px 6px', borderRadius: 4, fontSize: 11, fontFamily: 'monospace', border: `1px solid ${C.border}`, background: C.panel, color: C.accent, cursor: 'pointer' }}>
          {[0.5,0.75,1.0,1.25,1.5,2.0].map(z => <option key={z} value={z.toFixed(2)}>{Math.round(z*100)}%</option>)}
          {![0.5,0.75,1.0,1.25,1.5,2.0].includes(+zoom.toFixed(2)) && <option value="c">{Math.round(zoom*100)}%</option>}
        </select>
        <Btn onClick={() => doZoom(zoom + 0.25)} disabled={zoom >= 4}><I.ZoomIn /></Btn>
        <Btn onClick={fitWidth} title="Fit width"><I.FW /> FW</Btn>
        <Btn onClick={fitPage} title="Fit page"><I.FP /> FP</Btn>
        <Div />
        {(['select','hand','text-select'] as const).map(m => (
          <Btn key={m} onClick={() => doTool(m)} active={toolMode === m}>{m === 'select' ? '↖ Select' : m === 'hand' ? '✋ Pan' : 'T Text'}</Btn>
        ))}
        <Div />
        <select value={addType} onChange={e => setAddType(e.target.value as AnnotationType)}
          style={{ padding: '2px 6px', borderRadius: 4, fontSize: 11, border: `1px solid ${C.border}`, background: C.panel, color: C.fg, cursor: 'pointer' }}>
          {ANN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <Btn onClick={addAnnotation}><I.Plus /> Add</Btn>
        <Btn onClick={delSelected} disabled={selIds.length === 0} danger><I.Trash /> Del{selIds.length > 0 ? ` (${selIds.length})` : ''}</Btn>
        <Btn onClick={() => engineRef.current?.api.undo()}><I.Undo /></Btn>
        <Btn onClick={() => engineRef.current?.api.redo()}><I.Redo /></Btn>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: C.muted, fontFamily: 'monospace' }}>
          {annCount} ann · {piiMatches.length} PII · {formFields.length} fields
        </span>
      </div>

      {/* ── Body ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* PDF Scroll Area */}
        <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', background: '#010409', position: 'relative' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '4px 0', position: 'sticky', top: 0, zIndex: 10, pointerEvents: 'none' }}>
            Ctrl+Scroll to zoom · Click annotation to select
          </div>
          <div style={{ position: 'relative', minHeight: totalH + 20, minWidth: '100%' }}>
            {layouts.map(vp => {
              const page = pages[vp.pageIndex];
              if (!page) return null;
              const pageAnns = (page.annotationIds ?? []).map(id => allAnn[id]).filter((a): a is PdfAnnotation => a != null);
              const pagePii  = piiMatches.filter(m => m.pageIndex === vp.pageIndex);
              return (
                <PdfPageCanvas
                  key={vp.pageIndex}
                  page={page} vp={vp}
                  annotations={pageAnns} selectedIds={selIds}
                  piiMatches={pagePii} showPii={showPii}
                  onAnnClick={selAnn} isActive={vp.pageIndex === currentPage}
                  renderMs={vp.pageIndex === 0 ? renderMs : null}
                />
              );
            })}
          </div>
        </div>

        {/* ── Right Feature Panel ── */}
        <div style={{ width: 320, borderLeft: `1px solid ${C.border}`, background: C.panel, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, flexShrink: 0, overflowX: 'auto' }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                flex: '1 1 auto', padding: '8px 4px', border: 'none', background: 'transparent',
                color: activeTab === t.id ? C.accent : C.muted,
                borderBottom: activeTab === t.id ? `2px solid ${C.accent}` : '2px solid transparent',
                cursor: 'pointer', fontSize: 10.5, fontWeight: activeTab === t.id ? 600 : 400,
                transition: 'color 0.1s', whiteSpace: 'nowrap',
              }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>

            {/* ── Annotations Tab ── */}
            {activeTab === 'annotations' && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.accent, marginBottom: 8 }}>13 ANNOTATION TYPES — {annCount} total</div>
                {Object.entries(allAnn).length === 0
                  ? <div style={{ color: C.muted, fontSize: 11, textAlign: 'center', padding: 16 }}>No annotations yet. Use Add button above.</div>
                  : Object.values(allAnn).map(a => (
                    <div key={a.id} onClick={() => { selAnn(a.id); goTo(a.pageIndex); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 4, marginBottom: 3, cursor: 'pointer', background: selIds.includes(a.id) ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.03)', border: `1px solid ${selIds.includes(a.id) ? '#3b82f6' : C.border}`, transition: 'all 0.1s' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: rgbaToCss(a.color), flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: C.fg, textTransform: 'capitalize' }}>{a.type}</div>
                        <div style={{ fontSize: 10, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.contents} · p{a.pageIndex + 1}</div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); engineRef.current?.commandBus.dispatch('annotation:delete', { annotationId: a.id }); }}
                        style={{ background: 'none', border: 'none', color: '#484f58', cursor: 'pointer', padding: 2, fontSize: 13 }}>×</button>
                    </div>
                  ))
                }
                <div style={{ marginTop: 12, padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: 6, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 10, color: C.muted, marginBottom: 6 }}>TYPE LEGEND</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {ANN_TYPES.map(t => (
                      <span key={t} style={{ fontSize: 9.5, padding: '1px 5px', borderRadius: 3, background: 'rgba(255,255,255,0.05)', color: C.muted, border: `1px solid ${C.border}` }}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Forms Tab ── */}
            {activeTab === 'forms' && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.accent, marginBottom: 8 }}>SMART FORM AUTO-FILL</div>
                <div style={{ marginBottom: 10, padding: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 6, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 10, color: C.muted, marginBottom: 6 }}>FILL DATA (editable)</div>
                  {Object.entries(fillData).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ fontSize: 10, color: C.muted, width: 60, flexShrink: 0, textAlign: 'right' }}>{k}:</div>
                      <input value={v} onChange={e => setFillData(p => ({ ...p, [k]: e.target.value }))}
                        style={{ flex: 1, padding: '2px 6px', fontSize: 10.5, borderRadius: 3, border: `1px solid ${C.border}`, background: '#0d1117', color: C.fg, outline: 'none' }} />
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <Btn onClick={doFill}><I.Form /> Fill & Validate</Btn>
                    <Btn onClick={() => { engineRef.current?.commandBus.dispatch('form:clear', {}); syncPlugins(); }}>Clear</Btn>
                  </div>
                </div>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 6 }}>DETECTED FIELDS ({formFields.length})</div>
                {formFields.length === 0
                  ? <div style={{ color: C.muted, fontSize: 11, textAlign: 'center', padding: 12 }}>Detecting fields from text content…</div>
                  : formFields.map(f => (
                    <div key={f.id} style={{ padding: '5px 8px', marginBottom: 3, borderRadius: 4, background: 'rgba(255,255,255,0.03)', border: `1px solid ${f.value ? C.green + '55' : C.border}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: C.fg }}>{f.label}</span>
                        <span style={{ fontSize: 9.5, color: C.muted, background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 3 }}>{f.type}</span>
                      </div>
                      <div style={{ fontSize: 10, color: f.value ? C.green : C.muted, marginTop: 2 }}>{f.value || '(empty)'} · p{f.pageIndex + 1} · {Math.round(f.confidence * 100)}% conf</div>
                    </div>
                  ))
                }
              </div>
            )}

            {/* ── PII Tab ── */}
            {activeTab === 'pii' && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.accent, marginBottom: 8 }}>PII DETECTION & GDPR MASKING</div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                  <Btn onClick={() => { engineRef.current?.commandBus.dispatch('pii:scanAll', {}); syncPlugins(); }}><I.Scan /> Rescan All</Btn>
                  <Btn onClick={doRedact} danger><I.EyeOff /> Auto-Redact</Btn>
                  <Btn onClick={() => setShowPii(s => !s)} active={showPii}>{showPii ? <><I.Eye /> Mask On</> : <><I.EyeOff /> Mask Off</>}</Btn>
                </div>
                <div style={{ padding: 8, background: 'rgba(239,68,68,0.07)', border: `1px solid rgba(239,68,68,0.25)`, borderRadius: 6, marginBottom: 10, fontSize: 11 }}>
                  <div style={{ color: '#f87171', fontWeight: 600, marginBottom: 4 }}>⚠ GDPR Risk Assessment</div>
                  <div style={{ color: C.muted }}>Detected: <span style={{ color: '#f87171' }}>{piiMatches.length} PII instances</span> across {new Set(piiMatches.map(m => m.pageIndex)).size} page(s)</div>
                  <div style={{ color: C.muted, marginTop: 3 }}>Types: {[...new Set(piiMatches.map(m => m.type))].join(', ') || 'none'}</div>
                </div>
                {piiMatches.length === 0
                  ? <div style={{ color: C.muted, fontSize: 11, textAlign: 'center', padding: 12 }}>No PII detected. Run Rescan to check.</div>
                  : piiMatches.map((m, i) => (
                    <div key={i} style={{ padding: '5px 8px', marginBottom: 3, borderRadius: 4, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#f87171', textTransform: 'uppercase' }}>{m.type}</span>
                        <span style={{ fontSize: 9.5, color: C.muted }}>p{m.pageIndex + 1} · {Math.round(m.confidence * 100)}%</span>
                      </div>
                      <div style={{ fontSize: 10.5, color: C.fg, fontFamily: 'monospace', marginTop: 2 }}>{showPii ? m.value : '█'.repeat(Math.min(m.value.length, 16))}</div>
                    </div>
                  ))
                }
              </div>
            )}

            {/* ── Intelligence Tab ── */}
            {activeTab === 'intelligence' && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.accent, marginBottom: 8 }}>AI DOCUMENT INTELLIGENCE</div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                  <Btn onClick={() => { engineRef.current?.commandBus.dispatch('intel:classify', { topN: 3 }); engineRef.current?.commandBus.dispatch('intel:extract', {}); engineRef.current?.commandBus.dispatch('intel:summarize', {}); engineRef.current?.commandBus.dispatch('intel:detectTables', {}); setTimeout(syncPlugins, 20); }}><I.Brain /> Re-Analyse</Btn>
                </div>
                {/* Classification */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: C.muted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Document Classification</div>
                  {intelState?.classifications.length
                    ? intelState.classifications.map((cl, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <div style={{ flex: 1, height: 6, background: C.border, borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${cl.confidence * 100}%`, height: '100%', background: `hsl(${220 - i * 30},70%,55%)`, borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 10, color: C.fg, width: 70 }}>{cl.documentClass}</span>
                        <span style={{ fontSize: 10, color: C.muted, width: 30, textAlign: 'right' }}>{Math.round(cl.confidence * 100)}%</span>
                      </div>
                    ))
                    : <div style={{ color: C.muted, fontSize: 11 }}>Analysing…</div>
                  }
                </div>
                {/* Summary */}
                {intelState?.summary && (
                  <div style={{ marginBottom: 10, padding: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 6, border: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 10, color: C.muted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Summary</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.fg, marginBottom: 4 }}>{intelState.summary.title}</div>
                    <div style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.5 }}>{intelState.summary.description}</div>
                    {intelState.summary.keyPoints.length > 0 && (
                      <ul style={{ margin: '6px 0 0', padding: '0 0 0 14px', fontSize: 10 }}>
                        {intelState.summary.keyPoints.slice(0, 4).map((p, i) => <li key={i} style={{ color: C.muted, marginBottom: 2 }}>{p}</li>)}
                      </ul>
                    )}
                  </div>
                )}
                {/* Extracted fields */}
                {(intelState?.extractedFields ?? []).length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, color: C.muted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Extracted Fields ({intelState!.extractedFields.length})</div>
                    {intelState!.extractedFields.slice(0, 8).map((f, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, padding: '3px 0', borderBottom: `1px solid rgba(255,255,255,0.04)`, fontSize: 11 }}>
                        <span style={{ color: C.muted, width: 90, flexShrink: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{f.name}</span>
                        <span style={{ color: C.fg, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.value}</span>
                      </div>
                    ))}
                  </div>
                )}
                {/* Tables */}
                {(intelState?.tables ?? []).length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, color: C.muted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tables Detected ({intelState!.tables.length})</div>
                    {intelState!.tables.slice(0, 2).map((t, i) => (
                      <div key={i} style={{ marginBottom: 6, padding: 6, background: 'rgba(255,255,255,0.03)', borderRadius: 4, border: `1px solid ${C.border}`, fontSize: 10 }}>
                        <div style={{ color: C.muted }}>p{t.pageIndex + 1} · {t.rows.length} rows · {t.headerRow.length} cols · {Math.round(t.confidence * 100)}% conf</div>
                        {t.headerRow.length > 0 && <div style={{ color: C.fg, marginTop: 3 }}>{t.headerRow.slice(0, 3).join(' | ')}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Security Tab ── */}
            {activeTab === 'security' && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.accent, marginBottom: 8 }}>SECURITY & COMPLIANCE</div>
                {/* Encryption */}
                <div style={{ padding: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 6, border: `1px solid ${C.border}`, marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.fg, display: 'flex', alignItems: 'center', gap: 5 }}><I.Lock /> AES-256-GCM Encryption</div>
                    <button onClick={() => { setEncrypted(e => !e); addLog('encryption:toggle', encrypted ? 'disabled' : 'AES-256-GCM enabled'); }}
                      style={{ width: 40, height: 22, borderRadius: 11, border: 'none', background: encrypted ? '#22c55e' : '#374151', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                      <div style={{ position: 'absolute', top: 3, left: encrypted ? 20 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                    </button>
                  </div>
                  {encrypted && (
                    <div style={{ fontSize: 10, color: C.green, fontFamily: 'monospace' }}>
                      Algorithm: AES-256-GCM<br/>
                      Key Length: 256 bits<br/>
                      IV Length: 96 bits<br/>
                      Tag Length: 128 bits
                    </div>
                  )}
                  {!encrypted && <div style={{ fontSize: 10, color: C.muted }}>Toggle to enable AES-256-GCM document encryption</div>}
                </div>
                {/* Digital Signature */}
                <div style={{ padding: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 6, border: `1px solid ${C.border}`, marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.fg, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}><I.Shield /> Digital Signature (ECDSA P-256)</div>
                  <SignaturePad onSign={() => addLog('signature:applied', 'ECDSA P-256 signature captured')} />
                </div>
                {/* GDPR */}
                <div style={{ padding: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 6, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.fg, marginBottom: 8 }}>⚖ GDPR Compliance</div>
                  {[
                    ['Article 25', 'Privacy by Design', '✓', C.green],
                    ['Article 30', 'Data Inventory', piiMatches.length > 0 ? `⚠ ${piiMatches.length} items` : '✓', piiMatches.length > 0 ? C.yellow : C.green],
                    ['Article 32', 'Security Measures', encrypted ? 'AES-256' : '⚠ Off', encrypted ? C.green : C.yellow],
                    ['Article 35', 'DPIA Required', '→ Review', C.muted],
                  ].map(([art, label, val, color]) => (
                    <div key={art as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: `1px solid rgba(255,255,255,0.04)`, fontSize: 10.5 }}>
                      <span style={{ color: C.muted }}>{art} — {label}</span>
                      <span style={{ color: color as string, fontWeight: 600 }}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Status Bar ── */}
      <footer style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', height: 24, background: C.panel, borderTop: `1px solid ${C.border}`, flexShrink: 0, fontSize: 10.5, color: C.muted }}>
        <div style={{ display: 'flex', gap: 14, fontFamily: 'monospace' }}>
          <span>Page <strong style={{ color: C.fg }}>{currentPage + 1}/{pageCount}</strong></span>
          <span>Zoom <strong style={{ color: C.fg }}>{Math.round(zoom * 100)}%</strong></span>
          <span>Tool <strong style={{ color: C.fg }}>{toolMode}</strong></span>
          <span><strong style={{ color: C.fg }}>{annCount}</strong> ann{selIds.length > 0 ? <span style={{ color: C.accent }}> · {selIds.length} sel</span> : null}</span>
          <span>PII: <strong style={{ color: piiMatches.length > 0 ? C.red : C.green }}>{piiMatches.length}</strong></span>
          {topClass && <span>Class: <strong style={{ color: C.accent }}>{topClass.documentClass} {Math.round(topClass.confidence * 100)}%</strong></span>}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {log.length > 0 && <span style={{ fontFamily: 'monospace', fontSize: 10 }}>{log[0]!.ts} <span style={{ color: C.accent }}>{log[0]!.event}</span></span>}
          <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: C.green, boxShadow: `0 0 6px ${C.green}` }} />
          <span>Engine Ready · GridStorm v0.2.0</span>
        </div>
      </footer>
    </div>
  );
}
