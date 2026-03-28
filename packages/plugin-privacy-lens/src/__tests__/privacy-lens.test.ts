import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrivacyLensPlugin, getMaskedValue } from '../privacy-lens-plugin';
import type { PrivacyColumnConfig, PrivacyDataMap, PrivacyAuditEntry } from '../types';

function createMockContext() {
  const handlers = new Map<string, (payload: unknown) => void>();
  const eventListeners = new Map<string, Array<(payload: unknown) => void>>();
  const ctx = {
    api: {
      getSortModel: vi.fn().mockReturnValue([]),
      setSortModel: vi.fn(),
      getFilterModel: vi.fn().mockReturnValue({}),
      setFilterModel: vi.fn(),
      setQuickFilter: vi.fn(),
      getRowNode: vi.fn(),
      forEachNode: vi.fn(),
      getAllColumns: vi.fn().mockReturnValue([]),
      getState: vi.fn().mockReturnValue({ quickFilterText: '', pluginState: {} }),
      getSelectedRows: vi.fn().mockReturnValue([]),
      setColumnVisible: vi.fn(),
      moveColumn: vi.fn(),
      dispatchCommand: vi.fn(),
    } as unknown as import('@gridstorm/core').GridApi,
    commandBus: {
      registerHandler: vi.fn((type: string, handler: (p: unknown) => void) => {
        handlers.set(type, handler);
        return () => handlers.delete(type);
      }),
      dispatch: vi.fn((type: string, payload: unknown) => {
        handlers.get(type)?.(payload);
      }),
    } as unknown,
    eventBus: {
      on: vi.fn((event: string, listener: (p: unknown) => void) => {
        if (!eventListeners.has(event)) eventListeners.set(event, []);
        eventListeners.get(event)!.push(listener);
        return () => {
          const arr = eventListeners.get(event) ?? [];
          const idx = arr.indexOf(listener);
          if (idx >= 0) arr.splice(idx, 1);
        };
      }),
      emit: vi.fn((event: string, payload: unknown) => {
        for (const l of eventListeners.get(event) ?? []) l(payload);
      }),
    } as unknown,
    registerState: vi.fn(),
    getState: vi.fn().mockReturnValue(undefined),
    setState: vi.fn(),
    registerCellRenderer: vi.fn(),
    registerCellEditor: vi.fn(),
  } as unknown as import('@gridstorm/core').PluginContext;
  return {
    ctx,
    triggerCommand: (type: string, payload: unknown) => handlers.get(type)?.(payload),
    triggerEvent: (event: string, payload: unknown) => {
      for (const l of eventListeners.get(event) ?? []) l(payload);
    },
  };
}

