import './globals.css';
import { Providers } from './providers';
import type { Metadata } from 'next';
import dynamicImport from 'next/dynamic';

// Force dynamic rendering for all routes to prevent build-time issues
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

// Dynamically import the ChatbotWidget
const ChatbotWidget = dynamicImport(() => import('@/components/support/ChatbotWidget'));

// Font will be loaded via CSS and Tailwind configuration
// Using system fonts as fallback for better performance and reliability

// Get site URL from environment variable
const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://irisync.com';

export const metadata: Metadata = {
  title: {
    template: '%s | IriSync',
    default: 'IriSync - Social Media Management Platform',
  },
  description: 'Unified platform for social media content management with AI-powered tools',
  keywords: ['social media', 'content management', 'AI', 'scheduling', 'analytics'],
  authors: [{ name: 'IriSync Team' }],
  creator: 'IriSync',
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: 'IriSync - Social Media Management Platform',
    description: 'Unified platform for social media content management with AI-powered tools',
    type: 'website',
    locale: 'en_US',
    siteName: 'IriSync',
    url: new URL(siteUrl),
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IriSync - Social Media Management Platform',
    description: 'Unified platform for social media content management with AI-powered tools',
    site: '@irisync',
    creator: '@irisync',
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
          <ChatbotWidget position="bottom-right" />
        </Providers>
      </body>
    </html>
  );
}
