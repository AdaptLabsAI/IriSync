const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get all files with "Cannot find name 'firestore'" error
const output = execSync('npx tsc --noEmit 2>&1', { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
const lines = output.split('\n');

const filesWithErrors = new Set();

for (const line of lines) {
  if (line.includes("Cannot find name 'firestore'")) {
    const match = line.match(/^([^:]+):/);
    if (match) {
      // Convert to forward slashes for consistency
      const filePath = match[1].replace(/\\/g, '/');
      filesWithErrors.add(filePath);
    }
  }
}

console.log(`Found ${filesWithErrors.size} files with missing 'firestore' variable`);

let fixed = 0;

for (const relativeFilePath of filesWithErrors) {
  const filePath = path.join(process.cwd(), relativeFilePath);

  if (!fs.existsSync(filePath)) {
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;

  // Check if file already imports from firebase
  const hasFirebaseImport = content.match(/import.*from ['"]@\/lib\/core\/firebase['"]/);

  if (!hasFirebaseImport) {
    // Add import at the top after any existing imports
    const lines = content.split('\n');
    let lastImportIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/^import .* from/)) {
        lastImportIndex = i;
      }
    }

    if (lastImportIndex >= 0) {
      // Insert after last import
      lines.splice(lastImportIndex + 1, 0, "import { firestore } from '@/lib/core/firebase';");
    } else {
      // Insert at top after any comments/directives
      let insertIndex = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('//') || lines[i].startsWith('/*') || lines[i].startsWith('*') ||
            lines[i].trim() === '' || lines[i].startsWith('\'use') || lines[i].startsWith('"use')) {
          insertIndex = i + 1;
        } else {
          break;
        }
      }
      lines.splice(insertIndex, 0, "import { firestore } from '@/lib/core/firebase';");
    }

    content = lines.join('\n');
  } else {
    // File has a Firebase import, check if it includes firestore
    if (!content.match(/import\s*\{[^}]*firestore[^}]*\}\s*from ['"]@\/lib\/core\/firebase['"]/)) {
      // Add firestore to existing import
      content = content.replace(
        /(import\s*\{)([^}]*)\}\s*from ['"]@\/lib\/core\/firebase['"];/,
        (match, importStart, importContent) => {
          const imports = importContent.split(',').map(s => s.trim()).filter(s => s);
          if (!imports.includes('firestore')) {
            imports.push('firestore');
          }
          return `${importStart} ${imports.join(', ')} } from '@/lib/core/firebase';`;
        }
      );
    }
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    fixed++;
    if (fixed % 50 === 0) {
      console.log(`Fixed ${fixed} files...`);
    }
  }
}

console.log(`\nFixed ${fixed} files with missing firestore import`);
