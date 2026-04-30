const fs = require('fs');
const path = require('path');

function fixInterpolation(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/Rs\.\{/g, '${');
  fs.writeFileSync(filePath, content, 'utf8');
}

const dir = path.join(__dirname, 'src');

function walk(currentPath) {
  const items = fs.readdirSync(currentPath);
  for (const item of items) {
    const fullPath = path.join(currentPath, item);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      fixInterpolation(fullPath);
    }
  }
}

walk(dir);
console.log('Fixed broken string interpolations.');
