// ─── GridStorm Angular Component ───
// Standalone Angular component wrapping the headless core engine + DOM renderer.
// Uses ElementRef + ViewChild to mount the DomRenderer into the template container.

import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { createGrid } from '@gridstorm/core';
import { DomRenderer } from '@gridstorm/dom-renderer';
import type { GridConfig, GridApi, GridEngine, ColumnDef, GridPlugin } from '@gridstorm/core';

@Component({
  selector: 'gridstorm',
  standalone: true,
  template: `
    <div
      #gridContainer
      class="gridstorm-wrapper"
      [attr.data-theme]="theme"
      [attr.data-density]="density"
      style="width:100%;height:100%"
    ></div>
  `,
})
export class GridStormComponent implements OnInit, OnDestroy, OnChanges {
  // ── Inputs ──

  /** Column definitions describing each column's structure and behavior. */
  @Input() columns: ColumnDef[] = [];

  /** Client-side row data array. */
  @Input() rowData: any[] = [];

  /** Array of plugins to install during grid initialization. */
  @Input() plugins: GridPlugin[] = [];

  /** Callback to generate a unique string ID for each row. */
  @Input() getRowId?: (params: any) => string;

  /** Height of each data row in pixels. */
  @Input() rowHeight = 40;

  /** Theme identifier: 'light', 'dark', or custom theme name. */
  @Input() theme = 'light';

  /** Density mode: 'compact', 'normal', or 'comfortable'. */
  @Input() density = 'normal';

  /** Default column definition applied to all columns as fallback. */
  @Input() defaultColDef?: Partial<ColumnDef>;

  /** Number of rows per page when pagination is enabled. */
  @Input() paginationPageSize?: number;

  /** Height of the header row in pixels. */
  @Input() headerHeight?: number;

  /** Controls how the grid's DOM height is determined. */
  @Input() domLayout?: 'normal' | 'autoHeight' | 'print';

  /** Row selection mode: 'single', 'multiple', or false (disabled). */
  @Input() rowSelection?: 'single' | 'multiple' | false;

  /** When true, enables client-side pagination. */
  @Input() pagination?: boolean;

  /** ARIA label for the grid root element (screen reader accessibility). */
  @Input() ariaLabel?: string;

  // ── Outputs ──

  /** Emitted when the grid engine is fully initialized and the API is ready. */
  @Output() gridReady = new EventEmitter<GridApi>();

  /** Emitted when row data changes. */
  @Output() rowDataChanged = new EventEmitter<any>();

  /** Emitted when the selection state changes. */
  @Output() selectionChanged = new EventEmitter<any>();

  /** Emitted when the sort model changes. */
  @Output() sortChanged = new EventEmitter<any>();

  /** Emitted when the filter model changes. */
  @Output() filterChanged = new EventEmitter<any>();

  /** Emitted when a cell value is changed through editing. */
  @Output() cellValueChanged = new EventEmitter<any>();

  /** Emitted when a cell is clicked. */
  @Output() cellClicked = new EventEmitter<any>();

  /** Emitted when a cell is double-clicked. */
  @Output() cellDoubleClicked = new EventEmitter<any>();

  /** Emitted when a row is clicked. */
  @Output() rowClicked = new EventEmitter<any>();

  /** Emitted when pagination state changes. */
  @Output() paginationChanged = new EventEmitter<any>();

  /** Emitted when a column is resized. */
  @Output() columnResized = new EventEmitter<any>();

  // ── Template reference ──

  @ViewChild('gridContainer', { static: true })
  private gridContainerRef!: ElementRef<HTMLElement>;

  // ── Internal state ──

  private engine: GridEngine | null = null;
  private renderer: DomRenderer | null = null;
  private eventUnsubscribers: Array<() => void> = [];

  // ── Lifecycle ──

  ngOnInit(): void {
    this.initGrid();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.engine) return;

    // Sync rowData changes to the engine
    if (changes['rowData'] && !changes['rowData'].firstChange) {
      this.engine.api.setRowData(this.rowData);
    }

    // Sync column definition changes to the engine
    if (changes['columns'] && !changes['columns'].firstChange) {
      this.engine.api.setColumnDefs(this.columns);
    }

    // Sync pagination page size
    if (changes['paginationPageSize'] && !changes['paginationPageSize'].firstChange) {
      if (this.paginationPageSize != null) {
        this.engine.api.setGridOption('paginationPageSize', this.paginationPageSize);
      }
    }
  }

  ngOnDestroy(): void {
    this.destroyGrid();
  }

  // ── Public API ──

  /**
   * Returns the underlying GridApi instance, or null if the grid
   * has not been initialized yet.
   */
  getApi(): GridApi | null {
    return this.engine?.api ?? null;
  }

  /**
   * Returns the underlying GridEngine instance, or null if the grid
   * has not been initialized yet.
   */
  getEngine(): GridEngine | null {
    return this.engine;
  }

  // ── Initialization ──

  private initGrid(): void {
    const container = this.gridContainerRef.nativeElement;
    if (!container) return;

    // Build core config from inputs
    const config: GridConfig = {
      columns: this.columns,
      rowData: this.rowData,
      plugins: this.plugins,
      getRowId: this.getRowId,
      rowHeight: this.rowHeight,
      headerHeight: this.headerHeight,
      defaultColDef: this.defaultColDef,
      domLayout: this.domLayout,
      rowSelection: this.rowSelection,
      pagination: this.pagination,
      paginationPageSize: this.paginationPageSize,
      ariaLabel: this.ariaLabel,
      theme: this.theme,
    };

    // Create the headless grid engine
    this.engine = createGrid(config);

    // Create and mount the DOM renderer
    this.renderer = new DomRenderer({
      container,
      engine: this.engine,
    });
    this.renderer.mount();

    // Wire up event bridge: core events -> Angular EventEmitters
    this.setupEventBridge();

    // Emit gridReady
    this.gridReady.emit(this.engine.api);
  }

  private setupEventBridge(): void {
    if (!this.engine) return;

    const eb = this.engine.eventBus;

    this.eventUnsubscribers = [
      eb.on('rowData:changed', (e) => this.rowDataChanged.emit(e)),
      eb.on('selection:changed', (e) => this.selectionChanged.emit(e)),
      eb.on('column:sort:changed', (e) => this.sortChanged.emit(e)),
      eb.on('filter:changed', (e) => this.filterChanged.emit(e)),
      eb.on('cell:valueChanged', (e) => this.cellValueChanged.emit(e)),
      eb.on('cell:clicked', (e) => this.cellClicked.emit(e)),
      eb.on('cell:doubleClicked', (e) => this.cellDoubleClicked.emit(e)),
      eb.on('row:clicked', (e) => this.rowClicked.emit(e)),
      eb.on('pagination:changed', (e) => this.paginationChanged.emit(e)),
      eb.on('column:resized', (e) => this.columnResized.emit(e)),
    ];
  }

  private destroyGrid(): void {
    // Unsubscribe from all core events
    for (const unsub of this.eventUnsubscribers) {
      unsub();
    }
    this.eventUnsubscribers = [];

    // Destroy the DOM renderer
    if (this.renderer) {
      this.renderer.destroy();
      this.renderer = null;
    }

    // Destroy the grid engine
    if (this.engine) {
      this.engine.destroy();
      this.engine = null;
    }
  }
}
