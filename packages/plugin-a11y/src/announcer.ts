import type { AnnouncementType, AnnouncementContext, A11yPluginOptions } from './types';

function defaultFormat(type: AnnouncementType, context: AnnouncementContext): string {
  switch (type) {
    case 'sort-changed':
      return `Sorted by ${context.columnName} ${context.direction}`;
    case 'filter-changed':
      return `Filter ${context.active ? 'applied' : 'cleared'}${context.columnName ? ` on ${context.columnName}` : ''}`;
    case 'selection-changed': {
      const count = context.count as number;
      return count === 0 ? 'Selection cleared' : `${count} row${count !== 1 ? 's' : ''} selected`;
    }
    case 'cell-edit-started':
      return `Editing cell in column ${context.columnName}, row ${context.rowIndex}`;
    case 'cell-edit-stopped':
      return `Finished editing cell in column ${context.columnName}`;
    case 'cell-focused':
      return `Cell focused: column ${context.columnName}, row ${context.rowIndex}`;
    case 'row-expanded':
      return `Group ${context.groupValue ?? ''} expanded`;
    case 'row-collapsed':
      return `Group ${context.groupValue ?? ''} collapsed`;
    case 'page-changed':
      return `Page ${context.page} of ${context.totalPages}`;
    case 'data-loaded':
      return `${context.rowCount} rows loaded`;
    default:
      return '';
  }
}

export interface Announcer {
  announce(type: AnnouncementType, context: AnnouncementContext): void;
  announceRaw(message: string): void;
  getLastAnnouncement(): string;
  destroy(): void;
}

export function createAnnouncer(rootEl: HTMLElement, options: A11yPluginOptions): Announcer {
  const liveRegion = rootEl.querySelector('[aria-live]') as HTMLElement | null;
  const debounceMs = options.announceDebounce ?? 150;
  const formatter = options.formatAnnouncement ?? defaultFormat;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastAnnouncement = '';

  function doAnnounce(message: string): void {
    if (!liveRegion || !message) return;
    // Clear first to ensure re-announcement of same text
    liveRegion.textContent = '';
    requestAnimationFrame(() => {
      liveRegion.textContent = message;
    });
    lastAnnouncement = message;
  }

  function announce(type: AnnouncementType, context: AnnouncementContext): void {
    const message = formatter(type, context);
    if (!message) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => doAnnounce(message), debounceMs);
  }

  function announceRaw(message: string): void {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => doAnnounce(message), debounceMs);
  }

  return {
    announce,
    announceRaw,
    getLastAnnouncement: () => lastAnnouncement,
    destroy() {
      if (timer) clearTimeout(timer);
    },
  };
}
