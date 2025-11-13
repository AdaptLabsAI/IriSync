import { firestore } from '../core/firebase';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { SubscriptionTier } from '../core/models/User';
import unifiedEmailService from '../notifications/unified-email-service';
import { formatCurrency } from '../../utils/formatting';
import * as Yup from 'yup';
import { logger } from '../logging/logger';
import { createCustomer, getStripeClient, createSubscription } from '../billing/stripe';
import { generateOrganizationId } from '../utils';
import { z } from 'zod';

/**
 * Status of an enterprise quote
 */
export enum QuoteStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  SENT = 'sent',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  CANCELED = 'canceled'
}

/**
 * Type of billing for an enterprise subscription
 */
export enum BillingType {
  MONTHLY = 'monthly',
  ANNUAL = 'annual',
  QUARTERLY = 'quarterly',
  CUSTOM = 'custom'
}

/**
 * Feature add-on for enterprise quotes
 */
export interface EnterpriseFeatureAddOn {
  id: string;
  name: string;
  description: string;
  price: number;
  isOneTime: boolean;
}

/**
 * Enterprise quote model
 */
export interface EnterpriseQuote {
  id: string;
  userId: string;
  organizationId?: string;
  contactName: string;
  contactEmail: string;
  companyName: string;
  seats: number;
  basePrice: number;
  seatPrice: number;
  totalPrice: number;
  discountPercentage: number;
  discountAmount: number;
  addOns: {
    id: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  currency: string;
  billingType: BillingType;
  customBillingCycle?: number; // In days, if billingType is CUSTOM
  status: QuoteStatus;
  validUntil: Date;
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
  internalNotes?: string;
  approvedBy?: string;
  approvedAt?: Date;
  rejectedReason?: string;
  customTerms?: string;
  salesRepId?: string;
  quoteNumber: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  billingStatus?: string;
  billingNotes?: string;
}

/**
 * Request to create or update an enterprise quote
 */
export interface EnterpriseQuoteRequest {
  userId: string;
  organizationId?: string;
  contactName: string;
  contactEmail: string;
  companyName: string;
  seats: number;
  basePrice?: number;
  seatPrice?: number;
  discountPercentage?: number;
  addOns?: {
    id: string;
    quantity: number;
  }[];
  currency?: string;
  billingType?: BillingType;
  customBillingCycle?: number;
  notes?: string;
  internalNotes?: string;
  customTerms?: string;
  salesRepId?: string;
  validForDays?: number;
}

/**
 * Service for managing Enterprise tier custom pricing and quotes
 */
export class EnterpriseQuoteService {
  private readonly QUOTES_COLLECTION = 'enterprise_quotes';
  private readonly ADDONS_COLLECTION = 'enterprise_addons';
  
  /**
   * Validation schema for enterprise quote requests
   */
  private quoteRequestSchema = Yup.object().shape({
    userId: Yup.string().required('User ID is required'),
    contactName: Yup.string().required('Contact name is required'),
    contactEmail: Yup.string().email('Invalid email').required('Contact email is required'),
    companyName: Yup.string().required('Company name is required'),
    seats: Yup.number().integer().min(1).required('Number of seats is required'),
    basePrice: Yup.number().min(0),
    seatPrice: Yup.number().min(0),
    discountPercentage: Yup.number().min(0).max(100),
    addOns: Yup.array().of(
      Yup.object().shape({
        id: Yup.string().required('Add-on ID is required'),
        quantity: Yup.number().integer().min(1).required('Add-on quantity is required')
      })
    ),
    currency: Yup.string().default('usd'),
    billingType: Yup.string().oneOf(Object.values(BillingType)).default(BillingType.ANNUAL),
    customBillingCycle: Yup.number().integer().min(30).when('billingType', {
      is: BillingType.CUSTOM,
      then: (schema) => schema.required('Custom billing cycle is required when billing type is custom')
    }),
    validForDays: Yup.number().integer().min(1).max(90).default(30)
  });
  
  /**
   * Create a new enterprise quote
   */
  async createQuote(request: EnterpriseQuoteRequest): Promise<EnterpriseQuote> {
    try {
      // Validate the request
      await this.quoteRequestSchema.validate(request);
      
      const quoteId = this.generateQuoteNumber();
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + (request.validForDays || 30));
      
      const now = new Date();
      
      // Calculate pricing
      const basePrice = request.basePrice || 1250; // Default enterprise base price
      const seatPrice = request.seatPrice || 150; // Default per-seat price
      const seats = Math.max(request.seats, 5); // Minimum 5 seats for enterprise
      
      // Only charge for seats beyond the included 5
      const includedSeats = 5;
      const additionalSeats = Math.max(0, seats - includedSeats);
      const seatsTotal = basePrice + (additionalSeats * seatPrice);
      
      // Calculate add-ons
      let addOnsTotal = 0;
      const processedAddOns: EnterpriseQuote['addOns'] = [];
      
      if (request.addOns) {
        const availableAddOns = await this.getAvailableAddOns();
        
        for (const requestedAddOn of request.addOns) {
          const addOnData = availableAddOns.find(addon => addon.id === requestedAddOn.id);
          if (addOnData) {
            const quantity = Math.max(1, requestedAddOn.quantity);
            const totalPrice = addOnData.price * quantity;
            addOnsTotal += totalPrice;
            
            processedAddOns.push({
              id: requestedAddOn.id,
              quantity,
              unitPrice: addOnData.price,
              totalPrice
            });
          }
        }
      }
      
      // Calculate final pricing
      const subtotal = seatsTotal + addOnsTotal;
      const discountPercentage = request.discountPercentage || 0;
      const discountAmount = (subtotal * discountPercentage) / 100;
      const totalPrice = subtotal - discountAmount;
      
      // Determine if this is self-service (direct registration) or sales-managed
      const isSelfService = !request.salesRepId;
      const initialStatus = isSelfService ? QuoteStatus.APPROVED : QuoteStatus.DRAFT;
      
      const quote: EnterpriseQuote = {
        id: quoteId,
        userId: request.userId,
        organizationId: request.organizationId,
        contactName: request.contactName,
        contactEmail: request.contactEmail,
        companyName: request.companyName,
        seats,
        basePrice,
        seatPrice,
        totalPrice,
        discountPercentage,
        discountAmount,
        addOns: processedAddOns,
        currency: request.currency || 'USD',
        billingType: request.billingType || BillingType.ANNUAL,
        customBillingCycle: request.customBillingCycle,
        status: initialStatus,
        validUntil,
        createdAt: now,
        updatedAt: now,
        notes: request.notes,
        internalNotes: request.internalNotes,
        customTerms: request.customTerms,
        salesRepId: request.salesRepId,
        quoteNumber: quoteId,
        approvedBy: isSelfService ? 'SYSTEM_AUTO_APPROVED' : undefined,
        approvedAt: isSelfService ? now : undefined
      };
      
      // Save quote to Firestore
      await setDoc(doc(firestore, this.QUOTES_COLLECTION, quoteId), quote);
      
      // Send notifications
      if (isSelfService) {
        // Self-service: Send receipt to customer and notification to sales team
        await Promise.all([
          this.sendCustomerReceiptEmail(quote),
          this.sendSalesNotificationEmail(quote)
        ]);
      } else {
        // Sales-managed: Send confirmation to customer
        await this.sendQuoteConfirmationEmail(quote);
      }
      
      logger.info('Enterprise quote created', {
        quoteId,
        userId: request.userId,
        totalPrice,
        isSelfService,
        status: initialStatus
      });
      
      return quote;
      
    } catch (error) {
      logger.error('Failed to create enterprise quote', {
        error: error instanceof Error ? error.message : 'Unknown error',
        request: { ...request, userId: request.userId }
      });
      throw error;
    }
  }
  
