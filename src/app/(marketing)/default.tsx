import { redirect } from 'next/navigation';

/**
 * Default component for marketing route group
 * Will redirect to the home page when accessed directly
 */
export default function MarketingDefault() {
  redirect('/home');
} 