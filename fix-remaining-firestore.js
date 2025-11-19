const fs = require('fs');
const {execSync} = require('child_process');

// Get all files with firestore errors
const output = execSync('npx tsc --noEmit 2>&1 | grep "Cannot find name .firestore" | cut -d"(" -f1 | sort -u', {encoding: 'utf8'});
const files = output.trim().split('\n').filter(Boolean);

console.log(`Found ${files.length} files with firestore errors\n`);

files.forEach((file, i) => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;
    
    // Replace any remaining direct firestore usage with getFirebaseFirestore()
    const lines = content.split('\n');
    const newLines = [];
    let firestoreAdded = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // If we see collection(firestore or doc(firestore and haven't added const yet
      if ((line.includes('collection(firestore') || line.includes('doc(firestore')) && !firestoreAdded) {
        // Add const firestore = getFirebaseFirestore() with null check before this line
        const indent = line.match(/^\s*/)[0];
        newLines.push(`${indent}const firestore = getFirebaseFirestore();`);
        newLines.push(`${indent}if (!firestore) {`);
        newLines.push(`${indent}  return NextResponse.json({ error: 'Database not configured' }, { status: 500 });`);
        newLines.push(`${indent}}`);
        firestoreAdded = true;
      }
      
      newLines.push(line);
    }
    
    content = newLines.join('\n');
    
    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`✓ [${i+1}/${files.length}] Fixed: ${file}`);
    }
  } catch (error) {
    console.error(`✗ [${i+1}/${files.length}] Error: ${file}:`, error.message);
  }
});
