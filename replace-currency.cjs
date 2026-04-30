const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  // Look for `$${` and replace with `Rs.${`
  content = content.replace(/\$\$\{/g, 'Rs.${');
  // Look for `>`$` and replace with `>Rs.`
  content = content.replace(/>\$/g, '>Rs.');
  // Look for `price: '$'` or similar if any
  // Wait, let's just do a careful regex
  content = content.replace(/\$(?=\d|{)/g, 'Rs.');
  // Fix specifically `Revenue ($)` to `Revenue (Rs.)`
  content = content.replace(/Revenue \(\$\)/g, 'Revenue (Rs.)');
  // Fix `Price ($)` to `Price (Rs.)`
  content = content.replace(/Price \(\$\)/g, 'Price (Rs.)');
  
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
      replaceInFile(fullPath);
    }
  }
}

walk(dir);
console.log('Done replacing $ with Rs.');
