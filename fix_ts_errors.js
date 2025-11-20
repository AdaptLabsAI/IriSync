#!/usr/bin/env node
/**
 * Script to systematically fix TypeScript errors across the codebase.
 */

const fs = require('fs');
const path = require('path');

function fixCheckAdminAccess(content) {
  // Fix checkAdminAccess that returns NextResponse -> throw Error
  return content.replace(
    /async function checkAdminAccess\([^)]+\): Promise<boolean> \{[\s\S]*?const (firestore|firestoreDb) = getFirebaseFirestore\(\);[\s\S]*?if \(!\1\) \{\s*return NextResponse\.json\(\{ error: ['"]([^'"]+)['"] \}, \{ status: \d+ \}\);?\s*\}/g,
    (match) => {
      return match.replace(
        /return NextResponse\.json\(\{ error: ['"]([^'"]+)['"] \}, \{ status: \d+ \}\)/,
        "throw new Error('$1')"
      );
    }
  );
}

function fixImplicitAnyParams(content) {
  // Fix implicit any in forEach, map, filter, etc.
  const patterns = [
    [/\.forEach\(\((\w+)\) =>/g, '.forEach(($1: any) =>'],
    [/\.map\(\((\w+)\) =>/g, '.map(($1: any) =>'],
    [/\.filter\(\((\w+)\) =>/g, '.filter(($1: any) =>'],
    [/\.find\(\((\w+)\) =>/g, '.find(($1: any) =>'],
    [/\.some\(\((\w+)\) =>/g, '.some(($1: any) =>'],
    [/\.every\(\((\w+)\) =>/g, '.every(($1: any) =>'],
  ];

  for (const [pattern, replacement] of patterns) {
    content = content.replace(pattern, replacement);
  }

  return content;
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    let newContent = content;

    // Apply fixes
    newContent = fixCheckAdminAccess(newContent);
    newContent = fixImplicitAnyParams(newContent);

    // Only write if changed
    if (newContent !== content) {
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
