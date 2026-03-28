import { describe, it, expect } from 'vitest';
import { GridStormComponent } from '../gridstorm.component';
import { GridStormService } from '../gridstorm.service';
import type { GridStormInputs, GridStormOutputs, GridRegistration } from '../types';

// ─── GridStormComponent Structure ───

describe('GridStormComponent', () => {
  it('can be instantiated', () => {
    const component = new GridStormComponent();
    expect(component).toBeDefined();
    expect(component).toBeInstanceOf(GridStormComponent);
  });

  it('has default values for columns and rowData inputs', () => {
    const component = new GridStormComponent();
    expect(component.columns).toEqual([]);
    expect(component.rowData).toEqual([]);
  });

  it('has default values for plugins', () => {
    const component = new GridStormComponent();
    expect(component.plugins).toEqual([]);
  });

  it('has default rowHeight of 40', () => {
    const component = new GridStormComponent();
    expect(component.rowHeight).toBe(40);
  });

  it('has default theme of light', () => {
    const component = new GridStormComponent();
    expect(component.theme).toBe('light');
  });

  it('has default density of normal', () => {
    const component = new GridStormComponent();
    expect(component.density).toBe('normal');
  });

  it('has optional inputs that default to undefined', () => {
    const component = new GridStormComponent();
    expect(component.getRowId).toBeUndefined();
    expect(component.defaultColDef).toBeUndefined();
    expect(component.paginationPageSize).toBeUndefined();
    expect(component.headerHeight).toBeUndefined();
    expect(component.domLayout).toBeUndefined();
    expect(component.rowSelection).toBeUndefined();
    expect(component.pagination).toBeUndefined();
    expect(component.ariaLabel).toBeUndefined();
  });

  it('allows setting input properties', () => {
    const component = new GridStormComponent();
    const testColumns = [{ field: 'name' }, { field: 'age' }];
    const testData = [{ name: 'Alice', age: 30 }];

    component.columns = testColumns as any;
    component.rowData = testData;
    component.rowHeight = 50;
    component.theme = 'dark';
    component.density = 'compact';

    expect(component.columns).toBe(testColumns);
    expect(component.rowData).toBe(testData);
    expect(component.rowHeight).toBe(50);
    expect(component.theme).toBe('dark');
    expect(component.density).toBe('compact');
  });

  it('has EventEmitter outputs', () => {
    const component = new GridStormComponent();
    // All output EventEmitters should be defined and have an emit method
    expect(component.gridReady).toBeDefined();
    expect(typeof component.gridReady.emit).toBe('function');

    expect(component.rowDataChanged).toBeDefined();
    expect(typeof component.rowDataChanged.emit).toBe('function');

    expect(component.selectionChanged).toBeDefined();
    expect(typeof component.selectionChanged.emit).toBe('function');

    expect(component.sortChanged).toBeDefined();
    expect(typeof component.sortChanged.emit).toBe('function');

    expect(component.filterChanged).toBeDefined();
    expect(typeof component.filterChanged.emit).toBe('function');

    expect(component.cellValueChanged).toBeDefined();
    expect(typeof component.cellValueChanged.emit).toBe('function');

    expect(component.cellClicked).toBeDefined();
    expect(typeof component.cellClicked.emit).toBe('function');

    expect(component.cellDoubleClicked).toBeDefined();
    expect(typeof component.cellDoubleClicked.emit).toBe('function');

    expect(component.rowClicked).toBeDefined();
    expect(typeof component.rowClicked.emit).toBe('function');

    expect(component.paginationChanged).toBeDefined();
    expect(typeof component.paginationChanged.emit).toBe('function');

    expect(component.columnResized).toBeDefined();
    expect(typeof component.columnResized.emit).toBe('function');
  });

  it('has getApi method that returns null before initialization', () => {
    const component = new GridStormComponent();
    expect(component.getApi()).toBeNull();
  });

  it('has getEngine method that returns null before initialization', () => {
    const component = new GridStormComponent();
    expect(component.getEngine()).toBeNull();
  });

  it('has lifecycle methods defined', () => {
    const component = new GridStormComponent();
    expect(typeof component.ngOnInit).toBe('function');
    expect(typeof component.ngOnDestroy).toBe('function');
    expect(typeof component.ngOnChanges).toBe('function');
  });

  it('ngOnChanges is safe to call before engine is initialized', () => {
    const component = new GridStormComponent();
    // Should not throw when engine is null
    expect(() => {
      component.ngOnChanges({
        rowData: {
          currentValue: [{ id: 1 }],
          previousValue: [],
          firstChange: false,
          isFirstChange: () => false,
        },
      });
    }).not.toThrow();
  });

  it('ngOnChanges ignores first change events', () => {
    const component = new GridStormComponent();
    // Should not throw even with firstChange=true
    expect(() => {
      component.ngOnChanges({
        rowData: {
          currentValue: [{ id: 1 }],
          previousValue: undefined,
          firstChange: true,
          isFirstChange: () => true,
        },
      });
    }).not.toThrow();
  });
});

