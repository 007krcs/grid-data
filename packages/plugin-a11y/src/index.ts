// ─── @gridstorm/plugin-a11y — Public API ───

export { A11yPlugin } from './a11y-plugin';
export { createAnnouncer } from './announcer';
export { createFocusManager } from './focus-manager';
export { createSkipNav } from './skip-nav';
export { createHighContrastSupport } from './high-contrast';
export type {
  A11yPluginOptions,
  A11yState,
  AnnouncementType,
  AnnouncementContext,
} from './types';
