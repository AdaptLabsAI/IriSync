'use client';

import React from 'react';
import { Layout, Container, Typography, Button, Card } from '@/components/ui/new';
import Link from 'next/link';

// Pricing plan type
interface PricingPlan {
  name: string;
  price: string;
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
    buttonText: 'Start 7-Day Trial',
    buttonLink: '/register?plan=creator'
  },
  {
    name: 'Influencer',
    price: '$200',
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
    buttonText: 'Start 7-Day Trial',
    buttonLink: '/register?plan=influencer',
    highlighted: true
  },
  {
    name: 'Enterprise',
    price: 'Custom',
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

export default function PricingPage() {
  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <section className="pt-20 pb-16 bg-white">
          <Container className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <Typography variant="h1" className="mb-4 text-gray-900">
                Simple, Transparent Pricing
              </Typography>
              <Typography variant="body" className="text-gray-600 text-lg max-w-2xl mx-auto">
                Choose the perfect plan for your social media management needs. All plans include a 7-day free trial.
              </Typography>
            </div>
          </Container>
        </section>

        {/* Early Registration Banner */}
        <section className="py-8 bg-gradient-to-r from-blue-500 to-purple-600">
          <Container className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center text-white">
              <Typography variant="h5" className="font-bold mb-2 text-white">
                Limited Time Offer: Early Registration Pricing
              </Typography>
              <Typography variant="body" className="mb-4 text-white">
                Get 50% off our regular pricing when you sign up during our launch period
              </Typography>
              <div className="flex flex-wrap gap-4 justify-center">
                <div className="bg-white/20 px-4 py-2 rounded-md">
                  <span className="line-through text-gray-200">Creator: $80/mo</span> → <span className="font-bold">$40/mo</span>
                </div>
                <div className="bg-white/20 px-4 py-2 rounded-md">
                  <span className="line-through text-gray-200">Influencer: $200/mo</span> → <span className="font-bold">$100/mo</span>
                </div>
              </div>
              <Typography variant="caption" className="mt-2 block text-white">
                * Early registration pricing is locked in for the lifetime of your subscription
              </Typography>
            </div>
          </Container>
        </section>

        {/* Pricing Plans */}
        <section className="py-16">
          <Container className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-3 gap-8">
              {pricingPlans.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative bg-white rounded-2xl shadow-lg p-8 ${
                    plan.highlighted ? 'ring-2 ring-green-500 transform scale-105' : ''
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                      <span className="bg-green-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                        Most Popular
                      </span>
                    </div>
                  )}
                  
                  <div className="text-center mb-8">
                    <Typography variant="h3" className="mb-2 text-gray-900">
                      {plan.name}
                    </Typography>
                    <Typography variant="body" className="text-gray-600 mb-4">
                      {plan.description}
                    </Typography>
                    <div className="mb-6">
                      <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                      {plan.price !== 'Custom' && (
                        <span className="text-gray-600">/month</span>
                      )}
                    </div>
                  </div>

                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <svg
                          className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0"
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
                        <Typography variant="body" className="text-gray-700">
                          {feature}
                        </Typography>
                      </li>
                    ))}
                  </ul>

                  <Link href={plan.buttonLink}>
                    <Button
                      className={`w-full ${
                        plan.highlighted
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-gray-800 hover:bg-gray-900'
                      }`}
                      size="lg"
                    >
                      {plan.buttonText}
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* Features Comparison Link */}
        <section className="py-12 bg-white">
          <Container className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <Typography variant="body" className="text-gray-600 mb-4">
                Need more details on features?
              </Typography>
              <Link href="/features-pricing">
                <Button variant="outline" size="lg">
                  View Full Feature Comparison
                </Button>
              </Link>
            </div>
          </Container>
        </section>

        {/* FAQ Section */}
        <section className="py-16 bg-gray-50">
          <Container className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <Typography variant="h2" className="mb-4 text-gray-900">
                Frequently Asked Questions
              </Typography>
            </div>
            
            <div className="max-w-3xl mx-auto space-y-6">
              <Card className="p-6">
                <Typography variant="h6" className="mb-2 text-gray-900">
                  Can I change my plan later?
                </Typography>
                <Typography variant="body" className="text-gray-600">
                  Yes! You can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle.
                </Typography>
              </Card>

              <Card className="p-6">
                <Typography variant="h6" className="mb-2 text-gray-900">
                  What payment methods do you accept?
                </Typography>
                <Typography variant="body" className="text-gray-600">
                  We accept all major credit cards (Visa, MasterCard, American Express) and PayPal.
                </Typography>
              </Card>

              <Card className="p-6">
                <Typography variant="h6" className="mb-2 text-gray-900">
                  Is there a free trial?
                </Typography>
                <Typography variant="body" className="text-gray-600">
                  Yes! All plans include a 7-day free trial. No credit card required to start your trial.
                </Typography>
              </Card>

              <Card className="p-6">
                <Typography variant="h6" className="mb-2 text-gray-900">
                  Can I cancel anytime?
                </Typography>
                <Typography variant="body" className="text-gray-600">
                  Absolutely. You can cancel your subscription at any time with no cancellation fees.
                </Typography>
              </Card>
            </div>
          </Container>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-gradient-to-r from-green-600 to-green-700 text-white">
          <Container className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <Typography variant="h2" className="mb-4 text-white">
                Ready to Get Started?
              </Typography>
              <Typography variant="body" className="mb-8 text-white text-lg">
                Join thousands of businesses using IriSync to manage their social media
              </Typography>
              <Link href="/register">
                <Button size="lg" className="bg-white text-green-600 hover:bg-gray-100">
                  Start Your Free Trial
                </Button>
              </Link>
            </div>
          </Container>
        </section>
      </div>
    </Layout>
  );
}
