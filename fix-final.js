const fs = require('fs');
const path = require('path');

// Read list of files
const filesList = `src/app/api/admin/ai-models/route.ts
src/app/api/admin/careers/jobs/[id]/route.ts
src/app/api/admin/careers/route.ts
src/app/api/admin/communications/email/route.ts
src/app/api/admin/content/route.ts
src/app/api/admin/knowledge-base/route.ts
src/app/api/admin/roadmap/[id]/route.ts
src/app/api/admin/roadmap/route.ts
src/app/api/admin/seed-database/route.ts
src/app/api/admin/support/route.ts`.split('\n');

let fixed = 0;

filesList.forEach(relPath => {
  const fullPath = path.join(__dirname, relPath.trim());
  if (!fs.existsSync(fullPath)) return;

  let content = fs.readFileSync(fullPath, 'utf8');
  const original = content;

  // Simple strategy: Remove firestore from imports, rely on getFirebaseFirestore() call
  // Replace the import to remove firestore
  content = content.replace(
    /import\s+{\s*([^}]*?)\bgetFirebaseFirestore\b([^}]*?),\s*firestore([^}]*?)}\s+from\s+(['"]@\/lib\/core\/firebase['"])/,
    'import { $1getFirebaseFirestore$2$3 } from $4'
  );

  content = content.replace(
    /import\s+{\s*([^}]*?)firestore\s*,\s*([^}]*?)\bgetFirebaseFirestore\b([^}]*?)}\s+from\s+(['"]@\/lib\/core\/firebase['"])/,
    'import { $1$2getFirebaseFirestore$3 } from $4'
  );

  // For each function that has Firestore operations, add the check
  // Match export function or export const = 
  const lines = content.split('\n');
  const newLines = [];
  let inFunction = false;
  let needsCheck = false;
  let braceDepth = 0;
  let funcIndent = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Track braces
    braceDepth += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;

    // Function start
    if (/^\s*export\s+(async\s+)?function|^\s*export\s+const\s+\w+\s*=/.test(line)) {
      inFunction = true;
      needsCheck = false;
      funcIndent = line.match(/^(\s*)/)[1] + '  ';
    }

    // Check for Firestore usage
    if (inFunction && !needsCheck && /\b(collection|doc|query|getDocs|getDoc|setDoc|updateDoc|deleteDoc|addDoc|writeBatch)\s*\(/.test(line)) {
      // Check if firestore is already defined in this function
      let hasFirestore = false;
      for (let j = i - 1; j >= 0 && lines[j].trim() !== '' && !(/^\s*export/.test(lines[j])); j--) {
        if (/const\s+firestore\s*=\s*getFirebaseFirestore\(\)/.test(lines[j])) {
          hasFirestore = true;
          break;
        }
      }
      
      if (!hasFirestore) {
        needsCheck = true;
        // Insert before this line
        newLines.push(funcIndent + 'const firestore = getFirebaseFirestore();');
        newLines.push(funcIndent + 'if (!firestore) throw new Error(\'Database not configured\');');
        newLines.push('');
      }
    }

    newLines.push(line);

    if (braceDepth === 0) {
      inFunction = false;
    }
  }

  content = newLines.join('\n');

  if (content !== original) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log('✓ ' + relPath);
    fixed++;
  }
});

console.log('Fixed ' + fixed + ' files');
