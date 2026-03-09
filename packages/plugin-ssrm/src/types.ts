// ─── Server-Side Row Model Types ───

export interface SSRMPluginOptions {
  /** Data source for fetching rows from server */
  dataSource: ServerDataSource;
  /** Number of rows to fetch per block. Default: 100 */
  blockSize?: number;
  /** Maximum number of blocks to cache. Default: 10 */
  maxBlocks?: number;
  /** Show loading overlay while fetching. Default: true */
  showLoading?: boolean;
}

export interface ServerDataSource {
  /** Fetch a block of rows from the server */
  getRows(params: ServerRequest): Promise<ServerResult>;
  /** Optional: called when the data source is no longer needed */
  destroy?(): void;
}

export interface ServerRequest {
  /** Starting row index */
  startRow: number;
  /** Ending row index (exclusive) */
  endRow: number;
  /** Current sort model */
  sortModel: Array<{ colId: string; sort: 'asc' | 'desc' }>;
  /** Current filter model */
  filterModel: Record<string, any>;
  /** Group keys for grouped data */
  groupKeys: string[];
}

export interface ServerResult {
  /** The fetched row data */
  rowData: any[];
  /** Total row count (if known, for scroll sizing) */
  rowCount?: number;
  /** Whether there are more rows to fetch */
  lastRow?: number;
}

export interface BlockState {
  startRow: number;
  endRow: number;
  status: 'loading' | 'loaded' | 'failed';
  data: any[];
  lastAccessed: number;
}
