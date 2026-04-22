// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── XLSX Builder ───
// Generates Office Open XML Spreadsheet parts for true .xlsx format.
// Requires a ZIP utility (e.g., fflate, JSZip) to bundle into a .xlsx file.

export interface XlsxParts {
  '[Content_Types].xml': string;
  '_rels/.rels': string;
  'xl/workbook.xml': string;
  'xl/_rels/workbook.xml.rels': string;
  'xl/worksheets/sheet1.xml': string;
  'xl/styles.xml': string;
  'xl/sharedStrings.xml': string;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Build XLSX parts from headers and row data.
 * Returns an object where keys are file paths and values are XML content.
 * Use a ZIP library to bundle these into a .xlsx file.
 */
export function buildXlsxParts(
  headers: string[],
  rows: any[][],
): XlsxParts {
  // Shared strings table (deduplicates strings)
  const sharedStrings: string[] = [];
  const sharedStringIndex = new Map<string, number>();

  function getSharedStringIndex(str: string): number {
    const existing = sharedStringIndex.get(str);
    if (existing !== undefined) return existing;
    const idx = sharedStrings.length;
    sharedStrings.push(str);
    sharedStringIndex.set(str, idx);
    return idx;
  }

  // Build worksheet XML
  const sheetRows: string[] = [];

  // Header row
  const headerCells = headers.map((h, colIdx) => {
    const colRef = getColRef(colIdx);
    const ssIdx = getSharedStringIndex(h);
    return `<c r="${colRef}1" t="s" s="1"><v>${ssIdx}</v></c>`;
  });
  sheetRows.push(`<row r="1">${headerCells.join('')}</row>`);

  // Data rows
  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx]!;
    const rowNum = rowIdx + 2;
    const cells = row.map((val, colIdx) => {
      const colRef = getColRef(colIdx);
      const cellRef = `${colRef}${rowNum}`;

      if (val == null || val === '') {
        return `<c r="${cellRef}"><v></v></c>`;
      }
      if (typeof val === 'number' && !isNaN(val)) {
        return `<c r="${cellRef}"><v>${val}</v></c>`;
      }
      if (typeof val === 'boolean') {
        return `<c r="${cellRef}" t="b"><v>${val ? 1 : 0}</v></c>`;
      }
      // String value - use shared string
      const ssIdx = getSharedStringIndex(String(val));
      return `<c r="${cellRef}" t="s"><v>${ssIdx}</v></c>`;
    });
    sheetRows.push(`<row r="${rowNum}">${cells.join('')}</row>`);
  }

  const lastColRef = getColRef(headers.length - 1);
  const lastRowNum = rows.length + 1;
  const dimension = `A1:${lastColRef}${lastRowNum}`;

  return {
    '[Content_Types].xml': contentTypesXml(),
    '_rels/.rels': relsXml(),
    'xl/workbook.xml': workbookXml(),
    'xl/_rels/workbook.xml.rels': workbookRelsXml(),
    'xl/worksheets/sheet1.xml': worksheetXml(dimension, sheetRows),
    'xl/styles.xml': stylesXml(),
    'xl/sharedStrings.xml': sharedStringsXml(sharedStrings),
  };
}

function getColRef(index: number): string {
  let ref = '';
  let n = index;
  do {
    ref = String.fromCharCode(65 + (n % 26)) + ref;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return ref;
}

function contentTypesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`;
}

function relsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
}

function workbookXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Sheet1" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;
}

function workbookRelsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`;
}

function worksheetXml(dimension: string, rows: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="${dimension}"/>
  <sheetData>${rows.join('')}</sheetData>
</worksheet>`;
}

function stylesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><name val="Calibri"/></font>
  </fonts>
  <fills count="2">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
  </fills>
  <borders count="1">
    <border><left/><right/><top/><bottom/><diagonal/></border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="2">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
  </cellXfs>
</styleSheet>`;
}

function sharedStringsXml(strings: string[]): string {
  const items = strings.map(s => `<si><t>${escapeXml(s)}</t></si>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strings.length}" uniqueCount="${strings.length}">${items}</sst>`;
}