// ─── GridStormService ───

describe('GridStormService', () => {
  it('can be instantiated', () => {
    const service = new GridStormService();
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(GridStormService);
  });

  it('starts with no registered APIs', () => {
    const service = new GridStormService();
    expect(service.getRegisteredIds()).toEqual([]);
  });

  it('registers and retrieves an API by id', () => {
    const service = new GridStormService();
    const mockApi = { getSelectedRows: () => [] } as any;

    service.registerApi('employees', mockApi);
    expect(service.getApi('employees')).toBe(mockApi);
  });

  it('returns undefined for unregistered ids', () => {
    const service = new GridStormService();
    expect(service.getApi('nonexistent')).toBeUndefined();
  });

  it('reports whether an API is registered via hasApi', () => {
    const service = new GridStormService();
    const mockApi = {} as any;

    expect(service.hasApi('grid1')).toBe(false);
    service.registerApi('grid1', mockApi);
    expect(service.hasApi('grid1')).toBe(true);
  });

  it('removes a registered API', () => {
    const service = new GridStormService();
    const mockApi = {} as any;

    service.registerApi('grid1', mockApi);
    expect(service.hasApi('grid1')).toBe(true);

    service.removeApi('grid1');
    expect(service.hasApi('grid1')).toBe(false);
    expect(service.getApi('grid1')).toBeUndefined();
  });

  it('removeApi is safe to call with unregistered id', () => {
    const service = new GridStormService();
    expect(() => service.removeApi('nonexistent')).not.toThrow();
  });

  it('lists all registered IDs', () => {
    const service = new GridStormService();
    const mockApi1 = {} as any;
    const mockApi2 = {} as any;

    service.registerApi('grid-a', mockApi1);
    service.registerApi('grid-b', mockApi2);

    const ids = service.getRegisteredIds();
    expect(ids).toContain('grid-a');
    expect(ids).toContain('grid-b');
    expect(ids).toHaveLength(2);
  });

  it('replaces an existing API when registering with the same id', () => {
    const service = new GridStormService();
    const mockApi1 = { version: 1 } as any;
    const mockApi2 = { version: 2 } as any;

    service.registerApi('grid', mockApi1);
    expect(service.getApi('grid')).toBe(mockApi1);

    service.registerApi('grid', mockApi2);
    expect(service.getApi('grid')).toBe(mockApi2);
    // Should still only be one entry
    expect(service.getRegisteredIds()).toHaveLength(1);
  });

  it('clears all registered APIs', () => {
    const service = new GridStormService();
    service.registerApi('a', {} as any);
    service.registerApi('b', {} as any);
    service.registerApi('c', {} as any);

    expect(service.getRegisteredIds()).toHaveLength(3);

    service.clear();
    expect(service.getRegisteredIds()).toHaveLength(0);
    expect(service.getApi('a')).toBeUndefined();
  });

  it('clear is safe to call when no APIs are registered', () => {
    const service = new GridStormService();
    expect(() => service.clear()).not.toThrow();
    expect(service.getRegisteredIds()).toEqual([]);
  });
});

