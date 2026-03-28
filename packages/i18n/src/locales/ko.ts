import type { LocaleStrings } from '../types';

export const koStrings: LocaleStrings = {
  // Pagination
  page: '페이지',
  of: '/',
  to: '~',
  rows: '행',
  firstPage: '첫 페이지',
  previousPage: '이전 페이지',
  nextPage: '다음 페이지',
  lastPage: '마지막 페이지',

  // Filtering
  filterPlaceholder: '필터...',
  contains: '포함',
  notContains: '포함하지 않음',
  equals: '같음',
  notEquals: '같지 않음',
  startsWith: '시작 문자',
  endsWith: '끝 문자',
  greaterThan: '보다 큼',
  lessThan: '보다 작음',
  greaterThanOrEqual: '크거나 같음',
  lessThanOrEqual: '작거나 같음',
  inRange: '범위 내',
  noFilter: '필터 없음',
  clearFilter: '필터 지우기',
  applyFilter: '필터 적용',

  // Selection
  selectAll: '모두 선택',
  deselectAll: '모두 해제',
  selectedRows: '선택된 행',

  // Sorting
  sortAscending: '오름차순 정렬',
  sortDescending: '내림차순 정렬',
  clearSort: '정렬 해제',

  // Column menu
  pinLeft: '왼쪽에 고정',
  pinRight: '오른쪽에 고정',
  unpin: '고정 해제',
  autosizeColumn: '열 너비 자동 조정',
  autosizeAllColumns: '모든 열 너비 자동 조정',
  resetColumns: '열 초기화',

  // Groups
  expand: '펼치기',
  collapse: '접기',
  expandAll: '모두 펼치기',
  collapseAll: '모두 접기',
  group: '그룹',

  // Editing
  copy: '복사',
  cut: '잘라내기',
  paste: '붙여넣기',

  // General
  loading: '로딩 중...',
  noRowsToShow: '표시할 행이 없습니다',
  search: '검색',

  // Accessibility
  ariaGridDescription: '데이터 그리드',
  ariaSortAscending: '오름차순 정렬됨',
  ariaSortDescending: '내림차순 정렬됨',
  ariaColumnMenu: '열 메뉴',
};
