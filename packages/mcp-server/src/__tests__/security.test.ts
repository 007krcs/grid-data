// © 2025 GridStorm / Tekivex — All Rights Reserved
// Tests for the MCP server's permission gate, input length cap, and audit
// hook. These cover the "fail closed" defaults documented in SECURITY.md.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMCPServer, handleToolCall } from '../index';
import { __resetExperimentalWarningForTests } from '../server';
import type { ToolCallEvent } from '../types';

beforeEach(() => {
  // The experimental warning is a module-level once-flag. Reset it between
  // tests so the "warning fires by default" / "warning suppressible" tests
  // are independent.
  __resetExperimentalWarningForTests();
});

describe('MCP permission gate', () => {
  it('rejects mutation tools by default (allowMutations=false)', async () => {
    const registry = createMCPServer({
      permissions: { suppressExperimentalWarning: true },
    });
    const result = await handleToolCall(registry, 'grid_create', {
      columns: [{ field: 'a' }],
      rowData: [],
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/mutation/i);
    expect(result.error).toMatch(/allowMutations/);
  });

  it('allows mutation tools when allowMutations=true', async () => {
    const registry = createMCPServer({
      permissions: {
        allowMutations: true,
        suppressExperimentalWarning: true,
      },
    });
    const result = await handleToolCall(registry, 'grid_create', {
      columns: [{ field: 'a' }],
      rowData: [{ a: 1 }],
    });
    expect(result.success).toBe(true);
  });

  it('allows export tools by default (allowExport=true)', async () => {
    const registry = createMCPServer({
      permissions: {
        allowMutations: true,
        suppressExperimentalWarning: true,
      },
    });
    await handleToolCall(registry, 'grid_create', {
      columns: [{ field: 'a' }],
      rowData: [{ a: 1 }],
    });
    const result = await handleToolCall(registry, 'grid_export_csv', {});
    expect(result.success).toBe(true);
  });

  it('rejects export tools when allowExport=false', async () => {
    const registry = createMCPServer({
      permissions: {
        allowMutations: true,
        allowExport: false,
        suppressExperimentalWarning: true,
      },
    });
    await handleToolCall(registry, 'grid_create', {
      columns: [{ field: 'a' }],
      rowData: [{ a: 1 }],
    });
    const result = await handleToolCall(registry, 'grid_export_csv', {});
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/export/i);
    expect(result.error).toMatch(/allowExport/);
  });

  it('always allows read tools regardless of permissions', async () => {
    // Even with everything locked down, reads should work.
    const registry = createMCPServer({
      permissions: {
        allowMutations: true, // need to create the grid first
        suppressExperimentalWarning: true,
      },
    });
    await handleToolCall(registry, 'grid_create', {
      columns: [{ field: 'a' }],
      rowData: [{ a: 1 }],
    });

    // Now build a read-only registry that shares no state — different
    // context, but we can still verify the gate accepts the read.
    const readOnly = createMCPServer({
      permissions: {
        allowMutations: false,
        allowExport: false,
        suppressExperimentalWarning: true,
      },
    });
    // grid_get_data needs a grid; without one it returns its own
    // "No grid created" error, not a permission error. Either way, it
    // shouldn't be rejected at the permission gate.
    const result = await handleToolCall(readOnly, 'grid_get_data', {});
    expect(result.error ?? '').not.toMatch(/permissions/);
  });
});

