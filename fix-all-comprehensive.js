const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Scanning for TypeScript errors...');
let output;
try {
  output = execSync('npx tsc --noEmit 2>&1', { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
} catch (error) {
  output = error.stdout || '';
}

// Parse errors by file
const errorsByFile = {};
output.split('\n').forEach(line => {
  const match = line.match(/^(.+?)\((\d+),(\d+)\): error TS(\d+): (.+)$/);
  if (match) {
    const [, file, lineNum, col, errorCode, message] = match;
    const filePath = file.trim();
    if (!errorsByFile[filePath]) errorsByFile[filePath] = [];
    errorsByFile[filePath].push({ line: parseInt(lineNum), col: parseInt(col), code: errorCode, message });
  }
});

console.log(`Found errors in ${Object.keys(errorsByFile).length} files\n`);

let fixedFiles = 0;
let totalFixes = 0;

for (const [relativeFilePath, fileErrors] of Object.entries(errorsByFile)) {
  const filePath = path.join(process.cwd(), relativeFilePath);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  let modified = false;
  let fixCount = 0;

  // Fix 1: Missing firestore imports (TS2304)
  const needsFirestore = fileErrors.some(e => e.message.includes("Cannot find name 'firestore'"));
  if (needsFirestore) {
    if (!content.match(/import\s*\{[^}]*firestore[^}]*\}\s*from ['"]@\/lib\/core\/firebase['"]/)) {
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
          fixCount++;
        }
      }
    }
  }

  // Fix 2: Firestore null type issues (TS2769) - Add null checks where firestore is used
  const hasFirestoreNullError = fileErrors.some(e =>
    e.code === '2769' && e.message.includes("Argument of type 'Firestore | null'")
  );

  if (hasFirestoreNullError) {
    // Find uses of firestore variable and ensure there's a null check before
    const lines = content.split('\n');
    let linesModified = false;

    for (const error of fileErrors) {
      if (error.code === '2769' && error.message.includes("Argument of type 'Firestore | null'")) {
        const lineIndex = error.line - 1;
        if (lineIndex >= 0 && lineIndex < lines.length) {
          const line = lines[lineIndex];

          // Check if this line uses firestore without a local declaration
          if (line.includes('collection(firestore') || line.includes('doc(firestore') ||
              line.includes('query(firestore') || line.includes('getDocs(firestore')) {

            // Look back for null check
            let hasNullCheck = false;
            for (let i = Math.max(0, lineIndex - 10); i < lineIndex; i++) {
              if (lines[i].includes('if (!firestore)') ||
                  lines[i].includes('const firestore = getFirebaseFirestore()')) {
                hasNullCheck = true;
                break;
              }
            }

            // If no null check, add firestore declaration before this block
            if (!hasNullCheck) {
              const indent = line.match(/^(\s*)/)[1];
              // Find the start of this function/block
              let insertIndex = lineIndex;
              for (let i = lineIndex - 1; i >= 0; i--) {
                if (lines[i].trim().startsWith('export async function') ||
                    lines[i].trim().startsWith('async function') ||
                    lines[i].trim().startsWith('export function') ||
                    lines[i].includes('try {')) {
                  insertIndex = i + 1;
                  break;
                }
              }

              // Insert firestore declaration
              if (!lines[insertIndex].includes('const firestore = getFirebaseFirestore()')) {
                lines.splice(insertIndex, 0, `${indent}const firestoreDb = getFirebaseFirestore();`);
                lines.splice(insertIndex + 1, 0, `${indent}if (!firestoreDb) throw new Error('Database not configured');`);

                // Replace firestore with firestoreDb in subsequent lines
                for (let i = insertIndex + 2; i < Math.min(lines.length, insertIndex + 50); i++) {
                  lines[i] = lines[i].replace(/\bfirestore\b/g, 'firestoreDb');
                }

                linesModified = true;
                fixCount++;
              }
            }
          }
        }
      }
    }

    if (linesModified) {
      content = lines.join('\n');
      modified = true;
    }
  }

  // Fix 3: Implicit any types (TS7006)
  const needsAnyType = fileErrors.some(e => e.code === '7006');
  if (needsAnyType) {
    // Add any type to callback parameters
    content = content.replace(/\.(forEach|map|filter|reduce|find|some|every)\(\((\w+)\)\s*=>/g,
      (match, method, param) => `.${method}((${param}: any) =>`
    );
    content = content.replace(/\.(forEach|map|filter|reduce|find|some|every)\(\((\w+),\s*(\w+)\)\s*=>/g,
      (match, method, param1, param2) => `.${method}((${param1}: any, ${param2}: any) =>`
    );
    if (content !== originalContent) {
      modified = true;
      fixCount++;
    }
  }

  // Fix 4: Logger calls with objects as first parameter (TS2345)
  const loggerPattern = /(logger\.(trace|debug|info|warn|error|fatal))\(\s*\{\s*([^:]+):\s*/g;
  let match;
  const replacements = [];

  while ((match = loggerPattern.exec(content)) !== null) {
    const loggerMethod = match[1];
    const methodName = match[2];
    const firstKey = match[3].trim();

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

  replacements.reverse().forEach(({ index, original, replacement }) => {
    content = content.substring(0, index) + replacement + content.substring(index + original.length);
  });

  if (replacements.length > 0) {
    modified = true;
    fixCount += replacements.length;
  }

  // Fix 5: checkAdminAccess returning NextResponse instead of boolean
  if (content.includes('checkAdminAccess') && content.includes('return NextResponse.json')) {
    content = content.replace(
      /(async function checkAdminAccess[^{]*\{[\s\S]*?if\s*\(!firestore\)\s*\{[\s\S]*?)return NextResponse\.json\([^)]*\)[^;]*;/g,
      "$1throw new Error('Database not configured');"
    );
    if (content !== originalContent) {
      modified = true;
      fixCount++;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    fixedFiles++;
    totalFixes += fixCount;
    console.log(`✓ Fixed ${fixCount} issues in: ${relativeFilePath}`);
  }
}

console.log(`\n✅ Fixed ${totalFixes} issues across ${fixedFiles} files`);
