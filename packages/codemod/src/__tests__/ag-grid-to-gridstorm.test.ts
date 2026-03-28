import { describe, it, expect } from 'vitest';
import { transformAgGridToGridStorm, TransformOutput } from '../transforms/ag-grid-to-gridstorm.js';

/**
 * Helper that runs the transform on a TSX source string and returns the result.
 */
function transform(source: string, filePath = 'test.tsx'): TransformOutput {
  return transformAgGridToGridStorm(source, filePath);
}

// ─── Import Rewriting ───

describe('import rewriting', () => {
  it('rewrites ag-grid-community to @gridstorm/core', () => {
    const source = `import { ColDef } from 'ag-grid-community';`;
    const result = transform(source);
    expect(result.code).toContain(`from '@gridstorm/core'`);
    expect(result.code).not.toContain('ag-grid-community');
  });

  it('rewrites ag-grid-react to @gridstorm/react', () => {
    const source = `import { AgGridReact } from 'ag-grid-react';`;
    const result = transform(source);
    expect(result.code).toContain(`from '@gridstorm/react'`);
    expect(result.code).not.toContain('ag-grid-react');
  });

  it('rewrites ag-grid-enterprise to @gridstorm/core', () => {
    const source = `import { GridApi } from 'ag-grid-enterprise';`;
    const result = transform(source);
    expect(result.code).toContain(`from '@gridstorm/core'`);
    expect(result.code).not.toContain('ag-grid-enterprise');
  });

  it('rewrites scoped @ag-grid-community/core to @gridstorm/core', () => {
    const source = `import { GridApi } from '@ag-grid-community/core';`;
    const result = transform(source);
    expect(result.code).toContain(`from '@gridstorm/core'`);
    expect(result.code).not.toContain('@ag-grid-community/core');
  });

  it('rewrites scoped @ag-grid-community/react to @gridstorm/react', () => {
    const source = `import { AgGridReact } from '@ag-grid-community/react';`;
    const result = transform(source);
    expect(result.code).toContain(`from '@gridstorm/react'`);
    expect(result.code).not.toContain('@ag-grid-community/react');
  });

  it('rewrites enterprise scoped packages to correct gridstorm packages', () => {
    const source = `import { RowGroupingModule } from '@ag-grid-enterprise/row-grouping';`;
    const result = transform(source);
    expect(result.code).toContain('@gridstorm/plugin-grouping');
    expect(result.code).not.toContain('@ag-grid-enterprise/row-grouping');
  });

  it('records changes for each rewritten import', () => {
    const source = `import { ColDef } from 'ag-grid-community';`;
    const result = transform(source);
    expect(result.changes.length).toBeGreaterThan(0);
    expect(result.changes.some((c) => c.includes('Import'))).toBe(true);
  });
});

// ─── Named Export / Specifier Renaming ───

describe('named export renaming', () => {
  it('renames ColDef to ColumnDef', () => {
    const source = `import { ColDef } from 'ag-grid-community';`;
    const result = transform(source);
    expect(result.code).toContain('ColumnDef');
    expect(result.code).not.toMatch(/\bColDef\b/);
  });

  it('renames ColGroupDef to ColumnDef', () => {
    const source = `import { ColGroupDef } from 'ag-grid-community';`;
    const result = transform(source);
    expect(result.code).toContain('ColumnDef');
  });

  it('renames GridOptions to GridConfig', () => {
    const source = `import { GridOptions } from 'ag-grid-community';`;
    const result = transform(source);
    expect(result.code).toContain('GridConfig');
    expect(result.code).not.toMatch(/\bGridOptions\b/);
  });

  it('renames AgGridReact to GridStorm in import specifier', () => {
    const source = `import { AgGridReact } from 'ag-grid-react';`;
    const result = transform(source);
    expect(result.code).toContain('GridStorm');
  });

  it('renames ICellRendererParams to CellRendererProps', () => {
    const source = `import { ICellRendererParams } from 'ag-grid-community';`;
    const result = transform(source);
    expect(result.code).toContain('CellRendererProps');
    expect(result.code).not.toContain('ICellRendererParams');
  });

  it('keeps GridApi name unchanged but rewrites the package', () => {
    const source = `import { GridApi } from 'ag-grid-community';`;
    const result = transform(source);
    expect(result.code).toContain('GridApi');
    expect(result.code).toContain(`from '@gridstorm/core'`);
  });

  it('renames ColumnApi to GridApi', () => {
    const source = `import { ColumnApi } from 'ag-grid-community';`;
    const result = transform(source);
    // ColumnApi should become GridApi
    expect(result.code).toContain('GridApi');
    expect(result.code).not.toContain('ColumnApi');
  });
});

