import React from 'react';

export const iconPaths: Record<string, React.ReactNode> = {
  zap: React.createElement(React.Fragment, null,
    React.createElement('polygon', { points: '13 2 3 14 12 14 11 22 21 10 12 10 13 2' })
  ),

  puzzle: React.createElement(React.Fragment, null,
    React.createElement('path', {
      d: 'M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.61a2.404 2.404 0 0 1-1.705.707 2.402 2.402 0 0 1-1.704-.706l-1.568-1.568a1.026 1.026 0 0 0-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 1 1-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 0 0-.289-.877l-1.568-1.568A2.402 2.402 0 0 1 1.998 12c0-.617.236-1.234.706-1.704L4.315 8.685a.98.98 0 0 1 .837-.276c.47.07.802.48.968.925a2.501 2.501 0 1 0 3.214-3.214c-.446-.166-.855-.497-.925-.968a.979.979 0 0 1 .276-.837l1.61-1.61a2.404 2.404 0 0 1 1.705-.707c.617 0 1.234.236 1.704.706l1.568 1.568c.23.23.556.338.877.29.493-.074.84-.504 1.02-.968a2.5 2.5 0 1 1 3.237 3.237c-.464.18-.894.527-.967 1.02Z'
    })
  ),

  palette: React.createElement(React.Fragment, null,
    React.createElement('circle', { cx: '13.5', cy: '6.5', r: '.5' }),
    React.createElement('circle', { cx: '17.5', cy: '10.5', r: '.5' }),
    React.createElement('circle', { cx: '8.5', cy: '7.5', r: '.5' }),
    React.createElement('circle', { cx: '6.5', cy: '12.5', r: '.5' }),
    React.createElement('path', {
      d: 'M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2Z'
    })
  ),

  code: React.createElement(React.Fragment, null,
    React.createElement('polyline', { points: '16 18 22 12 16 6' }),
    React.createElement('polyline', { points: '8 6 2 12 8 18' })
  ),

  'file-pdf': React.createElement(React.Fragment, null,
    React.createElement('path', { d: 'M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z' }),
    React.createElement('polyline', { points: '14 2 14 8 20 8' }),
    React.createElement('path', { d: 'M10 12a1 1 0 0 0-1 1v1a1 1 0 0 0 2 0v-1a1 1 0 0 0-1-1Z' }),
    React.createElement('path', { d: 'M14 12a1 1 0 0 0-1 1v1a1 1 0 0 0 2 0v-1a1 1 0 0 0-1-1Z' })
  ),

  settings: React.createElement(React.Fragment, null,
    React.createElement('path', {
      d: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z'
    }),
    React.createElement('circle', { cx: '12', cy: '12', r: '3' })
  ),

  lock: React.createElement(React.Fragment, null,
    React.createElement('rect', { width: '18', height: '11', x: '3', y: '11', rx: '2', ry: '2' }),
    React.createElement('path', { d: 'M7 11V7a5 5 0 0 1 10 0v4' })
  ),

  save: React.createElement(React.Fragment, null,
    React.createElement('path', { d: 'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z' }),
    React.createElement('polyline', { points: '17 21 17 13 7 13 7 21' }),
    React.createElement('polyline', { points: '7 3 7 8 15 8' })
  ),

  search: React.createElement(React.Fragment, null,
    React.createElement('circle', { cx: '11', cy: '11', r: '8' }),
    React.createElement('line', { x1: '21', y1: '21', x2: '16.65', y2: '16.65' })
  ),

  edit: React.createElement(React.Fragment, null,
    React.createElement('path', { d: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' }),
    React.createElement('path', { d: 'M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' })
  ),

  'bar-chart': React.createElement(React.Fragment, null,
    React.createElement('line', { x1: '12', y1: '20', x2: '12', y2: '10' }),
    React.createElement('line', { x1: '18', y1: '20', x2: '18', y2: '4' }),
    React.createElement('line', { x1: '6', y1: '20', x2: '6', y2: '16' })
  ),

  move: React.createElement(React.Fragment, null,
    React.createElement('polyline', { points: '5 9 2 12 5 15' }),
    React.createElement('polyline', { points: '9 5 12 2 15 5' }),
    React.createElement('polyline', { points: '15 19 12 22 9 19' }),
    React.createElement('polyline', { points: '19 9 22 12 19 15' }),
    React.createElement('line', { x1: '2', y1: '12', x2: '22', y2: '12' }),
    React.createElement('line', { x1: '12', y1: '2', x2: '12', y2: '22' })
  ),

  rocket: React.createElement(React.Fragment, null,
    React.createElement('path', { d: 'M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z' }),
    React.createElement('path', { d: 'M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z' }),
    React.createElement('path', { d: 'M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0' }),
    React.createElement('path', { d: 'M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5' })
  ),

  globe: React.createElement(React.Fragment, null,
    React.createElement('circle', { cx: '12', cy: '12', r: '10' }),
    React.createElement('line', { x1: '2', y1: '12', x2: '22', y2: '12' }),
    React.createElement('path', { d: 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z' })
  ),

  layers: React.createElement(React.Fragment, null,
    React.createElement('polygon', { points: '12 2 2 7 12 12 22 7 12 2' }),
    React.createElement('polyline', { points: '2 17 12 22 22 17' }),
    React.createElement('polyline', { points: '2 12 12 17 22 12' })
  ),

  grid: React.createElement(React.Fragment, null,
    React.createElement('rect', { x: '3', y: '3', width: '7', height: '7' }),
    React.createElement('rect', { x: '14', y: '3', width: '7', height: '7' }),
    React.createElement('rect', { x: '14', y: '14', width: '7', height: '7' }),
    React.createElement('rect', { x: '3', y: '14', width: '7', height: '7' })
  ),

  'file-text': React.createElement(React.Fragment, null,
    React.createElement('path', { d: 'M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z' }),
    React.createElement('polyline', { points: '14 2 14 8 20 8' }),
    React.createElement('line', { x1: '16', y1: '13', x2: '8', y2: '13' }),
    React.createElement('line', { x1: '16', y1: '17', x2: '8', y2: '17' }),
    React.createElement('polyline', { points: '10 9 9 9 8 9' })
  ),

  sun: React.createElement(React.Fragment, null,
    React.createElement('circle', { cx: '12', cy: '12', r: '5' }),
    React.createElement('line', { x1: '12', y1: '1', x2: '12', y2: '3' }),
    React.createElement('line', { x1: '12', y1: '21', x2: '12', y2: '23' }),
    React.createElement('line', { x1: '4.22', y1: '4.22', x2: '5.64', y2: '5.64' }),
    React.createElement('line', { x1: '18.36', y1: '18.36', x2: '19.78', y2: '19.78' }),
    React.createElement('line', { x1: '1', y1: '12', x2: '3', y2: '12' }),
    React.createElement('line', { x1: '21', y1: '12', x2: '23', y2: '12' }),
    React.createElement('line', { x1: '4.22', y1: '19.78', x2: '5.64', y2: '18.36' }),
    React.createElement('line', { x1: '18.36', y1: '5.64', x2: '19.78', y2: '4.22' })
  ),

  moon: React.createElement(React.Fragment, null,
    React.createElement('path', { d: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z' })
  ),

  contrast: React.createElement(React.Fragment, null,
    React.createElement('circle', { cx: '12', cy: '12', r: '10' }),
    React.createElement('path', { d: 'M12 2a10 10 0 0 1 0 20Z' })
  ),

  github: React.createElement(React.Fragment, null,
    React.createElement('path', {
      d: 'M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4'
    }),
    React.createElement('path', { d: 'M9 18c-4.51 2-5-2-7-2' })
  ),

  'trending-up': React.createElement(React.Fragment, null,
    React.createElement('polyline', { points: '23 6 13.5 15.5 8.5 10.5 1 18' }),
    React.createElement('polyline', { points: '17 6 23 6 23 12' })
  ),

  terminal: React.createElement(React.Fragment, null,
    React.createElement('polyline', { points: '4 17 10 11 4 5' }),
    React.createElement('line', { x1: '12', y1: '19', x2: '20', y2: '19' })
  ),

  table: React.createElement(React.Fragment, null,
    React.createElement('path', { d: 'M12 3v18' }),
    React.createElement('rect', { width: '18', height: '18', x: '3', y: '3', rx: '2' }),
    React.createElement('path', { d: 'M3 9h18' }),
    React.createElement('path', { d: 'M3 15h18' })
  ),

  'chart-bar': React.createElement(React.Fragment, null,
    React.createElement('line', { x1: '12', y1: '20', x2: '12', y2: '10' }),
    React.createElement('line', { x1: '18', y1: '20', x2: '18', y2: '4' }),
    React.createElement('line', { x1: '6', y1: '20', x2: '6', y2: '16' })
  ),

  'chevron-down': React.createElement(React.Fragment, null,
    React.createElement('polyline', { points: '6 9 12 15 18 9' })
  ),

  'chevron-right': React.createElement(React.Fragment, null,
    React.createElement('polyline', { points: '9 18 15 12 9 6' })
  ),

  'external-link': React.createElement(React.Fragment, null,
    React.createElement('path', { d: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6' }),
    React.createElement('polyline', { points: '15 3 21 3 21 9' }),
    React.createElement('line', { x1: '10', y1: '14', x2: '21', y2: '3' })
  ),

  'book-open': React.createElement(React.Fragment, null,
    React.createElement('path', { d: 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z' }),
    React.createElement('path', { d: 'M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z' })
  ),

  play: React.createElement(React.Fragment, null,
    React.createElement('polygon', { points: '5 3 19 12 5 21 5 3' })
  ),

  cpu: React.createElement(React.Fragment, null,
    React.createElement('rect', { x: '4', y: '4', width: '16', height: '16', rx: '2', ry: '2' }),
    React.createElement('rect', { x: '9', y: '9', width: '6', height: '6' }),
    React.createElement('line', { x1: '9', y1: '1', x2: '9', y2: '4' }),
    React.createElement('line', { x1: '15', y1: '1', x2: '15', y2: '4' }),
    React.createElement('line', { x1: '9', y1: '20', x2: '9', y2: '23' }),
    React.createElement('line', { x1: '15', y1: '20', x2: '15', y2: '23' }),
    React.createElement('line', { x1: '20', y1: '9', x2: '23', y2: '9' }),
    React.createElement('line', { x1: '20', y1: '14', x2: '23', y2: '14' }),
    React.createElement('line', { x1: '1', y1: '9', x2: '4', y2: '9' }),
    React.createElement('line', { x1: '1', y1: '14', x2: '4', y2: '14' })
  ),

  check: React.createElement(React.Fragment, null,
    React.createElement('polyline', { points: '20 6 9 17 4 12' })
  ),

  'arrow-right': React.createElement(React.Fragment, null,
    React.createElement('line', { x1: '5', y1: '12', x2: '19', y2: '12' }),
    React.createElement('polyline', { points: '12 5 19 12 12 19' })
  ),

  menu: React.createElement(React.Fragment, null,
    React.createElement('line', { x1: '3', y1: '12', x2: '21', y2: '12' }),
    React.createElement('line', { x1: '3', y1: '6', x2: '21', y2: '6' }),
    React.createElement('line', { x1: '3', y1: '18', x2: '21', y2: '18' })
  ),

  x: React.createElement(React.Fragment, null,
    React.createElement('line', { x1: '18', y1: '6', x2: '6', y2: '18' }),
    React.createElement('line', { x1: '6', y1: '6', x2: '18', y2: '18' })
  ),

  shield: React.createElement(React.Fragment, null,
    React.createElement('path', { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' })
  ),

  users: React.createElement(React.Fragment, null,
    React.createElement('path', { d: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' }),
    React.createElement('circle', { cx: '9', cy: '7', r: '4' }),
    React.createElement('path', { d: 'M23 21v-2a4 4 0 0 0-3-3.87' }),
    React.createElement('path', { d: 'M16 3.13a4 4 0 0 1 0 7.75' })
  ),

  'heart-pulse': React.createElement(React.Fragment, null,
    React.createElement('path', { d: 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z' }),
    React.createElement('path', { d: 'M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27' })
  ),

  clock: React.createElement(React.Fragment, null,
    React.createElement('circle', { cx: '12', cy: '12', r: '10' }),
    React.createElement('polyline', { points: '12 6 12 12 16 14' })
  ),

  calculator: React.createElement(React.Fragment, null,
    React.createElement('rect', { x: '4', y: '2', width: '16', height: '20', rx: '2' }),
    React.createElement('line', { x1: '8', y1: '6', x2: '16', y2: '6' }),
    React.createElement('line', { x1: '8', y1: '10', x2: '8', y2: '10' }),
    React.createElement('line', { x1: '12', y1: '10', x2: '12', y2: '10' }),
    React.createElement('line', { x1: '16', y1: '10', x2: '16', y2: '10' }),
    React.createElement('line', { x1: '8', y1: '14', x2: '8', y2: '14' }),
    React.createElement('line', { x1: '12', y1: '14', x2: '12', y2: '14' }),
    React.createElement('line', { x1: '16', y1: '14', x2: '16', y2: '14' }),
    React.createElement('line', { x1: '8', y1: '18', x2: '16', y2: '18' })
  ),

  clipboard: React.createElement(React.Fragment, null,
    React.createElement('path', { d: 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2' }),
    React.createElement('rect', { x: '8', y: '2', width: '8', height: '4', rx: '1', ry: '1' })
  ),
};
