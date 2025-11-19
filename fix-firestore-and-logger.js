const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Running TypeScript compilation to find errors...');
let output;
try {
  output = execSync('npx tsc --noEmit 2>&1', { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
} catch (error) {
  output = error.stdout || '';
}

// Extract unique files with "Cannot find name 'firestore'" errors
const firestoreFiles = new Set();
const loggerFiles = new Set();

output.split('\n').forEach(line => {
  if (line.includes("Cannot find name 'firestore'")) {
    const match = line.match(/^(.+?)\(/);
    if (match) firestoreFiles.add(match[1].trim());
  }
  if (line.includes("is not assignable to parameter of type 'string'") && line.includes('logger.')) {
    const match = line.match(/^(.+?)\(/);
    if (match) loggerFiles.add(match[1].trim());
  }
});

console.log(`Found ${firestoreFiles.size} files needing firestore imports`);
console.log(`Found ${loggerFiles.size} files with logger issues`);

let fixedCount = 0;

// Fix firestore imports
for (const relativeFilePath of firestoreFiles) {
  const filePath = path.join(process.cwd(), relativeFilePath);
  if (!fs.existsSync(filePath)) {
    console.log(`Skip: ${relativeFilePath} (not found)`);
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;

  // Check if already has firestore import
  if (content.match(/import\s*\{[^}]*firestore[^}]*\}\s*from ['"]@\/lib\/core\/firebase['"]/)) {
    console.log(`Skip: ${relativeFilePath} (already has firestore import)`);
    continue;
  }

  // Check if there's an existing Firebase import to add to
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
    }
  } else {
    // Add new import after last import
    const lines = content.split('\n');
    let lastImportIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/^import .* from/)) {
        lastImportIndex = i;
      }
    }
    if (lastImportIndex >= 0) {
      lines.splice(lastImportIndex + 1, 0, "import { firestore } from '@/lib/core/firebase';");
      content = lines.join('\n');
    }
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    fixedCount++;
    console.log(`✓ Fixed firestore import: ${relativeFilePath}`);
  }
}

// Fix logger issues - the main issue is passing objects as the first parameter instead of strings
for (const relativeFilePath of loggerFiles) {
  const filePath = path.join(process.cwd(), relativeFilePath);
  if (!fs.existsSync(filePath)) {
    console.log(`Skip: ${relativeFilePath} (not found)`);
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;

  // Pattern 1: logger.info({ key: value }) -> logger.info('Operation', { key: value })
  // We need to be smart about this - look for logger calls that start with an object
  const loggerMethods = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

  for (const method of loggerMethods) {
    // Match logger.method({ ... }) where { is the first param
    const regex = new RegExp(`logger\\.${method}\\(\\s*\\{`, 'g');
    let match;
    let offset = 0;
    const newContent = [];
    let lastIndex = 0;

    while ((match = regex.exec(content)) !== null) {
      // Find the message to add - look for a key in the object that might be a good message
      // For now, just add a generic message
      newContent.push(content.substring(lastIndex, match.index));
      newContent.push(`logger.${method}('${method.charAt(0).toUpperCase() + method.slice(1)} operation', {`);
      lastIndex = match.index + match[0].length;
    }

    if (newContent.length > 0) {
      newContent.push(content.substring(lastIndex));
      content = newContent.join('');
    }
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    fixedCount++;
    console.log(`✓ Fixed logger calls: ${relativeFilePath}`);
  }
}

console.log(`\nTotal files fixed: ${fixedCount}`);
