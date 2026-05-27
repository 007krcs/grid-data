// © 2025 GridStorm / Tekivex — All Rights Reserved
//
// Shared scaffolding for Storybook stories so each story stays focused on the
// feature it demonstrates, not on the mount/destroy plumbing.
//
// What this gives you:
//   • `mountGridStory()` — creates a container, builds an engine, mounts a
//     DomRenderer, and registers cleanup that fires when Storybook swaps the
//     story out. Returns the container HTMLElement (which is what the story
//     render fn must return).
//   • `Employee`, `Product`, `makeEmployees`, `makeProducts` — small fixtures
//     so stories don't repeat their own sample data.
//   • `formatCurrency` — convenience valueFormatter wrapper.

import { createGrid, type GridConfig, type GridEngine } from '@gridstorm/core';
import { DomRenderer } from '@gridstorm/dom-renderer';

// ─── Story scaffolding ──────────────────────────────────────────────────────

export interface MountGridOptions<TData> {
  config: GridConfig<TData>;
  /** Container CSS height. Default '400px'. */
  height?: string;
  /** Container CSS width. Default '100%'. */
  width?: string;
  /** Optional theme attribute applied to the container, e.g. 'dark'. */
  theme?: 'light' | 'dark' | 'high-contrast';
  /** Optional density attribute applied to the container. */
  density?: 'compact' | 'comfortable' | 'spacious';
  /** Optional hook to capture the engine for in-story interactivity. */
  onReady?: (engine: GridEngine<TData>) => void;
}

/**
 * Build a Storybook story container that hosts a GridStorm engine + DOM
 * renderer. The returned HTMLElement is what your story's render fn returns.
 *
 * Cleanup is registered via a MutationObserver that fires when Storybook
 * removes the container from the DOM (story swap or unmount), at which point
 * we destroy the renderer and engine and disconnect the observer. Without
 * this, every story switch leaks an engine + DOM tree.
 */
export function mountGridStory<TData>(opts: MountGridOptions<TData>): HTMLElement {
  const container = document.createElement('div');
  container.className = 'gs-root';
  container.style.width = opts.width ?? '100%';
  container.style.height = opts.height ?? '400px';
  if (opts.theme) container.setAttribute('data-theme', opts.theme);
  if (opts.density) container.setAttribute('data-density', opts.density);

  const engine = createGrid<TData>(opts.config);
  const renderer = new DomRenderer({ container, engine });

  // Mount on next frame so the container is attached to the DOM (Storybook
  // appends it after this function returns).
  requestAnimationFrame(() => {
    renderer.mount();
    opts.onReady?.(engine);
  });

  // Auto-cleanup when Storybook removes the container.
  const observer = new MutationObserver(() => {
    if (!document.body.contains(container)) {
      try { renderer.destroy(); } catch { /* idempotent */ }
      try { engine.destroy(); } catch { /* idempotent */ }
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  return container;
}

// ─── Fixtures ───────────────────────────────────────────────────────────────

export interface Employee {
  id: number;
  name: string;
  role: string;
  department: string;
  salary: number;
  city: string;
  active: boolean;
  joinedAt: string;
  rating: number;
}

const ROLES = ['Engineer', 'Designer', 'Product Manager', 'QA Lead', 'DevOps', 'Sales', 'Support', 'Director'];
const DEPARTMENTS = ['Engineering', 'Design', 'Product', 'Operations', 'Sales', 'Customer Success'];
const CITIES = ['New York', 'London', 'Berlin', 'Tokyo', 'Sydney', 'Toronto', 'Mumbai', 'São Paulo', 'Singapore', 'Austin'];
const FIRST = ['Alice', 'Bob', 'Carol', 'David', 'Eve', 'Frank', 'Grace', 'Hank', 'Ivy', 'Jack', 'Kara', 'Leo', 'Maya', 'Nate', 'Olga', 'Paul', 'Quinn', 'Rita', 'Sam', 'Tina'];
const LAST = ['Smith', 'Johnson', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson'];

/** Deterministic pseudo-random so stories with the same row count look stable. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x1_0000_0000;
  };
}

export function makeEmployees(count: number, seed = 42): Employee[] {
  const rnd = seeded(seed);
  const out: Employee[] = [];
  for (let i = 0; i < count; i++) {
    const fn = FIRST[Math.floor(rnd() * FIRST.length)]!;
    const ln = LAST[Math.floor(rnd() * LAST.length)]!;
    const baseDate = new Date(2018, 0, 1).getTime();
    const span = new Date(2025, 11, 31).getTime() - baseDate;
    const joinedAt = new Date(baseDate + rnd() * span).toISOString().slice(0, 10);
    out.push({
      id: i + 1,
      name: `${fn} ${ln}`,
      role: ROLES[Math.floor(rnd() * ROLES.length)]!,
      department: DEPARTMENTS[Math.floor(rnd() * DEPARTMENTS.length)]!,
      salary: Math.round(50_000 + rnd() * 200_000),
      city: CITIES[Math.floor(rnd() * CITIES.length)]!,
      active: rnd() > 0.15,
      joinedAt,
      rating: Math.round((1 + rnd() * 4) * 10) / 10,
    });
  }
  return out;
}

export interface Product {
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  rating: number;
}

const CATEGORIES = ['Electronics', 'Apparel', 'Home', 'Books', 'Toys', 'Outdoor', 'Beauty'];
const PRODUCT_NAMES = ['Quantum', 'Aurora', 'Vertex', 'Helix', 'Nimbus', 'Photon', 'Echo', 'Vortex', 'Cipher', 'Lumen'];

export function makeProducts(count: number, seed = 7): Product[] {
  const rnd = seeded(seed);
  const out: Product[] = [];
  for (let i = 0; i < count; i++) {
    const name = `${PRODUCT_NAMES[Math.floor(rnd() * PRODUCT_NAMES.length)]} ${Math.floor(rnd() * 9000) + 1000}`;
    out.push({
      sku: `SKU-${(i + 1).toString().padStart(6, '0')}`,
      name,
      category: CATEGORIES[Math.floor(rnd() * CATEGORIES.length)]!,
      price: Math.round(rnd() * 50000) / 100, // $0.00 – $500.00
      stock: Math.floor(rnd() * 1000),
      rating: Math.round((1 + rnd() * 4) * 10) / 10,
    });
  }
  return out;
}

// ─── Value formatters ──────────────────────────────────────────────────────

export const formatCurrency = (params: { value: unknown }): string =>
  typeof params.value === 'number'
    ? params.value.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
    : String(params.value ?? '');

export const formatNumber = (params: { value: unknown }): string =>
  typeof params.value === 'number' ? params.value.toLocaleString() : String(params.value ?? '');

export const formatBool = (params: { value: unknown }): string =>
  params.value ? 'Yes' : 'No';
