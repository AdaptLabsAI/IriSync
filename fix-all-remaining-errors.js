const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Running TypeScript compilation to find all errors...');
const output = execSync('npx tsc --noEmit 2>&1', { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });

// Parse errors
const errors = {};
output.split('\n').forEach(line => {
  const match = line.match(/^([^(]+)\((\d+),(\d+)\): error TS(\d+): (.+)$/);
  if (match) {
    const [, file, lineNum, col, errorCode, message] = match;
    const filePath = file.replace(/\\/g, '/');
    if (!errors[filePath]) errors[filePath] = [];
    errors[filePath].push({ line: parseInt(lineNum), col: parseInt(col), code: errorCode, message });
  }
});

console.log(`Found errors in ${Object.keys(errors).length} files`);

let filesFixed = 0;

// Fix each file
for (const [relativeFilePath, fileErrors] of Object.entries(errors)) {
  const filePath = path.join(process.cwd(), relativeFilePath);
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  let modified = false;

  // Fix 1: Add missing firestore imports
  if (fileErrors.some(e => e.message.includes("Cannot find name 'firestore'"))) {
    if (!content.match(/import.*firestore.*from.*@\/lib\/core\/firebase/)) {
      const hasFirebaseImport = content.match(/import\s*\{([^}]*)\}\s*from ['"]@\/lib\/core\/firebase['"];?/);
      if (hasFirebaseImport) {
        const currentImports = hasFirebaseImport[1];
        if (!currentImports.includes('firestore')) {
          content = content.replace(
            /import\s*\{([^}]*)\}\s*from ['"]@\/lib\/core\/firebase['"];?/,
            (match, imports) => {
              const importList = imports.split(',').map(s => s.trim()).filter(s => s);
              importList.push('firestore');
              return `import { ${importList.join(', ')} } from '@/lib/core/firebase';`;
            }
          );
          modified = true;
        }
      } else {
        const lines = content.split('\n');
        let lastImportIndex = -1;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].match(/^import .* from/)) lastImportIndex = i;
        }
        if (lastImportIndex >= 0) {
          lines.splice(lastImportIndex + 1, 0, "import { firestore } from '@/lib/core/firebase';");
          content = lines.join('\n');
          modified = true;
        }
      }
    }
  }

  // Fix 2: Add type annotations for doc parameters
  content = content.replace(/\.forEach\(\(doc\) =>/g, '.forEach((doc: any) =>');
  content = content.replace(/\.map\(\(doc\) =>/g, '.map((doc: any) =>');
  content = content.replace(/\.filter\(\(doc\) =>/g, '.filter((doc: any) =>');
  if (content !== originalContent) modified = true;

  // Fix 3: Replace getFirebaseFirestore() direct usage with null-checked variable
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fix: collection(getFirebaseFirestore(), ...) -> use firestore variable
    if (line.includes('collection(getFirebaseFirestore()') ||
        line.includes('doc(getFirebaseFirestore()') ||
        line.includes('query(getFirebaseFirestore()')) {

      // Check if firestore variable is declared in this function
      let hasFirestoreDecl = false;
      for (let j = Math.max(0, i - 20); j < i; j++) {
        if (lines[j].includes('const firestore = getFirebaseFirestore()') ||
            lines[j].includes('const firestore: Firestore')) {
          hasFirestoreDecl = true;
          break;
        }
      }

      if (!hasFirestoreDecl) {
        // Add firestore declaration before this line
        const indent = line.match(/^(\s*)/)[1];
        lines.splice(i, 0, `${indent}const firestore = getFirebaseFirestore();`);
        lines.splice(i + 1, 0, `${indent}if (!firestore) throw new Error('Database not configured');`);
        i += 2;
        modified = true;
      }

      // Replace getFirebaseFirestore() with firestore
      lines[i] = lines[i].replace(/getFirebaseFirestore\(\)/g, 'firestore');
      modified = true;
    }
  }

  content = lines.join('\n');

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    filesFixed++;
    if (filesFixed % 10 === 0) {
      console.log(`Fixed ${filesFixed} files...`);
    }
  }
}

console.log(`\nTotal files fixed: ${filesFixed}`);
