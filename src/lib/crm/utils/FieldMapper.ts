// CRM Field Mapper Utility
// Handles field mapping between different CRM platforms and our standardized data format

import { logger } from '@/lib/logging/logger';
import { CRMPlatform } from '../types';
import { ContactData } from '../models/Contact';
import { DealData } from '../models/Deal';
import { LeadData } from '../models/Lead';

/**
 * Field mapping configuration for each platform
 */
interface FieldMapping {
  [standardField: string]: string | ((data: any) => any);
}

/**
 * Platform field mappings
 */
interface PlatformMappings {
  [platform: string]: {
    contact: FieldMapping;
    deal: FieldMapping;
    lead: FieldMapping;
  };
}

/**
 * Field mapper for CRM data transformation
 */
export class FieldMapper {
  private static mappings: PlatformMappings = {
    [CRMPlatform.HUBSPOT]: {
      contact: {
        firstName: 'firstname',
        lastName: 'lastname',
        email: 'email',
        phone: 'phone',
        mobilePhone: 'mobilephone',
        company: 'company',
        jobTitle: 'jobtitle',
        department: 'department',
        website: 'website',
        leadSource: 'hs_lead_source',
        notes: 'notes',
        address: (data: any) => ({
          street: data.address,
          city: data.city,
          state: data.state,
          postalCode: data.zip,
          country: data.country
        }),
        createdAt: (data: any) => new Date(data.createdate),
        updatedAt: (data: any) => new Date(data.lastmodifieddate)
      },
      deal: {
        name: 'dealname',
        amount: 'amount',
        stage: 'dealstage',
        probability: (data: any) => data.hs_probability ? parseFloat(data.hs_probability) : undefined,
        closeDate: (data: any) => data.closedate ? new Date(data.closedate) : undefined,
        description: 'description',
        companyName: 'hs_associated_company',
        contactName: 'hs_associated_contact',
        leadSource: 'hs_lead_source',
        dealSource: 'source',
        createdAt: (data: any) => new Date(data.createdate),
        updatedAt: (data: any) => new Date(data.hs_lastmodifieddate)
      },
      lead: {
        firstName: 'firstname',
        lastName: 'lastname',
        email: 'email',
        phone: 'phone',
        mobilePhone: 'mobilephone',
        company: 'company',
        jobTitle: 'jobtitle',
        industry: 'industry',
        website: 'website',
        status: 'hs_lead_status',
        leadSource: 'hs_lead_source',
        rating: 'rating',
        leadScore: (data: any) => data.hubspotscore ? parseInt(data.hubspotscore) : undefined,
        notes: 'notes',
        address: (data: any) => ({
          street: data.address,
          city: data.city,
          state: data.state,
          postalCode: data.zip,
          country: data.country
        }),
        createdAt: (data: any) => new Date(data.createdate),
        updatedAt: (data: any) => new Date(data.lastmodifieddate)
      }
    },
    [CRMPlatform.SALESFORCE]: {
      contact: {
        firstName: 'FirstName',
        lastName: 'LastName',
        email: 'Email',
        phone: 'Phone',
        mobilePhone: 'MobilePhone',
        company: 'Account.Name',
        jobTitle: 'Title',
        department: 'Department',
        leadSource: 'LeadSource',
        notes: 'Description',
        address: (data: any) => ({
          street: data.MailingStreet,
          city: data.MailingCity,
          state: data.MailingState,
          postalCode: data.MailingPostalCode,
          country: data.MailingCountry
        }),
        createdAt: (data: any) => new Date(data.CreatedDate),
        updatedAt: (data: any) => new Date(data.LastModifiedDate)
      },
      deal: {
        name: 'Name',
        amount: 'Amount',
        stage: 'StageName',
        probability: 'Probability',
        closeDate: (data: any) => data.CloseDate ? new Date(data.CloseDate) : undefined,
        description: 'Description',
        companyName: 'Account.Name',
        contactName: 'Contact.Name',
        leadSource: 'LeadSource',
        dealSource: 'Type',
        createdAt: (data: any) => new Date(data.CreatedDate),
        updatedAt: (data: any) => new Date(data.LastModifiedDate)
      },
      lead: {
        firstName: 'FirstName',
        lastName: 'LastName',
        email: 'Email',
        phone: 'Phone',
        mobilePhone: 'MobilePhone',
        company: 'Company',
        jobTitle: 'Title',
        industry: 'Industry',
        website: 'Website',
        status: 'Status',
        leadSource: 'LeadSource',
        rating: 'Rating',
        notes: 'Description',
        address: (data: any) => ({
          street: data.Street,
          city: data.City,
          state: data.State,
          postalCode: data.PostalCode,
          country: data.Country
        }),
        createdAt: (data: any) => new Date(data.CreatedDate),
        updatedAt: (data: any) => new Date(data.LastModifiedDate)
      }
    },
    [CRMPlatform.ZOHO]: {
      contact: {
        firstName: 'First_Name',
        lastName: 'Last_Name',
        email: 'Email',
        phone: 'Phone',
        mobilePhone: 'Mobile',
        company: 'Account_Name',
        jobTitle: 'Title',
        department: 'Department',
        leadSource: 'Lead_Source',
        notes: 'Description',
        address: (data: any) => ({
          street: data.Mailing_Street,
          city: data.Mailing_City,
          state: data.Mailing_State,
          postalCode: data.Mailing_Zip,
          country: data.Mailing_Country
        }),
        createdAt: (data: any) => new Date(data.Created_Time),
        updatedAt: (data: any) => new Date(data.Modified_Time)
      },
      deal: {
        name: 'Deal_Name',
        amount: 'Amount',
        stage: 'Stage',
        probability: (data: any) => data.Probability ? parseFloat(data.Probability) : undefined,
        closeDate: (data: any) => data.Closing_Date ? new Date(data.Closing_Date) : undefined,
        description: 'Description',
        companyName: 'Account_Name',
        contactName: 'Contact_Name',
        leadSource: 'Lead_Source',
        dealSource: 'Deal_Category',
        createdAt: (data: any) => new Date(data.Created_Time),
        updatedAt: (data: any) => new Date(data.Modified_Time)
      },
      lead: {
        firstName: 'First_Name',
        lastName: 'Last_Name',
        email: 'Email',
        phone: 'Phone',
        mobilePhone: 'Mobile',
        company: 'Company',
        jobTitle: 'Title',
        industry: 'Industry',
        website: 'Website',
        status: 'Lead_Status',
        leadSource: 'Lead_Source',
        rating: 'Rating',
        notes: 'Description',
        address: (data: any) => ({
          street: data.Street,
          city: data.City,
          state: data.State,
          postalCode: data.Zip_Code,
          country: data.Country
        }),
        createdAt: (data: any) => new Date(data.Created_Time),
        updatedAt: (data: any) => new Date(data.Modified_Time)
      }
    },
    [CRMPlatform.PIPEDRIVE]: {
      contact: {
        firstName: (data: any) => data.name ? data.name.split(' ')[0] : '',
        lastName: (data: any) => data.name ? data.name.split(' ').slice(1).join(' ') : '',
        email: (data: any) => data.email?.[0]?.value || '',
        phone: (data: any) => data.phone?.[0]?.value || '',
        company: 'org_name',
        jobTitle: 'job_title',
        notes: 'notes',
        createdAt: (data: any) => new Date(data.add_time),
        updatedAt: (data: any) => new Date(data.update_time)
      },
      deal: {
        name: 'title',
        amount: 'value',
        stage: 'stage_name',
        probability: (data: any) => data.probability || 0,
        closeDate: (data: any) => data.expected_close_date ? new Date(data.expected_close_date) : undefined,
        companyName: 'org_name',
        contactName: 'person_name',
        dealSource: 'source',
        createdAt: (data: any) => new Date(data.add_time),
        updatedAt: (data: any) => new Date(data.update_time)
      },
      lead: {
        firstName: (data: any) => data.person_name ? data.person_name.split(' ')[0] : '',
        lastName: (data: any) => data.person_name ? data.person_name.split(' ').slice(1).join(' ') : '',
        email: (data: any) => data.email || '',
        phone: (data: any) => data.phone || '',
        company: 'organization_name',
        notes: 'note',
        createdAt: (data: any) => new Date(data.add_time),
        updatedAt: (data: any) => new Date(data.update_time)
      }
    },
    [CRMPlatform.DYNAMICS]: {
      contact: {
        firstName: 'firstname',
        lastName: 'lastname',
        email: 'emailaddress1',
        phone: 'telephone1',
        mobilePhone: 'mobilephone',
        company: '_parentcustomerid_value@OData.Community.Display.V1.FormattedValue',
        jobTitle: 'jobtitle',
        department: 'department',
        notes: 'description',
        address: (data: any) => ({
          street: data.address1_line1,
          city: data.address1_city,
          state: data.address1_stateorprovince,
          postalCode: data.address1_postalcode,
          country: data.address1_country
        }),
        createdAt: (data: any) => new Date(data.createdon),
        updatedAt: (data: any) => new Date(data.modifiedon)
      },
      deal: {
        name: 'name',
        amount: 'estimatedvalue',
        stage: 'salesstagecode@OData.Community.Display.V1.FormattedValue',
        probability: 'closeprobability',
        closeDate: (data: any) => data.estimatedclosedate ? new Date(data.estimatedclosedate) : undefined,
        description: 'description',
        companyName: '_customerid_value@OData.Community.Display.V1.FormattedValue',
        createdAt: (data: any) => new Date(data.createdon),
        updatedAt: (data: any) => new Date(data.modifiedon)
      },
      lead: {
        firstName: 'firstname',
        lastName: 'lastname',
        email: 'emailaddress1',
        phone: 'telephone1',
        mobilePhone: 'mobilephone',
        company: 'companyname',
        jobTitle: 'jobtitle',
        industry: 'industrycode@OData.Community.Display.V1.FormattedValue',
        website: 'websiteurl',
        status: 'statuscode@OData.Community.Display.V1.FormattedValue',
        rating: 'leadqualitycode@OData.Community.Display.V1.FormattedValue',
        notes: 'description',
        address: (data: any) => ({
          street: data.address1_line1,
          city: data.address1_city,
          state: data.address1_stateorprovince,
          postalCode: data.address1_postalcode,
          country: data.address1_country
        }),
        createdAt: (data: any) => new Date(data.createdon),
        updatedAt: (data: any) => new Date(data.modifiedon)
      }
    },
    [CRMPlatform.SUGARCRM]: {
      contact: {
        firstName: 'first_name',
        lastName: 'last_name',
        email: 'email1',
        phone: 'phone_work',
        mobilePhone: 'phone_mobile',
        company: 'account_name',
        jobTitle: 'title',
        department: 'department',
        notes: 'description',
        address: (data: any) => ({
          street: data.primary_address_street,
          city: data.primary_address_city,
          state: data.primary_address_state,
          postalCode: data.primary_address_postalcode,
          country: data.primary_address_country
        }),
        createdAt: (data: any) => new Date(data.date_entered),
        updatedAt: (data: any) => new Date(data.date_modified)
      },
      deal: {
        name: 'name',
        amount: 'amount',
        stage: 'sales_stage',
        probability: (data: any) => data.probability ? parseFloat(data.probability) : undefined,
        closeDate: (data: any) => data.date_closed ? new Date(data.date_closed) : undefined,
        description: 'description',
        companyName: 'account_name',
        createdAt: (data: any) => new Date(data.date_entered),
        updatedAt: (data: any) => new Date(data.date_modified)
      },
      lead: {
        firstName: 'first_name',
        lastName: 'last_name',
        email: 'email1',
        phone: 'phone_work',
        mobilePhone: 'phone_mobile',
        company: 'account_name',
        jobTitle: 'title',
        industry: 'industry',
        website: 'website',
        status: 'status',
        rating: 'lead_source',
        notes: 'description',
        address: (data: any) => ({
          street: data.primary_address_street,
          city: data.primary_address_city,
          state: data.primary_address_state,
          postalCode: data.primary_address_postalcode,
          country: data.primary_address_country
        }),
        createdAt: (data: any) => new Date(data.date_entered),
        updatedAt: (data: any) => new Date(data.date_modified)
      }
    }
  };

