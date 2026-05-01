const fs = require('fs');

const file = 'src/pages/Admin.tsx';
let content = fs.readFileSync(file, 'utf8');

// Find lines 704-723 and replace them
const lines = content.split('\n');
console.log('Total lines:', lines.length);

// Find the cover image section
for (let i = 700; i < 730; i++) {
  console.log(i+1, JSON.stringify(lines[i]));
}
