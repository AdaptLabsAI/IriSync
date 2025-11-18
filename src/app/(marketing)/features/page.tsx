'use client';

import React from 'react';
import { Layout, Container, Typography, Button, Card } from '@/components/ui/new';
import Link from 'next/link';
import PricingSection from '@/components/features-componets/pricing-section';
import PricingFAQ from '@/components/features-componets/pricing-faq';

// Define feature categories
const featureCategories = [
  {
    id: 'social',
    name: 'Social Media Management',
    features: [
      { 
        id: 'social_accounts', 
        name: 'Social Accounts', 
        creator: '5 accounts',
        influencer: 'Unlimited',
        enterprise: 'Unlimited',
        tooltip: 'Number of social media accounts you can connect and manage.'
      },
      { 
        id: 'user_seats', 
        name: 'User Seats', 
        creator: 'Up to 3',
        influencer: 'Up to 10',
        enterprise: 'Starting at 5',
        tooltip: 'Number of team members who can access your account.'
      },
      { 
        id: 'post_publishing', 
        name: 'Draft, Schedule and Publish Posts', 
        creator: true,
        influencer: true,
        enterprise: true,
        tooltip: 'Create, schedule, and publish content to your social platforms.'
      },
      { 
        id: 'social_inbox', 
        name: 'Unified Social Inbox', 
        creator: true,
        influencer: true,
        enterprise: true,
        tooltip: 'Manage all your social conversations in one place.'
      },
      { 
        id: 'video_scheduling', 
        name: 'Video Scheduling', 
        creator: false,
        influencer: true,
        enterprise: true,
        tooltip: 'Schedule video content for your social platforms.'
      },
      { 
        id: 'bulk_scheduling', 
        name: 'Bulk Scheduling', 
        creator: false,
        influencer: true,
        enterprise: true,
        tooltip: 'Upload and schedule multiple posts at once.'
      },
      { 
        id: 'custom_urls', 
        name: 'Custom Branded URLs', 
        creator: false,
        influencer: true,
        enterprise: true,
        tooltip: 'Create branded short links for your content.'
      },
      { 
        id: 'approval_workflow', 
        name: 'Post Approval Workflows', 
        creator: false,
        influencer: true,
        enterprise: true,
        tooltip: 'Create custom approval flows for content publishing.'
      },
      { 
        id: 'image_editing', 
        name: 'Image Editing Tools and Storage', 
        creator: true,
        influencer: true,
        enterprise: true,
        tooltip: 'Edit and store your media files.'
      }
    ]
  },
  {
    id: 'ai',
    name: 'AI Capabilities',
    features: [
      { 
        id: 'ai_generation', 
        name: 'AI Content Generation/Caption Writing/Hashtag Suggestion', 
        creator: '100/month',
        influencer: '500/month',
        enterprise: 'Starting at 5000/month',
        tooltip: 'AI-generated content, captions and hashtags based on your inputs.'
      },
      { 
        id: 'smart_replies', 
        name: 'Smart Replies', 
        creator: false,
        influencer: false,
        enterprise: true,
        tooltip: 'AI-generated reply suggestions for comments and messages.'
      },
      { 
        id: 'brand_recognition', 
        name: 'Brand Recognition', 
        creator: false,
        influencer: false,
        enterprise: true,
        tooltip: 'AI system that recognizes and maintains your brand voice.'
      },
      { 
        id: 'social_listening', 
        name: 'Basic Social Listening', 
        creator: false,
        influencer: true,
        enterprise: true,
        tooltip: 'Monitor conversations about your brand across social media.'
      },
      { 
        id: 'advanced_listening', 
        name: 'Advanced Social Listening', 
        creator: false,
        influencer: false,
        enterprise: true,
        tooltip: 'Advanced tools to monitor and analyze social conversations.'
      },
      { 
        id: 'sentiment_analysis', 
        name: 'Sentiment Analysis', 
        creator: false,
        influencer: true,
        enterprise: true,
        tooltip: 'Analyze the sentiment of comments and messages on your posts.'
      }
    ]
  },
  {
    id: 'analytics',
    name: 'Analytics & Reporting',
    features: [
      { 
        id: 'basic_analytics', 
        name: 'Basic Analytics', 
        creator: true,
        influencer: true,
        enterprise: true,
        tooltip: 'Track engagement, reach, and audience growth.'
      },
      { 
        id: 'competitor_analytics', 
        name: 'Competitor Benchmarking', 
        creator: 'Up to 5',
        influencer: 'Up to 10',
        enterprise: 'Up to 20',
        tooltip: 'Compare your performance against competitors.'
      },
      { 
        id: 'custom_reports', 
        name: 'Custom Reports', 
        creator: false,
        influencer: true,
        enterprise: true,
        tooltip: 'Create and schedule custom analytics reports.'
      },
      { 
        id: 'link_tracking', 
        name: 'Link Tracking', 
        creator: false,
        influencer: true,
        enterprise: true,
        tooltip: 'Track clicks and engagement on your links.'
      },
      { 
        id: 'custom_dashboard', 
        name: 'Custom Dashboard', 
        creator: false,
        influencer: false,
        enterprise: true,
        tooltip: 'Build custom analytics dashboards.'
      }
    ]
  },
  {
    id: 'support',
    name: 'Support & Collaboration',
    features: [
      { 
        id: 'custom_roles', 
        name: 'Custom User Roles', 
        creator: false,
        influencer: false,
        enterprise: true,
        tooltip: 'Create custom permission levels for team members.'
      },
      { 
        id: 'account_manager', 
        name: 'Dedicated Account Manager', 
        creator: false,
        influencer: false,
        enterprise: true,
        tooltip: 'A dedicated account manager to help with your needs.'
      },
      { 
        id: 'priority_support', 
        name: 'Priority Support', 
        creator: false,
        influencer: false,
        enterprise: true,
        tooltip: 'Get priority access to our support team.'
      },
      { 
        id: 'white_label', 
        name: 'White Label Solution', 
        creator: false,
        influencer: false,
        enterprise: 'Available',
        tooltip: 'Brand the platform with your own logo and colors.'
      }
    ]
  }
];

