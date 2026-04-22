// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── @gridstorm/plugin-adaptive-renderer — Types ───

export type DeviceClass = 'mobile' | 'tablet' | 'desktop' | 'large-screen';
export type LayoutMode = 'normal' | 'compact' | 'card' | 'minimal' | 'print';

export interface DeviceProfile {
  deviceClass: DeviceClass;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  hasTouch: boolean;
  prefersReducedMotion: boolean;
  prefersColorScheme: 'light' | 'dark' | 'no-preference';
  prefersHighContrast: boolean;
  connectionSpeed: 'slow' | 'medium' | 'fast' | 'unknown';
}

export interface DataProfile {
  rowCount: number;
  columnCount: number;
  hasNumericColumns: boolean;
  hasLongTextColumns: boolean;
  estimatedCellCount: number;
}

export interface LayoutRecommendation {
  mode: LayoutMode;
  rowHeight: number;
  headerHeight: number;
  fontSize: number;
  showPagination: boolean;
  pageSize: number;
  virtualScrollThreshold: number;  // enable virtual scroll above this row count
  columnsToHideOnMobile: string[];
  reason: string;
  confidence: number;
}

export interface AdaptiveRendererOptions {
  autoApply?: boolean;   // apply recommendations automatically, default false
  breakpoints?: {
    mobile: number;    // default 640
    tablet: number;    // default 1024
    desktop: number;   // default 1440
  };
  onRecommendation?: (rec: LayoutRecommendation) => void;
  overrides?: Partial<LayoutRecommendation>;
}
