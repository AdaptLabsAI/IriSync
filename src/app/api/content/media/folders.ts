import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '../../../../lib/core/firebase/admin';
import { verifyAuthentication } from '../../../../lib/auth/utils';
import { v4 as uuidv4 } from 'uuid';

const firestore = getFirestore();

// GET: List folders (optionally by parentId)
export async function GET(req: NextRequest) {
  try {
    const userId = await verifyAuthentication(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const parentId = searchParams.get('parentId');
    let query: any = firestore.collection('users').doc(userId).collection('mediaFolders');
    if (parentId) query = query.where('parentId', '==', parentId);
    const snapshot = await query.orderBy('createdAt', 'asc').get();
    const folders = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate(), updatedAt: doc.data().updatedAt?.toDate() }));
    return NextResponse.json({ folders });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to list folders', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

// POST: Create folder
export async function POST(req: NextRequest) {
  try {
    const userId = await verifyAuthentication(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { name, parentId } = await req.json();
    if (!name || typeof name !== 'string') return NextResponse.json({ error: 'Folder name required' }, { status: 400 });
    const folderId = uuidv4();
    const now = new Date();
    const folderData = { name, parentId: parentId || null, createdAt: now, updatedAt: now };
    await firestore.collection('users').doc(userId).collection('mediaFolders').doc(folderId).set(folderData);
    return NextResponse.json({ id: folderId, ...folderData });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create folder', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

// PUT: Rename/move folder
export async function PUT(req: NextRequest) {
  try {
    const userId = await verifyAuthentication(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id, name, parentId } = await req.json();
    if (!id) return NextResponse.json({ error: 'Folder id required' }, { status: 400 });
    const update: any = { updatedAt: new Date() };
    if (name) update.name = name;
    if (parentId !== undefined) update.parentId = parentId;
    await firestore.collection('users').doc(userId).collection('mediaFolders').doc(id).update(update);
    return NextResponse.json({ id, ...update });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update folder', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

// DELETE: Delete folder
export async function DELETE(req: NextRequest) {
  try {
    const userId = await verifyAuthentication(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'Folder id required' }, { status: 400 });
    await firestore.collection('users').doc(userId).collection('mediaFolders').doc(id).delete();
    // Optionally: move or delete media in this folder
    return NextResponse.json({ id, deleted: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete folder', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
} 