/**
 * Features & Pricing Redirect Page
 *
 * This page exists for backward compatibility with old links.
 * Redirects to /features since features and pricing are now separate pages.
 */

import { redirect } from 'next/navigation';

export default function FeaturesPricingPage() {
  redirect('/features');
}