describe('PrivacyLensPlugin', () => {
  let mock: ReturnType<typeof createMockContext>;

  beforeEach(() => {
    mock = createMockContext();
  });

  it('installs without errors', () => {
    const plugin = PrivacyLensPlugin();
    expect(() => plugin.install(mock.ctx)).not.toThrow();
  });

  it('email pattern detected correctly', () => {
    const emailValues = ['user@example.com', 'admin@test.org', 'foo.bar@baz.io'];
    const api = mock.ctx.api as unknown as {
      getAllColumns: ReturnType<typeof vi.fn>;
      forEachNode: ReturnType<typeof vi.fn>;
    };
    api.getAllColumns.mockReturnValue([{ field: 'email' }]);
    api.forEachNode.mockImplementation((cb: (node: unknown) => void) => {
      emailValues.forEach((v) => cb({ data: { email: v } }));
    });

    const detectedListener = vi.fn();
    (mock.ctx.eventBus as unknown as { on: (e: string, l: (p: unknown) => void) => () => void }).on(
      'privacy:pii-detected',
      detectedListener,
    );

    const plugin = PrivacyLensPlugin({ autoDetect: false });
    plugin.install(mock.ctx);
    mock.triggerCommand('privacy:scan-column', { columnId: 'email' });

    expect(detectedListener).toHaveBeenCalled();
    const detection = detectedListener.mock.calls[0]![0] as { columnId: string; piiCategories: string[] };
    expect(detection.piiCategories).toContain('email');
  });

  it('phone pattern detected correctly', () => {
    const phoneValues = ['555-123-4567', '(555) 987-6543', '5551234567'];
    const api = mock.ctx.api as unknown as {
      forEachNode: ReturnType<typeof vi.fn>;
    };
    api.forEachNode.mockImplementation((cb: (node: unknown) => void) => {
      phoneValues.forEach((v) => cb({ data: { phone: v } }));
    });

    const detectedListener = vi.fn();
    (mock.ctx.eventBus as unknown as { on: (e: string, l: (p: unknown) => void) => () => void }).on(
      'privacy:pii-detected',
      detectedListener,
    );

    const plugin = PrivacyLensPlugin({ autoDetect: false });
    plugin.install(mock.ctx);
    mock.triggerCommand('privacy:scan-column', { columnId: 'phone' });

    expect(detectedListener).toHaveBeenCalled();
    const detection = detectedListener.mock.calls[0]![0] as { piiCategories: string[] };
    expect(detection.piiCategories).toContain('phone');
  });

  it('SSN pattern detected correctly', () => {
    const ssnValues = ['123-45-6789', '987-65-4321', '111-22-3333'];
    const api = mock.ctx.api as unknown as {
      forEachNode: ReturnType<typeof vi.fn>;
    };
    api.forEachNode.mockImplementation((cb: (node: unknown) => void) => {
      ssnValues.forEach((v) => cb({ data: { ssn: v } }));
    });

    const detectedListener = vi.fn();
    (mock.ctx.eventBus as unknown as { on: (e: string, l: (p: unknown) => void) => () => void }).on(
      'privacy:pii-detected',
      detectedListener,
    );

    const plugin = PrivacyLensPlugin({ autoDetect: false });
    plugin.install(mock.ctx);
    mock.triggerCommand('privacy:scan-column', { columnId: 'ssn' });

    expect(detectedListener).toHaveBeenCalled();
    const detection = detectedListener.mock.calls[0]![0] as { piiCategories: string[] };
    expect(detection.piiCategories).toContain('ssn');
  });

  it('credit card pattern detected correctly', () => {
    // Visa numbers for testing
    const ccValues = ['4111111111111111', '4222222222222222', '4333333333333333'];
    const api = mock.ctx.api as unknown as {
      forEachNode: ReturnType<typeof vi.fn>;
    };
    api.forEachNode.mockImplementation((cb: (node: unknown) => void) => {
      ccValues.forEach((v) => cb({ data: { cc: v } }));
    });

    const detectedListener = vi.fn();
    (mock.ctx.eventBus as unknown as { on: (e: string, l: (p: unknown) => void) => () => void }).on(
      'privacy:pii-detected',
      detectedListener,
    );

    const plugin = PrivacyLensPlugin({ autoDetect: false });
    plugin.install(mock.ctx);
    mock.triggerCommand('privacy:scan-column', { columnId: 'cc' });

    expect(detectedListener).toHaveBeenCalled();
    const detection = detectedListener.mock.calls[0]![0] as { piiCategories: string[] };
    expect(detection.piiCategories).toContain('credit-card');
  });

  it('privacy:configure stores column config', () => {
    const plugin = PrivacyLensPlugin({ autoDetect: false });
    plugin.install(mock.ctx);

    const config: PrivacyColumnConfig = {
      columnId: 'email',
      piiCategories: ['email'],
      masked: true,
      revealPolicy: 'on-click',
      maskChar: '#',
      maskLength: 3,
    };

    // Should not throw
    expect(() => mock.triggerCommand('privacy:configure', config)).not.toThrow();
  });

  it('privacy:mask enables masking for column', () => {
    const maskedListener = vi.fn();
    (mock.ctx.eventBus as unknown as { on: (e: string, l: (p: unknown) => void) => () => void }).on(
      'privacy:column-masked',
      maskedListener,
    );

    const plugin = PrivacyLensPlugin({ autoDetect: false });
    plugin.install(mock.ctx);
    mock.triggerCommand('privacy:mask', { columnId: 'ssn' });

    expect(maskedListener).toHaveBeenCalledWith({ columnId: 'ssn' });
  });

  it('privacy:unmask disables masking', () => {
    const unmaskedListener = vi.fn();
    (mock.ctx.eventBus as unknown as { on: (e: string, l: (p: unknown) => void) => () => void }).on(
      'privacy:column-unmasked',
      unmaskedListener,
    );

    const plugin = PrivacyLensPlugin({ autoDetect: false });
    plugin.install(mock.ctx);

    // First mask, then unmask
    mock.triggerCommand('privacy:mask', { columnId: 'ssn' });
    mock.triggerCommand('privacy:unmask', { columnId: 'ssn' });

    expect(unmaskedListener).toHaveBeenCalledWith({ columnId: 'ssn' });
  });

  it('maskValue masks full string by default', () => {
    const config: PrivacyColumnConfig = {
      columnId: 'ssn',
      piiCategories: ['ssn'],
      masked: true,
      revealPolicy: 'on-click',
      maskChar: '*',
      maskLength: 0,
    };
    const result = getMaskedValue('123-45-6789', config);
    expect(result).toBe('********');
    expect(result).not.toContain('1');
    expect(result).not.toContain('6');
  });

  it('maskValue shows first N chars when maskLength > 0', () => {
    const config: PrivacyColumnConfig = {
      columnId: 'email',
      piiCategories: ['email'],
      masked: true,
      revealPolicy: 'on-click',
      maskChar: '*',
      maskLength: 4,
    };
    const result = getMaskedValue('user@example.com', config);
    expect(result.startsWith('user')).toBe(true);
    expect(result).toContain('*');
  });

  it('privacy:reveal-cell logs audit entry', () => {
    const revealedListener = vi.fn();
    (mock.ctx.eventBus as unknown as { on: (e: string, l: (p: unknown) => void) => () => void }).on(
      'privacy:cell-revealed',
      revealedListener,
    );

    const plugin = PrivacyLensPlugin({ autoDetect: false, auditLog: true });
    plugin.install(mock.ctx);

    mock.triggerCommand('privacy:reveal-cell', {
      columnId: 'ssn',
      rowId: 'row-1',
      userId: 'user-123',
    });

    expect(revealedListener).toHaveBeenCalled();
    const entry = revealedListener.mock.calls[0]![0] as PrivacyAuditEntry;
    expect(entry.columnId).toBe('ssn');
    expect(entry.rowId).toBe('row-1');
    expect(entry.userId).toBe('user-123');
    expect(entry.action).toBe('revealed');
    expect(entry.timestamp).toBeGreaterThan(0);
  });

  it('privacy:export-map emits PrivacyDataMap', () => {
    const mapListener = vi.fn();
    (mock.ctx.eventBus as unknown as { on: (e: string, l: (p: unknown) => void) => () => void }).on(
      'privacy:map-exported',
      mapListener,
    );

    const api = mock.ctx.api as unknown as {
      forEachNode: ReturnType<typeof vi.fn>;
    };
    api.forEachNode.mockImplementation((_cb: (node: unknown) => void) => {
      // no rows for simplicity
    });

    const plugin = PrivacyLensPlugin({
      autoDetect: false,
      columns: [
        {
          columnId: 'email',
          piiCategories: ['email'],
          masked: true,
          revealPolicy: 'on-click',
        },
      ],
    });
    plugin.install(mock.ctx);
    mock.triggerCommand('privacy:export-map', {});

    expect(mapListener).toHaveBeenCalled();
    const dataMap = mapListener.mock.calls[0]![0] as PrivacyDataMap;
    expect(dataMap.columns).toBeDefined();
    expect(dataMap.generatedAt).toBeGreaterThan(0);
    expect(typeof dataMap.totalPiiColumns).toBe('number');
    expect(typeof dataMap.totalPiiCells).toBe('number');
  });

  it('privacy:get-audit emits audit log', () => {
    const auditListener = vi.fn();
    (mock.ctx.eventBus as unknown as { on: (e: string, l: (p: unknown) => void) => () => void }).on(
      'privacy:audit-listed',
      auditListener,
    );

    const plugin = PrivacyLensPlugin({ autoDetect: false, auditLog: true });
    plugin.install(mock.ctx);

    mock.triggerCommand('privacy:reveal-cell', { columnId: 'ssn', rowId: 'row-1' });
    mock.triggerCommand('privacy:get-audit', {});

    expect(auditListener).toHaveBeenCalled();
    const result = auditListener.mock.calls[0]![0] as { entries: PrivacyAuditEntry[] };
    expect(result.entries).toBeDefined();
    expect(Array.isArray(result.entries)).toBe(true);
    expect(result.entries.length).toBeGreaterThan(0);
    expect(result.entries[0]!.action).toBe('revealed');
  });

  it('autoDetect option triggers scan on data:changed', () => {
    const detectedListener = vi.fn();
    (mock.ctx.eventBus as unknown as { on: (e: string, l: (p: unknown) => void) => () => void }).on(
      'privacy:pii-detected',
      detectedListener,
    );

    const api = mock.ctx.api as unknown as {
      getAllColumns: ReturnType<typeof vi.fn>;
      forEachNode: ReturnType<typeof vi.fn>;
    };
    api.getAllColumns.mockReturnValue([{ field: 'email' }]);
    api.forEachNode.mockImplementation((cb: (node: unknown) => void) => {
      ['user@example.com', 'admin@test.org', 'foo@bar.io'].forEach((v) =>
        cb({ data: { email: v } }),
      );
    });

    const plugin = PrivacyLensPlugin({ autoDetect: true });
    plugin.install(mock.ctx);

    // Trigger data:changed
    mock.triggerEvent('data:changed', {});

    expect(detectedListener).toHaveBeenCalled();
  });
});
