// ── Shared Data for Feature Demos ──

const DEPARTMENTS = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Support', 'Legal', 'Operations'];
const FIRST_NAMES = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Hank', 'Ivy', 'Jack',
  'Karen', 'Leo', 'Mia', 'Nathan', 'Olivia', 'Paul', 'Quinn', 'Rachel', 'Sam', 'Tina'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Wilson', 'Moore', 'Taylor',
  'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Garcia', 'Martinez', 'Robinson', 'Clark'];
const CITIES = ['New York', 'San Francisco', 'Chicago', 'Seattle', 'Boston', 'Austin', 'Denver', 'Portland', 'Miami', 'Atlanta'];
const ROLES = ['Manager', 'Senior Developer', 'Junior Developer', 'Intern', 'Team Lead', 'Director', 'VP', 'Analyst'];
const PRODUCTS = ['Laptop Pro', 'Wireless Mouse', 'USB-C Hub', 'Monitor 27"', 'Keyboard Mech', 'Webcam HD',
  'Desk Lamp', 'Standing Desk', 'Chair Ergo', 'Cable Kit', 'Headphones', 'Tablet', 'Phone Case', 'Power Bank'];
const CATEGORIES = ['Electronics', 'Accessories', 'Furniture', 'Office Supplies'];
const STATUSES = ['Active', 'Inactive', 'On Leave', 'Probation'];

export interface Employee {
  id: number;
  name: string;
  email: string;
  department: string;
  role: string;
  salary: number;
  startDate: string;
  city: string;
  active: boolean;
  status: string;
  rating: number;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  quantity: number;
  inStock: boolean;
  supplier: string;
  sku: string;
}

export interface TreeNode {
  id: string;
  name: string;
  type: 'folder' | 'file';
  size: number;
  modified: string;
  children?: TreeNode[];
}

export function generateEmployees(count: number): Employee[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[Math.floor(i / FIRST_NAMES.length) % LAST_NAMES.length]}`,
    email: `user${i + 1}@company.com`,
    department: DEPARTMENTS[i % DEPARTMENTS.length],
    role: ROLES[i % ROLES.length],
    salary: 45000 + Math.floor((i * 7919) % 105000),
    startDate: `${2018 + (i % 8)}-${String(1 + (i % 12)).padStart(2, '0')}-${String(1 + (i % 28)).padStart(2, '0')}`,
    city: CITIES[i % CITIES.length],
    active: i % 5 !== 0,
    status: STATUSES[i % STATUSES.length],
    rating: 1 + (i % 5),
  }));
}

export function generateProducts(count: number): Product[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: PRODUCTS[i % PRODUCTS.length],
    category: CATEGORIES[i % CATEGORIES.length],
    price: 10 + Math.floor((i * 7919) % 2000),
    quantity: Math.floor((i * 3571) % 500),
    inStock: i % 4 !== 0,
    supplier: `Supplier ${1 + (i % 5)}`,
    sku: `SKU-${String(i + 1).padStart(5, '0')}`,
  }));
}

export function generateTreeData(): TreeNode[] {
  return [
    {
      id: 'src', name: 'src', type: 'folder', size: 0, modified: '2024-01-15',
      children: [
        {
          id: 'components', name: 'components', type: 'folder', size: 0, modified: '2024-01-14',
          children: [
            { id: 'header', name: 'Header.tsx', type: 'file', size: 2400, modified: '2024-01-14' },
            { id: 'sidebar', name: 'Sidebar.tsx', type: 'file', size: 3100, modified: '2024-01-13' },
            { id: 'footer', name: 'Footer.tsx', type: 'file', size: 1800, modified: '2024-01-12' },
          ],
        },
        {
          id: 'hooks', name: 'hooks', type: 'folder', size: 0, modified: '2024-01-10',
          children: [
            { id: 'useAuth', name: 'useAuth.ts', type: 'file', size: 1200, modified: '2024-01-10' },
            { id: 'useTheme', name: 'useTheme.ts', type: 'file', size: 800, modified: '2024-01-09' },
          ],
        },
        { id: 'app', name: 'App.tsx', type: 'file', size: 4500, modified: '2024-01-15' },
        { id: 'main', name: 'main.tsx', type: 'file', size: 300, modified: '2024-01-01' },
      ],
    },
    {
      id: 'public', name: 'public', type: 'folder', size: 0, modified: '2024-01-05',
      children: [
        { id: 'favicon', name: 'favicon.ico', type: 'file', size: 15406, modified: '2024-01-05' },
        { id: 'robots', name: 'robots.txt', type: 'file', size: 67, modified: '2024-01-01' },
      ],
    },
    { id: 'package', name: 'package.json', type: 'file', size: 1200, modified: '2024-01-15' },
    { id: 'readme', name: 'README.md', type: 'file', size: 5600, modified: '2024-01-14' },
    { id: 'tsconfig', name: 'tsconfig.json', type: 'file', size: 450, modified: '2024-01-01' },
  ];
}

/** Simulate a server-side data source for infinite scrolling */
export function createServerDataSource(totalRows: number) {
  const allData = generateEmployees(totalRows);
  return {
    getRows(params: { startRow: number; endRow: number; sortModel?: any[]; filterModel?: any }) {
      return new Promise<{ rowData: Employee[]; lastRow: number }>((resolve) => {
        // Simulate network latency
        setTimeout(() => {
          let data = [...allData];
          // Apply sort
          if (params.sortModel?.length) {
            const { colId, sort } = params.sortModel[0];
            data.sort((a: any, b: any) => {
              const valA = a[colId], valB = b[colId];
              if (valA < valB) return sort === 'asc' ? -1 : 1;
              if (valA > valB) return sort === 'asc' ? 1 : -1;
              return 0;
            });
          }
          const page = data.slice(params.startRow, params.endRow);
          resolve({ rowData: page, lastRow: data.length });
        }, 200 + Math.random() * 300);
      });
    },
  };
}
