#!/usr/bin/env node
/**
 * Script to fix all direct firestore references by replacing them with firestoreDb
 * and adding null checks.
 */

const fs = require('fs');
const path = require('path');

function fixFirestoreReferences(content) {
  const lines = content.split('\n');
  const result = [];
  let modified = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check if line uses firestore directly (not firestoreDb)
    const usesFirestoreDirectly = (
      (trimmed.includes('collection(firestore,') ||
       trimmed.includes('doc(firestore,') ||
       trimmed.includes('collectionGroup(firestore,')) &&
      !trimmed.includes('firestoreDb')
    );

    if (usesFirestoreDirectly) {
      // Check if we already have firestoreDb defined nearby
      let hasFirestoreDb = false;
      for (let j = Math.max(0, i - 15); j < Math.min(lines.length, i + 5); j++) {
        if (lines[j].includes('const firestoreDb = getFirebaseFirestore()')) {
          hasFirestoreDb = true;
          break;
        }
      }

      // If not, add it before this block
      if (!hasFirestoreDb) {
        const indent = line.match(/^(\s*)/)[1];
        result.push(indent + 'const firestoreDb = getFirebaseFirestore();');
        result.push(indent + 'if (!firestoreDb) throw new Error(\'Database not configured\');');
        result.push('');
        modified = true;
      }

      // Replace firestore with firestoreDb
      const modifiedLine = line
        .replace(/collection\(firestore,/g, 'collection(firestoreDb,')
        .replace(/doc\(firestore,/g, 'doc(firestoreDb,')
        .replace(/collectionGroup\(firestore,/g, 'collectionGroup(firestoreDb,');

      result.push(modifiedLine);
      modified = true;
    } else {
      result.push(line);
    }
  }

  return { content: result.join('\n'), modified };
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Only process files that use firestore from firebase import
    if (!content.includes("from '@/lib/core/firebase'") &&
        !content.includes('from "@/lib/core/firebase"')) {
      return false;
    }

    const { content: newContent, modified } = fixFirestoreReferences(content);

    if (modified) {
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
