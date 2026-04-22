// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
import type { LocaleStrings } from '../types';

export const jaStrings: LocaleStrings = {
  // Pagination
  page: 'ページ',
  of: '/',
  to: '~',
  rows: '行',
  firstPage: '最初のページ',
  previousPage: '前のページ',
  nextPage: '次のページ',
  lastPage: '最後のページ',

  // Filtering
  filterPlaceholder: 'フィルター...',
  contains: '含む',
  notContains: '含まない',
  equals: '等しい',
  notEquals: '等しくない',
  startsWith: 'で始まる',
  endsWith: 'で終わる',
  greaterThan: 'より大きい',
  lessThan: 'より小さい',
  greaterThanOrEqual: '以上',
  lessThanOrEqual: '以下',
  inRange: '範囲内',
  noFilter: 'フィルターなし',
  clearFilter: 'フィルターをクリア',
  applyFilter: 'フィルターを適用',

  // Selection
  selectAll: 'すべて選択',
  deselectAll: 'すべて選択解除',
  selectedRows: '選択した行',

  // Sorting
  sortAscending: '昇順で並べ替え',
  sortDescending: '降順で並べ替え',
  clearSort: '並べ替えを解除',

  // Column menu
  pinLeft: '左に固定',
  pinRight: '右に固定',
  unpin: '固定解除',
  autosizeColumn: '列幅を自動調整',
  autosizeAllColumns: 'すべての列幅を自動調整',
  resetColumns: '列をリセット',

  // Groups
  expand: '展開',
  collapse: '折りたたむ',
  expandAll: 'すべて展開',
  collapseAll: 'すべて折りたたむ',
  group: 'グループ',

  // Editing
  copy: 'コピー',
  cut: '切り取り',
  paste: '貼り付け',

  // General
  loading: '読み込み中...',
  noRowsToShow: '表示する行がありません',
  search: '検索',

  // Accessibility
  ariaGridDescription: 'データグリッド',
  ariaSortAscending: '昇順でソート済み',
  ariaSortDescending: '降順でソート済み',
  ariaColumnMenu: '列メニュー',
};
