// ─── Benchmark Data Generators ───
// Generates deterministic test data at various row counts.
// Uses modular arithmetic instead of Math.random() for reproducibility.

export interface BenchRow {
  id: number;
  name: string;
  email: string;
  department: string;
  salary: number;
  age: number;
  city: string;
  country: string;
  joinDate: string;
  active: boolean;
}

// ── Data pools ──

const FIRST_NAMES = [
  'Alice', 'Bob', 'Charlie', 'Diana', 'Edward', 'Fiona', 'George', 'Hannah',
  'Ivan', 'Julia', 'Kevin', 'Laura', 'Michael', 'Nina', 'Oscar', 'Patricia',
  'Quinn', 'Rachel', 'Samuel', 'Teresa', 'Ulrich', 'Victoria', 'William', 'Xena',
  'Yuri', 'Zara', 'Adrian', 'Beatrice', 'Caleb', 'Denise', 'Ethan', 'Francesca',
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
  'Young',
];

const DEPARTMENTS = [
  'Engineering', 'Sales', 'Marketing', 'Finance', 'HR', 'Operations',
  'Legal', 'Support', 'Product', 'Design', 'Research', 'QA',
];

const CITIES = [
  'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia',
  'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville',
  'Fort Worth', 'Columbus', 'Charlotte', 'Indianapolis', 'San Francisco',
  'Seattle', 'Denver', 'Nashville', 'Portland', 'Memphis', 'Louisville', 'Baltimore',
];

const COUNTRIES = [
  'United States', 'Canada', 'United Kingdom', 'Germany', 'France', 'Australia',
  'Japan', 'Brazil', 'India', 'Mexico', 'Spain', 'Italy',
];

const EMAIL_DOMAINS = [
  'example.com', 'test.org', 'demo.io', 'company.net', 'acme.co',
  'corp.biz', 'enterprise.dev', 'global.tech',
];

/**
 * Generate a deterministic array of benchmark rows.
 *
 * All data is computed using modular arithmetic on the row index,
 * ensuring the same input count always produces the same output.
 */
export function generateRows(count: number): BenchRow[] {
  const rows: BenchRow[] = new Array(count);

  for (let i = 0; i < count; i++) {
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length]!;
    const lastName = LAST_NAMES[(i * 7 + 3) % LAST_NAMES.length]!;
    const domain = EMAIL_DOMAINS[(i * 3 + 1) % EMAIL_DOMAINS.length]!;

    // Deterministic salary between 30000 and 200000
    const salary = 30000 + ((i * 1597 + 51749) % 170001);

    // Deterministic age between 22 and 65
    const age = 22 + ((i * 31 + 17) % 44);

    // Deterministic join date between 2015-01-01 and 2024-12-31
    const yearOffset = (i * 13 + 5) % 10;
    const month = ((i * 7 + 2) % 12) + 1;
    const day = ((i * 11 + 3) % 28) + 1;
    const year = 2015 + yearOffset;
    const joinDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    rows[i] = {
      id: i + 1,
      name: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@${domain}`,
      department: DEPARTMENTS[i % DEPARTMENTS.length]!,
      salary,
      age,
      city: CITIES[(i * 5 + 11) % CITIES.length]!,
      country: COUNTRIES[(i * 3 + 7) % COUNTRIES.length]!,
      joinDate,
      active: i % 5 !== 0, // 80% active
    };
  }

  return rows;
}

/**
 * Standard row counts for benchmarking at increasing scale.
 */
export const ROW_COUNTS = [100, 1_000, 10_000, 50_000, 100_000] as const;

/**
 * Format a number with commas for display (e.g., 10000 -> "10,000").
 */
export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}
