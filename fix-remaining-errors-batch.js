const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Running TypeScript compilation to find all errors...');
let output;
try {
  output = execSync('npx tsc --noEmit 2>&1', { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
} catch (error) {
  output = error.stdout || '';
}

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
  const docTypeRegex = /\.(forEach|map|filter)\(\(doc\) =>/g;
  content = content.replace(docTypeRegex, (match, method) => `.${method}((doc: any) =>`);
  if (content !== originalContent) modified = true;

  // Fix 3: Fix checkAdminAccess return type issues (returning NextResponse instead of boolean)
  if (fileErrors.some(e => e.message.includes("Type 'NextResponse") && e.message.includes("is not assignable to type 'boolean'"))) {
    // This function is incorrectly returning NextResponse - it should throw or return false
    content = content.replace(
      /async function checkAdminAccess\(userId: string\): Promise<boolean> \{[\s\S]*?const firestore = getFirebaseFirestore\(\);[\s\S]*?if \(!firestore\) \{[\s\S]*?return NextResponse\.json\(/g,
      (match) => match.replace('return NextResponse.json(', 'throw new Error(')
    );
    content = content.replace(
      /async function checkAdminAccess\(userId: string\): Promise<boolean> \{[\s\S]*?if \(!firestore\) \{[\s\S]*?return NextResponse\.json\(/g,
      (match) => match.replace('return NextResponse.json(', 'throw new Error(')
    );
    if (content !== originalContent) modified = true;
  }

  if (modified && content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    filesFixed++;
    console.log(`Fixed: ${relativeFilePath}`);
  }
}

console.log(`\nTotal files fixed: ${filesFixed}`);
