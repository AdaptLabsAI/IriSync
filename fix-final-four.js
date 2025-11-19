const fs = require('fs');
const path = require('path');

const filesToFix = [
  { file: 'src/lib/features/content/models/contentService.ts', line: 19 },
  { file: 'src/lib/features/monitoring/EngagementService.ts', line: 310 },
  { file: 'src/lib/features/monitoring/SocialListeningService.ts', line: 616 },
  { file: 'src/lib/features/team/TeamService.ts', line: 308 }
];

for (const { file } of filesToFix) {
  const filePath = path.join(process.cwd(), file);

  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${file} - not found`);
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Fix the pattern: const xQuery = const firestore = getFirebaseFirestore();...query(...)
  // Replace with: const firestore = getFirebaseFirestore(); if (!firestore) return; const xQuery = query(...)

  content = content.replace(
    /const (\w+Query) = const firestore = getFirebaseFirestore\(\);\s*if \(!firestore\) \{\s*return NextResponse\.json\(\{ error: 'Database not configured' \}, \{ status: 500 \}\);\s*\}\s*query\(/g,
    (match, varName) => {
      return `const firestore = getFirebaseFirestore();\n    if (!firestore) {\n      return 0;\n    }\n    const ${varName} = query(`;
    }
  );

  // Also handle cases where it might throw instead of returning
  content = content.replace(
    /const (\w+Query) = const firestore = getFirebaseFirestore\(\);\s*if \(!firestore\) \{\s*throw new Error\('Database not configured'\);\s*\}\s*query\(/g,
    (match, varName) => {
      return `const firestore = getFirebaseFirestore();\n    if (!firestore) {\n      throw new Error('Database not configured');\n    }\n    const ${varName} = query(`;
    }
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✓ Fixed ${file}`);
}

console.log('\nDone!');
