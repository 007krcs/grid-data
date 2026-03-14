// ─── Shared Data Generators for Cookbook Examples ───

// ── Employee Data ──

export interface Employee {
  id: number;
  name: string;
  department: string;
  role: string;
  salary: number;
  startDate: string;
  active: boolean;
  email: string;
  age: number;
  city: string;
  country: string;
  rating: number;
}

export const departments = [
  'Engineering', 'Marketing', 'Sales', 'Finance', 'HR',
  'Operations', 'Legal', 'Design', 'Product', 'Support',
];

export const roles = [
  'Manager', 'Senior Engineer', 'Engineer', 'Junior Engineer',
  'Analyst', 'Director', 'VP', 'Intern', 'Lead', 'Architect',
];

export const cities = [
  'New York', 'San Francisco', 'London', 'Berlin', 'Tokyo',
  'Sydney', 'Toronto', 'Paris', 'Singapore', 'Austin',
  'Seattle', 'Chicago', 'Mumbai', 'Dublin', 'Amsterdam',
];

export const countries = [
  'USA', 'UK', 'Germany', 'Japan', 'Australia',
  'Canada', 'France', 'Singapore', 'India', 'Netherlands',
];

const firstNames = [
  'Alice', 'Bob', 'Charlie', 'Diana', 'Edward',
  'Fiona', 'George', 'Hannah', 'Ivan', 'Julia',
  'Kevin', 'Laura', 'Michael', 'Nina', 'Oscar',
  'Patricia', 'Quinn', 'Rachel', 'Samuel', 'Tanya',
  'Uma', 'Victor', 'Wendy', 'Xavier', 'Yara', 'Zachary',
];

const lastNames = [
  'Anderson', 'Brown', 'Clark', 'Davis', 'Evans',
  'Foster', 'Garcia', 'Harris', 'Ibrahim', 'Jones',
  'Kim', 'Lee', 'Martinez', 'Nguyen', 'O\'Brien',
  'Patel', 'Quinn', 'Robinson', 'Smith', 'Taylor',
  'Ueda', 'Varma', 'Wilson', 'Xu', 'Yang', 'Zhang',
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateEmployees(count: number): Employee[] {
  const rand = seededRandom(42);
  const pick = <T>(arr: T[]) => arr[Math.floor(rand() * arr.length)];

  return Array.from({ length: count }, (_, i) => {
    const first = pick(firstNames);
    const last = pick(lastNames);
    const dept = pick(departments);
    const city = pick(cities);
    const countryIdx = Math.floor(rand() * countries.length);

    return {
      id: i + 1,
      name: `${first} ${last}`,
      department: dept,
      role: pick(roles),
      salary: Math.round(40000 + rand() * 160000),
      startDate: `${2015 + Math.floor(rand() * 10)}-${String(1 + Math.floor(rand() * 12)).padStart(2, '0')}-${String(1 + Math.floor(rand() * 28)).padStart(2, '0')}`,
      active: rand() > 0.15,
      email: `${first.toLowerCase()}.${last.toLowerCase()}@company.com`,
      age: 22 + Math.floor(rand() * 40),
      city,
      country: countries[countryIdx],
      rating: Math.round((1 + rand() * 4) * 10) / 10,
    };
  });
}

// ── Order Data ──

export interface Order {
  id: number;
  customer: string;
  product: string;
  quantity: number;
  price: number;
  status: string;
  date: string;
  region: string;
}

export const products = [
  'Laptop Pro', 'Wireless Mouse', 'Mechanical Keyboard', 'Monitor 4K',
  'USB-C Hub', 'Webcam HD', 'Headphones', 'Desk Lamp', 'Standing Desk',
  'Ergonomic Chair', 'External SSD', 'Tablet', 'Smartwatch', 'Power Bank',
];

export const statuses = [
  'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned',
];

const regions = [
  'North America', 'Europe', 'Asia Pacific', 'Latin America', 'Middle East',
];

const customerNames = [
  'Acme Corp', 'TechStart Inc', 'Global Systems', 'DataFlow LLC',
  'CloudBase', 'NetWorks Co', 'BrightPath', 'CoreLogic',
  'Pinnacle Group', 'Summit Labs', 'Quantum Ltd', 'Apex Digital',
];

export function generateOrders(count: number): Order[] {
  const rand = seededRandom(123);
  const pick = <T>(arr: T[]) => arr[Math.floor(rand() * arr.length)];

  return Array.from({ length: count }, (_, i) => {
    const product = pick(products);
    const basePrice =
      product.includes('Laptop') ? 999 + rand() * 1500 :
      product.includes('Monitor') ? 299 + rand() * 700 :
      product.includes('Desk') || product.includes('Chair') ? 199 + rand() * 800 :
      product.includes('Tablet') ? 299 + rand() * 500 :
      19 + rand() * 200;

    return {
      id: 1000 + i,
      customer: pick(customerNames),
      product,
      quantity: 1 + Math.floor(rand() * 20),
      price: Math.round(basePrice * 100) / 100,
      status: pick(statuses),
      date: `${2023 + Math.floor(rand() * 3)}-${String(1 + Math.floor(rand() * 12)).padStart(2, '0')}-${String(1 + Math.floor(rand() * 28)).padStart(2, '0')}`,
      region: pick(regions),
    };
  });
}
