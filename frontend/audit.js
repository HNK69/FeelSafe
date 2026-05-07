const fs   = require('fs');
const path = require('path');

const SRC = path.join(process.cwd(), 'src');
const files = [];

function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (f.endsWith('.jsx') || f.endsWith('.js')) files.push(full);
  }
}
walk(SRC);

const errors = [];

for (const file of files) {
  const rel     = file.replace(SRC, '');
  const content = fs.readFileSync(file, 'utf8');

  if (content.includes('<<<<<<<')) {
    errors.push(rel + ' [CONFLICT MARKERS]');
  }

  const importRe = /from\s+['"](\.[^'"]+)['"]/g;
  let m;
  while ((m = importRe.exec(content)) !== null) {
    const imp  = m[1];
    const base = path.resolve(path.dirname(file), imp);
    const exts = ['', '.js', '.jsx', '/index.js', '/index.jsx'];
    const found = exts.some(e => { try { return fs.existsSync(base + e); } catch { return false; } });
    if (!found) errors.push(rel + '  =>  MISSING IMPORT: ' + imp);
  }
}

if (errors.length === 0) {
  console.log('ALL CLEAR - 0 errors across ' + files.length + ' files.');
} else {
  console.log('ERRORS FOUND (' + errors.length + '):');
  errors.forEach(e => console.log('  ' + e));
}
console.log('Scanned: ' + files.length + ' files');
