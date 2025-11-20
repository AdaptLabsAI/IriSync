const fs = require('fs');
const path = require('path');

function fixFile(relativePath) {
  const fullPath = path.join(__dirname, relativePath);
  if (!fs.existsSync(fullPath)) return false;

  let content = fs.readFileSync(fullPath, 'utf8');
  const original = content;

  // Only fix files that import both getFirebaseFirestore and firestore
  if (!/import\s+{[^}]*getFirebaseFirestore[^}]*firestore[^}]*}\s+from/.test(content)) {
    return false;
  }

  const lines = content.split('\n');
  const newLines = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Look for lines that use firestore directly in a Firebase function call
    // BUT we need to make sure it's not already inside a function argument list
    const hasFirestoreUsage = /\b(collection|doc|query|getDocs|getDoc|setDoc|updateDoc|deleteDoc|addDoc|writeBatch)\s*\(\s*firestore\s*,/.test(line);

    if (hasFirestoreUsage) {
      // Check if there's already a local firestore declaration in previous lines
      // Look back to find the function start
      let hasLocalFirestore = false;
      for (let j = i - 1; j >= 0; j--) {
        const prevLine = lines[j];
        // Stop at function boundary
        if (/^\s*export\s+(async\s+)?function|^\s*export\s+const\s+\w+\s*=/.test(prevLine)) {
          break;
        }
        if (/const\s+firestore\s*=\s*getFirebaseFirestore\(\)/.test(prevLine)) {
          hasLocalFirestore = true;
          break;
        }
      }

      if (!hasLocalFirestore) {
        // Find the start of this statement
        // Look backwards for a line that isn't part of a continuation
        let statementStart = i;
        for (let j = i - 1; j >= 0; j--) {
          const prevLine = lines[j];
          // If previous line ends with a semicolon, comma (not in parens), or opening brace, we've found the start
          if (/;\s*$|{\s*$/.test(prevLine) && !prevLine.trim().startsWith('//')) {
            break;
          }
          // If it's a blank line or comment, stop
          if (prevLine.trim() === '' || prevLine.trim().startsWith('//')) {
            break;
          }
          // If it's a const/let/var declaration, this is the start
          if (/^\s*(const|let|var)\s+/.test(prevLine)) {
            statementStart = j;
            break;
          }
          statementStart = j;
        }

        // Insert the firestore check before the statement
        const indent = lines[statementStart].match(/^(\s*)/)[1];
        newLines.push(indent + 'const firestore = getFirebaseFirestore();');
        newLines.push(indent + 'if (!firestore) throw new Error(\'Database not configured\');');
        newLines.push('');

        // Now add all the lines from statementStart to current
        for (let j = statementStart; j <=  i; j++) {
          newLines.push(lines[j]);
        }
        i++;
        continue;
      }
    }

    newLines.push(line);
    i++;
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
  'src/app/api/admin/support/route.ts',
  'src/app/api/admin/system/route.ts',
  'src/app/api/admin/users/route.ts'
];

let fixed = 0;
files.forEach(f => { if (fixFile(f)) fixed++; });
console.log('Fixed ' + fixed + '/' + files.length + ' files');