// ─── Component Renaming ───

describe('component renaming', () => {
  it('renames <AgGridReact> JSX to <GridStorm>', () => {
    const source = `
import React from 'react';
import { AgGridReact } from 'ag-grid-react';
export default function App() {
  return <AgGridReact columnDefs={[]} rowData={[]} />;
}`;
    const result = transform(source);
    expect(result.code).toContain('<GridStorm');
    expect(result.code).not.toContain('<AgGridReact');
  });

  it('renames closing </AgGridReact> tags', () => {
    const source = `
import React from 'react';
import { AgGridReact } from 'ag-grid-react';
export default function App() {
  return <AgGridReact columnDefs={[]}></AgGridReact>;
}`;
    const result = transform(source);
    expect(result.code).toContain('</GridStorm>');
    expect(result.code).not.toContain('</AgGridReact>');
  });

  it('renames AgGridColumn JSX identifiers', () => {
    const source = `
import React from 'react';
import { AgGridReact, AgGridColumn } from 'ag-grid-react';
export default function App() {
  return <AgGridReact><AgGridColumn field="name" /></AgGridReact>;
}`;
    const result = transform(source);
    expect(result.code).not.toContain('<AgGridColumn');
    expect(result.code).not.toContain('<AgGridReact');
  });

  it('renames AgGridReact identifiers in non-JSX positions', () => {
    const source = `
import { AgGridReact } from 'ag-grid-react';
const ref = React.useRef<AgGridReact>(null);
`;
    const result = transform(source, 'test.tsx');
    // The identifier in the type parameter should be renamed
    expect(result.code).toContain('GridStorm');
  });
});

// ─── Prop Renaming ───

describe('prop renaming', () => {
  it('renames columnDefs prop to columns', () => {
    const source = `
import React from 'react';
import { AgGridReact } from 'ag-grid-react';
export default function App() {
  return <AgGridReact columnDefs={cols} rowData={data} />;
}`;
    const result = transform(source);
    expect(result.code).toContain('columns={cols}');
    expect(result.code).not.toContain('columnDefs=');
  });

  it('renames modules prop to plugins', () => {
    const source = `
import React from 'react';
import { AgGridReact } from 'ag-grid-react';
export default function App() {
  return <AgGridReact modules={mods} rowData={data} />;
}`;
    const result = transform(source);
    expect(result.code).toContain('plugins={mods}');
    expect(result.code).not.toContain('modules=');
  });

  it('does not rename props that are unchanged between AG Grid and GridStorm', () => {
    const source = `
import React from 'react';
import { AgGridReact } from 'ag-grid-react';
export default function App() {
  return <AgGridReact rowData={data} rowHeight={40} pagination />;
}`;
    const result = transform(source);
    expect(result.code).toContain('rowData={data}');
    expect(result.code).toContain('rowHeight={40}');
    expect(result.code).toContain('pagination');
  });

  it('records changes for each renamed prop', () => {
    const source = `
import React from 'react';
import { AgGridReact } from 'ag-grid-react';
export default function App() {
  return <AgGridReact columnDefs={c} modules={m} />;
}`;
    const result = transform(source);
    const propChanges = result.changes.filter((c) => c.startsWith('Prop:'));
    expect(propChanges.length).toBe(2);
  });
});

// ─── Theme Class Conversion ───

