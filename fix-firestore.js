const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Starting Firestore null safety fix...\n');

// Get all files that import firestore
const files = execSync(
  'cd src && find . -type f \\( -name "*.ts" -o -name "*.tsx" \\) -not -path "*/__tests__/*" -not -path "*/node_modules/*" | xargs grep -l "import { firestore } from" || true',
  { encoding: 'utf8' }
).trim().split('\n').filter(Boolean).map(f => path.join('src', f.substring(2)));

console.log(`Found ${files.length} files to fix\n`);

let fixedCount = 0;

files.forEach((file, index) => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;

    // Step 1: Replace import statement
    content = content.replace(
      /import \{ firestore \} from (['"])(@\/lib\/core\/firebase|\.\.\/\.\.\/core\/firebase|\.\.\/core\/firebase)\1;?/g,
      "import { getFirebaseFirestore } from $1$2$1;"
    );

    // Step 2: Add null check at the start of functions that use firestore
    // Pattern: Look for collection(firestore, or doc(firestore, usage
    if (content.includes('collection(firestore,') || content.includes('doc(firestore,')) {
      // For API routes (Next.js 13+ route handlers)
      if (content.includes('export async function GET') ||
          content.includes('export async function POST') ||
          content.includes('export async function PUT') ||
          content.includes('export async function DELETE') ||
          content.includes('export async function PATCH')) {

        // Add firestore check in route handlers
        content = content.replace(
          /(export async function (GET|POST|PUT|DELETE|PATCH)[^{]*\{)\n(\s+)(try \{)?/g,
          (match, funcDecl, method, indent, tryBlock) => {
            const check = `\n${indent}const firestore = getFirebaseFirestore();\n${indent}if (!firestore) {\n${indent}  return NextResponse.json({ error: 'Database not configured' }, { status: 500 });\n${indent}}\n`;
            if (tryBlock) {
              return `${funcDecl}${check}\n${indent}${tryBlock}`;
            }
            return `${funcDecl}${check}`;
          }
        );

        // Add NextResponse import if not present
        if (!content.includes('import { NextResponse }') && !content.includes('import{NextResponse}')) {
          content = content.replace(
            /(import.*from ['"]next\/server['"];?\n)/,
            "$1"
          );
          if (!content.includes("from 'next/server'") && !content.includes('from "next/server"')) {
            content = "import { NextResponse } from 'next/server';\n" + content;
          }
        }
      }

      // For React components and pages
      else if (content.includes('export default function') || content.includes('const ') && content.includes('= ()')) {
        // Add inline checks before firestore usage in useEffect, etc.
        // This is complex, so we'll do simple replacement
        content = content.replace(
          /(\s+)(const \w+Ref = (?:collection|doc)\()firestore,/g,
          "$1const firestore = getFirebaseFirestore();\n$1if (!firestore) { console.error('Firestore not configured'); return; }\n$1$2firestore,"
        );
      }

      // For service classes
      else if (content.includes('export class ') && content.includes('Service')) {
        // Add getFirestore helper method if not already present
        if (!content.includes('getFirestore()')) {
          content = content.replace(
            /(export class \w+Service \{)/,
            `$1\n  private getFirestore() {\n    const firestore = getFirebaseFirestore();\n    if (!firestore) throw new Error('Firestore not configured');\n    return firestore;\n  }\n`
          );

          // Replace firestore usages in methods with this.getFirestore()
          content = content.replace(
            /((?:collection|doc|query|getDocs|getDoc|addDoc|updateDoc|deleteDoc|runTransaction)\()firestore,/g,
            (match, func) => {
              // Don't replace if it's already using this.getFirestore()
              if (content.substring(content.indexOf(match) - 20, content.indexOf(match)).includes('this.getFirestore()')) {
                return match;
              }
              return match.replace('firestore,', 'this.getFirestore(),');
            }
          );

          // Add Firestore import from firebase/firestore if not present
          if (!content.includes('import { Firestore }') && !content.includes('import type { Firestore }')) {
            content = content.replace(
              /(import \{[^}]+\} from ['"]firebase\/firestore['"];?)/,
              (match) => {
                if (match.includes('Firestore')) return match;
                return match.replace(/(import \{)/, '$1 Firestore,');
              }
            );
          }
        }
      }

      // For other files (utils, helpers, etc.)
      else {
        // Add const firestore = getFirebaseFirestore() at function start
        // Replace direct firestore usage
        content = content.replace(
          /(async function \w+[^{]*\{)\n(\s+)/g,
          "$1\n$2const firestore = getFirebaseFirestore();\n$2if (!firestore) throw new Error('Firestore not configured');\n$2"
        );
      }
    }

    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      fixedCount++;
      console.log(`✓ [${index + 1}/${files.length}] Fixed: ${file}`);
    } else {
      console.log(`  [${index + 1}/${files.length}] Skipped (no changes): ${file}`);
    }
  } catch (error) {
    console.error(`✗ [${index + 1}/${files.length}] Error fixing ${file}:`, error.message);
  }
});

console.log(`\n${'='.repeat(60)}`);
console.log(`Fixed: ${fixedCount} files`);
console.log(`Total processed: ${files.length} files`);
console.log(`${'='.repeat(60)}\n`);
