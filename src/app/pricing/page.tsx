'use client';

import React, { useState } from 'react';
import { Layout, Container, Typography, Button, Card } from '@/components/ui/new';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';

// Pricing plan type
interface PricingPlan {
  name: string;
  price: string;
  monthlyPrice: string;
  annualPrice: string;
  description: string;
  features: string[];
  buttonText: string;
  buttonLink: string;
  highlighted?: boolean;
}

// Static pricing data
const pricingPlans: PricingPlan[] = [
  {
    name: 'Creator',
    price: '$80',
    monthlyPrice: '$80',
    annualPrice: '$68',
    description: 'Perfect for solo creators and small businesses',
    features: [
      '5 social accounts',
      '1+ user seats',
      'Draft, schedule, and publish posts',
      'Unified social inbox',
      '100 AI content generations/month',
      'Image editing tools and storage',
      'Basic analytics'
    ],
    buttonText: 'Start Free Trial',
    buttonLink: '/register?plan=creator'
  },
  {
    name: 'Influencer',
    price: '$200',
    monthlyPrice: '$200',
    annualPrice: '$170',
    description: 'Ideal for growing brands and influencers',
    features: [
      'Unlimited social accounts',
      '1+ user seats',
      'Everything in Creator, plus:',
      'Video scheduling',
      'Bulk scheduling',
      'Custom branded URLs',
      'Post approval workflows',
      '500 AI content generations/month',
      'Competitor benchmarking (up to 10)',
      'Custom reports'
    ],
    buttonText: 'Start Free Trial',
    buttonLink: '/register?plan=influencer',
    highlighted: true
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    monthlyPrice: 'Custom',
    annualPrice: 'Custom',
    description: 'Advanced solutions for large organizations',
    features: [
      'Unlimited social accounts',
      '5+ user seats',
      'Everything in Influencer, plus:',
      'Smart replies',
      'Brand recognition',
      'Advanced social listening',
      'Sentiment analysis',
      'Custom user roles',
      'Dedicated account manager',
      'Priority support'
    ],
    buttonText: 'Contact Sales',
    buttonLink: '/contact-sales'
  }
];

// Feature comparison data
const featureCategories = [
  {
    name: 'Features',
    features: [
      { name: 'Social account limits', creator: 'up to 5', influencer: 'Unlimited', enterprise: 'Unlimited' },
      { name: 'User seats', creator: '1+', influencer: '1+', enterprise: '5+' },
      { name: 'Publish, Schedule, and Publish posts', creator: true, influencer: true, enterprise: true },
      { name: 'AI content generation', creator: 'Trial only', influencer: '500 / month', enterprise: 'Unlimited' },
      { name: 'AI caption writing', creator: 'Trial only', influencer: true, enterprise: true },
      { name: 'AI hashtag suggestions', creator: 'Trial only', influencer: true, enterprise: true },
      { name: 'Image editing tools', creator: 'Canva', influencer: 'Canva, Drive', enterprise: 'Canva, Drive, Adobe Express' },
      { name: 'Video scheduling', creator: false, influencer: true, enterprise: true },
      { name: 'Bulk scheduling', creator: false, influencer: true, enterprise: true },
      { name: 'Custom branded URLs', creator: false, influencer: true, enterprise: true },
      { name: 'Post approval workflows', creator: false, influencer: true, enterprise: true },
      { name: 'Team analytics', creator: false, influencer: true, enterprise: true },
      { name: 'Competitor benchmarking', creator: 'up to 5', influencer: 'up to 10', enterprise: 'up to 20' },
      { name: 'Custom reports', creator: false, influencer: true, enterprise: true },
      { name: 'Link tracking', creator: false, influencer: true, enterprise: true },
      { name: 'Custom dashboard', creator: false, influencer: true, enterprise: true },
      { name: 'Smart replies', creator: false, influencer: false, enterprise: true },
      { name: 'Brand recognition', creator: false, influencer: false, enterprise: true },
      { name: 'Basic social listening', creator: false, influencer: false, enterprise: true },
      { name: 'Advanced listening', creator: false, influencer: false, enterprise: true },
      { name: 'Sentiment analysis', creator: false, influencer: false, enterprise: true },
      { name: 'Alert & Notifications', creator: true, influencer: true, enterprise: true },
      { name: 'Access permissions', creator: false, influencer: true, enterprise: true },
      { name: 'Custom user roles', creator: false, influencer: false, enterprise: true },
      { name: 'Legal support', creator: false, influencer: false, enterprise: true },
      { name: 'Ad management', creator: 'Coming soon', influencer: 'Coming soon', enterprise: 'Coming soon' },
      { name: 'Support level', creator: 'Email', influencer: 'Priority email', enterprise: 'Priority + Custom CRM' }
    ]
  }
];

