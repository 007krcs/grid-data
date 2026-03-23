const fs = require('fs');
const path = require('path');

const NEW_VERSION = process.argv[2] || '0.1.1';
const pkgDirs = fs.readdirSync(path.join(__dirname, '..', 'packages'));

let count = 0;
for (const dir of pkgDirs) {
  const pkgPath = path.join(__dirname, '..', 'packages', dir, 'package.json');
  if (!fs.existsSync(pkgPath)) continue;
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  if (pkg.private) continue;
  pkg.version = NEW_VERSION;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`${pkg.name} -> ${NEW_VERSION}`);
  count++;
}
console.log(`\nBumped ${count} packages to ${NEW_VERSION}`);