describe('theme class conversion', () => {
  it('converts className="ag-theme-alpine" to data-theme="light" on AG Grid wrapper', () => {
    const source = `
import React from 'react';
import { AgGridReact } from 'ag-grid-react';
export default function App() {
  return <div className="ag-theme-alpine"><AgGridReact rowData={[]} /></div>;
}`;
    const result = transform(source);
    // Theme class should be converted to data-theme attribute
    expect(result.changes.some((c) => c.includes('Theme:'))).toBe(true);
  });

  it('converts className="ag-theme-alpine-dark" on AG Grid wrapper', () => {
    const source = `
import React from 'react';
import { AgGridReact } from 'ag-grid-react';
export default function App() {
  return <div className="ag-theme-alpine-dark"><AgGridReact rowData={[]} /></div>;
}`;
    const result = transform(source);
    expect(result.changes.some((c) => c.includes('Theme:') && c.includes('dark'))).toBe(true);
  });

  it('records theme conversion changes for ag-theme-balham', () => {
    const source = `
import React from 'react';
import { AgGridReact } from 'ag-grid-react';
export default function App() {
  return <div className="ag-theme-balham"><AgGridReact rowData={[]} /></div>;
}`;
    const result = transform(source);
    expect(result.changes.some((c) => c.includes('Theme:'))).toBe(true);
  });

  it('records theme conversion changes for ag-theme-material', () => {
    const source = `
import React from 'react';
import { AgGridReact } from 'ag-grid-react';
export default function App() {
  return <div className="ag-theme-material"><AgGridReact rowData={[]} /></div>;
}`;
    const result = transform(source);
    expect(result.changes.some((c) => c.includes('Theme:'))).toBe(true);
  });

  it('preserves remaining classes when theme class is mixed with others', () => {
    const source = `
import React from 'react';
import { AgGridReact } from 'ag-grid-react';
export default function App() {
  return <div className="ag-theme-alpine my-grid"><AgGridReact rowData={[]} /></div>;
}`;
    const result = transform(source);
    expect(result.code).toContain('my-grid');
    expect(result.changes.some((c) => c.includes('Theme:'))).toBe(true);
  });
});

// ─── CSS Import Replacement ───

describe('CSS import replacement', () => {
  it('removes AG Grid CSS imports and adds GridStorm theme import', () => {
    const source = `
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { AgGridReact } from 'ag-grid-react';
`;
    const result = transform(source);
    expect(result.code).not.toContain('ag-grid-community/styles/ag-grid.css');
    expect(result.code).not.toContain('ag-grid-community/styles/ag-theme-alpine.css');
    expect(result.code).toContain('@gridstorm/theme-default/dist/tokens.css');
  });

  it('does not duplicate GridStorm theme import if already present', () => {
    const source = `
import 'ag-grid-community/styles/ag-grid.css';
import '@gridstorm/theme-default/dist/tokens.css';
`;
    const result = transform(source);
    const matches = result.code.match(/@gridstorm\/theme-default\/dist\/tokens\.css/g);
    expect(matches?.length).toBe(1);
  });

  it('removes scoped AG Grid CSS imports', () => {
    const source = `
import '@ag-grid-community/styles/ag-grid.css';
import '@ag-grid-community/styles/ag-theme-alpine.css';
`;
    const result = transform(source);
    expect(result.code).not.toContain('@ag-grid-community/styles/');
    expect(result.code).toContain('@gridstorm/theme-default/dist/tokens.css');
  });
});

// ─── Type Reference Renaming ───

describe('type reference renaming', () => {
  it('renames ColDef type annotations to ColumnDef', () => {
    const source = `
import { ColDef } from 'ag-grid-community';
const columns: ColDef[] = [];
`;
    const result = transform(source, 'test.ts');
    expect(result.code).not.toMatch(/\bColDef\b/);
    expect(result.code).toContain('ColumnDef');
  });

  it('renames GridOptions type annotation to GridConfig', () => {
    const source = `
import { GridOptions } from 'ag-grid-community';
function setup(opts: GridOptions) {}
`;
    const result = transform(source, 'test.ts');
    expect(result.code).toContain('GridConfig');
    expect(result.code).not.toMatch(/\bGridOptions\b/);
  });
});

