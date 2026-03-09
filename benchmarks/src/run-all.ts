// ─── GridStorm Benchmark Suite ───
// Entry point that runs all benchmark suites and generates a consolidated report.

import { generateAndSaveReport } from './reports/generate-report.js';

console.log('='.repeat(60));
console.log('  GridStorm Benchmark Suite');
console.log('='.repeat(60));
console.log('');

const startTime = performance.now();

const outputPath = generateAndSaveReport();

const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);

console.log('');
console.log('='.repeat(60));
console.log(`  Completed in ${elapsed}s`);
console.log(`  Report: ${outputPath}`);
console.log('='.repeat(60));
