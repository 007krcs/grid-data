import './GridSkeleton.css';

interface GridSkeletonProps {
  /** Number of columns to render */
  columns?: number;
  /** Number of body rows to render */
  rows?: number;
  /** Optional height override (default: 100%) */
  height?: string | number;
}

interface GridErrorProps {
  /** Error message to display */
  message?: string;
  /** Optional retry callback */
  onRetry?: () => void;
  /** Optional height override */
  height?: string | number;
}

interface GridEmptyProps {
  /** Custom empty message */
  message?: string;
  /** Optional height override */
  height?: string | number;
}

/**
 * Animated shimmer skeleton that matches GridStorm's visual structure.
 * Show while row data is being fetched / generated asynchronously.
 */
export function GridSkeleton({ columns = 5, rows = 8, height }: GridSkeletonProps) {
  const cellWidth = (row: number, col: number) =>
    `${48 + ((row * 13 + col * 7) % 40)}%`;

  return (
    <div className="gs-skeleton" style={height != null ? { height } : undefined}>
      <div className="gs-skeleton-header">
        {Array.from({ length: columns }, (_, c) => (
          <div key={c} className="gs-skeleton-cell gs-skeleton-header-cell">
            <div className="gs-shimmer gs-shimmer-header" style={{ width: cellWidth(0, c) }} />
          </div>
        ))}
      </div>
      <div className="gs-skeleton-body">
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="gs-skeleton-row">
            {Array.from({ length: columns }, (_, c) => (
              <div key={c} className="gs-skeleton-cell">
                <div className="gs-shimmer" style={{ width: cellWidth(r, c) }} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Error state for a grid — shows when data loading fails.
 */
export function GridError({
  message = 'Failed to load data. Please try again.',
  onRetry,
  height,
}: GridErrorProps) {
  return (
    <div className="gs-state-box gs-error-box" style={height != null ? { height } : undefined}>
      <div className="gs-state-icon gs-error-icon">⚠</div>
      <div className="gs-state-title">Something went wrong</div>
      <div className="gs-state-message">{message}</div>
      {onRetry && (
        <button className="gs-retry-btn" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

/**
 * Empty state for a grid — shows when data loads successfully but has 0 rows.
 */
export function GridEmpty({
  message = 'No data to display.',
  height,
}: GridEmptyProps) {
  return (
    <div className="gs-state-box gs-empty-box" style={height != null ? { height } : undefined}>
      <div className="gs-state-icon gs-empty-icon">▤</div>
      <div className="gs-state-title">No results</div>
      <div className="gs-state-message">{message}</div>
    </div>
  );
}