describe('MCP input length cap', () => {
  it('rejects strings longer than maxStringInput at the top level', async () => {
    const registry = createMCPServer({
      permissions: {
        allowMutations: true,
        maxStringInput: 100,
        suppressExperimentalWarning: true,
      },
    });
    const oversized = 'x'.repeat(101);
    const result = await handleToolCall(registry, 'grid_create', {
      columns: [{ field: 'a' }],
      gridId: oversized,
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/exceeding the configured maxStringInput/);
    expect(result.error).toContain('101');
  });

  it('rejects oversized strings buried in nested inputs', async () => {
    const registry = createMCPServer({
      permissions: {
        allowMutations: true,
        maxStringInput: 50,
        suppressExperimentalWarning: true,
      },
    });
    // The huge string is two levels deep inside rowData.
    const result = await handleToolCall(registry, 'grid_create', {
      columns: [{ field: 'a' }],
      rowData: [{ a: 'small' }, { a: 'y'.repeat(1000) }],
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/exceeding the configured maxStringInput/);
    expect(result.error).toMatch(/rowData/);
  });

  it('accepts strings exactly at the limit', async () => {
    const registry = createMCPServer({
      permissions: {
        allowMutations: true,
        maxStringInput: 10,
        suppressExperimentalWarning: true,
      },
    });
    const result = await handleToolCall(registry, 'grid_create', {
      columns: [{ field: 'abc' }],
      gridId: '1234567890', // exactly 10
    });
    expect(result.success).toBe(true);
  });
});

describe('MCP audit hook', () => {
  it('fires onToolCall for allowed reads', async () => {
    const events: ToolCallEvent[] = [];
    const registry = createMCPServer({
      permissions: {
        onToolCall: (e) => events.push(e),
        suppressExperimentalWarning: true,
      },
    });
    await handleToolCall(registry, 'grid_get_data', {});
    expect(events).toHaveLength(1);
    expect(events[0]!.tool).toBe('grid_get_data');
    expect(events[0]!.kind).toBe('read');
    expect(events[0]!.allowed).toBe(true);
  });

  it('fires onToolCall for denied mutations with a deny reason', async () => {
    const events: ToolCallEvent[] = [];
    const registry = createMCPServer({
      permissions: {
        onToolCall: (e) => events.push(e),
        suppressExperimentalWarning: true,
      },
    });
    await handleToolCall(registry, 'grid_create', {
      columns: [{ field: 'a' }],
    });
    expect(events).toHaveLength(1);
    expect(events[0]!.tool).toBe('grid_create');
    expect(events[0]!.kind).toBe('mutation');
    expect(events[0]!.allowed).toBe(false);
    expect(events[0]!.denyReason).toMatch(/mutation/i);
  });

  it('reports the input keys but not the values', async () => {
    const events: ToolCallEvent[] = [];
    const registry = createMCPServer({
      permissions: {
        onToolCall: (e) => events.push(e),
        suppressExperimentalWarning: true,
      },
    });
    await handleToolCall(registry, 'grid_get_data', {
      gridId: 'super-secret-id',
      page: 0,
    });
    expect(events[0]!.inputKeys.sort()).toEqual(['gridId', 'page']);
    // Belt-and-suspenders: the audit event must not leak the value itself.
    expect(JSON.stringify(events[0])).not.toContain('super-secret-id');
  });

  it('reports unknown tools', async () => {
    const events: ToolCallEvent[] = [];
    const registry = createMCPServer({
      permissions: {
        onToolCall: (e) => events.push(e),
        suppressExperimentalWarning: true,
      },
    });
    await handleToolCall(registry, 'does_not_exist', {});
    expect(events).toHaveLength(1);
    expect(events[0]!.allowed).toBe(false);
    expect(events[0]!.kind).toBe('unknown');
  });

  it('does not break the tool pipeline if the callback throws', async () => {
    const registry = createMCPServer({
      permissions: {
        allowMutations: true,
        onToolCall: () => {
          throw new Error('audit hook intentionally throws');
        },
        suppressExperimentalWarning: true,
      },
    });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await handleToolCall(registry, 'grid_create', {
      columns: [{ field: 'a' }],
      rowData: [{ a: 1 }],
    });
    expect(result.success).toBe(true);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

describe('MCP experimental warning', () => {
  it('prints by default on the first createMCPServer call', () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    createMCPServer();
    expect(consoleWarn).toHaveBeenCalled();
    const msg = consoleWarn.mock.calls[0]![0] as string;
    expect(msg).toMatch(/experimental/i);
    expect(msg).toMatch(/SECURITY\.md/);
    consoleWarn.mockRestore();
  });

  it('does not print when suppressExperimentalWarning=true', () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    createMCPServer({ permissions: { suppressExperimentalWarning: true } });
    expect(consoleWarn).not.toHaveBeenCalled();
    consoleWarn.mockRestore();
  });

  it('prints only once even across many createMCPServer calls', () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    createMCPServer();
    createMCPServer();
    createMCPServer();
    expect(consoleWarn).toHaveBeenCalledTimes(1);
    consoleWarn.mockRestore();
  });
});
