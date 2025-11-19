const fs = require('fs');
const path = require('path');

// Read the file list
const fileList = fs.readFileSync(path.join(__dirname, 'files-missing-firestore.txt'), 'utf8')
  .split('\n')
  .map(line => line.trim())
  .filter(line => line && line !== 'src/app/' && !line.endsWith(':'));

console.log(`Processing ${fileList.length} files...`);

let fixed = 0;

for (const relativeFilePath of fileList) {
  const filePath = path.join(process.cwd(), relativeFilePath);

  if (!fs.existsSync(filePath)) {
    console.log(`Skip: ${relativeFilePath} (not found)`);
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;

  // Check if file already imports firestore from @/lib/core/firebase
  if (content.match(/import\s*\{[^}]*firestore[^}]*\}\s*from ['"]@\/lib\/core\/firebase['"]/)) {
    console.log(`Skip: ${relativeFilePath} (already has firestore import)`);
    continue;
  }

  // Check if file imports from firebase but doesn't have firestore in the import
  const hasFirebaseImport = content.match(/import\s*\{([^}]*)\}\s*from ['"]@\/lib\/core\/firebase['"];?/);
  if (hasFirebaseImport) {
    // Add firestore to existing import
    const currentImports = hasFirebaseImport[1];
    if (!currentImports.includes('firestore')) {
      content = content.replace(
        /import\s*\{([^}]*)\}\s*from ['"]@\/lib\/core\/firebase['"];?/,
        (match, imports) => {
          const importList = imports.split(',').map(s => s.trim()).filter(s => s);
          if (!importList.includes('firestore')) {
            importList.push('firestore');
          }
          return `import { ${importList.join(', ')} } from '@/lib/core/firebase';`;
        }
      );
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ ${relativeFilePath} (added to existing import)`);
      fixed++;
      continue;
    }
  }

  const lines = content.split('\n');

  // Find the last import line
  let lastImportIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^import .* from/)) {
      lastImportIndex = i;
    }
  }

  if (lastImportIndex >= 0) {
    // Insert after last import
    lines.splice(lastImportIndex + 1, 0, "import { firestore } from '@/lib/core/firebase';");
    content = lines.join('\n');
  } else {
    // No imports found, insert at top after directives/comments
    let insertIndex = 0;
    for (let i = 0; i < Math.min(20, lines.length); i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('/*') || line.startsWith('*') ||
          line === '' || line.startsWith("'use") || line.startsWith('"use') ||
          line.startsWith('/**')) {
        insertIndex = i + 1;
      } else {
        break;
      }
    }
    lines.splice(insertIndex, 0, "import { firestore } from '@/lib/core/firebase';");
    content = lines.join('\n');
  }

  fs.writeFileSync(filePath, content, 'utf8');
  fixed++;
  console.log(`✓ ${relativeFilePath}`);
}

console.log(`\nFixed ${fixed} files`);
