// ─── @gridstorm/plugin-clipboard-pro — Public API ───

export { ClipboardProPlugin } from './clipboard-pro-plugin';
export { serializeRangeToTSV, serializeSelectedRowsToTSV, parseTSVAdvanced } from './range-serializer';
export { coerceValue, coerceGrid } from './type-coercion';
export { validatePastedValues } from './paste-validator';
export { snapshotBeforePaste, snapshotAfterPaste } from './undo-integration';
export type {
  ClipboardProPluginOptions,
  ClipboardProState,
  ProcessCellParams,
  PasteOperation,
  PastedCell,
  RejectedCell,
  CutRange,
} from './types';
