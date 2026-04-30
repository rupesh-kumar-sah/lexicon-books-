const fs = require('fs');
const path = require('path');

function fixFiles() {
  // 1. Fix BookCard.tsx
  const bcPath = path.join(__dirname, 'src/components/BookCard.tsx');
  let bcContent = fs.readFileSync(bcPath, 'utf8');
  bcContent = bcContent.replace(/import \{ ShoppingCart/, "import React from 'react';\nimport { ShoppingCart");
  bcContent = bcContent.replace(/interface BookCardProps \{/, 'interface BookCardProps {\n  key?: React.Key | string | number;');
  bcContent = bcContent.replace(/\$(?=\d|\{)/g, 'Rs.');
  bcContent = bcContent.replace(/Rs\.\{/g, '${');
  fs.writeFileSync(bcPath, bcContent, 'utf8');

  // 2. Fix Admin.tsx
  const adPath = path.join(__dirname, 'src/pages/Admin.tsx');
  let adContent = fs.readFileSync(adPath, 'utf8');
  // Make sure it doesn't duplicate key
  if (!adContent.includes('key?: React.Key')) {
    adContent = adContent.replace(/function BookRow\(\{ book, onEdit \}: \{ book: Book; onEdit: \(book: Book\) => void \}\)/, 'function BookRow({ book, onEdit }: { key?: React.Key | string | number; book: Book; onEdit: (book: Book) => void })');
    adContent = adContent.replace(/function InventoryView\(\{ onEdit \}: \{ onEdit: \(book: Book\) => void \}\)/, 'function InventoryView({ onEdit }: { key?: React.Key | string | number; onEdit: (book: Book) => void })');
  }
  fs.writeFileSync(adPath, adContent, 'utf8');

  // 3. Fix ErrorBoundary.tsx
  const ebPath = path.join(__dirname, 'src/components/ErrorBoundary.tsx');
  let ebContent = fs.readFileSync(ebPath, 'utf8');
  ebContent = ebContent.replace('interface Props {', 'interface Props {\n  key?: React.Key | string | number;');
  fs.writeFileSync(ebPath, ebContent, 'utf8');

  console.log('All TS and currency fixes applied');
}

fixFiles();
