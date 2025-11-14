import { NextRequest, NextResponse } from 'next/server';
import { auth, storage } from '@/lib/core/firebase/admin';
import { v4 as uuidv4 } from 'uuid';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Parse form data
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Validate file types and sizes
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ];

    const maxFileSize = 10 * 1024 * 1024; // 10MB
    const uploadedUrls: string[] = [];

    for (const file of files) {
      // Validate file type
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({ 
          error: `File type ${file.type} is not allowed` 
        }, { status: 400 });
      }

      // Validate file size
      if (file.size > maxFileSize) {
        return NextResponse.json({ 
          error: `File ${file.name} exceeds maximum size of 10MB` 
        }, { status: 400 });
      }

      // Generate unique filename
      const fileExtension = file.name.split('.').pop();
      const fileName = `support-tickets/${userId}/${uuidv4()}.${fileExtension}`;

      try {
        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to Firebase Storage
        const bucket = storage.bucket();
        const fileRef = bucket.file(fileName);

        await fileRef.save(buffer, {
          metadata: {
            contentType: file.type,
            metadata: {
              originalName: file.name,
              uploadedBy: userId,
              uploadedAt: new Date().toISOString()
            }
          }
        });

        // Make file publicly readable
        await fileRef.makePublic();

        // Get public URL
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        uploadedUrls.push(publicUrl);

      } catch (uploadError) {
        console.error('Error uploading file:', uploadError);
        return NextResponse.json({ 
          error: `Failed to upload file ${file.name}` 
        }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      success: true,
      urls: uploadedUrls,
      count: uploadedUrls.length
    });

  } catch (error) {
    console.error('Error in upload endpoint:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 