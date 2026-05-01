const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
        processDir(fullPath);
      }
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Replace literal '$' in JSX:
      // Typically like `${` or `$<` or `$ ` or `$[0-9]`
      // Actually, we can just replace:
      // 1. `${` with `Rs.${`  (wait, in template strings, `${` is syntax. In JSX, `${` means literal $ followed by {expression}.
      // To distinguish JSX from template string:
      // In JS, template string is inside backticks.
      // A quick and safe way: 
      content = content.replace(/\$\{/g, (match, offset, str) => {
        // if inside backticks, it's a template literal. We shouldn't change it unless it's \${
        return match;
      });
      
      // Let's just do it explicitly:
      // Replace JSX literal dollar signs before {
      // example: >${item.price} -> >Rs.{item.price}
      content = content.replace(/>\$\{/g, '>Rs.{');
      
      // replace `$${` which is literal $ then template string
      content = content.replace(/\$\$\{/g, 'Rs.${');
      
      // replace `$ ` with `Rs. `
      // content = content.replace(/\$ /g, 'Rs. ');
      
      // replace `$` followed by number
      content = content.replace(/\$([0-9])/g, 'Rs.$1');
      
      // replace >$</span> -> >Rs.</span>
      content = content.replace(/>\$/g, '>Rs.');

      // Price (Rs.) was already set in Admin.tsx
      
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log('Processed', fullPath);
    }
  }
}

processDir(path.join(__dirname, 'src'));
processDir(path.join(__dirname, 'server'));