// ─── Exported Types ───

describe('exported types', () => {
  it('GridStormInputs type is usable', () => {
    // Verify the type compiles and can be used in a type annotation
    const inputs: GridStormInputs = {
      columns: [],
      rowData: [],
      plugins: [],
      rowHeight: 40,
      theme: 'light',
      density: 'normal',
    };
    expect(inputs.columns).toEqual([]);
    expect(inputs.rowHeight).toBe(40);
    expect(inputs.theme).toBe('light');
  });

  it('GridStormInputs supports optional properties', () => {
    const inputs: GridStormInputs = {
      columns: [],
      rowData: [],
      plugins: [],
      rowHeight: 40,
      theme: 'light',
      density: 'normal',
      pagination: true,
      paginationPageSize: 25,
      headerHeight: 48,
      domLayout: 'autoHeight',
      rowSelection: 'multiple',
      ariaLabel: 'Data grid',
    };
    expect(inputs.pagination).toBe(true);
    expect(inputs.paginationPageSize).toBe(25);
    expect(inputs.domLayout).toBe('autoHeight');
    expect(inputs.rowSelection).toBe('multiple');
  });

  it('GridStormOutputs type is usable', () => {
    const outputs: Partial<GridStormOutputs> = {
      rowDataChanged: { rowData: [{ id: 1 }] },
      selectionChanged: { selectedNodes: [], source: 'api' },
      sortChanged: { sortModel: [] },
      filterChanged: { filterModel: {} },
      cellValueChanged: { node: null, colId: 'name', oldValue: 'a', newValue: 'b' },
    };
    expect(outputs.rowDataChanged?.rowData).toHaveLength(1);
    expect(outputs.selectionChanged?.source).toBe('api');
  });

  it('GridRegistration type is usable', () => {
    const reg: GridRegistration = {
      id: 'my-grid',
      api: {} as any,
    };
    expect(reg.id).toBe('my-grid');
    expect(reg.api).toBeDefined();
  });
});

// ─── Event Emission Mapping ───

describe('event emission mapping', () => {
  it('component has all expected event outputs for the documented core events', () => {
    const component = new GridStormComponent();
    // These correspond to the core event bus events bridged in setupEventBridge
    const expectedOutputs = [
      'gridReady',
      'rowDataChanged',
      'selectionChanged',
      'sortChanged',
      'filterChanged',
      'cellValueChanged',
      'cellClicked',
      'cellDoubleClicked',
      'rowClicked',
      'paginationChanged',
      'columnResized',
    ];

    for (const outputName of expectedOutputs) {
      const emitter = (component as any)[outputName];
      expect(emitter).toBeDefined();
      expect(typeof emitter.emit).toBe('function');
      expect(typeof emitter.subscribe).toBe('function');
    }
  });

  it('EventEmitters can be subscribed to and receive values', () => {
    const component = new GridStormComponent();
    const received: any[] = [];

    component.cellClicked.subscribe((val: any) => received.push(val));
    component.cellClicked.emit({ rowIndex: 0, colId: 'name' });

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({ rowIndex: 0, colId: 'name' });
  });
});

// ─── Cleanup on Destroy ───

describe('cleanup on destroy', () => {
  it('ngOnDestroy does not throw when called before initialization', () => {
    const component = new GridStormComponent();
    // Engine and renderer are null, should handle gracefully
    expect(() => component.ngOnDestroy()).not.toThrow();
  });

  it('getApi returns null after destroy is called', () => {
    const component = new GridStormComponent();
    // Even without initialization, calling destroy then getApi should be safe
    component.ngOnDestroy();
    expect(component.getApi()).toBeNull();
  });

  it('getEngine returns null after destroy is called', () => {
    const component = new GridStormComponent();
    component.ngOnDestroy();
    expect(component.getEngine()).toBeNull();
  });
});
