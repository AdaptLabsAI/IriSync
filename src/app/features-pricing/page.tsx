/**
 * Features & Pricing Redirect Page
 *
 * This page exists for backward compatibility with old links.
 * Redirects to /integrations since the features page has been deprecated.
 */

import { redirect } from 'next/navigation';

export default function FeaturesPricingPage() {
  redirect('/integrations');
}
