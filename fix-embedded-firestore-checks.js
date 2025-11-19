const fs = require('fs');
const path = require('path');

// Files with embedded firestore checks in function calls
const filesToFix = [
  'src/lib/features/credits/CreditService.ts',
  'src/lib/webhooks/WebhookService.ts',
  'src/lib/subscription/validate.ts',
  'src/lib/subscription/suspension-middleware.ts',
  'src/lib/subscription/SubscriptionService.ts'
];

let totalFixed = 0;

function fixFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${filePath} - file not found`);
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;

  // Find and fix patterns where firestore check is embedded inside function calls
  // This is a complex pattern, so we'll do it line by line

  const lines = content.split('\n');
  let modified = false;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Check if this line has a function call followed by firestore check on next line
    if (line.trim().match(/^(const \w+ = )?(await )?(getDoc|getDocs|setDoc|updateDoc|deleteDoc|query)\(/)) {
      // Check if next line has "const firestore = getFirebaseFirestore();"
      if (i + 1 < lines.length && lines[i + 1].trim() === 'const firestore = getFirebaseFirestore();') {
        // Found the pattern - need to extract and move firestore check before the function call

        // Get the indentation
        const indent = line.match(/^(\s*)/)[1];

        // Find the closing parenthesis of the function call
        let parenDepth = 0;
        let endLine = i;
        let foundStart = false;

        for (let j = i; j < lines.length; j++) {
          for (let char of lines[j]) {
            if (char === '(') {
              parenDepth++;
              foundStart = true;
            }
            if (char === ')') parenDepth--;
            if (foundStart && parenDepth === 0) {
              endLine = j;
              break;
            }
          }
          if (foundStart && parenDepth === 0) break;
        }

        // Extract the firestore check lines (should be lines i+1 through i+4 or so)
        const checkLines = [];
        let checkEndLine = i + 1;

        // Look for the pattern:
        // const firestore = getFirebaseFirestore();
        // if (!firestore) {
        //   return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
        // }

        if (i + 4 < lines.length &&
            lines[i + 1].includes('const firestore = getFirebaseFirestore()') &&
            lines[i + 2].includes('if (!firestore)') &&
            lines[i + 3].includes('return') &&
            lines[i + 4].includes('}')) {

          // Remove these lines from their current position
          checkLines.push(
            `${indent}const firestore = getFirebaseFirestore();`,
            `${indent}if (!firestore) {`,
            lines[i + 3], // Keep the return line as-is
            `${indent}}`
          );

          // Remove the embedded check lines
          lines.splice(i + 1, 4);

          // Insert check before the function call
          lines.splice(i, 0, ...checkLines, '');

          modified = true;
          i += checkLines.length + 1; // Skip past what we just inserted
          continue;
        }
      }
    }

    i++;
  }

  if (modified) {
    content = lines.join('\n');
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }

  return false;
}

for (const file of filesToFix) {
  const filePath = path.join(process.cwd(), file);

  if (fixFile(filePath)) {
    console.log(`✓ Fixed ${file}`);
    totalFixed++;
  } else {
    console.log(`- No automatic fix for ${file} - may need manual correction`);
  }
}

console.log(`\nFixed ${totalFixed} files with embedded firestore checks`);