// ─── Module to Plugin Comments ───

describe('module to plugin comments', () => {
  it('adds TODO comment for RowGroupingModule usage', () => {
    const source = `
import { RowGroupingModule } from '@ag-grid-enterprise/row-grouping';
const modules = [RowGroupingModule];
`;
    const result = transform(source, 'test.ts');
    expect(result.changes.some((c) => c.includes('GroupingPlugin'))).toBe(true);
  });

  it('adds comment for modules with no plugin equivalent', () => {
    const source = `
import { ClientSideRowModelModule } from 'ag-grid-community';
const modules = [ClientSideRowModelModule];
`;
    const result = transform(source, 'test.ts');
    expect(result.changes.some((c) => c.includes('ClientSideRowModelModule'))).toBe(true);
  });
});

// ─── Edge Cases ───

describe('edge cases', () => {
  it('returns source unchanged when there are no AG Grid imports', () => {
    const source = `
import React from 'react';
export default function App() {
  return <div>Hello</div>;
}`;
    const result = transform(source);
    expect(result.changes).toHaveLength(0);
    // Source should be semantically unchanged (may differ in whitespace/quotes)
    expect(result.code).toContain('Hello');
  });

  it('handles already-migrated code gracefully (no double transforms)', () => {
    const source = `
import { GridStorm } from '@gridstorm/react';
import { ColumnDef } from '@gridstorm/core';
export default function App() {
  return <GridStorm columns={cols} rowData={data} />;
}`;
    const result = transform(source);
    // No AG Grid references should be introduced
    expect(result.code).not.toContain('ag-grid');
    expect(result.code).not.toContain('AgGrid');
    expect(result.code).toContain('@gridstorm/react');
    expect(result.code).toContain('@gridstorm/core');
  });

  it('handles mixed AG Grid and non-AG Grid imports', () => {
    const source = `
import React from 'react';
import lodash from 'lodash';
import { AgGridReact } from 'ag-grid-react';
import { ColDef } from 'ag-grid-community';
export default function App() {
  return <AgGridReact columnDefs={[]} rowData={[]} />;
}`;
    const result = transform(source);
    // Non-AG Grid imports should be untouched
    expect(result.code).toContain(`from 'react'`);
    expect(result.code).toContain(`from 'lodash'`);
    // AG Grid imports should be rewritten
    expect(result.code).toContain(`from '@gridstorm/react'`);
    expect(result.code).toContain(`from '@gridstorm/core'`);
  });

  it('handles files with no JSX (pure TypeScript)', () => {
    const source = `
import { ColDef, GridApi } from 'ag-grid-community';
export function getColumns(): ColDef[] {
  return [{ field: 'name' }];
}
`;
    const result = transform(source, 'utils.ts');
    expect(result.code).toContain('ColumnDef');
    expect(result.code).toContain('@gridstorm/core');
  });

  it('returns source unchanged for unparseable code', () => {
    const source = `this is not valid javascript {{{{`;
    const result = transform(source, 'bad.ts');
    expect(result.code).toBe(source);
    expect(result.changes).toHaveLength(0);
  });

  it('handles .jsx file extension with babel parser', () => {
    const source = `
import { AgGridReact } from 'ag-grid-react';
export default function App() {
  return <AgGridReact columnDefs={[]} rowData={[]} />;
}`;
    const result = transform(source, 'component.jsx');
    expect(result.code).toContain('GridStorm');
    expect(result.code).toContain('columns=');
  });

  it('handles multiple grid components in the same file', () => {
    const source = `
import React from 'react';
import { AgGridReact } from 'ag-grid-react';
export default function App() {
  return (
    <div>
      <AgGridReact columnDefs={cols1} rowData={data1} />
      <AgGridReact columnDefs={cols2} rowData={data2} />
    </div>
  );
}`;
    const result = transform(source);
    // Both should be renamed
    const gridStormCount = (result.code.match(/<GridStorm/g) || []).length;
    expect(gridStormCount).toBe(2);
    expect(result.code).not.toContain('<AgGridReact');
  });
});
