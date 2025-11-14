import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { firestore } from '@/lib/core/firebase/client';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { logger } from '@/lib/core/logging/logger';
import { HubspotAdapter } from '@/lib/features/integrations/HubspotAdapter';
import { SalesforceAdapter } from '@/lib/features/integrations/SalesforceAdapter';
import { ZohoCRMAdapter } from '@/lib/features/integrations/ZohoCRMAdapter';
import { handleApiError } from '@/lib/features/auth/utils';
import { TokenRefreshService } from '@/lib/features/integrations/TokenRefreshService';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


// Define types for CRM contacts
interface HubspotContact {
  id: string;
  properties: {
    firstname?: string;
    lastname?: string;
    email?: string;
    phone?: string;
    company?: string;
  };
}

interface SalesforceContact {
  Id: string;
  Name: string;
  Email?: string;
  Phone?: string;
  Account?: {
    Name?: string;
  };
}

interface ZohoContact {
  id: string;
  Full_Name?: string;
  First_Name?: string;
  Last_Name?: string;
  Email?: string;
  Phone?: string;
  Account_Name?: {
    name?: string;
  };
}

export async function GET(request: NextRequest) {
  try {
    // Get the user session
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = session.user.email;
    
    // Get the user's CRM connections
    const connectionsRef = collection(firestore, 'crmConnections');
    const connectionsQuery = query(connectionsRef, where('userId', '==', userId));
    const connectionsSnapshot = await getDocs(connectionsQuery);
    
    if (connectionsSnapshot.empty) {
      return NextResponse.json({ contacts: [] });
    }
    
    // Fetch contacts from each connected CRM
    const contactsPromises = connectionsSnapshot.docs.map(async (doc) => {
      const connection = doc.data();
      const platform = connection.platform;
      const connectionId = doc.id;
      let tokens = connection.tokens;
      
      try {
        // Check if token is expired and refresh if needed
        tokens = await TokenRefreshService.refreshTokenIfNeeded(
          userId,
          connectionId,
          platform,
          tokens
        );
        
        const accessToken = tokens.accessToken;
        
        // Fetch contacts based on platform
        let platformContacts = [];
        
        switch (platform) {
          case 'hubspot':
            const hubspotContacts = await HubspotAdapter.getContacts(accessToken);
            platformContacts = hubspotContacts.map((contact: HubspotContact) => ({
              id: contact.id,
              name: `${contact.properties.firstname || ''} ${contact.properties.lastname || ''}`.trim(),
              email: contact.properties.email || '',
              phone: contact.properties.phone || '',
              company: contact.properties.company || '',
              platform: 'hubspot'
            }));
            break;
            
          case 'salesforce':
            const instanceUrl = tokens.instanceUrl;
            const salesforceContacts = await SalesforceAdapter.getContacts(accessToken, instanceUrl);
            platformContacts = salesforceContacts.map((contact: SalesforceContact) => ({
              id: contact.Id,
              name: contact.Name,
              email: contact.Email || '',
              phone: contact.Phone || '',
              company: contact.Account?.Name || '',
              platform: 'salesforce'
            }));
            break;
            
          case 'zoho':
            const zohoContacts = await ZohoCRMAdapter.getContacts(accessToken);
            platformContacts = zohoContacts.map((contact: ZohoContact) => ({
              id: contact.id,
              name: contact.Full_Name || `${contact.First_Name || ''} ${contact.Last_Name || ''}`.trim(),
              email: contact.Email || '',
              phone: contact.Phone || '',
              company: contact.Account_Name?.name || '',
              platform: 'zoho'
            }));
            break;
            
          default:
            // Skip unsupported platforms
            return [];
        }
        
        return platformContacts;
      } catch (err) {
        logger.error('Error fetching contacts from CRM', { 
          platform, 
          connectionId, 
          error: err instanceof Error ? err.message : String(err) 
        });
        return []; // Return empty array for failed platforms
      }
    });
    
    // Wait for all contacts to be fetched
    const contactsArrays = await Promise.all(contactsPromises);
    
    // Flatten the array of arrays
    const allContacts = contactsArrays.flat();
    
    return NextResponse.json({ contacts: allContacts });
  } catch (error) {
    logger.error('Error retrieving CRM contacts', { error });
    
    return NextResponse.json(
      handleApiError(error, '/api/crm/contacts', 'retrieving CRM contacts'),
      { status: 500 }
    );
  }
} 