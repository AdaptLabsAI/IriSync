const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get all files with TS2769 errors
const output = execSync('npx tsc --noEmit 2>&1', { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
const lines = output.split('\n');
const files = new Set();

lines.forEach(line => {
  if (line.includes('TS2769')) {
    const match = line.match(/^([^(]+)\(/);
    if (match) {
      files.add(match[1]);
    }
  }
});

console.log('Found ' + files.size + ' files with TS2769 errors');

// Fix each file
let fixedCount = 0;
files.forEach(relativePath => {
  const fullPath = path.join(__dirname, relativePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log('Skipping (not found): ' + relativePath);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  const original = content;

  // Strategy: Replace all occurrences where firestore is used from import
  // Add local firestore with null check at start of each function that uses it

  // Replace pattern: collection(firestore, ... -> collection(db, ...
  // But first add: const db = getFirebaseFirestore(); if (!db) throw...
  
  // Simpler: just replace the firestore import with a function call everywhere
  // Replace: where('fieldName', '==', value) patterns that use the global firestore

  // Easiest: Rename the imported firestore to _firestore and create local firestore
  // Replace the import line first
  content = content.replace(
    /import\s+{\s*([^}]*?)\bgetFirebaseFirestore\b([^}]*?)\bfirestore\b([^}]*?)}\s+from\s+(['"]@\/lib\/core\/firebase['"])/,
    function(match, before, between, after, quote) {
      // Remove firestore from import, keep getFirebaseFirestore
      const cleaned = (before + between + after)
        .split(',')
        .map(s => s.trim())
        .filter(s => s && s !== 'firestore')
        .join(', ');
      return 'import { ' + cleaned + ' } from ' + quote;
    }
  );

  // Now add const firestore = getFirebaseFirestore() at the start of functions that need it
  // Find all functions
  const functionStarts = [];
  const regex = /^(\s*)(export\s+)?((async\s+)?function\s+\w+|const\s+\w+\s*=.*?(?:async\s+)?(?:\([^)]*\)|[^=>]+)\s*=>)/gm;
  
  let match;
  while ((match = regex.exec(content)) !== null) {
    functionStarts.push({
      index: match.index,
      indent: match[1],
      declaration: match[0]
    });
  }

  // For each function, check if it uses Firestore functions
  // If so, add the firestore initialization
  let offset = 0;
  functionStarts.forEach(func => {
    // Find the opening brace after this function declaration
    let braceIndex = content.indexOf('{', func.index + func.declaration.length + offset);
    if (braceIndex === -1) return;

    // Find the closing brace
    let braceCount = 1;
    let closeBraceIndex = braceIndex + 1;
    while (closeBraceIndex < content.length && braceCount > 0) {
      if (content[closeBraceIndex] === '{') braceCount++;
      if (content[closeBraceIndex] === '}') braceCount--;
      closeBraceIndex++;
    }

    const funcBody = content.substring(braceIndex, closeBraceIndex);
    
    // Check if this function uses Firestore operations
    const usesFirestore = /\b(collection|doc|query|getDocs|getDoc|setDoc|updateDoc|deleteDoc|addDoc|writeBatch)\s*\(/.test(funcBody);
    const hasFirestoreInit = /const\s+firestore\s*=\s*getFirebaseFirestore\(\)/.test(funcBody);

    if (usesFirestore && !hasFirestoreInit) {
      // Add firestore initialization after the opening brace
      const insertion = '\n' + func.indent + '  const firestore = getFirebaseFirestore();\n' +
                       func.indent + '  if (!firestore) throw new Error(\'Database not configured\');\n';
      
      const insertPos = braceIndex + 1 + offset;
      content = content.substring(0, insertPos) + insertion + content.substring(insertPos);
      offset += insertion.length;
    }
  });

  if (content !== original) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log('✓ ' + relativePath);
    fixedCount++;
  }
});

console.log('\nFixed ' + fixedCount + ' files');
