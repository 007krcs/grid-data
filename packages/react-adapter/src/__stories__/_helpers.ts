// © 2025 GridStorm / Tekivex — All Rights Reserved
//
// Sample data for the React adapter stories. Kept separate from the core
// Storybook helpers so the two configs don't have to share files.

export interface Employee {
  id: number;
  name: string;
  role: string;
  department: string;
  salary: number;
  city: string;
  active: boolean;
  rating: number;
}

const ROLES = ['Engineer', 'Designer', 'Product Manager', 'QA Lead', 'DevOps', 'Sales', 'Support'];
const DEPARTMENTS = ['Engineering', 'Design', 'Product', 'Operations', 'Sales', 'Customer Success'];
const CITIES = ['New York', 'London', 'Berlin', 'Tokyo', 'Sydney', 'Toronto', 'Mumbai', 'Austin'];
const FIRST = ['Alice', 'Bob', 'Carol', 'David', 'Eve', 'Frank', 'Grace', 'Hank', 'Ivy', 'Jack', 'Kara', 'Leo'];
const LAST = ['Smith', 'Johnson', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore'];

function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x1_0000_0000;
  };
}

export function makeEmployees(count: number, seed = 42): Employee[] {
  const rnd = seeded(seed);
  const out: Employee[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      id: i + 1,
      name: `${FIRST[Math.floor(rnd() * FIRST.length)]} ${LAST[Math.floor(rnd() * LAST.length)]}`,
      role: ROLES[Math.floor(rnd() * ROLES.length)]!,
      department: DEPARTMENTS[Math.floor(rnd() * DEPARTMENTS.length)]!,
      salary: Math.round(50_000 + rnd() * 200_000),
      city: CITIES[Math.floor(rnd() * CITIES.length)]!,
      active: rnd() > 0.15,
      rating: Math.round((1 + rnd() * 4) * 10) / 10,
    });
  }
  return out;
}

export const formatCurrency = (params: { value: unknown }): string =>
  typeof params.value === 'number'
    ? params.value.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
    : String(params.value ?? '');
