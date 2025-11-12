import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Configure Google Cloud Storage
const storage = new Storage({
  projectId: process.env.FIREBASE_PROJECT_ID,
  credentials: JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}')
});

const bucket = storage.bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '');

// Allowed file types for documents
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated for secure uploads
    // For job applications, we allow unauthenticated uploads
    const session = await getServerSession(authOptions);
    const isAuthenticated = !!session;
    
    // Parse form data with file
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string | null; // 'resume' or 'coverLetter'
    
    // Validate file
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF and Word documents are allowed.' },
        { status: 400 }
      );
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds the 10MB limit.' },
        { status: 400 }
      );
    }
    
    // Get file buffer
    const buffer = await file.arrayBuffer();
    
    // Generate unique filename
    const fileExtension = file.name.split('.').pop();
    const uniqueFilename = `${uuidv4()}.${fileExtension}`;
    
    // Determine storage path based on authentication status and file type
    let storagePath;
    
    if (isAuthenticated) {
      // For authenticated users, store in a user-specific folder
      storagePath = `documents/${(session?.user as any)?.id || session?.user?.email || 'unknown'}/${type || 'other'}/${uniqueFilename}`;
    } else {
      // For job applicants (unauthenticated), store in a temporary folder
      // These will be moved to a permanent location when the application is submitted
      storagePath = `documents/applications/temp/${type || 'other'}/${uniqueFilename}`;
    }
    
    // Create a new blob in the bucket
    const blob = bucket.file(storagePath);
    
    // Create a write stream and upload the file
    const blobStream = blob.createWriteStream({
      resumable: false,
      metadata: {
        contentType: file.type,
        metadata: {
          originalFilename: file.name,
          uploadedBy: isAuthenticated ? (session?.user as any)?.id || session?.user?.email || 'unknown' : 'anonymous',
          timestamp: new Date().toISOString()
        }
      }
    });
    
    // Handle success and error
    const uploadPromise = new Promise<string>((resolve, reject) => {
      blobStream.on('error', (err) => {
        reject(err);
      });
      
      blobStream.on('finish', async () => {
        // Make the file publicly accessible (optional)
        if (!isAuthenticated) {
          await blob.makePublic();
        }
        
        // Generate signed URL that expires in 7 days (for authenticated users)
        // or a public URL (for unauthenticated users)
        let fileUrl;
        
        if (isAuthenticated) {
          const [url] = await blob.getSignedUrl({
            action: 'read',
            expires: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
          });
          fileUrl = url;
        } else {
          fileUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
        }
        
        resolve(fileUrl);
      });
    });
    
    // Write the buffer to the blob stream
    blobStream.end(Buffer.from(buffer));
    
    // Wait for the upload to complete
    const fileUrl = await uploadPromise;
    
    // Return the file URL
    return NextResponse.json({
      url: fileUrl,
      filename: file.name,
      storagePath
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
} 