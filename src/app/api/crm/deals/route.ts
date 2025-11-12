import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { firestore } from '@/lib/firebase/client';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { logger } from '@/lib/logging/logger';
import { HubspotAdapter } from '@/lib/integrations/HubspotAdapter';
import { SalesforceAdapter } from '@/lib/integrations/SalesforceAdapter';
import { ZohoCRMAdapter } from '@/lib/integrations/ZohoCRMAdapter';
import { PipedriveAdapter } from '@/lib/integrations/PipedriveAdapter';
import { DynamicsCRMAdapter } from '@/lib/integrations/DynamicsCRMAdapter';
import { SugarCRMAdapter } from '@/lib/integrations/SugarCRMAdapter';
import { handleApiError } from '@/lib/auth/utils';
import { TokenRefreshService } from '@/lib/integrations/TokenRefreshService';

// Type definitions for CRM deals
interface HubspotDeal {
  id: string;
  properties: {
    dealname?: string;
    amount?: string;
    dealstage?: string;
    closedate?: string;
    company?: string;
  };
  associations?: {
    companies?: {
      results: Array<{name?: string}>;
    };
  };
}

interface SalesforceDeal {
  Id: string;
  Name: string;
  Amount: number | null;
  StageName: string;
  CloseDate: string;
  Account?: {
    Name?: string;
  };
}

interface ZohoDeal {
  id: string;
  Deal_Name: string;
  Amount: number | null;
  Stage: string;
  Closing_Date: string;
  Account_Name?: {
    name?: string;
  };
}

interface PipedriveDeal {
  id: number;
  title: string;
  value?: number;
  stage_id?: number;
  expected_close_date?: string;
  org_name?: string;
}

interface DynamicsDeal {
  opportunityid: string;
  name: string;
  estimatedvalue?: number;
  stepname?: string;
  actualclosedate?: string;
  _parentaccountid_value?: string;
}

interface SugarCRMDeal {
  id: string;
  name: string;
  amount?: string;
  sales_stage?: string;
  date_closed?: string;
  account_name?: string;
}

// Standardized deal interface
interface DealData {
  id: string;
  name: string;
  amount?: number | null;
  stage?: string;
  closeDate?: string;
  company?: string;
  platform: string;
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
      return NextResponse.json({ deals: [] });
    }
    
    // Fetch deals from each connected CRM
    const dealsPromises = connectionsSnapshot.docs.map(async (doc) => {
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
        
        // Fetch deals based on platform
        let platformDeals: DealData[] = [];
        
        switch (platform) {
          case 'hubspot':
            const hubspotDeals = await HubspotAdapter.getDeals(accessToken);
            platformDeals = hubspotDeals.map((deal: HubspotDeal) => ({
              id: deal.id,
              name: deal.properties.dealname || 'Unnamed Deal',
              amount: deal.properties.amount ? parseFloat(deal.properties.amount) : null,
              stage: deal.properties.dealstage || 'Unknown',
              closeDate: deal.properties.closedate,
              company: deal.properties.company || deal.associations?.companies?.results[0]?.name,
              platform: 'hubspot'
            }));
            break;
            
          case 'salesforce':
            const instanceUrl = tokens.instanceUrl;
            const salesforceDeals = await SalesforceAdapter.getDeals(accessToken, instanceUrl);
            platformDeals = salesforceDeals.map((deal: SalesforceDeal) => ({
              id: deal.Id,
              name: deal.Name,
              amount: deal.Amount,
              stage: deal.StageName,
              closeDate: deal.CloseDate,
              company: deal.Account?.Name,
              platform: 'salesforce'
            }));
            break;
            
          case 'zoho':
            const zohoDeals = await ZohoCRMAdapter.getDeals(accessToken);
            platformDeals = zohoDeals.map((deal: ZohoDeal) => ({
              id: deal.id,
              name: deal.Deal_Name,
              amount: deal.Amount,
              stage: deal.Stage,
              closeDate: deal.Closing_Date,
              company: deal.Account_Name?.name,
              platform: 'zoho'
            }));
            break;
            
          case 'pipedrive':
            const pipedriveDeals = await PipedriveAdapter.getDeals(accessToken);
            platformDeals = pipedriveDeals.map((deal: PipedriveDeal) => ({
              id: deal.id.toString(),
              name: deal.title,
              amount: deal.value,
              stage: `Stage ${deal.stage_id}`, // Pipedrive uses stage IDs, we could fetch stage names in a production app
              closeDate: deal.expected_close_date,
              company: deal.org_name,
              platform: 'pipedrive'
            }));
            break;
            
          case 'dynamics':
            const dynamicsInstanceUrl = tokens.instanceUrl;
            const dynamicsDeals = await DynamicsCRMAdapter.getDeals(accessToken, dynamicsInstanceUrl);
            platformDeals = dynamicsDeals.map((deal: DynamicsDeal) => ({
              id: deal.opportunityid,
              name: deal.name,
              amount: deal.estimatedvalue,
              stage: deal.stepname,
              closeDate: deal.actualclosedate,
              company: deal._parentaccountid_value, // In a production app, we'd resolve this to an account name
              platform: 'dynamics'
            }));
            break;
            
          case 'sugarcrm':
            const sugarDeals = await SugarCRMAdapter.getDeals(accessToken);
            platformDeals = sugarDeals.map((deal: SugarCRMDeal) => ({
              id: deal.id,
              name: deal.name,
              amount: deal.amount ? parseFloat(deal.amount) : null,
              stage: deal.sales_stage,
              closeDate: deal.date_closed,
              company: deal.account_name,
              platform: 'sugarcrm'
            }));
            break;
            
          default:
            // Skip unsupported platforms
            logger.warn(`Unsupported CRM platform for deals: ${platform}`);
            return [];
        }
        
        return platformDeals;
      } catch (err) {
        logger.error('Error fetching deals from CRM', { 
          platform, 
          connectionId, 
          error: err instanceof Error ? err.message : String(err) 
        });
        return []; // Return empty array for failed platforms
      }
    });
    
    // Wait for all deals to be fetched
    const dealsArrays = await Promise.all(dealsPromises);
    
    // Flatten the array of arrays
    const allDeals = dealsArrays.flat();
    
    return NextResponse.json({ deals: allDeals });
  } catch (error) {
    logger.error('Error retrieving CRM deals', { error });
    
    return NextResponse.json(
      handleApiError(error, '/api/crm/deals', 'retrieving CRM deals'),
      { status: 500 }
    );
  }
} 