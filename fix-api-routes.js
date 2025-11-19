const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get list of files with errors from TypeScript
console.log('Finding files with errors...');
let output;
try {
  output = execSync('npx tsc --noEmit 2>&1', { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
} catch (error) {
  output = error.stdout || '';
}

const filesWithErrors = new Set();
output.split('\n').forEach(line => {
  const match = line.match(/^(.+?)\(/);
  if (match && line.includes('error TS')) {
    filesWithErrors.add(match[1].trim());
  }
});

console.log(`Found ${filesWithErrors.size} files with errors`);

let fixedCount = 0;

for (const relativeFilePath of filesWithErrors) {
  const filePath = path.join(process.cwd(), relativeFilePath);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  let modified = false;

  // Fix 1: Add missing firestore imports
  if (content.includes("'firestore'") || content.includes("firestore,") || content.includes(" firestore ")) {
    // Check if already has firestore import
    if (!content.match(/import\s*\{[^}]*firestore[^}]*\}\s*from ['"]@\/lib\/core\/firebase['"]/)) {
      // Check if there's an existing Firebase import
      const hasFirebaseImport = content.match(/import\s*\{([^}]*)\}\s*from ['"]@\/lib\/core\/firebase['"];?/);
      if (hasFirebaseImport) {
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
          modified = true;
        }
      }
    }
  }

  // Fix 2: Fix logger calls - logger.method({ ... }) should be logger.method('message', { ... })
  // Match patterns like logger.info({ error: ...  or logger.error({ error: ...
  const loggerPattern = /(logger\.(trace|debug|info|warn|error|fatal))\(\s*\{\s*([^:]+):\s*/g;
  let match;
  const replacements = [];

  while ((match = loggerPattern.exec(content)) !== null) {
    const loggerMethod = match[1];  // e.g. "logger.info"
    const methodName = match[2];    // e.g. "info"
    const firstKey = match[3].trim(); // e.g. "error" or "adminId"

    // Create a generic message based on the method name and first key
    let message = '';
    if (firstKey === 'error') {
      message = `${methodName.charAt(0).toUpperCase() + methodName.slice(1)} occurred`;
    } else if (firstKey.includes('Id')) {
      message = `${methodName.charAt(0).toUpperCase() + methodName.slice(1)} operation`;
    } else {
      message = `${methodName.charAt(0).toUpperCase() + methodName.slice(1)}`;
    }

    replacements.push({
      index: match.index,
      original: match[0],
      replacement: `${loggerMethod}('${message}', { ${firstKey}: `
    });
  }

  // Apply replacements in reverse order to maintain indices
  replacements.reverse().forEach(({ index, original, replacement }) => {
    content = content.substring(0, index) + replacement + content.substring(index + original.length);
  });

  if (replacements.length > 0) {
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    fixedCount++;
    console.log(`✓ Fixed: ${relativeFilePath}`);
  }
}

console.log(`\n✅ Total files fixed: ${fixedCount}`);
