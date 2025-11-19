const fs = require('fs');
const path = require('path');

// Files with query syntax issues based on TypeScript errors
const filesToFix = [
  'src/app/api/support/tickets/export/route.ts',
  'src/lib/features/analytics/reporting/scheduler.ts',
  'src/lib/features/content/models/contentService.ts',
  'src/lib/features/credits/CreditService.ts',
  'src/lib/features/monitoring/EngagementService.ts',
  'src/lib/features/monitoring/SocialListeningService.ts',
  'src/lib/features/platforms/utils/platformUtils.ts',
  'src/lib/features/team/TeamService.ts',
  'src/lib/utils/platformConnectionChecker.ts',
  'src/lib/webhooks/WebhookService.ts',
  'src/lib/subscription/validate.ts',
  'src/lib/subscription/suspension-middleware.ts',
  'src/lib/subscription/SubscriptionService.ts'
];

let totalFixed = 0;

for (const file of filesToFix) {
  const filePath = path.join(process.cwd(), file);

  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${file} - file not found`);
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;

  // Fix pattern: query() call with firestore check inside it
  // Pattern 1: query(\n      const firestore = getFirebaseFirestore()...
  content = content.replace(
    /query\(\s*const firestore = getFirebaseFirestore\(\);\s*if \(!firestore\) \{\s*return NextResponse\.json\(\{ error: 'Database not configured' \}, \{ status: 500 \}\);\s*\}\s*collection\(firestore,/g,
    (match) => {
      return `const firestore = getFirebaseFirestore();\n    if (!firestore) {\n      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });\n    }\n    query(\n      collection(firestore,`;
    }
  );

  // Pattern 2: Similar but without NextResponse (for non-API-route files)
  content = content.replace(
    /const connectionsQuery = query\(\s*const firestore = getFirebaseFirestore\(\);\s*if \(!firestore\) \{\s*return NextResponse\.json\(\{ error: 'Database not configured' \}, \{ status: 500 \}\);\s*\}\s*collection\(firestore,/g,
    (match) => {
      return `const firestore = getFirebaseFirestore();\n    if (!firestore) {\n      throw new Error('Database not configured');\n    }\n    const connectionsQuery = query(\n      collection(firestore,`;
    }
  );

  // Pattern 3: Any remaining query( with embedded firestore check
  content = content.replace(
    /(\w+Query|platformsQuery|webhooksQuery|attemptsQuery|q) = query\(\s*const firestore = getFirebaseFirestore\(\);\s*if \(!firestore\) \{\s*return NextResponse\.json\(\{ error: 'Database not configured' \}, \{ status: 500 \}\);\s*\}\s*collection\(firestore,/g,
    (match, varName) => {
      return `const firestore = getFirebaseFirestore();\n    if (!firestore) {\n      throw new Error('Database not configured');\n    }\n    const ${varName} = query(\n      collection(firestore,`;
    }
  );

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Fixed ${file}`);
    totalFixed++;
  } else {
    console.log(`- No changes needed for ${file}`);
  }
}

console.log(`\nFixed ${totalFixed} files with query syntax issues`);
