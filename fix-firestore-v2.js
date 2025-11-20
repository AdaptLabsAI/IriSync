const fs = require('fs');
const path = require('path');

const BASE_DIR = __dirname;

function fixFile(relativePath) {
  const fullPath = path.join(BASE_DIR, relativePath);
  if (!fs.existsSync(fullPath)) return false;

  let content = fs.readFileSync(fullPath, 'utf8');
  const original = content;

  // Check if file imports both getFirebaseFirestore and firestore
  const hasImport = /import\s+{[^}]*getFirebaseFirestore[^}]*firestore[^}]*}\s+from/.test(content);
  if (!hasImport) return false;

  // Replace all uses of the imported firestore variable
  // Pattern: collection(firestore, ...) should become collection(fs, ...) after we add const fs = getFirebaseFirestore(); if(!fs) throw...
  
  // Find each function that uses firestore
  const lines = content.split('\n');
  const newLines = [];
  let inFunction = false;
  let hasAddedFirestoreCheck = false;
  let braceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const openBraces = (line.match(/{/g) || []).length;
    const closeBraces = (line.match(/}/g) || []).length;
    braceDepth += openBraces - closeBraces;

    // Check for function start
    if (/^\s*export\s+(async\s+)?function\s+\w+|^\s*export\s+const\s+\w+\s*=/.test(line)) {
      inFunction = true;
      hasAddedFirestoreCheck = false;
    }

    // If in function, check for firestore usage
    if (inFunction && !hasAddedFirestoreCheck) {
      // Look for lines using firestore from import
      if (/\b(collection|doc|query|getDocs|getDoc|setDoc|updateDoc|deleteDoc|addDoc|writeBatch)\s*\(\s*firestore\s*,/.test(line)) {
        // Check if this function already has getFirebaseFirestore call
        let hasLocalFirestore = false;
        for (let j = i - 1; j >= 0; j--) {
          if (/^\s*export\s+(async\s+)?function|^\s*export\s+const\s+\w+\s*=/.test(lines[j])) break;
          if (/const\s+firestore\s*=\s*getFirebaseFirestore\(\)/.test(lines[j])) {
            hasLocalFirestore = true;
            break;
          }
        }

        if (!hasLocalFirestore) {
          // Add firestore check before this line
          const indent = line.match(/^(\s*)/)[1];
          newLines.push(indent + 'const firestore = getFirebaseFirestore();');
          newLines.push(indent + 'if (!firestore) throw new Error(\'Database not configured\');');
          newLines.push('');
          hasAddedFirestoreCheck = true;
        }
      }
    }

    newLines.push(line);

    // Reset when leaving function
    if (braceDepth === 0 && inFunction) {
      inFunction = false;
      hasAddedFirestoreCheck = false;
    }
  }

  content = newLines.join('\n');

  if (content !== original) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log('✓ Fixed: ' + relativePath);
    return true;
  }
  return false;
}

const files = [
  'src/app/api/admin/ai-models/route.ts',
  'src/app/api/admin/careers/jobs/[id]/route.ts',
  'src/app/api/admin/careers/route.ts',
  'src/app/api/admin/communications/email/route.ts',
  'src/app/api/admin/content/route.ts',
  'src/app/api/admin/knowledge-base/route.ts',
  'src/app/api/admin/roadmap/[id]/route.ts',
  'src/app/api/admin/roadmap/route.ts',
  'src/app/api/admin/seed-database/route.ts',
  'src/app/api/admin/support/route.ts'
];

let fixed = 0;
files.forEach(f => { if (fixFile(f)) fixed++; });
console.log('Fixed ' + fixed + '/' + files.length + ' files');
