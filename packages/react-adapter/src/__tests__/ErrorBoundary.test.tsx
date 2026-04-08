// ─── GridErrorBoundary Tests ──────────────────────────────────────────────────
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { GridErrorBoundary } from '../ErrorBoundary';

// ── Component that always throws on render ──────────────────────────────────
function Bomb({ shouldThrow }: { shouldThrow: boolean }): React.ReactElement {
  if (shouldThrow) {
    throw new Error('Test render error');
  }
  return <div data-testid="child">child content</div>;
}

// Suppress console.error noise from error boundary tests
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe('GridErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <GridErrorBoundary>
        <Bomb shouldThrow={false} />
      </GridErrorBoundary>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('child content')).toBeInTheDocument();
  });

  it('renders null (empty) when child throws and no fallback is provided', () => {
    const { container } = render(
      <GridErrorBoundary>
        <Bomb shouldThrow={true} />
      </GridErrorBoundary>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the fallback prop when child throws', () => {
    render(
      <GridErrorBoundary fallback={<div data-testid="fallback">Grid Error</div>}>
        <Bomb shouldThrow={true} />
      </GridErrorBoundary>,
    );
    expect(screen.getByTestId('fallback')).toBeInTheDocument();
    expect(screen.getByText('Grid Error')).toBeInTheDocument();
  });

  it('does not render children when fallback is shown', () => {
    render(
      <GridErrorBoundary fallback={<div data-testid="fallback">Error UI</div>}>
        <Bomb shouldThrow={true} />
      </GridErrorBoundary>,
    );
    expect(screen.queryByTestId('child')).not.toBeInTheDocument();
  });

  it('calls console.error with the error and component stack', () => {
    render(
      <GridErrorBoundary>
        <Bomb shouldThrow={true} />
      </GridErrorBoundary>,
    );
    expect(consoleErrorSpy).toHaveBeenCalled();
    // The first call includes the error message
    const firstCallArgs = consoleErrorSpy.mock.calls.find(
      (args) => String(args[1]).includes('Test render error'),
    );
    expect(firstCallArgs).toBeDefined();
  });

  it('getDerivedStateFromError returns hasError:true with the error', () => {
    const error = new Error('static test');
    const state = GridErrorBoundary.getDerivedStateFromError(error);
    expect(state.hasError).toBe(true);
    expect(state.error).toBe(error);
  });

  it('renders multiple children when no error', () => {
    render(
      <GridErrorBoundary>
        <span data-testid="a">A</span>
        <span data-testid="b">B</span>
      </GridErrorBoundary>,
    );
    expect(screen.getByTestId('a')).toBeInTheDocument();
    expect(screen.getByTestId('b')).toBeInTheDocument();
  });

  it('renders complex ReactNode fallback (not just text)', () => {
    const fallback = (
      <div data-testid="complex-fallback">
        <h2>Grid failed to load</h2>
        <p>Please refresh the page.</p>
      </div>
    );
    render(
      <GridErrorBoundary fallback={fallback}>
        <Bomb shouldThrow={true} />
      </GridErrorBoundary>,
    );
    expect(screen.getByTestId('complex-fallback')).toBeInTheDocument();
    expect(screen.getByText('Grid failed to load')).toBeInTheDocument();
    expect(screen.getByText('Please refresh the page.')).toBeInTheDocument();
  });
});