  /**
   * Map contact data from platform format to standard format
   */
  static mapContactFromPlatform(
    platformData: any,
    platform: CRMPlatform,
    externalId: string
  ): ContactData {
    try {
      const mapping = this.mappings[platform]?.contact;
      if (!mapping) {
        logger.warn(`No contact mapping found for platform: ${platform}`);
        return this.createDefaultContact(platformData, externalId);
      }

      const mappedData = this.applyMapping(platformData, mapping);
      
      return {
        externalId,
        platform,
        ...mappedData
      } as ContactData;
    } catch (error) {
      logger.error('Error mapping contact from platform', { platform, error });
      return this.createDefaultContact(platformData, externalId);
    }
  }

  /**
   * Map deal data from platform format to standard format
   */
  static mapDealFromPlatform(
    platformData: any,
    platform: CRMPlatform,
    externalId: string
  ): DealData {
    try {
      const mapping = this.mappings[platform]?.deal;
      if (!mapping) {
        logger.warn(`No deal mapping found for platform: ${platform}`);
        return this.createDefaultDeal(platformData, externalId);
      }

      const mappedData = this.applyMapping(platformData, mapping);
      
      return {
        externalId,
        platform,
        ...mappedData
      } as DealData;
    } catch (error) {
      logger.error('Error mapping deal from platform', { platform, error });
      return this.createDefaultDeal(platformData, externalId);
    }
  }