// Define pricing plans
const plans = [
  {
    id: 'creator',
    name: 'Creator',
    price: '$80',
    period: '/month',
    description: 'Perfect for solo creators and small businesses',
    highlight: false,
    buttonText: 'Start 7-Day Trial',
    buttonLink: '/register?plan=creator'
  },
  {
    id: 'influencer',
    name: 'Influencer',
    price: '$200',
    period: '/month',
    description: 'Ideal for growing brands and influencers',
    highlight: true,
    buttonText: 'Start 7-Day Trial',
    buttonLink: '/register?plan=influencer'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'Advanced solutions for large organizations',
    highlight: false,
    buttonText: 'Contact Sales',
    buttonLink: '/contact-sales'
  }
];

// Helper to render feature value
const renderFeatureValue = (value: boolean | string): React.ReactNode => {
  if (typeof value === 'boolean') {
    return value ? (
      <svg className="w-5 h-5 text-[#00FF6A]" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    ) : (
      <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    );
  }
  return value;
};

// Early Registration Banner Component
const EarlyRegistrationBanner = () => {
  return (
    <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white mb-8">
      <Typography variant="h5" className="text-white font-bold mb-2">
        Limited Time Offer: Early Registration Pricing
      </Typography>
      <Typography variant="body" className="text-white mb-2">
        Get 50% off our regular pricing when you sign up during our launch period:
      </Typography>
      <div className="flex flex-wrap gap-4 justify-center mb-2">
        <div className="bg-white/20 px-4 py-2 rounded-md">
          <span className="line-through text-gray-200">Creator: $80/mo</span> → <span className="font-bold">$40/mo</span>
        </div>
        <div className="bg-white/20 px-4 py-2 rounded-md">
          <span className="line-through text-gray-200">Influencer: $200/mo</span> → <span className="font-bold">$100/mo</span>
        </div>
      </div>
      <Typography variant="caption" className="text-white">
        * Early registration pricing is locked in for the lifetime of your subscription
      </Typography>
    </Card>
  );
};

