import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseFirestore } from '@/lib/core/firebase';
import { getAuth } from '@/lib/core/firebase/admin';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { logger } from '@/lib/core/logging/logger';
import { Parser as Json2CsvParser } from 'json2csv';
import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


// Admin check middleware (simplified version)
async function isAdmin(request: NextRequest): Promise<boolean> {
  try {
    const auth = getAuth();
    let token = request.headers.get('authorization');
    if (!token || !token.startsWith('Bearer ')) {
      return false;
    }
    
    token = token.replace('Bearer ', '');
    const decoded = await auth.verifyIdToken(token);
    return decoded.role === 'admin' || decoded.role === 'super_admin';
  } catch (error) {
    logger.error('Error checking admin status', { error });
    return false;
  }
}

export async function GET(request: NextRequest) {
  // Admin-only endpoint
  const admin = await isAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Parse request URL for filters
    if (!request.url) {
      return NextResponse.json({ error: 'Request URL is required' }, { status: 400 });
    }
    
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const priority = url.searchParams.get('priority');
    const userId = url.searchParams.get('userId');
    const assignedTo = url.searchParams.get('assignedTo');
    const tag = url.searchParams.get('tag');
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');
    const format = url.searchParams.get('format') || 'csv';
    
    // Build query with filters
    const filters: any[] = [];
    if (status) filters.push(where('status', '==', status));
    if (priority) filters.push(where('priority', '==', priority));
    if (userId) filters.push(where('userId', '==', userId));
    if (assignedTo) filters.push(where('assignedTo', '==', assignedTo));
    
    // Execute query
    const firestore = getFirebaseFirestore();
    if (!firestore) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }
    const ticketsQuery = query(
      collection(firestore, 'supportTickets'),
      ...filters,
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(ticketsQuery);
    let tickets = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        subject: data.subject || '',
        userId: data.userId || '',
        status: data.status || 'open',
        priority: data.priority || 'medium',
        assignedTo: data.assignedTo || '',
        tags: Array.isArray(data.tags) ? data.tags.join(', ') : '',
        createdAt: formatTimestamp(data.createdAt),
        updatedAt: formatTimestamp(data.updatedAt),
        firstResponseAt: formatTimestamp(data.firstResponseAt),
        closedAt: formatTimestamp(data.closedAt),
        satisfactionRating: data.satisfactionRating || '',
        escalated: data.escalated ? 'Yes' : 'No',
        convertedToForum: data.convertedToForum ? 'Yes' : 'No',
        forumPostId: data.forumPostId || '',
      };
    });
    
    // Apply filters that can't be done in Firestore
    if (tag) {
      tickets = tickets.filter((t: any) => 
        t.tags && t.tags.split(', ').includes(tag)
      );
    }
    
    if (dateFrom) {
      const from = new Date(dateFrom);
      tickets = tickets.filter((t: any) => {
        const date = t.createdAt ? new Date(t.createdAt) : null;
        return date && date >= from;
      });
    }
    
    if (dateTo) {
      const to = new Date(dateTo);
      tickets = tickets.filter((t: any) => {
        const date = t.createdAt ? new Date(t.createdAt) : null;
        return date && date <= to;
      });
    }
    
    // Generate export based on format
    if (format === 'csv') {
      return generateCsvExport(tickets);
    } else if (format === 'pdf') {
      return generatePdfExport(tickets);
    } else {
      return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
    }
  } catch (error: any) {
    logger.error('Error exporting tickets', { error });
    return NextResponse.json({ 
      error: 'Failed to export tickets', 
      details: error.message 
    }, { status: 500 });
  }
}

// Helper function to format timestamps
function formatTimestamp(timestamp: any): string {
  if (!timestamp) return '';
  
  try {
    if (typeof timestamp === 'string') {
      return new Date(timestamp).toISOString();
    }
    
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000).toISOString();
    }
    
    return '';
  } catch (error) {
    return '';
  }
}

// Generate CSV export
async function generateCsvExport(tickets: any[]) {
  const fields = [
    'id', 
    'subject', 
    'userId', 
    'status', 
    'priority', 
    'assignedTo', 
    'tags', 
    'createdAt', 
    'updatedAt', 
    'firstResponseAt', 
    'closedAt', 
    'satisfactionRating', 
    'escalated',
    'convertedToForum',
    'forumPostId'
  ];
  
  const json2csvParser = new Json2CsvParser({ fields });
  const csv = json2csvParser.parse(tickets);
  
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename=support-tickets-export.csv`
    }
  });
}

// Generate PDF export
async function generatePdfExport(tickets: any[]) {
  // Create a PDF document
  const doc = new PDFDocument();
  const chunks: Buffer[] = [];
  
  // Collect chunks
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  
  // Add content to PDF
  doc.fontSize(20).text('Support Tickets Export', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Export Date: ${new Date().toLocaleDateString()}`);
  doc.moveDown();
  doc.fontSize(12).text(`Total Tickets: ${tickets.length}`);
  doc.moveDown();
  
  // Table header
  const tableTop = 150;
  const tableHeaders = ['ID', 'Subject', 'Status', 'Priority', 'Assigned To', 'Created At'];
  const columnWidth = 90;
  
  doc.fontSize(10);
  tableHeaders.forEach((header, i) => {
    doc.text(header, 50 + (i * columnWidth), tableTop, { width: columnWidth });
  });
  
  // Draw a line under the header
  doc.moveTo(50, tableTop + 20)
     .lineTo(50 + tableHeaders.length * columnWidth, tableTop + 20)
     .stroke();
  
  // Table rows
  let rowTop = tableTop + 30;
  const maxRowsPerPage = 25;
  let rowCount = 0;
  
  tickets.forEach((ticket, index) => {
    // Add a new page if needed
    if (rowCount >= maxRowsPerPage) {
      doc.addPage();
      rowTop = 50;
      rowCount = 0;
    }
    
    // Draw ticket data
    doc.text(ticket.id.substring(0, 8) + '...', 50, rowTop, { width: columnWidth });
    doc.text(ticket.subject.substring(0, 20) + (ticket.subject.length > 20 ? '...' : ''), 50 + columnWidth, rowTop, { width: columnWidth });
    doc.text(ticket.status, 50 + (columnWidth * 2), rowTop, { width: columnWidth });
    doc.text(ticket.priority, 50 + (columnWidth * 3), rowTop, { width: columnWidth });
    doc.text(ticket.assignedTo || 'Unassigned', 50 + (columnWidth * 4), rowTop, { width: columnWidth });
    doc.text(ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : '', 50 + (columnWidth * 5), rowTop, { width: columnWidth });
    
    rowTop += 20;
    rowCount++;
  });
  
  // Finalize the PDF
  doc.end();
  
  // Wait for PDF generation to complete
  return new Promise<NextResponse>((resolve) => {
    doc.on('end', () => {
      const buffer = Buffer.concat(chunks);
      resolve(new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename=support-tickets-export.pdf`
        }
      }));
    });
  });
} 