  /**
   * Map lead data from platform format to standard format
   */
  static mapLeadFromPlatform(
    platformData: any,
    platform: CRMPlatform,
    externalId: string
  ): LeadData {
    try {
      const mapping = this.mappings[platform]?.lead;
      if (!mapping) {
        logger.warn(`No lead mapping found for platform: ${platform}`);
        return this.createDefaultLead(platformData, externalId);
      }

      const mappedData = this.applyMapping(platformData, mapping);
      
      return {
        externalId,
        platform,
        ...mappedData
      } as LeadData;
    } catch (error) {
      logger.error('Error mapping lead from platform', { platform, error });
      return this.createDefaultLead(platformData, externalId);
    }
  }

  /**
   * Map contact data from standard format to platform format
   */
  static mapContactToPlatform(
    contactData: ContactData,
    platform: CRMPlatform
  ): any {
    try {
      const mapping = this.mappings[platform]?.contact;
      if (!mapping) {
        logger.warn(`No contact mapping found for platform: ${platform}`);
        return contactData;
      }

      return this.reverseMapping(contactData, mapping);
    } catch (error) {
      logger.error('Error mapping contact to platform', { platform, error });
      return contactData;
    }
  }

  /**
   * Map deal data from standard format to platform format
   */
  static mapDealToPlatform(
    dealData: DealData,
    platform: CRMPlatform
  ): any {
    try {
      const mapping = this.mappings[platform]?.deal;
      if (!mapping) {
        logger.warn(`No deal mapping found for platform: ${platform}`);
        return dealData;
      }

      return this.reverseMapping(dealData, mapping);
    } catch (error) {
      logger.error('Error mapping deal to platform', { platform, error });
      return dealData;
    }
  }

