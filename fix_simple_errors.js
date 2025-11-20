#!/usr/bin/env node
/**
 * Script to fix ONLY the simple, safe error patterns
 */

const fs = require('fs');
const path = require('path');

function fixFile(content) {
  let modified = false;

  // Fix 1: Change checkAdminAccess return NextResponse -> throw Error
  const oldCheckAdmin = /if \(!(?:firestore|firestoreDb)\) \{\s*return NextResponse\.json\(\{ error: ['"]([^'"]+)['"] \}, \{ status: \d+ \}\);?\s*\}/g;
  if (oldCheckAdmin.test(content)) {
    content = content.replace(oldCheckAdmin, "if (!firestoreDb) {\n    throw new Error('$1');\n  }");
    modified = true;
  }

  // Fix 2: Add : any to doc parameter in forEach/map
  content = content.replace(/\.forEach\(\(doc\) =>/g, '.forEach((doc: any) =>');
  content = content.replace(/\.map\(\(doc\) =>/g, '.map((doc: any) =>');

  // Fix 3: Add : any to result parameter
  content = content.replace(/\.map\(\(result\) =>/g, '.map((result: any) =>');
  content = content.replace(/\.filter\(\(result\) =>/g, '.filter((result: any) =>');

  return { content, modified };
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { content: newContent, modified } = fixFile(content);

    if (modified || newContent !== content) {
      fs.writeFileSync(filePath, newContent, 'utf-8');
      console.log(`Fixed: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

function getAllTsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== 'dist') {
        getAllTsFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  }

  return fileList;
}

function main() {
  const srcDir = path.join(__dirname, 'src');
  const tsFiles = getAllTsFiles(srcDir);

  console.log(`Found ${tsFiles.length} TypeScript files`);

  let changedCount = 0;
  for (const file of tsFiles) {
    if (processFile(file)) {
      changedCount++;
    }
  }

  console.log(`\nProcessed ${tsFiles.length} files, modified ${changedCount} files`);
}

main();
