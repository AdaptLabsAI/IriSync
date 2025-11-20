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
Object.entries(errorsByType).sort((a, b) => b[1].length - a[1].length).slice(0, 15).forEach(([code, errors]) => {
  console.log(`  TS${code}: ${errors.length} errors`);
});
console.log();

let totalFixed = 0;

// Fix TS7006 - Implicit any in callbacks
console.log('Fixing TS7006 (implicit any)...');
const ts7006Files = [...new Set((errorsByType['7006'] || []).map(e => e.file))];
let fixed7006 = 0;

for (const relativeFilePath of ts7006Files) {
  const filePath = path.join(process.cwd(), relativeFilePath);
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Add : any to callback parameters - more patterns
  content = content.replace(/\\.forEach\(\s*\((\w+)\)(\s*)=>/g, '.forEach(($1: any)$2=>');
  content = content.replace(/\\.map\(\s*\((\w+)\)(\s*)=>/g, '.map(($1: any)$2=>');
  content = content.replace(/\\.filter\(\s*\((\w+)\)(\s*)=>/g, '.filter(($1: any)$2=>');
  content = content.replace(/\\.reduce\(\s*\((\w+),\s*(\w+)\)(\s*)=>/g, '.reduce(($1: any, $2: any)$3=>');
  content = content.replace(/\\.find\(\s*\((\w+)\)(\s*)=>/g, '.find(($1: any)$2=>');
  content = content.replace(/\\.some\(\s*\((\w+)\)(\s*)=>/g, '.some(($1: any)$2=>');
  content = content.replace(/\\.every\(\s*\((\w+)\)(\s*)=>/g, '.every(($1: any)$2=>');
  content = content.replace(/\\.sort\(\s*\((\w+),\s*(\w+)\)(\s*)=>/g, '.sort(($1: any, $2: any)$3=>');

  // Fix addEventListener, setTimeout, etc.
  content = content.replace(/addEventListener\(\s*['"](\w+)['"]\s*,\s*\((\w+)\)(\s*)=>/g, "addEventListener('$1', ($2: any)$3=>");
  content = content.replace(/setTimeout\(\s*\(\)(\s*)=>/g, 'setTimeout(()$1=>');
  content = content.replace(/setInterval\(\s*\(\)(\s*)=>/g, 'setInterval(()$1=>');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    fixed7006++;
  }
}
console.log(`  Fixed ${fixed7006} files`);
totalFixed += fixed7006;

// Fix TS2769 - Remaining Firestore null issues
console.log('\nFixing TS2769 (Firestore | null)...');
const ts2769Files = [...new Set((errorsByType['2769'] || []).map(e => e.file).filter(f => f.includes('src/')))];
let fixed2769 = 0;

for (const relativeFilePath of ts2769Files) {
  const filePath = path.join(process.cwd(), relativeFilePath);
  if (!fs.existsSync(filePath) || !filePath.match(/\.(ts|tsx)$/)) continue;

  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Check if file uses firestore variable
  if (!content.includes('firestore') && !content.includes('Firestore')) continue;

  const lines = content.split('\n');
  let modified = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if this line uses firestore in a Firebase function call
    if ((line.includes('collection(firestore') || line.includes('doc(firestore') ||
         line.includes('query(firestore') || line.includes('writeBatch(firestore') ||
         line.includes('getDocs(firestore') || line.includes('getDoc(firestore')) &&
        !line.includes('const firestore') && !line.includes('const db') &&
        !line.includes('const firestoreDb')) {

      // Look backwards to see if there's already a null check
      let hasNullCheck = false;
      let firestoreVarName = 'firestore';

      for (let j = Math.max(0, i - 20); j < i; j++) {
        if (lines[j].includes('if (!firestore)') || lines[j].includes('if (!db)') ||
            lines[j].includes('if (!firestoreDb)') ||
            lines[j].match(/const (db|firestoreDb) = getFirebaseFirestore\(\)/)) {
          hasNullCheck = true;
          if (lines[j].includes('const db =')) firestoreVarName = 'db';
          if (lines[j].includes('const firestoreDb =')) firestoreVarName = 'firestoreDb';
          break;
        }
      }

      // If no null check, look for where we're in a function and add it at the start
      if (!hasNullCheck) {
        for (let j = Math.max(0, i - 30); j < i; j++) {
          if (lines[j].match(/^\s*(export\s+)?(async\s+)?function\s+\w+/) ||
              lines[j].match(/^\s*const\s+\w+\s*=\s*(async\s*)?\([^)]*\)\s*(:|=>)/) ||
              lines[j].includes('try {')) {

            const indent = lines[j + 1] ? lines[j + 1].match(/^(\s*)/)[1] : '  ';
            const dbVarName = 'db';

            // Insert at function start
            let insertLine = j + 1;
            if (lines[j].includes('try {')) {
              insertLine = j + 1;
            }

            lines.splice(insertLine, 0, `${indent}const ${dbVarName} = getFirebaseFirestore();`);
            lines.splice(insertLine + 1, 0, `${indent}if (!${dbVarName}) throw new Error('Database not configured');`);
            lines.splice(insertLine + 2, 0, ``);

            // Replace firestore with db in subsequent lines
            for (let k = insertLine + 3; k < Math.min(lines.length, insertLine + 60); k++) {
              lines[k] = lines[k].replace(/\bfirestore\b/g, dbVarName);
            }

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

// Fix TS2304 - Missing imports for common names
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
for (const [relativeFilePath, missingNames] of Object.entries(filesMissingImports)) {
  const filePath = path.join(process.cwd(), relativeFilePath);
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  for (const name of missingNames) {
    // Skip if already imported
    if (content.includes(`import.*${name}`) || content.includes(`from.*${name}`)) continue;

    // Add appropriate imports based on common patterns
    if (name === 'NextResponse' && !content.includes("from 'next/server'")) {
      const lines = content.split('\n');
      let lastImport = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].match(/^import .* from/)) lastImport = i;
      }
      if (lastImport >= 0) {
        lines.splice(lastImport + 1, 0, "import { NextResponse } from 'next/server';");
        content = lines.join('\n');
        modified = true;
      }
    } else if (name === 'NextRequest' && !content.includes("from 'next/server'")) {
      const lines = content.split('\n');
      let lastImport = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].match(/^import .* from/)) lastImport = i;
      }
      if (lastImport >= 0) {
        lines.splice(lastImport + 1, 0, "import { NextRequest } from 'next/server';");
        content = lines.join('\n');
        modified = true;
      }
    } else if (name === 'toast' && !content.includes("from '@/components/ui/use-toast'")) {
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

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    fixed2304++;
  }
}
console.log(`  Fixed ${fixed2304} files`);
totalFixed += fixed2304;

console.log(`\n✅ Total files fixed: ${totalFixed}`);
console.log('\nRe-running TypeScript check...');

try {
  const errorCount = execSync('npx tsc --noEmit 2>&1 | grep "error TS" | wc -l', { encoding: 'utf8' });
  console.log(`Remaining errors: ${errorCount.trim()}`);
} catch (e) {
  // Ignore
}