// FAQ data
const faqs = [
  {
    question: 'What\'s the difference between the Pro, Influencer, and Enterprise plans?',
    answer: 'Each plan is designed for different user needs. Creator is perfect for individuals, Influencer adds team collaboration features, and Enterprise provides advanced analytics and dedicated support.'
  },
  {
    question: 'Can I switch between plans later?',
    answer: 'Yes! You can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle.'
  },
  {
    question: 'Is there a free trial available?',
    answer: 'Yes, we offer a 7-day free trial for the Influencer Plan. During the trial, you get full access to all Influencer Plan features. No credit card required. Once the trial is complete, the plan automatically reverts to the Creator tier, granting access to all its features at no cost. If you want to keep your data and insights from the trial, simply upgrade to a paid plan before the trial ends to ensure the seamless transition and retention of all your work.'
  },
  {
    question: 'What happens after my free trial ends?',
    answer: 'After your trial ends, you can choose to upgrade to a paid plan or continue with our free tier with limited features.'
  },
  {
    question: 'Do you offer custom plans for agencies or large teams?',
    answer: 'Yes! Our Enterprise plan can be customized to fit your specific needs. Contact our sales team to discuss your requirements.'
  },
  {
    question: 'Do you offer support with all plans?',
    answer: 'Yes, all plans include support. Creator and Influencer plans include email support, while Enterprise includes priority support with a dedicated account manager.'
  }
];

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annually'>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <Layout>
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="pt-20 pb-16">
          <Container className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-semibold mb-4 text-gray-900">
                Simple transparent <span className="bg-gradient-to-r from-[#00FF6A] to-[#00CC44] bg-clip-text text-transparent">Pricing</span>
              </h1>
            </div>

            {/* Billing Toggle */}
            <div className="flex justify-center mt-8 gap-4">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  billingPeriod === 'monthly'
                    ? 'bg-[#00FF6A] text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod('annually')}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  billingPeriod === 'annually'
                    ? 'bg-[#00FF6A] text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Annually
              </button>
            </div>
          </Container>
        </section>

        {/* Pricing Plans */}
        <section className="pb-16">
          <Container className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-3 gap-8">
              {pricingPlans.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative bg-white rounded-2xl p-8 ${
                    plan.highlighted ? 'ring-2 ring-[#00FF6A] shadow-xl transform scale-105' : 'shadow-md border border-gray-200'
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                      <span className="bg-yellow-400 text-gray-900 px-4 py-1 rounded-full text-sm font-bold uppercase">
                        Best Value
                      </span>
                    </div>
                  )}

                  <div className="mb-6">
                    <Typography variant="h3" className="text-gray-900 mb-2">
                      {plan.name}
                    </Typography>
                    <Typography variant="body" className="text-gray-600">
                      {plan.description}
                    </Typography>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-bold text-gray-900">
                        {plan.price === 'Custom' ? 'Custom' : (billingPeriod === 'monthly' ? plan.monthlyPrice : plan.annualPrice)}
                      </span>
                      {plan.price !== 'Custom' && (
                        <span className="text-gray-600 text-lg">per user / month</span>
                      )}
                    </div>
                  </div>

                  <Link href={plan.buttonLink}>
                    <Button
                      className={`w-full rounded-lg mb-6 ${
                        plan.highlighted
                          ? 'bg-[#00FF6A] hover:bg-[#00CC44] text-white'
                          : 'bg-white border-2 border-[#00FF6A] text-[#00FF6A] hover:bg-green-50'
                      }`}
                      size="lg"
                    >
                      {plan.buttonText}
                    </Button>
                  </Link>

                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <svg
                          className="w-5 h-5 text-[#00FF6A] mt-0.5 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <Typography variant="body" className="text-gray-700 text-sm">
                          {feature}
                        </Typography>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* Feature Comparison Table */}
        <section className="py-16 bg-gray-50">
          <Container className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse bg-white rounded-lg shadow-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left p-4 font-semibold text-gray-900">Features</th>
                    <th className="text-center p-4 font-semibold text-gray-900">Creator<br/><span className="text-sm font-normal text-gray-600">$80 / user / month</span></th>
                    <th className="text-center p-4 font-semibold text-gray-900 bg-green-50">Influencer<br/><span className="text-sm font-normal text-gray-600">$200 / user / month</span></th>
                    <th className="text-center p-4 font-semibold text-gray-900">Enterprise<br/><span className="text-sm font-normal text-gray-600">Custom</span></th>
                  </tr>
                </thead>
                <tbody>
                  {featureCategories[0].features.map((feature, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-4 text-gray-700">{feature.name}</td>
                      <td className="p-4 text-center">
                        {typeof feature.creator === 'boolean' ? (
                          feature.creator ? (
                            <span className="text-[#00FF6A]">✓</span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )
                        ) : (
                          <span className="text-gray-700 text-sm">{feature.creator}</span>
                        )}
                      </td>
                      <td className="p-4 text-center bg-green-50">
                        {typeof feature.influencer === 'boolean' ? (
                          feature.influencer ? (
                            <span className="text-[#00FF6A]">✓</span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )
                        ) : (
                          <span className="text-gray-700 text-sm">{feature.influencer}</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {typeof feature.enterprise === 'boolean' ? (
                          feature.enterprise ? (
                            <span className="text-[#00FF6A]">✓</span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )
                        ) : (
                          <span className="text-gray-700 text-sm">{feature.enterprise}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Container>
        </section>

        {/* FAQ Section */}
        <section className="py-16 bg-white">
          <Container className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-12">
              <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-4">
                Pricing <span className="bg-gradient-to-r from-[#00FF6A] to-[#00CC44] bg-clip-text text-transparent">FAQ's</span>
              </h2>
              <Typography variant="body" className="text-gray-600">
                Got questions? We're here to help you find the plan that works best for your goals.
              </Typography>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-medium text-gray-900 pr-4">{faq.question}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-gray-500 flex-shrink-0 transition-transform ${
                        openFaq === index ? 'transform rotate-180' : ''
                      }`}
                    />
                  </button>
                  {openFaq === index && (
                    <div className="px-5 pb-5 text-gray-600 border-t border-gray-100 pt-4">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Container>
        </section>
      </div>
    </Layout>
  );
}
