import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthentication } from '@/lib/features/auth/utils';
import { getFirestore, serverTimestamp } from '@/lib/core/firebase/admin';
import { logger } from '@/lib/core/logging/logger';
import { getStripeClient } from '@/lib/features/billing/stripe';
import { hasOrganizationRole, OrganizationRole, isMemberOfOrganization } from '@/lib/features/team/users/organization';
import { SubscriptionTier, SubscriptionTierValues } from '@/lib/core/models/User';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


/**
 * API endpoint to add seats to an organization's subscription
 */
export async function POST(req: NextRequest) {
  try {
    // Verify user authentication
    const userId = await verifyAuthentication(req);
    if (!userId) {
      return NextResponse.json({
        error: 'Unauthorized',
        message: 'You must be logged in to manage seats'
      }, { status: 401 });
    }

    // Parse request body
    const body = await req.json();
    const { organizationId, seats, confirm = false } = body;

    if (!organizationId) {
      return NextResponse.json({
        error: 'Missing organization ID',
        message: 'Organization ID is required'
      }, { status: 400 });
    }

    if (!seats || typeof seats !== 'number' || seats <= 0) {
      return NextResponse.json({
        error: 'Invalid seats count',
        message: 'A positive number of seats is required'
      }, { status: 400 });
    }

    // Get the Firestore db
    const db = getFirestore();

    // Check if user is a member of the organization
    const isMember = await isMemberOfOrganization(userId, organizationId);
    if (!isMember) {
      return NextResponse.json({
        error: 'Forbidden',
        message: 'You are not a member of this organization'
      }, { status: 403 });
    }

    // Check if user is an org admin or owner
    const isOrgAdmin = await hasOrganizationRole(userId, organizationId, [OrganizationRole.ADMIN, OrganizationRole.OWNER]);
    if (!isOrgAdmin) {
      return NextResponse.json({
        error: 'Permission denied',
        message: 'You do not have permission to manage seats'
      }, { status: 403 });
    }

    // Get organization data
    const orgDoc = await db.collection('organizations').doc(organizationId).get();
    if (!orgDoc.exists) {
      return NextResponse.json({
        error: 'Organization not found',
        message: 'The organization could not be located'
      }, { status: 404 });
    }

    const orgData = orgDoc.data();
    if (!orgData) {
      return NextResponse.json({
        error: 'Organization data missing',
        message: 'The organization exists but has no data'
      }, { status: 404 });
    }

    // Check seat limits based on tier
    const tier = orgData.billing?.subscriptionTier || orgData.subscriptionTier;
    const currentSeats = orgData.seats || 1;
    const newSeatTotal = currentSeats + seats;
    
    // Enforce tier-based seat limits
    let seatLimit = 1;
    let additionalSeatCost = 0;
    
    switch (tier) {
      case SubscriptionTierValues.CREATOR:
        seatLimit = 3;
        additionalSeatCost = 80; // $80 per additional seat (same as base price)
        break;
      case SubscriptionTierValues.INFLUENCER:
        seatLimit = 10;
        additionalSeatCost = 200; // $200 per additional seat (same as base price)
        break;
      case SubscriptionTierValues.ENTERPRISE:
        seatLimit = Number.MAX_SAFE_INTEGER; // Unlimited for enterprise
        additionalSeatCost = 150; // $150 per additional seat
        break;
      default:
        seatLimit = 1;
    }

    if (newSeatTotal > seatLimit) {
      return NextResponse.json({
        error: 'Seat limit exceeded',
        message: `Your ${tier} tier is limited to ${seatLimit} seats. Please upgrade your plan to add more seats.`
      }, { status: 400 });
    }

    // For pricing estimate only (no confirm), return the cost
    if (!confirm) {
      return NextResponse.json({
        success: true,
        currentSeats,
        newSeatTotal,
        additionalSeats: seats,
        costPerSeat: additionalSeatCost,
        totalAdditionalCost: additionalSeatCost * seats,
        tier,
        message: 'Pricing estimate for additional seats',
        confirm: false
      });
    }

    // Get Stripe client
    const stripe = getStripeClient();

    // Get Stripe subscription from organization
    const stripeSubscriptionId = orgData.billing?.stripeSubscriptionId || orgData.stripeSubscriptionId;
    
    if (!stripeSubscriptionId) {
      return NextResponse.json({
        error: 'No subscription found',
        message: 'No Stripe subscription found for this organization'
      }, { status: 400 });
    }

    try {
      // Get current subscription from Stripe
      const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId, {
        expand: ['items.data.price.product']
      });

      // Find the seat item in the subscription
      const seatItem = subscription.items.data.find(item => {
        const product = item.price.product;
        // Check if product exists, is not deleted, and has the required metadata
        return product && typeof product === 'object' && !product.deleted && product.metadata && product.metadata.isSeat === 'true';
      });

      if (!seatItem) {
        // If no seat item exists, we need to add it
        // This requires creating a new price for the seat or using an existing one
        
        let seatPriceId;
        
        switch (tier) {
          case SubscriptionTierValues.CREATOR:
            seatPriceId = process.env.STRIPE_CREATOR_SEAT_PRICE_ID;
            break;
          case SubscriptionTierValues.INFLUENCER:
            seatPriceId = process.env.STRIPE_INFLUENCER_SEAT_PRICE_ID;
            break;
          case SubscriptionTierValues.ENTERPRISE:
            seatPriceId = process.env.STRIPE_ENTERPRISE_SEAT_PRICE_ID;
            break;
          default:
            seatPriceId = process.env.STRIPE_CREATOR_SEAT_PRICE_ID;
        }
        
        if (!seatPriceId) {
          return NextResponse.json({
            error: 'Configuration error',
            message: 'Seat pricing is not configured for this tier'
          }, { status: 500 });
        }

        // Add new item to subscription
        await stripe.subscriptionItems.create({
          subscription: stripeSubscriptionId,
          price: seatPriceId,
          quantity: seats
        });
      } else {
        // Update existing seat item quantity
        await stripe.subscriptionItems.update(seatItem.id, {
          quantity: newSeatTotal
        });
      }

      // Update organization in database
      await db.collection('organizations').doc(organizationId).update({
        seats: newSeatTotal,
        updatedAt: serverTimestamp()
      });

      // Log the seat update
      const logEntry = {
        action: 'update_seats',
        userId,
        organizationId,
        previousSeats: currentSeats,
        newSeats: newSeatTotal,
        additionalSeats: seats,
        stripeSubscriptionId,
        timestamp: serverTimestamp()
      };

      await db.collection('audit_logs').add(logEntry);

      // Return success
      return NextResponse.json({
        success: true,
        organizationId,
        previousSeats: currentSeats,
        currentSeats: newSeatTotal,
        additionalSeats: seats,
        message: 'Seats added successfully'
      });
    } catch (stripeError) {
      logger.error('Error updating Stripe subscription', {
        error: stripeError instanceof Error ? stripeError.message : String(stripeError),
        stripeSubscriptionId,
        organizationId
      });

      return NextResponse.json({
        error: 'Stripe error',
        message: 'Failed to update subscription with additional seats',
        details: stripeError instanceof Error ? stripeError.message : 'Unknown Stripe error'
      }, { status: 500 });
    }
  } catch (error) {
    logger.error('Error managing organization seats', {
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json({
      error: 'Server error',
      message: 'An error occurred while managing organization seats',
    }, { status: 500 });
  }
} 