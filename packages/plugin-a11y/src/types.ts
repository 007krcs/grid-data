// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
export interface A11yPluginOptions {
  /** Enable screen reader announcements. Default: true */
  announcements?: boolean;
  /** Enable skip navigation links. Default: true */
  skipNav?: boolean;
  /** Enable high contrast support. Default: true */
  highContrast?: boolean;
  /** Custom announcement formatter */
  formatAnnouncement?: (type: AnnouncementType, context: AnnouncementContext) => string | null;
  /** Announcement politeness level. Default: 'polite' */
  politeness?: 'polite' | 'assertive';
  /** Debounce announcements (ms). Default: 150 */
  announceDebounce?: number;
}

export type AnnouncementType =
  | 'sort-changed'
  | 'filter-changed'
  | 'selection-changed'
  | 'cell-edit-started'
  | 'cell-edit-stopped'
  | 'cell-focused'
  | 'row-expanded'
  | 'row-collapsed'
  | 'page-changed'
  | 'data-loaded';

export interface AnnouncementContext {
  type: AnnouncementType;
  [key: string]: unknown;
}

export interface A11yState {
  announcementsEnabled: boolean;
  highContrastActive: boolean;
  lastAnnouncement: string;
  focusMode: 'navigate' | 'edit';
}