  /**
   * Get an enterprise quote by ID
   */
  async getQuoteById(quoteId: string): Promise<EnterpriseQuote | null> {
    const quoteDoc = await getDoc(doc(firestore, this.QUOTES_COLLECTION, quoteId));
      
    if (!quoteDoc.exists()) {
      return null;
    }
    
    return quoteDoc.data() as EnterpriseQuote;
  }
  
  /**
   * Get all quotes for a user
   */
  async getQuotesForUser(userId: string): Promise<EnterpriseQuote[]> {
    const quotesQuery = query(
      collection(firestore, this.QUOTES_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const quotesSnapshot = await getDocs(quotesQuery);
      
    const quotes: EnterpriseQuote[] = [];
    
    quotesSnapshot.forEach((doc) => {
      quotes.push(doc.data() as EnterpriseQuote);
    });
    
    return quotes;
  }
  
  /**
   * Update an enterprise quote
   */
  async updateQuote(
    quoteId: string,
    updates: Partial<EnterpriseQuoteRequest>
  ): Promise<EnterpriseQuote> {
    try {
      // Get existing quote
      const existingQuote = await this.getQuoteById(quoteId);
      
      if (!existingQuote) {
        logger.warn(`Quote with ID ${quoteId} not found during update attempt`);
        throw new Error(`Quote with ID ${quoteId} not found`);
      }
      
      // Check if quote can be updated
      if (![QuoteStatus.DRAFT, QuoteStatus.PENDING_APPROVAL, QuoteStatus.REJECTED].includes(existingQuote.status)) {
        logger.warn(`Attempted to update quote in invalid status: ${existingQuote.status}`, { quoteId });
        throw new Error(`Quote with status ${existingQuote.status} cannot be updated`);
      }
      
      // Create update object
      const now = new Date();
      const updateData: Partial<EnterpriseQuote> = {
        updatedAt: now
      };
      
      // Copy allowed fields
      const allowedFields: (keyof EnterpriseQuoteRequest)[] = [
        'contactName',
        'contactEmail',
        'companyName',
        'seats',
        'basePrice',
        'seatPrice',
        'discountPercentage',
        'currency',
        'billingType',
        'customBillingCycle',
        'notes',
        'internalNotes',
        'customTerms',
        'salesRepId'
      ];
      
      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          // Type assertion to handle the 'validForDays' property not being in EnterpriseQuote
          (updateData as any)[field] = updates[field];
        }
      }
      
      // Handle complex updates
      
      // Recalculate pricing if any pricing-related field is updated
      if (
        updates.seats !== undefined ||
        updates.basePrice !== undefined ||
        updates.seatPrice !== undefined ||
        updates.discountPercentage !== undefined ||
        updates.addOns !== undefined
      ) {
        // Use existing values if not provided in updates
        const basePrice = updates.basePrice ?? existingQuote.basePrice;
        const seatPrice = updates.seatPrice ?? existingQuote.seatPrice;
        const seats = updates.seats ?? existingQuote.seats;
        const discountPercentage = updates.discountPercentage ?? existingQuote.discountPercentage;
        
        // Calculate seat price - only charge for seats beyond the included 5
        const includedSeats = 5;
        let totalSeatsPrice = 0;
        if (seats > includedSeats) {
          totalSeatsPrice = (seats - includedSeats) * seatPrice;
        }
        
        // Calculate add-ons price
        let addOns = existingQuote.addOns;
        let addOnsTotalPrice = 0;
        
        if (updates.addOns) {
          try {
            // Get add-ons data from Firestore
            const addOnsIds = updates.addOns.map(addon => addon.id);
            const addOnsQuery = query(
              collection(firestore, this.ADDONS_COLLECTION),
              where('id', 'in', addOnsIds)
            );
            const addOnsSnapshot = await getDocs(addOnsQuery);
            
            if (addOnsSnapshot.empty && updates.addOns.length > 0) {
              logger.warn('No matching add-ons found during quote update', {
                requestedAddOns: updates.addOns.map(a => a.id),
                quoteId
              });
              throw new Error(`No add-ons found matching the requested IDs`);
            }
            
            const addOnsData: Record<string, EnterpriseFeatureAddOn> = {};
            addOnsSnapshot.forEach(doc => {
              const data = doc.data() as EnterpriseFeatureAddOn;
              addOnsData[data.id] = data;
            });
            
            // Create new add-ons array
            addOns = updates.addOns.map(addon => {
              const addonData = addOnsData[addon.id];
              
              if (!addonData) {
                logger.warn(`Add-on with ID ${addon.id} not found during quote update`, {
                  quoteId,
                  addon: addon.id
                });
                throw new Error(`Add-on with ID ${addon.id} not found`);
              }
              
              const quantity = addon.quantity || 1;
              const unitPrice = addonData.price;
              const totalPrice = unitPrice * quantity;
              
              return {
                id: addon.id,
                quantity,
                unitPrice,
                totalPrice
              };
            });
          } catch (error) {
            logger.error('Error processing add-ons during quote update', {
              error: error instanceof Error ? error.message : String(error),
              quoteId,
              addOns: updates.addOns
            });
            throw new Error(`Error processing add-ons: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        
        // Calculate total add-ons price
        addOnsTotalPrice = addOns.reduce((total, addon) => total + addon.totalPrice, 0);
        
        // Calculate subtotal and discount
        const subtotal = basePrice + totalSeatsPrice + addOnsTotalPrice;
        const discountAmount = (subtotal * discountPercentage) / 100;
        const totalPrice = subtotal - discountAmount;
        
        // Update quote data
        updateData.basePrice = basePrice;
        updateData.seatPrice = seatPrice;
        updateData.seats = seats;
        updateData.discountPercentage = discountPercentage;
        updateData.discountAmount = discountAmount;
        updateData.addOns = addOns;
        updateData.totalPrice = totalPrice;
      }
      
      // Update valid until if requested
      if (updates.validForDays) {
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + updates.validForDays);
        updateData.validUntil = validUntil;
      }
      
      // Update in Firestore with retry logic
      let retries = 0;
      const maxRetries = 3;
      
      while (retries < maxRetries) {
        try {
          await setDoc(doc(firestore, this.QUOTES_COLLECTION, quoteId), {
            ...existingQuote,
            ...updateData
          });
          
          // Log successful quote update
          logger.info('Enterprise quote updated', {
            quoteId,
            quoteNumber: existingQuote.quoteNumber,
            changes: Object.keys(updateData).filter(k => k !== 'updatedAt'),
            companyName: existingQuote.companyName
          });
          
          // Return updated quote
          return {
            ...existingQuote,
            ...updateData
          };
        } catch (error) {
          retries++;
          logger.warn(`Error updating quote in Firestore (attempt ${retries}/${maxRetries})`, {
            error: error instanceof Error ? error.message : String(error),
            quoteId
          });
          
          if (retries >= maxRetries) {
            throw error;
          }
          
          // Wait before retrying with exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries - 1)));
        }
      }
      
      // This should never happen due to the throw in the loop above
      throw new Error('Failed to update quote after maximum retries');
      
    } catch (error) {
      logger.error('Failed to update enterprise quote', {
        error: error instanceof Error ? error.message : String(error),
        stackTrace: error instanceof Error ? error.stack : undefined,
        quoteId
      });
      
      throw error;
    }
  }
  
  /**
   * Submit quote for approval
   */
  async submitForApproval(quoteId: string): Promise<EnterpriseQuote> {
    const quote = await this.getQuoteById(quoteId);
    
    if (!quote) {
      throw new Error(`Quote with ID ${quoteId} not found`);
    }
    
    if (quote.status !== QuoteStatus.DRAFT) {
      throw new Error(`Only draft quotes can be submitted for approval`);
    }
    
    const updateData: Partial<EnterpriseQuote> = {
      status: QuoteStatus.PENDING_APPROVAL,
      updatedAt: new Date()
    };
    
    await setDoc(doc(firestore, this.QUOTES_COLLECTION, quoteId), {
      ...quote,
      ...updateData
    });
    
    // Send notification to sales managers
    try {
      // 1. Send email notification to sales management team
      const salesManagementEmail = process.env.EMAIL_SALES_MANAGEMENT || 'sales-management@irisync.ai';
      await unifiedEmailService.sendEmail({
        to: salesManagementEmail,
        subject: `New Enterprise Quote Pending Approval: ${quote.quoteNumber}`,
        htmlContent: `
          <h2>New Enterprise Quote Needs Approval</h2>
          <p>A new enterprise quote has been submitted and requires your approval.</p>
          <table style="border-collapse: collapse; width: 100%;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Quote Number:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${quote.quoteNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Company:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${quote.companyName}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Contact:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${quote.contactName} (${quote.contactEmail})</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Total Amount:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${formatCurrency(quote.totalPrice, quote.currency)}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Seats:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${quote.seats}</td>
            </tr>
          </table>
          <p style="margin-top: 20px;">
            <a href="https://app.irisync.io/admin/quotes/${quote.id}" style="background-color: #4A5568; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px;">
              Review Quote
            </a>
          </p>
        `,
        category: 'quote_approval'
      });
      
      // 2. Create a notification record in the system
      const notificationsRef = collection(firestore, 'notifications');
      await setDoc(doc(notificationsRef), {
        type: 'quote_approval_needed',
        quoteId: quote.id,
        quoteNumber: quote.quoteNumber,
        companyName: quote.companyName,
        amount: quote.totalPrice,
        currency: quote.currency,
        createdAt: new Date(),
        read: false,
        recipientType: 'sales_managers',
        priority: 'high',
        metadata: {
          seats: quote.seats,
          salesRepId: quote.salesRepId
        }
      });
      
      logger.info('Enterprise quote approval notification sent', {
        quoteId: quote.id,
        quoteNumber: quote.quoteNumber,
        companyName: quote.companyName
      });
    } catch (error) {
      // Log the notification error but don't fail the quote submission
      logger.error('Failed to send quote approval notification', {
        error: error instanceof Error ? error.message : String(error),
        quoteId: quote.id
      });
    }
    
    return {
      ...quote,
      ...updateData
    };
  }
  
  /**
   * Approve a quote
   */
  async approveQuote(quoteId: string, approverUserId: string): Promise<EnterpriseQuote> {
    try {
      if (!approverUserId) {
        throw new Error('Approver user ID is required');
      }
    
      const quote = await this.getQuoteById(quoteId);
      
      if (!quote) {
        logger.warn(`Quote with ID ${quoteId} not found during approval attempt`);
        throw new Error(`Quote with ID ${quoteId} not found`);
      }
      
      if (quote.status !== QuoteStatus.PENDING_APPROVAL) {
        logger.warn(`Attempted to approve quote in invalid status: ${quote.status}`, { quoteId });
        throw new Error(`Only pending quotes can be approved`);
      }
      
      const now = new Date();
      const updateData: Partial<EnterpriseQuote> = {
        status: QuoteStatus.APPROVED,
        approvedBy: approverUserId,
        approvedAt: now,
        updatedAt: now
      };
      
      // Update in Firestore with retry logic
      let retries = 0;
      const maxRetries = 3;
      
      while (retries < maxRetries) {
        try {
          await setDoc(doc(firestore, this.QUOTES_COLLECTION, quoteId), {
            ...quote,
            ...updateData
          });
          
          // Log quote approval
          logger.info('Enterprise quote approved', {
            quoteId,
            quoteNumber: quote.quoteNumber,
            approverUserId,
            companyName: quote.companyName,
            amount: quote.totalPrice
          });
          
          // Notify salespeople that quote was approved
          if (quote.salesRepId) {
            try {
              const salesRepDomain = process.env.EMAIL_SALES_REP_DOMAIN || 'irisync.ai';
              const salesRepEmail = `sales+${quote.salesRepId}@${salesRepDomain}`;
              await unifiedEmailService.sendEmail({
                to: salesRepEmail,
                subject: `Enterprise Quote ${quote.quoteNumber} Approved`,
                htmlContent: `
                  <p>The enterprise quote for ${quote.companyName} has been approved.</p>
                  <p>Quote Number: ${quote.quoteNumber}</p>
                  <p>Amount: ${formatCurrency(quote.totalPrice, quote.currency)}</p>
                  <p>Please proceed with sending it to the customer.</p>
                `,
                category: 'quote_notification'
              });
            } catch (emailError) {
              // Log email error but don't fail the approval process
              logger.error('Failed to send quote approval notification', {
                error: emailError instanceof Error ? emailError.message : String(emailError),
                quoteId, 
                salesRepId: quote.salesRepId
              });
            }
          }
          
          return {
            ...quote,
            ...updateData
          };
        } catch (error) {
          retries++;
          logger.warn(`Error approving quote in Firestore (attempt ${retries}/${maxRetries})`, {
            error: error instanceof Error ? error.message : String(error),
            quoteId
          });
          
          if (retries >= maxRetries) {
            throw error;
          }
          
          // Wait before retrying with exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries - 1)));
        }
      }
      
      // This should never happen due to the throw in the loop above
      throw new Error('Failed to approve quote after maximum retries');
      
    } catch (error) {
      logger.error('Failed to approve enterprise quote', {
        error: error instanceof Error ? error.message : String(error),
        stackTrace: error instanceof Error ? error.stack : undefined,
        quoteId,
        approverUserId
      });
      
      throw error;
    }
  }
  
  /**
   * Reject a quote
   */
  async rejectQuote(quoteId: string, rejectedReason: string): Promise<EnterpriseQuote> {
    const quote = await this.getQuoteById(quoteId);
    
    if (!quote) {
      throw new Error(`Quote with ID ${quoteId} not found`);
    }
    
    if (quote.status !== QuoteStatus.PENDING_APPROVAL) {
      throw new Error(`Only pending quotes can be rejected`);
    }
    
    const updateData: Partial<EnterpriseQuote> = {
      status: QuoteStatus.REJECTED,
      rejectedReason,
      updatedAt: new Date()
    };
    
    await setDoc(doc(firestore, this.QUOTES_COLLECTION, quoteId), {
      ...quote,
      ...updateData
    });
    
    return {
      ...quote,
      ...updateData
    };
  }
  
  /**
   * Send quote to customer
   */
  async sendQuote(quoteId: string): Promise<EnterpriseQuote> {
    const quote = await this.getQuoteById(quoteId);
    
    if (!quote) {
      throw new Error(`Quote with ID ${quoteId} not found`);
    }
    
    if (quote.status !== QuoteStatus.APPROVED) {
      throw new Error(`Only approved quotes can be sent to customers`);
    }
    
    const updateData: Partial<EnterpriseQuote> = {
      status: QuoteStatus.SENT,
      updatedAt: new Date()
    };
    
    await setDoc(doc(firestore, this.QUOTES_COLLECTION, quoteId), {
      ...quote,
      ...updateData
    });
    
    // Send email to customer
    await this.sendQuoteEmail(quote);
    
    return {
      ...quote,
      ...updateData
    };
  }
  
  /**
   * Mark quote as accepted by customer and set up Stripe subscription
   */
  async acceptQuote(quoteId: string): Promise<EnterpriseQuote> {
    const quote = await this.getQuoteById(quoteId);
    
    if (!quote) {
      throw new Error(`Quote with ID ${quoteId} not found`);
    }
    
    if (quote.status !== QuoteStatus.SENT) {
      throw new Error(`Only sent quotes can be accepted`);
    }
    
    // Check if quote is expired
    if (new Date() > quote.validUntil) {
      throw new Error(`This quote has expired`);
    }
    
    const updateData: Partial<EnterpriseQuote> = {
      status: QuoteStatus.ACCEPTED,
      updatedAt: new Date()
    };
    
    // Create or retrieve Stripe customer
    let stripeCustomerId: string | undefined;
    let subscriptionId: string | undefined;
    let priceId: string | undefined;
    
    try {
      // 1. Get or create the Stripe customer
      stripeCustomerId = await this.createStripeCustomer(
        quote.userId,
        quote.contactEmail,
        quote.contactName,
        quote.companyName
      );
      
      // 2. Create a custom price for this enterprise subscription
      priceId = await this.createCustomPrice(quoteId, quote);
      
      // 3. Create the subscription in Stripe
      subscriptionId = await createSubscription(
        stripeCustomerId,
        priceId,
        1, // Quantity is always 1 for Enterprise (we manage seats separately)
        undefined, // No trial days
        {
          quoteId,
          quoteNumber: quote.quoteNumber,
          companyName: quote.companyName,
          tier: 'enterprise',
          seats: quote.seats.toString(),
          billingType: quote.billingType,
          isEnterpriseQuote: 'true'
        }
      );
      
      // Update quote with Stripe subscription info
      updateData.stripeCustomerId = stripeCustomerId;
      updateData.stripeSubscriptionId = subscriptionId;
      updateData.stripePriceId = priceId;
      
      logger.info('Created Stripe subscription for enterprise quote', {
        quoteId,
        quoteNumber: quote.quoteNumber,
        stripeCustomerId,
        stripeSubscriptionId: subscriptionId,
        stripePriceId: priceId
      });
    } catch (error) {
      logger.error('Failed to create Stripe subscription for enterprise quote', {
        error: error instanceof Error ? error.message : String(error),
        quoteId,
        quoteNumber: quote.quoteNumber
      });
      
      // Continue with quote acceptance even if Stripe fails
      // We'll need to manually set up the subscription later
      updateData.billingStatus = 'pending_setup';
      updateData.billingNotes = `Failed to create Stripe subscription: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
    
    await setDoc(doc(firestore, this.QUOTES_COLLECTION, quoteId), {
      ...quote,
      ...updateData
    });
    
    // Trigger onboarding process
    try {
      // 1. Update user's subscription to Enterprise tier
      const userRef = doc(firestore, 'users', quote.userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error(`User with ID ${quote.userId} not found during enterprise onboarding`);
      }
      
      const userData = userDoc.data();
      
      // Update the user record with enterprise subscription details
      // NOTE: Per organization-centric model, the organization document is the primary source of truth for tier and seats.
      // These user-level fields might be for denormalization, quick client-side reference, or legacy compatibility.
      // Ensure consistency with the organization record.
      const userUpdateData: Record<string, any> = {
        'subscription.tier': 'enterprise', 
        'subscription.seats': quote.seats,
        'subscription.enterpriseQuoteId': quote.id,
        'subscription.billingType': quote.billingType,
        'subscription.customTerms': quote.customTerms || null,
        'subscription.startDate': Timestamp.now(), // Use Timestamp for consistency
        'subscription.updatedAt': Timestamp.now()
      };
      
      // Only add Stripe data if available
      if (subscriptionId) {
        userUpdateData['subscription.stripeSubscriptionId'] = subscriptionId;
      }
      
      if (priceId) {
        userUpdateData['subscription.stripePriceId'] = priceId;
      }
      
      if (stripeCustomerId) {
        userUpdateData['stripeCustomerId'] = stripeCustomerId;
      } else if (userData.stripeCustomerId) {
        userUpdateData['stripeCustomerId'] = userData.stripeCustomerId;
      }
      
      await updateDoc(userRef, userUpdateData);
      
      // 2. Create organization record if not already associated
      if (!quote.organizationId) {
        // Generate a new organization ID
        const orgId = await generateOrganizationId(quote.contactEmail, firestore); // Use contact email for deterministic ID if desired
        
        const nowForOrg = Timestamp.now();
        let periodEndDate = new Date(nowForOrg.toDate().getTime()); // clone
        if (quote.billingType === BillingType.ANNUAL) {
          periodEndDate.setFullYear(periodEndDate.getFullYear() + 1);
        } else if (quote.billingType === BillingType.QUARTERLY) {
          periodEndDate.setMonth(periodEndDate.getMonth() + 3);
        } else if (quote.billingType === BillingType.CUSTOM && quote.customBillingCycle) {
          periodEndDate.setDate(periodEndDate.getDate() + quote.customBillingCycle);
        } else { // Default to MONTHLY
          periodEndDate.setMonth(periodEndDate.getMonth() + 1);
        }

        // Create organization record
        await setDoc(doc(firestore, 'organizations', orgId), {
          id: orgId,
          name: quote.companyName,
          ownerUserId: quote.userId,
          members: {
            [quote.userId]: { role: 'owner', joinedAt: nowForOrg }
          },
          usedSeats: 1, // Owner is first seat
          enterpriseQuoteId: quote.id,
          createdAt: nowForOrg,
          updatedAt: nowForOrg,
          billing: {
            subscriptionTier: 'enterprise',
            subscriptionStatus: 'active', // Assuming active upon quote acceptance
            seats: quote.seats,
            billingType: quote.billingType,
            ...(quote.customBillingCycle && quote.billingType === BillingType.CUSTOM && { customBillingCycleDays: quote.customBillingCycle }),
            currentPeriodStart: nowForOrg,
            currentPeriodEnd: Timestamp.fromDate(periodEndDate),
            // renewalDate: // This would typically be set by a billing event or Stripe webhook
            stripeSubscriptionId: subscriptionId || null,
            stripePriceId: priceId || null,
            stripeCustomerId: stripeCustomerId || null,
            customTerms: quote.customTerms || null,
            quoteReference: quote.quoteNumber
          },
          // Default usage quotas might be set here or by another process
          usageQuota: { 
            // Example:
            // aiTokens: { limit: 1000000, used: 0, resetDate: Timestamp.fromDate(periodEndDate) },
            // socialAccounts: { limit: 50, used: 0 } 
          },
          settings: {
            // General org settings can go here
          }
        });
        
        // Update user's organization association
        await updateDoc(userRef, {
          currentOrganizationId: orgId, // Set the new org as current
          // If user.organizationRole is a denormalized field for their role in the currentOrganizationId:
          organizationRole: 'owner', 
          updatedAt: Timestamp.now()
        });
        
        // Update quote with organization ID
        await updateDoc(doc(firestore, this.QUOTES_COLLECTION, quote.id), {
          organizationId: orgId
        });
        
        // Set the organizationId in the updated quote data
        updateData.organizationId = orgId;
      }
      
      // 3. Send welcome email to the customer
      const enterpriseSupportEmail = process.env.EMAIL_ENTERPRISE_CUSTOMER_SUPPORT || 'enterprise-support@irisync.ai';
      await unifiedEmailService.sendEmail({
        to: quote.contactEmail,
        subject: 'Welcome to IriSync Enterprise!',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #4A5568; padding: 20px; text-align: center;">
              <img src="https://irisync.ai/logo-white.png" alt="IriSync Logo" width="150" style="display: block; margin: 0 auto;">
            </div>
            
            <div style="padding: 30px; background-color: #ffffff; border-radius: 0 0 5px 5px;">
              <h1 style="color: #4A5568; margin-top: 0;">Welcome to IriSync Enterprise!</h1>
              
              <p>Dear ${quote.contactName},</p>
              
              <p>Thank you for choosing IriSync Enterprise! We're thrilled to have ${quote.companyName} on board and look forward to helping you achieve your social media management goals.</p>
              
              <p>Your enterprise account has been activated with the following details:</p>
              
              <ul>
                <li><strong>Plan:</strong> Enterprise</li>
                <li><strong>Seats:</strong> ${quote.seats}</li>
                <li><strong>Billing Cycle:</strong> ${quote.billingType.charAt(0).toUpperCase() + quote.billingType.slice(1)}</li>
                <li><strong>Quote Reference:</strong> ${quote.quoteNumber}</li>
              </ul>
              
              <div style="margin: 30px 0; text-align: center;">
                <a href="https://app.irisync.io/dashboard" style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
                  Access Your Enterprise Dashboard
                </a>
              </div>
              
              <h2 style="color: #4A5568;">Next Steps:</h2>
              
              <ol>
                <li>Set up your organization profile and preferences</li>
                <li>Invite your team members to join your organization</li>
                <li>Connect your social media accounts</li>
                <li>Schedule your onboarding call with your dedicated Customer Success Manager</li>
              </ol>
              
              <p>Your dedicated Customer Success Manager will reach out to you soon to schedule your onboarding call and help you get started.</p>
              
              <p>If you have any questions or need assistance, please don't hesitate to contact us at <a href="mailto:${enterpriseSupportEmail}">${enterpriseSupportEmail}</a>.</p>
              
              <p>Best regards,<br>The IriSync Enterprise Team</p>
            </div>
          </div>
        `
      });
      
      // 4. Create a task for the customer success team
      await setDoc(doc(collection(firestore, 'tasks')), {
        type: 'enterprise_onboarding',
        status: 'pending',
        priority: 'high',
        title: `Enterprise Onboarding: ${quote.companyName}`,
        description: `New enterprise customer needs onboarding. Quote ${quote.quoteNumber} accepted.`,
        assignedTo: quote.salesRepId || 'unassigned',
        deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        createdAt: new Date(),
        metadata: {
          quoteId: quote.id,
          quoteNumber: quote.quoteNumber,
          userId: quote.userId,
          organizationId: quote.organizationId || updateData.organizationId,
          seats: quote.seats,
          contactEmail: quote.contactEmail,
          contactName: quote.contactName,
          companyName: quote.companyName
        }
      });
      
      // 5. Notify internal teams about the new enterprise customer
      const internalTeamEmailsRaw = process.env.EMAIL_INTERNAL_TEAM_NOTIFICATIONS || 'sales@irisync.ai,customer-success@irisync.ai,support@irisync.ai';
      const internalTeamEmails = internalTeamEmailsRaw.split(',').map(email => email.trim()).filter(email => email);

      if (internalTeamEmails.length > 0) {
        await unifiedEmailService.sendEmail({
          to: internalTeamEmails,
          subject: `New Enterprise Customer: ${quote.companyName}`,
          htmlContent: `
            <h2>New Enterprise Customer Onboarding</h2>
            <p>A new enterprise quote has been accepted and the customer is now ready for onboarding.</p>
            <table style="border-collapse: collapse; width: 100%;">
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;"><strong>Company:</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">${quote.companyName}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;"><strong>Quote Number:</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">${quote.quoteNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;"><strong>Contact:</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">${quote.contactName} (${quote.contactEmail})</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;"><strong>Seats:</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">${quote.seats}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;"><strong>Total Value:</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">${formatCurrency(quote.totalPrice, quote.currency)}</td>
              </tr>
            </table>
            <p style="margin-top: 20px;">
              <a href="https://app.irisync.io/admin/customers/${quote.userId}" style="background-color: #4A5568; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px;">
                View Customer
              </a>
            </p>
          `
        });
      }
      
      // Log successful onboarding initiation
      logger.info('Enterprise customer onboarding initiated', {
        quoteId: quote.id,
        quoteNumber: quote.quoteNumber,
        userId: quote.userId,
        companyName: quote.companyName,
        seats: quote.seats
      });
      
    } catch (error) {
      logger.error('Failed during enterprise onboarding process', {
        error: error instanceof Error ? error.message : String(error),
        stackTrace: error instanceof Error ? error.stack : undefined,
        quoteId: quote.id,
        userId: quote.userId,
        companyName: quote.companyName
      });
      
      // Send alert to administrators about the failed onboarding
      try {
        const adminAlertsEmail = process.env.EMAIL_ADMIN_ALERTS || 'admin-alerts@irisync.ai';
        await unifiedEmailService.sendEmail({
          to: adminAlertsEmail,
          subject: 'URGENT: Enterprise Onboarding Failure',
          htmlContent: `
            <h2>Enterprise Onboarding Failed</h2>
            <p>There was an error during the onboarding process for a new enterprise customer.</p>
            <p><strong>Error:</strong> ${error instanceof Error ? error.message : 'Unknown error'}</p>
            <p><strong>Company:</strong> ${quote.companyName}</p>
            <p><strong>Quote ID:</strong> ${quote.id}</p>
            <p><strong>Quote Number:</strong> ${quote.quoteNumber}</p>
            <p>Please investigate and complete the onboarding process manually.</p>
          `,
          ...(quote.salesRepId ? { cc: `sales+${quote.salesRepId}@${process.env.EMAIL_SALES_REP_DOMAIN || 'irisync.ai'}` } : {})
        });
      } catch (emailError) {
        // Just log if alert email fails
        logger.error('Failed to send onboarding failure alert', {
          quoteId: quote.id,
          emailError: emailError instanceof Error ? emailError.message : String(emailError)
        });
      }
    }
    
    return {
      ...quote,
      ...updateData
    };
  }
  
  /**
   * Cancel a quote
   */
  async cancelQuote(quoteId: string, reason?: string): Promise<EnterpriseQuote> {
    const quote = await this.getQuoteById(quoteId);
    
    if (!quote) {
      throw new Error(`Quote with ID ${quoteId} not found`);
    }
    
    // Cannot cancel already completed quotes
    if ([QuoteStatus.ACCEPTED, QuoteStatus.EXPIRED, QuoteStatus.CANCELED].includes(quote.status)) {
      throw new Error(`Quotes with status ${quote.status} cannot be canceled`);
    }
    
    const updateData: Partial<EnterpriseQuote> = {
      status: QuoteStatus.CANCELED,
      rejectedReason: reason,
      updatedAt: new Date()
    };
    
    await setDoc(doc(firestore, this.QUOTES_COLLECTION, quoteId), {
      ...quote,
      ...updateData
    });
    
    return {
      ...quote,
      ...updateData
    };
  }
  
  /**
   * Send quote to customer via email
   */
  private async sendQuoteEmail(quote: EnterpriseQuote): Promise<void> {
    try {
      // Send email with high priority using unified email service
      const emailResult = await unifiedEmailService.sendEnterpriseQuote({
        to: quote.contactEmail,
        contactName: quote.contactName,
        companyName: quote.companyName,
        quoteNumber: quote.quoteNumber,
        totalPrice: quote.totalPrice,
        currency: quote.currency,
        validUntil: quote.validUntil,
        quoteId: quote.id,
        salesRepId: quote.salesRepId
      });
      
      // Track quote email sent event in analytics
      logger.info('Enterprise quote email sent', {
        quoteId: quote.id,
        quoteNumber: quote.quoteNumber,
        recipient: quote.contactEmail,
        companyName: quote.companyName,
        amount: quote.totalPrice,
        emailMessageId: emailResult.messageId
      });
      
      // Schedule a follow-up reminder if quote is not acted upon
      const followupDate = new Date();
      followupDate.setDate(followupDate.getDate() + 3); // 3 days from now
      
      // Update quote with email tracking info
      await setDoc(doc(firestore, this.QUOTES_COLLECTION, quote.id), {
        ...quote,
        emailSentAt: new Date(),
        followupScheduledFor: followupDate
      });
      
    } catch (error) {
      // Log the error but don't throw it to prevent disrupting the flow
      logger.error('Failed to send enterprise quote email', {
        error: error instanceof Error ? error.message : String(error),
        stackTrace: error instanceof Error ? error.stack : undefined,
        quoteId: quote.id,
        quoteNumber: quote.quoteNumber,
        recipient: quote.contactEmail
      });
      
      // Still update quote status despite email failure
      await setDoc(doc(firestore, this.QUOTES_COLLECTION, quote.id), {
        ...quote,
        emailError: error instanceof Error ? error.message : 'Unknown error sending email',
        lastEmailAttempt: new Date()
      });
    }
  }

  /**
   * Create a Stripe customer for the enterprise client
   * @param userId The user ID
   * @param email The customer email
   * @param name The customer name
   * @param companyName The company name
   * @returns The Stripe customer ID
   */
  private async createStripeCustomer(
    userId: string,
    email: string,
    name: string,
    companyName: string
  ): Promise<string> {
    try {
      // Check if user already has a Stripe customer ID
      const userDoc = await getDoc(doc(firestore, 'users', userId));
      
      if (!userDoc.exists()) {
        throw new Error(`User with ID ${userId} not found`);
      }
      
      const userData = userDoc.data();
      
      // If user already has a Stripe customer ID, return it
      if (userData.stripeCustomerId) {
        logger.info('Using existing Stripe customer for enterprise quote', {
          userId,
          stripeCustomerId: userData.stripeCustomerId
        });
        
        return userData.stripeCustomerId;
      }
      
      // Create a new Stripe customer
      const customerId = await createCustomer(
        email,
        name,
        {
          companyName,
          userId,
          tier: 'enterprise',
          type: 'enterprise_customer'
        }
      );
      
      // Update user with Stripe customer ID
      await updateDoc(doc(firestore, 'users', userId), {
        stripeCustomerId: customerId
      });
      
      logger.info('Created Stripe customer for enterprise quote', {
        userId,
        stripeCustomerId: customerId
      });
      
      return customerId;
    } catch (error) {
      logger.error('Failed to create Stripe customer for enterprise quote', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        email
      });
      
      throw new Error('Failed to create Stripe customer');
    }
  }

  /**
   * Create a custom price for the enterprise subscription in Stripe
   * @param quoteId The quote ID
   * @param quote The enterprise quote
   * @returns The Stripe price ID
   */
  private async createCustomPrice(
    quoteId: string,
    quote: EnterpriseQuote
  ): Promise<string> {
    try {
      const stripe = getStripeClient();
      
      // First, create or retrieve the product
      const productId = process.env.STRIPE_ENTERPRISE_PRODUCT_ID;
      
      if (!productId) {
        throw new Error('Stripe Enterprise product ID not configured');
      }
      
      // Calculate the unit amount based on billing type
      let unitAmount = quote.totalPrice * 100; // Convert to cents
      let interval: 'day' | 'week' | 'month' | 'year' = 'month';
      let intervalCount = 1;
      
      switch (quote.billingType) {
        case BillingType.ANNUAL:
          interval = 'year';
          break;
        case BillingType.QUARTERLY:
          interval = 'month';
          intervalCount = 3;
          break;
        case BillingType.MONTHLY:
          interval = 'month';
          break;
        case BillingType.CUSTOM:
          // For custom billing cycles, default to monthly and adjust the price
          interval = 'month';
          if (quote.customBillingCycle) {
            // Calculate the monthly equivalent price
            const monthlyEquivalent = (quote.totalPrice * 30) / quote.customBillingCycle;
            unitAmount = Math.round(monthlyEquivalent * 100); // Convert to cents and round
          }
          break;
      }
      
      // Create a custom price
      const price = await stripe.prices.create({
        product: productId,
        unit_amount: unitAmount,
        currency: quote.currency,
        recurring: {
          interval,
          interval_count: intervalCount
        },
        nickname: `Enterprise - ${quote.companyName} - ${quote.quoteNumber}`,
        metadata: {
          quoteId,
          quoteNumber: quote.quoteNumber,
          companyName: quote.companyName,
          seats: quote.seats.toString(),
          basePrice: quote.basePrice.toString(),
          seatPrice: quote.seatPrice.toString(),
          billingType: quote.billingType,
          totalPrice: quote.totalPrice.toString()
        }
      });
      
      logger.info('Created custom price for enterprise quote', {
        quoteId,
        quoteNumber: quote.quoteNumber,
        priceId: price.id,
        unitAmount: unitAmount / 100, // Log in dollars for readability
        interval,
        intervalCount
      });
      
      return price.id;
    } catch (error) {
      logger.error('Failed to create custom price for enterprise quote', {
        error: error instanceof Error ? error.message : String(error),
        quoteId,
        quoteNumber: quote.quoteNumber
      });
      
      throw new Error('Failed to create custom price');
    }
  }

  /**
   * Generate a unique quote number
   * @returns Quote number in format QT-YYYYMMDD-XXXX
   */
  private generateQuoteNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
    return `QT-${year}${month}${day}-${random}`;
  }

  /**
   * Get available add-ons from Firestore
   * @returns Array of available add-ons
   */
  private async getAvailableAddOns(): Promise<EnterpriseFeatureAddOn[]> {
    try {
      const addOnsSnapshot = await getDocs(collection(firestore, this.ADDONS_COLLECTION));
      return addOnsSnapshot.docs.map(doc => doc.data() as EnterpriseFeatureAddOn);
    } catch (error) {
      logger.error('Failed to get available add-ons', { error });
      return [];
    }
  }

  /**
   * Send customer receipt email for self-service enterprise registration
   * @param quote The enterprise quote
   */
  private async sendCustomerReceiptEmail(quote: EnterpriseQuote): Promise<void> {
    try {
      const fromEmail = process.env.EMAIL_FROM || 'noreply@irisync.com';
      const supportEmail = process.env.ENTERPRISE_SUPPORT_EMAIL || 'enterprise@irisync.com';
      
      const htmlContent = `
        <h2>Enterprise Registration Confirmed</h2>
        <p>Dear ${quote.contactName},</p>
        <p>Thank you for registering for IriSync Enterprise! Your registration has been automatically approved.</p>
        
        <h3>Registration Details:</h3>
        <ul>
          <li><strong>Company:</strong> ${quote.companyName}</li>
          <li><strong>Seats:</strong> ${quote.seats}</li>
          <li><strong>Total Price:</strong> $${quote.totalPrice.toFixed(2)} ${quote.currency.toUpperCase()}</li>
          <li><strong>Billing:</strong> ${quote.billingType}</li>
        </ul>
        
        <p>You can now access your enterprise dashboard and begin setting up your team.</p>
        <p>If you have any questions, please contact our enterprise support team at ${supportEmail}</p>
        
        <p>Welcome to IriSync Enterprise!</p>
      `;

      // Using environment variables for email addresses
      logger.info('Sending customer receipt email', {
        quoteId: quote.id,
        recipient: quote.contactEmail,
        fromEmail
      });

    } catch (error) {
      logger.error('Failed to send customer receipt email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        quoteId: quote.id
      });
    }
  }

  /**
   * Send sales notification email for self-service enterprise registration
   * @param quote The enterprise quote
   */
  private async sendSalesNotificationEmail(quote: EnterpriseQuote): Promise<void> {
    try {
      const salesEmail = process.env.ENTERPRISE_SALES_EMAIL || 'sales@irisync.com';
      const fromEmail = process.env.EMAIL_FROM || 'noreply@irisync.com';
      
      const htmlContent = `
        <h2>New Enterprise Self-Service Registration</h2>
        <p>A new enterprise customer has registered through the self-service flow:</p>
        
        <h3>Customer Details:</h3>
        <ul>
          <li><strong>Contact:</strong> ${quote.contactName} (${quote.contactEmail})</li>
          <li><strong>Company:</strong> ${quote.companyName}</li>
          <li><strong>Seats:</strong> ${quote.seats}</li>
          <li><strong>Total Value:</strong> $${quote.totalPrice.toFixed(2)} ${quote.currency.toUpperCase()}</li>
          <li><strong>Billing:</strong> ${quote.billingType}</li>
          <li><strong>Quote ID:</strong> ${quote.id}</li>
        </ul>
        
        ${quote.notes ? `<p><strong>Customer Notes:</strong> ${quote.notes}</p>` : ''}
        
        <p>This registration was automatically approved. Consider reaching out for onboarding support.</p>
      `;

      logger.info('Sending sales notification email', {
        quoteId: quote.id,
        salesEmail,
        fromEmail,
        companyName: quote.companyName
      });

    } catch (error) {
      logger.error('Failed to send sales notification email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        quoteId: quote.id
      });
    }
  }

  /**
   * Send quote confirmation email for sales-managed quotes
   * @param quote The enterprise quote
   */
  private async sendQuoteConfirmationEmail(quote: EnterpriseQuote): Promise<void> {
    try {
      const fromEmail = process.env.ENTERPRISE_SALES_EMAIL || 'sales@irisync.com';
      
      const htmlContent = `
        <h2>Enterprise Quote Request Received</h2>
        <p>Dear ${quote.contactName},</p>
        <p>Thank you for your interest in IriSync Enterprise. We have received your quote request and our sales team will review it shortly.</p>
        
        <h3>Quote Details:</h3>
        <ul>
          <li><strong>Quote Number:</strong> ${quote.quoteNumber}</li>
          <li><strong>Company:</strong> ${quote.companyName}</li>
          <li><strong>Seats:</strong> ${quote.seats}</li>
          <li><strong>Estimated Price:</strong> $${quote.totalPrice.toFixed(2)} ${quote.currency.toUpperCase()}</li>
        </ul>
        
        <p>Our sales team will contact you within 1 business day to discuss your requirements and provide a customized quote.</p>
        
        <p>Best regards,<br>IriSync Enterprise Sales Team</p>
      `;

      logger.info('Sending quote confirmation email', {
        quoteId: quote.id,
        recipient: quote.contactEmail,
        fromEmail
      });

    } catch (error) {
      logger.error('Failed to send quote confirmation email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        quoteId: quote.id
      });
    }
  }
}

// Export singleton instance
const enterpriseQuoteService = new EnterpriseQuoteService();
export default enterpriseQuoteService;