  /**
   * Map lead data from standard format to platform format
   */
  static mapLeadToPlatform(
    leadData: LeadData,
    platform: CRMPlatform
  ): any {
    try {
      const mapping = this.mappings[platform]?.lead;
      if (!mapping) {
        logger.warn(`No lead mapping found for platform: ${platform}`);
        return leadData;
      }

      return this.reverseMapping(leadData, mapping);
    } catch (error) {
      logger.error('Error mapping lead to platform', { platform, error });
      return leadData;
    }
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Apply field mapping to data
   */
  private static applyMapping(data: any, mapping: FieldMapping): any {
    const result: any = {};

    for (const [standardField, platformField] of Object.entries(mapping)) {
      if (typeof platformField === 'function') {
        try {
          result[standardField] = platformField(data);
        } catch (error) {
          logger.debug(`Error applying function mapping for field ${standardField}`, { error });
          result[standardField] = undefined;
        }
      } else {
        result[standardField] = this.getNestedValue(data, platformField);
      }
    }

    return result;
  }

  /**
   * Reverse mapping from standard format to platform format
   */
  private static reverseMapping(data: any, mapping: FieldMapping): any {
    const result: any = {};

    for (const [standardField, platformField] of Object.entries(mapping)) {
      const value = data[standardField];
      
      if (value !== undefined && value !== null) {
        if (typeof platformField === 'string') {
          this.setNestedValue(result, platformField, value);
        }
        // Skip function mappings in reverse direction for now
      }
    }

    return result;
  }

  /**
   * Get nested value from object using dot notation
   */
  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Set nested value in object using dot notation
   */
  private static setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop();
    
    if (!lastKey) return;

    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);

    target[lastKey] = value;
  }

  /**
   * Create default contact when mapping fails
   */
  private static createDefaultContact(data: any, externalId: string): ContactData {
    return {
      externalId,
      platform: CRMPlatform.HUBSPOT, // Default platform
      firstName: data.firstName || data.first_name || '',
      lastName: data.lastName || data.last_name || '',
      email: data.email || data.emailaddress1 || '',
      phone: data.phone || data.telephone1 || '',
      company: data.company || data.account_name || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Create default deal when mapping fails
   */
  private static createDefaultDeal(data: any, externalId: string): DealData {
    return {
      externalId,
      platform: CRMPlatform.HUBSPOT, // Default platform
      name: data.name || data.title || data.dealname || 'Untitled Deal',
      amount: data.amount || data.value || 0,
      stage: data.stage || data.sales_stage || 'New',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Create default lead when mapping fails
   */
  private static createDefaultLead(data: any, externalId: string): LeadData {
    return {
      externalId,
      platform: CRMPlatform.HUBSPOT, // Default platform
      firstName: data.firstName || data.first_name || '',
      lastName: data.lastName || data.last_name || '',
      email: data.email || data.emailaddress1 || '',
      company: data.company || data.account_name || '',
      status: data.status || 'New',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
} 