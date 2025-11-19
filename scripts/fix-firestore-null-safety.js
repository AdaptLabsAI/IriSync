/**
 * Automated Firestore Null Safety Fixer
 *
 * This script systematically fixes all Firestore null safety issues by:
 * 1. Finding files that import { firestore } from firebase config
 * 2. Adding null checks before firestore usage
 * 3. Converting to use getFirebaseFirestore() with proper error handling
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Pattern 1: Service classes (add getFirestore helper method)
const SERVICE_PATTERN = /export class \w+Service/;

// Pattern 2: API routes and pages (inline null check)
const API_ROUTE_PATTERN = /(export async function (GET|POST|PUT|DELETE|PATCH)|async function handler)/;

/**
 * Fix a service class file
 */
function fixServiceClass(filePath, content) {
  console.log(`Fixing service class: ${filePath}`);

  // Replace import
  content = content.replace(
    /import \{ firestore \} from ['"](@\/lib\/core\/firebase|\.\.\/\.\.\/core\/firebase|\.\.\/core\/firebase)['"]/,
    `import { getFirebaseFirestore } from '$1';\nimport { Firestore } from 'firebase/firestore'`
  );

  // Add getFirestore helper after class declaration
  const classMatch = content.match(/(export class \w+Service \{)/);
  if (classMatch) {
    const insertion = `
  /**
   * Get Firestore instance with null check
   */
  private getFirestore(): Firestore {
    const firestore = getFirebaseFirestore();
    if (!firestore) {
      throw new Error('Firestore not configured');
    }
    return firestore;
  }
`;
    content = content.replace(classMatch[0], classMatch[0] + insertion);
  }

  // Replace all method-level firestore usages with const firestore = this.getFirestore();
  // Find all async methods
  content = content.replace(
    /(async \w+\([^)]*\)[^{]*\{)\n(\s+)(try \{)?/g,
    (match, methodDecl, indent, tryBlock) => {
      if (tryBlock) {
        return `${methodDecl}\n${indent}${tryBlock}\n${indent}  const firestore = this.getFirestore();`;
      }
      return `${methodDecl}\n${indent}const firestore = this.getFirestore();`;
    }
  );

  return content;
}

/**
 * Fix an API route or page file
 */
function fixAPIRoute(filePath, content) {
  console.log(`Fixing API route/page: ${filePath}`);

  // Replace import
  content = content.replace(
    /import \{ firestore \} from ['"](@\/lib\/core\/firebase|\.\.\/\.\.\/core\/firebase|\.\.\/core\/firebase)['"]/,
    `import { getFirebaseFirestore } from '$1'`
  );

  // Add null check at start of route handlers
  content = content.replace(
    /(export async function (GET|POST|PUT|DELETE|PATCH)[^{]*\{)\n(\s+)(try \{)?/g,
    (match, funcDecl, indent, tryBlock) => {
      const check = `${indent}const firestore = getFirebaseFirestore();\n${indent}if (!firestore) {\n${indent}  return NextResponse.json({ error: 'Database not configured' }, { status: 500 });\n${indent}}`;
      if (tryBlock) {
        return `${funcDecl}\n${check}\n\n${indent}${tryBlock}`;
      }
      return `${funcDecl}\n${check}`;
    }
  );

  return content;
}

/**
 * Fix a React component/page
 */
function fixComponent(filePath, content) {
  console.log(`Fixing component: ${filePath}`);

  // Replace import
  content = content.replace(
    /import \{ firestore \} from ['"](@\/lib\/core\/firebase|\.\.\/\.\.\/core\/firebase|\.\.\/core\/firebase)['"]/,
    `import { getFirebaseFirestore } from '$1'`
  );

  // Add null check in useEffect and async functions
  // This is trickier - we'll add inline checks before each collection/doc call
  content = content.replace(
    /(const \w+Ref = (?:collection|doc)\()firestore,/g,
    (match) => {
      return `const firestore = getFirebaseFirestore();\n    if (!firestore) {\n      console.error('Firestore not configured');\n      return;\n    }\n    ${match}`;
    }
  );

  return content;
}

/**
 * Determine file type and apply appropriate fix
 */
function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Skip if already using getFirebaseFirestore
  if (content.includes('getFirebaseFirestore()')) {
    console.log(`Skipping ${filePath} - already fixed`);
    return false;
  }

  // Skip if not importing firestore
  if (!content.includes("import { firestore }") && !content.match(/from ['"]@\/lib\/core\/firebase['"]/)) {
    return false;
  }

  const original = content;

  // Determine file type and fix
  if (SERVICE_PATTERN.test(content)) {
    content = fixServiceClass(filePath, content);
  } else if (API_ROUTE_PATTERN.test(content) || filePath.includes('/api/')) {
    content = fixAPIRoute(filePath, content);
  } else if (filePath.includes('/components/') || filePath.endsWith('.tsx')) {
    content = fixComponent(filePath, content);
  }

  // Only write if content changed
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Fixed: ${filePath}`);
    return true;
  }

  return false;
}

/**
 * Main execution
 */
async function main() {
  console.log('Starting Firestore null safety fix...\n');

  // Get all TypeScript/TSX files
  const files = await glob('src/**/*.{ts,tsx}', {
    ignore: ['**/*.test.ts', '**/*.spec.ts', '**/__tests__/**', '**/node_modules/**'],
    cwd: process.cwd(),
    absolute: true
  });

  console.log(`Found ${files.length} files to check\n`);

  let fixedCount = 0;
  let errorCount = 0;

  for (const file of files) {
    try {
      if (fixFile(file)) {
        fixedCount++;
      }
    } catch (error) {
      console.error(`✗ Error fixing ${file}:`, error.message);
      errorCount++;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Fixed: ${fixedCount} files`);
  console.log(`Errors: ${errorCount} files`);
  console.log(`Total checked: ${files.length} files`);
  console.log(`${'='.repeat(60)}`);
}

main().catch(console.error);