export default function FeaturesPricingPage() {
  return (
    <Layout>
      <section className="py-20 bg-white">
        <Container>
          {/* Header */}
          {/* <div className="text-center mb-16">
            <Typography variant="h1" className="mb-6">
              Features & Pricing
            </Typography>
            <Typography variant="body" color="secondary" className="max-w-4xl mx-auto">
              Compare our plans and find the perfect solution for your social media management needs
            </Typography>
          </div> */}

          {/* Pricing Section */}
          {/* <div className="mb-16">
            <div className="text-center mb-12">
              <Typography variant="h2" className="mb-4">
                Simple, Transparent Pricing
              </Typography>
              <Typography variant="body" color="secondary">
                Choose the plan that works best for your needs
              </Typography>
            </div>
            
            <EarlyRegistrationBanner />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {plans.map((plan) => (
                <Card 
                  key={plan.id}
                  className={`relative ${plan.highlight ? 'ring-2 ring-[#00FF6A]' : ''}`}
                >
                  {plan.highlight && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className="bg-[#00FF6A] text-white px-4 py-2 rounded-full text-sm font-medium flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        Most Popular
                      </span>
                    </div>
                  )}
                  
                  <div className="text-center mb-8">
                    <Typography variant="h4" className="mb-2">
                      {plan.name}
                    </Typography>
                    <Typography variant="h2" className={`mb-4 ${plan.highlight ? 'text-[#00FF6A]' : ''}`}>
                      {plan.price}
                      {plan.period && <span className="text-lg font-normal text-gray-500">{plan.period}</span>}
                    </Typography>
                    <Typography variant="body" color="secondary">
                      {plan.description}
                    </Typography>
                  </div>
                  
                  <div className="mt-auto">
                    <Link href={plan.buttonLink}>
                      <Button 
                        variant={plan.highlight ? 'primary' : 'outline'} 
                        className="w-full"
                        size="lg"
                      >
                        {plan.buttonText}
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </div> */}
<PricingSection  />
          {/* Feature Comparison Table */}
<div className="mt-20 mb-16 ">
  <div className="text-center ">
    <Typography variant="h2" className="text-3xl font-bold mb-4 text-gray-900">
      Feature Comparison
    </Typography>
    <Typography className="text-gray-600">
      Compare all features across our different plans to find the perfect fit for your needs.
    </Typography>
  </div>

  <Card className="overflow-hidden shadow-lg">
    <div className="overflow-x-auto"> 
      <table className="w-full table-auto border-gray-300">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-300">
            <th className="px-6 py-6 text-left font-semibold text-gray-900 w-[40%] min-w-[150px] border-r border-gray-300">
              Features
            </th>
            <th className="px-6 py-6 text-center font-semibold text-gray-900 w-[30%] min-w-[150px] border-r border-gray-300">
              <div>
                <div className="mb-2">Creator</div>
                <div className="text-2xl font-bold text-gray-900">$30.00</div>
                <div className="text-sm text-gray-500 font-normal">per user / month</div>
              </div>
            </th>
            <th className="px-6 py-6 text-center font-semibold text-gray-900 w-[30%] min-w-[150px] border-r border-gray-300">
              <div>
                <div className="mb-2">Influencer</div>
                <div className="text-2xl font-bold text-gray-900">$89.00</div>
                <div className="text-sm text-gray-500 font-normal">per user / month</div>
              </div>
            </th>
            <th className="px-6 py-6 text-center font-semibold text-gray-900 w-[30%] min-w-[150px]">
              <div>
                <div className="mb-2">Enterprise</div>
                <div className="text-2xl font-bold text-gray-900">Custom</div>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {featureCategories.map((category, catIdx) =>
            category.features.map((feature, featIdx) => (
              <tr
                key={`${category.id}-${feature.id}`}
                className={`border-b border-gray-300 ${
                  (catIdx + featIdx) % 2 === 0 ? "bg-white" : "bg-gray-50"
                }`}
              >
                <td className="px-6 py-4 text-sm font-medium text-gray-900 border-r border-gray-300">
                  {feature.name}
                </td>
                <td className="px-6 py-4 text-center border-r border-gray-300">
                  {typeof feature.creator === 'boolean' ? (feature.creator ? '✔' : '-') : feature.creator}
                </td>
                <td className="px-6 py-4 text-center border-r border-gray-300">
                  {typeof feature.influencer === 'boolean' ? (feature.influencer ? '✔' : '-') : feature.influencer}
                </td>
                <td className="px-6 py-4 text-center">
                  {typeof feature.enterprise === 'boolean' ? (feature.enterprise ? '✔' : '-') : feature.enterprise}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </Card>
</div>

<PricingFAQ/>
      
      
        </Container>
      </section>
    </Layout>
  );
}