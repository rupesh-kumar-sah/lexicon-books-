const fs = require('fs');
const path = require('path');

function addReactImport(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('import React') && !content.includes('import * as React')) {
    content = `import React from 'react';\n` + content;
  }
  fs.writeFileSync(filePath, content, 'utf8');
}

function fixBookCardProps(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/interface BookCardProps \{/, 'interface BookCardProps {\n  key?: React.Key | string | number;');
  fs.writeFileSync(filePath, content, 'utf8');
}

function fixAdminProps(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/function BookRow\(\{ book, onEdit \}: \{ book: Book; onEdit: \(book: Book\) => void \}\)/, 'function BookRow({ book, onEdit }: { key?: React.Key | string | number; book: Book; onEdit: (book: Book) => void })');
  fs.writeFileSync(filePath, content, 'utf8');
}

addReactImport(path.join(__dirname, 'src/components/AuthModal.tsx'));
addReactImport(path.join(__dirname, 'src/components/Navbar.tsx'));
addReactImport(path.join(__dirname, 'src/pages/Admin.tsx'));
addReactImport(path.join(__dirname, 'src/pages/BookDetail.tsx'));
addReactImport(path.join(__dirname, 'src/pages/Checkout.tsx'));
addReactImport(path.join(__dirname, 'src/pages/SqlEditor.tsx'));

fixBookCardProps(path.join(__dirname, 'src/components/BookCard.tsx'));
fixAdminProps(path.join(__dirname, 'src/pages/Admin.tsx'));

console.log('Fixed TS errors step 1');
