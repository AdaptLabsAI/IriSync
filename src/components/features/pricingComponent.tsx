'use client';

import React, { useState } from 'react';
import { Switch, FormControlLabel, Chip, Button } from '@mui/material';
import { Check, TrendingUp } from '@mui/icons-material';

const PricingComponent = () => {
  const [isAnnual, setIsAnnual] = useState(false);

  const plans = [
    {
      name: 'Creator',
      description: 'Ideal for growing businesses and marketing professionals.',
      price: isAnnual ? 24 : 30,
      originalPrice: isAnnual ? 30 : null,
      features: [
        'All Starter features',
        '10 unique social accounts',
        '50 AI-generated posts/month',
        'Hashtag recommendations and trending analysis',
        'UTM link builder and tracking',
        'Advanced analytics with export options',
        'Email support'
      ]
    },
    {
      name: 'Influencer',
      description: 'For professional influencers and growing marketing teams.',
      price: isAnnual ? 71.2 : 89,
      originalPrice: isAnnual ? 89 : null,
      isPopular: true,
      features: [
        'All Pro features',
        '30 unique social accounts',
        'Unlimited AI content generation',
        'AI-assisted approval workflows',
        'Shared calendar integration',
        'CRM sync (HubSpot, Zoho, Pipedrive)',
        'Email White-label reporting',
        'Priority email and chat support'
      ]
    },
    {
      name: 'Enterprise',
      description: 'For organizations requiring advanced features and support.',
      price: 'Custom',
      features: [
        'All Influencer features',
        '100+ social accounts',
        'Unlimited users and workspaces',
        'API & webhook integrations',
        'Advanced CRM integrations',
        'AI tone modelling & sentiment tracking',
        'Custom AI model training',
        'Dedicated account manager'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#131A13] text-white p-6">
      <div className="max-w-7xl mx-auto py-9">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-8">
            Simple transparent{' '}
            <span className="text-green-400">Pricing</span>
          </h1>
          
          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-2 ">
            <div className="flex items-center bg-white rounded-lg p-1 mt-4">
           <button
  onClick={() => setIsAnnual(false)}
  className={`px-4 py-2 rounded-lg transition-all font-semibold ${
    !isAnnual
      ? 'bg-gradient-to-r from-[#00FF6A] to-[#00CC44] text-white'
      : 'text-gray-400'
  }`}
>
  Monthly
</button>

              <button
                onClick={() => setIsAnnual(true)}
                className={`px-6 py-2 rounded-lg transition-all  ${
                  isAnnual
                    ? 'bg-gradient-to-r from-[#00FF6A] to-[#00CC44] text-white'
                    : 'text-gray-400 '
                }`}
              >
                Annually
              </button>
            </div>
            
              <div className="relative">
              <div className="absolute -top-7  left-20 transform -translate-x-1/2 rotate-30">
                <Chip
                  label="20% OFF"
                  color="primary"
                  size="small"
                  className="bg-yellow-400 text-white"
                />
                </div>        
<svg width="77" height="32" viewBox="0 0 77 32" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M68.5918 26.9028C72.7746 19.7265 74.4226 11.3939 76.0363 3.20167C75.9552 3.11526 75.8285 2.99719 75.6583 2.85422C75.3012 2.55433 74.8026 2.18149 74.2797 1.81912C73.7573 1.45704 73.2214 1.11296 72.7908 0.868019C72.5742 0.744834 72.3942 0.651826 72.2609 0.594765C72.2046 0.570638 72.164 0.557917 72.1383 0.550168C65.2692 1.39537 58.3762 2.47287 51.6225 3.89128C51.9436 4.17295 52.2842 4.51275 52.6084 4.83362C53.0192 5.24016 53.4143 5.62166 53.784 5.89631C54.1255 6.15001 54.3637 6.24946 54.5156 6.26278L54.5762 6.26301C59.4504 5.60698 64.3904 4.85064 69.2308 4.02918L70.8031 3.76264L69.6643 4.87985C60.6969 13.6722 50.5253 21.4323 38.5713 25.7212L38.5635 25.7242C32.7878 27.6939 26.7923 29.1023 20.6458 29.4037C17.0129 29.6244 13.3837 29.4071 9.79592 28.9231L9.78942 28.9223C9.3087 28.8515 8.69312 28.788 7.99065 28.7073C7.29543 28.6275 6.52788 28.5322 5.77185 28.4003C5.66492 28.3817 5.55814 28.3602 5.45139 28.34C8.28775 29.6531 11.542 30.3978 14.921 30.7459C20.5141 31.322 26.38 30.8062 31.0955 30.0532L31.0982 30.0526C46.1681 27.7304 59.8127 19.6021 70.5513 8.95132L71.7092 7.80341L71.3935 9.40362C70.3067 14.9205 68.7368 20.5448 67.3252 26.0971C67.3416 26.1088 67.3588 26.1221 67.3774 26.135C67.5563 26.2593 67.7972 26.4137 68.0435 26.5671C68.2363 26.6872 68.4289 26.8047 68.5918 26.9028Z" fill="url(#paint0_linear_1_4347)" stroke="#131A13"/>
<defs>
<linearGradient id="paint0_linear_1_4347" x1="74.0002" y1="1.50001" x2="11.5002" y2="29.5" gradientUnits="userSpaceOnUse">
<stop stop-color="white"/>
<stop offset="1" stop-color="white"/>
</linearGradient>
</defs>
</svg>

              </div>
            
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3  mb-8  rounded-3xl">
          {plans.map((plan, index) => (
            <div
              key={plan.name}
              className={`relative  rounded-lg p-6 shadow-sm shadow-gray-400 ${
                plan.isPopular 
                  ? ' ' 
                  : ''
              }  `}
            >
              {/* Popular Badge */}
              {plan.isPopular && (
              <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white rounded-2xl bg-gradient-to-r from-[#00FF6A] to-[#00CC44] bg-clip-text text-transparent">
  <button className="bg-green-500 text-white font-bold text-xs px-3 py-1 rounded-full">
    MOST POPULAR
  </button>
</div>
              )}

              {/* Plan Header */}
              <div className="mb-6  border-gray-700 pb-4 ">
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <p className="text-gray-400 text-sm border-b-amber-300  leading-relaxed">
                  {plan.description}
                </p>
              </div>

              {/* Pricing */}
              <div className="mb-8">
                {plan.price === 'Custom' ? (
                  <div className="text-4xl font-bold">Custom</div>
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">
                      ${plan.price}
                    </span>
                    <span className="text-gray-400">
                      / month
                    </span>
                    {plan.originalPrice && (
                      <span className="text-gray-500 line-through text-lg">
                        ${plan.originalPrice}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Features */}
              <div className="space-y-4">
                {plan.features.map((feature, featureIndex) => (
                  <div key={featureIndex} className="flex items-start gap-3">
                    <Check className="text-green-500 mt-0.5 flex-shrink-0" fontSize="small" />
                    <span className="text-gray-300 text-sm leading-relaxed">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <div className="mt-8">
             
              </div>
            </div>
          ))}
        </div>

        {/* Footer Note */}
        <div className="text-center">
          <p className="text-gray-400 text-sm">
            *Enjoy a 7-day free trial exclusively with the Influencer Edition - explore all premium features before you commit.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PricingComponent;