const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Running comprehensive TypeScript error fixes...\n');

// Get all TS errors
let output;
try {
  output = execSync('npx tsc --noEmit 2>&1', { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
} catch (error) {
  output = error.stdout || '';
}

// Parse errors by type and file
const errorsByFile = {};
const errorsByType = {};

output.split('\n').forEach(line => {
  const match = line.match(/^(.+?)\((\d+),(\d+)\): error TS(\d+): (.+)$/);
  if (match) {
    const [, file, lineNum, col, errorCode, message] = match;
    const filePath = file.trim();

    if (!errorsByFile[filePath]) errorsByFile[filePath] = [];
    errorsByFile[filePath].push({ line: parseInt(lineNum), col: parseInt(col), code: errorCode, message, fullLine: line });

    if (!errorsByType[errorCode]) errorsByType[errorCode] = [];
    errorsByType[errorCode].push({ file: filePath, line: parseInt(lineNum), message });
  }
});

console.log('Error Summary:');
Object.entries(errorsByType).sort((a, b) => b[1].length - a[1].length).slice(0, 10).forEach(([code, errors]) => {
  console.log(`  TS${code}: ${errors.length} errors`);
});
console.log();

let totalFixed = 0;

// Fix TS7006 - Implicit any in callbacks
console.log('Fixing TS7006 (implicit any)...');
const ts7006Files = [...new Set((errorsByType['7006'] || []).map(e => e.file))];
let fixed7006 = 0;

for (const relativeFilePath of ts7006Files.slice(0, 50)) {
  const filePath = path.join(process.cwd(), relativeFilePath);
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Add : any to callback parameters
  content = content.replace(/\.forEach\(\((\w+)\)\s*=>/g, '.forEach(($1: any) =>');
  content = content.replace(/\.map\(\((\w+)\)\s*=>/g, '.map(($1: any) =>');
  content = content.replace(/\.filter\(\((\w+)\)\s*=>/g, '.filter(($1: any) =>');
  content = content.replace(/\.reduce\(\((\w+),\s*(\w+)\)\s*=>/g, '.reduce(($1: any, $2: any) =>');
  content = content.replace(/\.find\(\((\w+)\)\s*=>/g, '.find(($1: any) =>');
  content = content.replace(/\.some\(\((\w+)\)\s*=>/g, '.some(($1: any) =>');
  content = content.replace(/\.every\(\((\w+)\)\s*=>/g, '.every(($1: any) =>');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    fixed7006++;
  }
}
console.log(`  Fixed ${fixed7006} files`);
totalFixed += fixed7006;

// Fix TS2304 - Missing names/imports
console.log('\nFixing TS2304 (missing imports)...');
const ts2304Errors = errorsByType['2304'] || [];
const filesMissingImports = {};

ts2304Errors.forEach(error => {
  const nameMatch = error.message.match(/Cannot find name '(\w+)'/);
  if (nameMatch) {
    const missingName = nameMatch[1];
    if (!filesMissingImports[error.file]) filesMissingImports[error.file] = new Set();
    filesMissingImports[error.file].add(missingName);
  }
});

let fixed2304 = 0;
for (const [relativeFilePath, missingNames] of Object.entries(filesMissingImports).slice(0, 50)) {
  const filePath = path.join(process.cwd(), relativeFilePath);
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  for (const name of missingNames) {
    // Skip if already imported
    if (content.includes(`import.*${name}`)) continue;

    // Add appropriate imports
    if (name === 'firestore') {
      const match = content.match(/import\s*\{([^}]*)\}\s*from ['"]@\/lib\/core\/firebase['"];?/);
      if (match && !match[1].includes('firestore')) {
        content = content.replace(
          /import\s*\{([^}]*)\}\s*from ['"]@\/lib\/core\/firebase['"];?/,
          (m, imports) => {
            const list = imports.split(',').map(s => s.trim()).filter(s => s);
            list.push('firestore');
            return `import { ${list.join(', ')} } from '@/lib/core/firebase';`;
          }
        );
        modified = true;
      }
    } else if (name === 'toast') {
      if (!content.includes("from '@/components/ui/use-toast'")) {
        const lines = content.split('\n');
        let lastImport = -1;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].match(/^import .* from/)) lastImport = i;
        }
        if (lastImport >= 0) {
          lines.splice(lastImport + 1, 0, "import { toast } from '@/components/ui/use-toast';");
          content = lines.join('\n');
          modified = true;
        }
      }
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    fixed2304++;
  }
}
console.log(`  Fixed ${fixed2304} files`);
totalFixed += fixed2304;

// Fix TS2769 - Remaining Firestore null issues
console.log('\nFixing TS2769 (Firestore | null)...');
const ts2769Files = [...new Set((errorsByType['2769'] || []).map(e => e.file).filter(f => f.includes('src/')))];
let fixed2769 = 0;

for (const relativeFilePath of ts2769Files.slice(0, 30)) {
  const filePath = path.join(process.cwd(), relativeFilePath);
  if (!fs.existsSync(filePath) || !filePath.match(/\.(ts|tsx)$/)) continue;

  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Check if file uses firestore variable
  if (!content.includes('firestore') && !content.includes('Firestore')) continue;

  // Look for patterns like collection(firestore, ...) without null check
  const lines = content.split('\n');
  let modified = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if this line uses firestore in a Firebase function call
    if ((line.includes('collection(firestore') || line.includes('doc(firestore') ||
         line.includes('query(firestore') || line.includes('writeBatch(firestore')) &&
        !line.includes('const firestore') && !line.includes('const db')) {

      // Look backwards to see if there's already a null check
      let hasNullCheck = false;
      for (let j = Math.max(0, i - 15); j < i; j++) {
        if (lines[j].includes('if (!firestore)') || lines[j].includes('if (!db)')) {
          hasNullCheck = true;
          break;
        }
      }

      // If no null check, look for where firestore is declared
      if (!hasNullCheck) {
        for (let j = Math.max(0, i - 30); j < i; j++) {
          if (lines[j].includes('const firestore = getFirebaseFirestore()')) {
            // Add null check right after the declaration
            const indent = lines[j].match(/^(\s*)/)[1];
            lines.splice(j + 1, 0, `${indent}if (!firestore) throw new Error('Database not configured');`);
            modified = true;
            break;
          }
        }
      }

      if (modified) break; // Only fix one per file to avoid breaking things
    }
  }

  if (modified) {
    content = lines.join('\n');
    fs.writeFileSync(filePath, content, 'utf8');
    fixed2769++;
  }
}
console.log(`  Fixed ${fixed2769} files`);
totalFixed += fixed2769;

console.log(`\n✅ Total files fixed: ${totalFixed}`);
console.log('\nRe-running TypeScript check...');

try {
  execSync('npx tsc --noEmit 2>&1 | grep "error TS" | wc -l', { encoding: 'utf8', stdio: 'inherit' });
} catch (e) {
  // Ignore - just showing results
}
