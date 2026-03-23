const fs = require('fs');
const path = require('path');
const pkgDirs = fs.readdirSync(path.join(__dirname, '..', 'packages'));

let updated = 0;
for (const dir of pkgDirs) {
  const pkgPath = path.join(__dirname, '..', 'packages', dir, 'package.json');
  if (!fs.existsSync(pkgPath)) continue;

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  // Skip private packages
  if (pkg.private) continue;

  let changed = false;

  // Fix repository URL (always update to correct URL)
  if (!pkg.repository || (pkg.repository.url && pkg.repository.url.includes('nicktesh'))) {
    pkg.repository = {
      type: 'git',
      url: 'https://github.com/007krcs/grid-data.git',
      directory: `packages/${dir}`
    };
    changed = true;
  }

  // Fix homepage URL
  if (!pkg.homepage || pkg.homepage === 'https://gridstorm.dev') {
    pkg.homepage = 'https://grid-data-analytics-explorer.vercel.app/';
    changed = true;
  }

  // Fix bugs URL
  if (!pkg.bugs || (pkg.bugs.url && pkg.bugs.url.includes('nicktesh'))) {
    pkg.bugs = {
      url: 'https://github.com/007krcs/grid-data/issues'
    };
    changed = true;
  }

  // Ensure publishConfig exists
  if (!pkg.publishConfig) {
    pkg.publishConfig = { access: 'public' };
    changed = true;
  }

  // Add engines if missing
  if (!pkg.engines) {
    pkg.engines = { node: '>=18.0.0' };
    changed = true;
  }

  // Ensure sideEffects is set (important for tree-shaking)
  if (pkg.sideEffects === undefined) {
    // CSS packages have side effects
    if (dir.includes('theme')) {
      pkg.sideEffects = ['*.css'];
    } else {
      pkg.sideEffects = false;
    }
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`Updated: ${pkg.name}`);
    updated++;
  } else {
    console.log(`OK: ${pkg.name}`);
  }
}

console.log(`\n${updated} packages updated`);
