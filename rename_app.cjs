const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  for (const [search, replace] of replacements) {
    content = content.replace(search, replace);
  }
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated:', filePath);
  }
}

const dir = __dirname;
const filesToUpdate = [
  {
    path: 'src/pages/Wishlist.tsx',
    replacements: [[/Your personal Lexicon curation\./g, 'Your personal BookSellNP curation.']]
  },
  {
    path: 'src/pages/SqlEditor.tsx',
    replacements: [[/'lexiconn_sql_history'/g, "'booksellnp_sql_history'"]]
  },
  {
    path: 'src/lib/api.ts',
    replacements: [[/'lexiconn_token'/g, "'booksellnp_token'"]]
  },
  {
    path: 'src/pages/Admin.tsx',
    replacements: [[/Manage your Lexiconn Books storefront\./g, 'Manage your BookSellNP storefront.']]
  },
  {
    path: 'server/schema.ts',
    replacements: [[/DEFAULT 'Lexiconn Books'/g, "DEFAULT 'BookSellNP'"]]
  },
  {
    path: 'src/context/SiteSettingsContext.tsx',
    replacements: [[/siteName: 'Lexiconn Books'/g, "siteName: 'BookSellNP'"]]
  },
  {
    path: 'src/context/RecentlyViewedContext.tsx',
    replacements: [[/'lexiconn_recently_viewed'/g, "'booksellnp_recently_viewed'"]]
  },
  {
    path: 'src/context/CartContext.tsx',
    replacements: [[/'lexiconn_cart'/g, "'booksellnp_cart'"]]
  },
  {
    path: 'src/constants.ts',
    replacements: [[/APP_NAME = 'lexiconn books'/g, "APP_NAME = 'booksellnp'"]]
  },
  {
    path: 'src/components/AIAssistant.tsx',
    replacements: [
      [/Lexiconn AI/g, 'BookSellNP AI'],
      [/Lexiconn Books/g, 'BookSellNP'],
      [/lexiconn AI/g, 'BookSellNP AI']
    ]
  },
  {
    path: 'src/components/Footer.tsx',
    replacements: [[/LEXICON MEDIA GROUP/g, 'BOOKSELLNP MEDIA GROUP']]
  },
  {
    path: 'src/components/AuthModal.tsx',
    replacements: [
      [/Lexiconn Books/g, 'BookSellNP'],
      [/reader@lexicon\.com/g, 'reader@booksellnp.com']
    ]
  }
];

filesToUpdate.forEach(file => {
  const fullPath = path.join(dir, file.path);
  if (fs.existsSync(fullPath)) {
    replaceInFile(fullPath, file.replacements);
  } else {
    console.warn('File not found:', fullPath);
  }
});
