const fs = require('fs');
const path = require('path');

// Read the file list
const fileList = fs.readFileSync(path.join(__dirname, 'files-missing-firestore.txt'), 'utf8')
  .split('\n')
  .map(line => line.trim())
  .filter(line => line && !line.endsWith(':'));

console.log(`Processing ${fileList.length} files...`);

let fixed = 0;

for (const relativeFilePath of fileList) {
  const filePath = path.join(process.cwd(), relativeFilePath);

  if (!fs.existsSync(filePath)) {
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;

  // For each function that uses firestore, add const firestore = getFirebaseFirestore(); at the top
  // Strategy: Find functions that use firestore and add declaration at start of function

  const lines = content.split('\n');
  const newLines = [];
  let inFunction = false;
  let functionIndent = '';
  let needsFirestoreDecl = false;
  let alreadyHasDecl = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if this is a function declaration
    if (line.match(/^\s*(const|function|async function)\s+\w+\s*=?\s*(async\s*)?\([^)]*\)\s*[{=]/) ||
        line.match(/^\s*export\s+(const|function|async function)\s+/) ||
        line.match(/^\s*(const|let|var)\s+\w+\s*=\s*(async\s*)?\([^)]*\)\s*=>/)) {
      inFunction = true;
      const match = line.match(/^(\s*)/);
      functionIndent = match ? match[1] : '';
      needsFirestoreDecl = false;
      alreadyHasDecl = false;
    }

    // Check if firestore is used in this line
    if (inFunction && !alreadyHasDecl && line.match(/[^a-zA-Z]firestore[^a-zA-Z]/) && !line.includes('getFirebaseFirestore')) {
      needsFirestoreDecl = true;
    }

    // Check if already has firestore declaration
    if (inFunction && line.includes('const firestore = getFirebaseFirestore()')) {
      alreadyHasDecl = true;
      needsFirestoreDecl = false;
    }

    // If we see an opening brace for the function and need firestore, add declaration
    if (inFunction && needsFirestoreDecl && !alreadyHasDecl && line.trim() === '{') {
      newLines.push(line);
      newLines.push(`${functionIndent}  const firestore = getFirebaseFirestore();`);
      alreadyHasDecl = true;
      continue;
    }

    // If function has arrow syntax, check for =>
    if (inFunction && needsFirestoreDecl && !alreadyHasDecl && line.includes('=>')) {
      if (line.trim().endsWith('{')) {
        // Arrow function with braces on same line
        newLines.push(line);
        newLines.push(`${functionIndent}  const firestore = getFirebaseFirestore();`);
        alreadyHasDecl = true;
        continue;
      }
    }

    newLines.push(line);
  }

  content = newLines.join('\n');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ ${relativeFilePath}`);
    fixed++;
  }
}

console.log(`\nFixed ${fixed} files`);
