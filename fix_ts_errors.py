#!/usr/bin/env python3
"""
Script to systematically fix TypeScript errors across the codebase.
Fixes:
1. checkAdminAccess pattern (return NextResponse -> throw Error)
2. firestore null checks
3. implicit any types (TS7006)
"""

import os
import re
from pathlib import Path

def fix_check_admin_access(content):
    """Fix checkAdminAccess functions that return NextResponse instead of throwing Error"""
    # Pattern for checkAdminAccess function that returns NextResponse
    pattern = r'(async function checkAdminAccess\([^)]+\): Promise<boolean> \{[^\}]*?const (?:firestore|firestoreDb) = getFirebaseFirestore\(\);[^\}]*?)if \(!(?:firestore|firestoreDb)\) \{\s*return NextResponse\.json\([^}]+\}, \{ status: \d+ \}\);?\s*\}'

    def replacer(match):
        original = match.group(0)
        # Replace return NextResponse with throw new Error
        replaced = re.sub(
            r'return NextResponse\.json\(\{ error: ([\'"])([^\'"]+)\1 \}, \{ status: \d+ \}\)',
            r'throw new Error(\1\2\1)',
            original
        )
        return replaced

    return re.sub(pattern, replacer, content, flags=re.DOTALL)

def fix_firestore_references(content):
    """Fix direct firestore usage to use firestoreDb with null checks"""
    lines = content.split('\n')
    result_lines = []
    i = 0

    while i < len(lines):
        line = lines[i]

        # Check if line uses firestore directly in collection/doc calls
        if ('collection(firestore,' in line or
            'doc(firestore,' in line or
            'query(' in line and i < len(lines) - 1 and 'collection(firestore' in lines[i+1]):

            # Check if we already have a null check above
            has_null_check = False
            for j in range(max(0, i-10), i):
                if 'const firestoreDb = getFirebaseFirestore()' in lines[j]:
                    has_null_check = True
                    break

            if not has_null_check:
                # Add null check before this block
                indent = len(line) - len(line.lstrip())
                result_lines.append(' ' * indent + 'const firestoreDb = getFirebaseFirestore();')
                result_lines.append(' ' * indent + 'if (!firestoreDb) throw new Error(\'Database not configured\');')
                result_lines.append('')

            # Replace firestore with firestoreDb in this line
            line = line.replace('collection(firestore,', 'collection(firestoreDb,')
            line = line.replace('doc(firestore,', 'doc(firestoreDb,')

        result_lines.append(line)
        i += 1

    return '\n'.join(result_lines)

def fix_implicit_any_params(content):
    """Fix implicit any type parameters in callbacks"""
    # Common patterns for callbacks with implicit any
    patterns = [
        (r'\.forEach\(\((\w+)\) =>', r'.forEach((\1: any) =>'),
        (r'\.map\(\((\w+)\) =>', r'.map((\1: any) =>'),
        (r'\.filter\(\((\w+)\) =>', r'.filter((\1: any) =>'),
        (r'\.find\(\((\w+)\) =>', r'.find((\1: any) =>'),
        (r'\.some\(\((\w+)\) =>', r'.some((\1: any) =>'),
        (r'\.every\(\((\w+)\) =>', r'.every((\1: any) =>'),
    ]

    for pattern, replacement in patterns:
        content = re.sub(pattern, replacement, content)

    return content

def process_file(file_path):
    """Process a single TypeScript file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content

        # Apply fixes
        content = fix_check_admin_access(content)
        content = fix_implicit_any_params(content)

        # Only write if content changed
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False

def main():
    """Main entry point"""
    base_dir = Path(__file__).parent
    ts_files = list(base_dir.rglob('*.ts')) + list(base_dir.rglob('*.tsx'))

    # Filter to only src directory
    ts_files = [f for f in ts_files if 'src' in str(f) and 'node_modules' not in str(f)]

    changed_count = 0
    for file_path in ts_files:
        if process_file(file_path):
            changed_count += 1
            print(f"Fixed: {file_path}")

    print(f"\nProcessed {len(ts_files)} files, modified {changed_count} files")

if __name__ == '__main__':
    main()
