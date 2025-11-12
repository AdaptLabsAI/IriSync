'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Layout, Container, Typography, Button, Card } from '@/components/ui/new';
import { get } from '@/lib/core/utils/api-client';
import {  CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { LinearProgress } from "@mui/material";
import { ChartColumn, ChartPie, MessageCircle, MessageSquare, SendHorizonal, Workflow, Zap } from 'lucide-react';
import Head from 'next/head';
import PricingComponent from '@/components/pricingComponent';
import WorkflowHeroSection from '@/components/workflowHeroSection';
import TestimonialsSection from '@/components/testimonialsSection';
import { LineChart, Line } from 'recharts';
import { Instagram, Twitter } from '@mui/icons-material';
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

// Testimonial type
interface Testimonial {
  id: string;
  name: string;
  role: string;
  company: string;
  avatar?: string;
  content: string;
  rating: number;
  isPublished: boolean;
  createdAt: string;
}

// Feature type
interface Feature {
  title: string;
  description: string;
  icon: React.ReactNode;
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

// Features data
const features: Feature[] = [
  {
    title: 'AI Content Generation',
    description: 'Create engaging content automatically with our advanced AI tools',
    icon: (
      <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center">
        <div className="w-8 h-8 bg-green-500 rounded-lg"></div>
      </div>
    )
  },
  {
    title: 'Multi-Platform Management',
    description: 'Manage all your social accounts from one unified dashboard',
    icon: (
      <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center">
        <div className="w-8 h-8 bg-green-500 rounded-lg"></div>
      </div>
    )
  },
  {
    title: 'Engagement Analytics',
    description: 'Track performance with detailed analytics and custom reports',
    icon: (
      <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center">
        <div className="w-8 h-8 bg-green-500 rounded-lg"></div>
      </div>
    )
  },
  {
    title: 'Smart Scheduling',
    description: 'Schedule posts at optimal times for maximum engagement',
    icon: (
      <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center">
        <div className="w-8 h-8 bg-green-500 rounded-lg"></div>
      </div>
    )
  }
];

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

export default function HomePage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTestimonials = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log('Fetching testimonials from API');
        const response = await get('/api/testimonials');
        
        if (response.success && Array.isArray(response.data)) {
          const publishedTestimonials = response.data.filter((t: Testimonial) => t.isPublished);
          setTestimonials(publishedTestimonials.slice(0, 6));
        } else {
          console.warn('No testimonials data or invalid format:', response);
          setTestimonials([]);
        }
      } catch (err) {
        console.error('Error fetching testimonials:', err);
        setError('Failed to load testimonials');
        setTestimonials([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTestimonials();
  }, []);
const data = [
  { name: "Point 1", value: 10 },
  { name: "Point 2", value: 15 },
  { name: "Point 3", value: 30 },
  { name: "Point 4", value: 25 },
  { name: "Point 5", value: 40 },
  { name: "Point 6", value: 35 },
  { name: "Point 7", value: 50 },
  { name: "Point 8", value: 40 },
  { name: "Point 9", value: 60 },
  { name: "Point 10", value: 55 },
]
  return (
    <Layout>
      {/* Hero Section */}
  <section className="relative pt-20 pb-32 overflow-hidden">
  <Container className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
    {/* Headings & Buttons */}
    <div className="text-center max-w-4xl mx-auto">
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold mb-4 text-gray-900">
        AI-Powered
      </h1>
      <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 py-4 bg-gradient-to-r from-green-400 to-green-700 bg-clip-text text-transparent">
        Marketing Mastery
      </h2>
      <p className="text-gray-600 mb-10 text-base md:text-lg">
        Transform your marketing strategy with intelligent automation, data-driven insights and creative optimization.<br />
        Stay ahead of the competition with the power of AI
      </p>
      <div className="flex flex-col sm:flex-row justify-center gap-4">
        <button className="px-6 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition">
          Learn more
        </button>
        <Link href="/register">
          <button className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
            Start free trial
          </button>
        </Link>
      </div>
    </div>

    {/* Grid Section */}
  
    <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 px-2 sm:px-4">
      {/* Connector Lines */}
      <div className="absolute top-1/2 left-1/4 right-1/4 h-0.5 bg-green-200 z-0"></div>
      <div className="absolute top-1/3 left-1/4 h-[calc(50%-4rem)] w-0.5 bg-green-200 z-0"></div>
      <div className="absolute top-1/3 right-1/4 h-[calc(50%-4rem)] w-0.5 bg-green-200 z-0"></div>

      {/* Left Side */}
      <div className="flex flex-col gap-6 relative z-10 w-full max-w-[300px] mx-auto">
        <Card>
          <CardContent>
            <div className="flex items-center">
              <div className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">+21%</div>
            </div>
            <div className="overflow-x-auto">
              <LineChart width={200} height={70} data={data}>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={{ r: 0 }}
                  activeDot={{ r: 4, fill: "#10B981", stroke: "white", strokeWidth: 2 }}
                />
              </LineChart>
            </div>
            <div className="flex justify-between items-center mt-2">
              <p className="text-gray-800 text-sm">Load time vs Bounce rate</p>
              <p className="text-gray-800 text-sm">7 Sec</p>
            </div>
          </CardContent>
        </Card>
        <Card className="mt-6">
          <h3 className="text-2xl font-bold text-gray-800 mb-2">
            479k <span className="text-sm font-normal text-gray-500">sessions</span>
          </h3>
          <p className="text-xs text-gray-500">Session Length VS Per Session</p>
          <div className="space-y-3">
            <div className="w-full">
              <div className="h-4 bg-yellow-300 rounded-full w-3/5 text-xs text-gray-600">
                <span className="ml-3">17mins</span>
              </div>
            </div>
            <div className="w-full">
              <div className="h-4 bg-green-400 rounded-full w-4/5 text-xs text-gray-600">
                <span className="ml-3">29%</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Center - Top Integrations */}
      <Card className="relative z-10 w-full sm-mt-[-20px] mt-[-18px] md:mt-10 max-w-[230px] h-[250px] rounded-3xl mx-auto shadow-2xl shadow-green-200 flex flex-col items-center justify-center">
     
        <div className="absolute w-16 h-16 rounded-full bg-white border border-gray-300 flex items-center justify-center z-20">
          <SendHorizonal className="w-6 h-6 text-gray-700" />
        </div>
        <div className="absolute w-26 h-26 rounded-full border border-dashed border-gray-200 flex items-center justify-center">
          <div className="w-32 h-32 rounded-full border border-dashed border-gray-100"></div>
        </div>
        <div className="absolute w-full h-full top-0 left-0 flex items-center justify-center">
          <div className="absolute top-10 left-10 w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-gray-600" />
          </div>
          <div className="absolute top-10 right-10 w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
            <Twitter className="w-6 h-6 text-gray-600" />
          </div>
          <div className="absolute bottom-10 left-10 w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-gray-600" />
          </div>
          <div className="absolute bottom-10 right-10 w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
            <Instagram className="w-6 h-6 text-gray-600" />
          </div>
        </div>
      </Card>

      {/* Right Side */}
      <div className="flex flex-col gap-6 relative z-10 w-full max-w-[300px] mx-auto">
        <Card>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden">
                <img src="/images/profile3.png" alt="David Williams" className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="font-medium text-gray-800">David Williams</p>
                <p className="text-sm text-gray-500">Marketing Head</p>
              </div>
              <div className="ml-auto">
                <MessageCircle className="w-5 h-5 text-gray-400" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden">
                <img src="/images/profile2.png" alt="Sarah Washington" className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="font-medium text-gray-800">Sarah Washington</p>
                <p className="text-sm text-gray-500">CEO & Founder</p>
              </div>
              <div className="ml-auto">
                <MessageCircle className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          </div>
        </Card>
        <Card className="mt-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-gray-800"></div>
            </div>
            <p className="text-sm text-gray-600">User growth</p>
          </div>
          <div className="flex items-center justify-between">
            <h3 className="text-3xl font-bold text-gray-800">+88.3%</h3>
            <div className="w-10 h-10 rounded-full overflow-hidden">
              <img src="/images/profile4.jpg" alt="Profile" className="w-full h-full object-cover" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  </Container>

  {/* Decorative BG Blur */}
  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-500 rounded-full opacity-10 blur-3xl"></div>
</section>


      {/* Early Registration Banner */}
      {/* <section className="py-16">
        <Container>
          <EarlyRegistrationBanner />
        </Container>
      </section> */}

      {/* Features Section */}
      {/* <section className="py-20 bg-white">
        <Container>
          <div className="text-center mb-16">
            <Typography variant="h2" className="mb-4">
              A <span className="text-green-500">smarter</span> way to market
            </Typography>
            <Typography variant="body" color="secondary" className="max-w-2xl mx-auto">
              Take control of your marketing with our three-pillar approach to success.
            </Typography>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center">
                <div className="mb-6 flex justify-center">
                  {feature.icon}
                </div>
                <Typography variant="h5" className="mb-4">
                  {feature.title}
                </Typography>
                <Typography variant="body" color="secondary">
                  {feature.description}
                </Typography>
              </Card>
            ))}
          </div>
        </Container>
      </section> */}

<section className="w-full py-12 md:py-20 bg-white">
  <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  <div className="flex gap-0 xl:gap-16 items-center">

  {/* Left Column - Text */}
  <div className="w-[80%]  mt-[-265px]">
    <h2 className="text-xl  sm:text-4xl md:text-5xl font-semibold leading-tight sm:leading-snug mb-4">
      A <span className="bg-gradient-to-r from-[#00C853] to-[#003305] bg-clip-text text-transparent">
        smarter
      </span> way to market
    </h2>
    <p className="text-gray-500 text-base sm:text-lg">
      Take control of your marketing with <br className="hidden sm:block" />
      our three-pillar approach to success.
    </p>
  </div>

  {/* Right Column - Cards */}
  <div className="max-w-full ">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-0 p-4 sm:p-6 ">

      {/* Automate */}
      <div className="bg-white  p-4 sm:p-6 shadow-md  ">
        <div className="mb-3">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-green-400 to-white flex items-center justify-center rounded-lg">
            <Zap className='text-white w-6 h-6 sm:w-7 sm:h-7' />
          </div>
        </div>
        <h3 className="font-semibold text-lg sm:text-xl mb-2">Automate</h3>
        <p className="text-sm sm:text-base text-gray-500">
          Eliminate manual tasks and streamline your workflow. Schedule content, analyze performance, and engage audiences—all on autopilot.
        </p>
      </div>

      {/* Dominate */}
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm">
        <div className="mb-3">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-green-400 to-white flex items-center justify-center rounded-lg">
            <ChartPie className='text-white w-6 h-6 sm:w-7 sm:h-7' />
          </div>
        </div>
        <h3 className="font-semibold text-lg sm:text-xl mb-2">Dominate</h3>
        <p className="text-sm sm:text-base text-gray-500">
          Outperform competitors with AI-optimized strategies. Turn insights into action with precision targeting.
        </p>
      </div>

      {/* Elevate */}
      <div className="col-span-1 sm:col-span-2 bg-white rounded-xl p-4 sm:p-6 shadow-sm">
        <div className="mb-3">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-green-400 to-white flex items-center justify-center rounded-lg">
            <ChartColumn className='text-white w-6 h-6 sm:w-7 sm:h-7' />
          </div>
        </div>
        <h3 className="font-semibold text-lg sm:text-xl mb-2">Elevate</h3>
        <p className="text-sm sm:text-base text-gray-500">
          Take your brand to new heights with insights and creative content that resonates and builds loyalty.
        </p>
      </div>

    </div>
  </div>

</div>

  </div>
</section>

<section className='py-10 bg-gray-100'>
  <Container>
  <div className="container mx-auto px-4 py-16">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-5xl font-semibold mb-2">
          Everything you need to <span className="bg-gradient-to-r from-[#00C853] to-[#003305] bg-clip-text text-transparent">succeed</span>
        </h1>
        <p className="text-gray-400">
          Our comprehensive platform delivers tools for every aspect of modern marketing.
        </p>
      </div>

      {/* List of Features */}
      <div className="flex flex-col md:flex-row gap-4 mt-10">
        <div className="w-full md:w-1/3 text-xl">
          <ul className="space-y-10">
            <li className="flex items-center">
          <svg
  xmlns="http://www.w3.org/2000/svg"
  className="h-5 w-5 text-gray-500 mr-2"
  viewBox="0 0 20 20"
  fill="currentColor"
>
  <path
    fillRule="evenodd"
    d="M10.293 15.707a1 1 0 010-1.414L13.586 11H4a1 1 0 110-2h9.586l-3.293-3.293a1 1 0 111.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z"
    clipRule="evenodd"
  />
</svg>
         <span className="bg-gradient-to-r from-[#00C853] to-[#003305] bg-clip-text text-transparent">     AI content creation</span>
            </li>
            <li className="flex items-center">
              <svg
  xmlns="http://www.w3.org/2000/svg"
  className="h-5 w-5 text-gray-500 mr-2"
  viewBox="0 0 20 20"
  fill="currentColor"
>
  <path
    fillRule="evenodd"
    d="M10.293 15.707a1 1 0 010-1.414L13.586 11H4a1 1 0 110-2h9.586l-3.293-3.293a1 1 0 111.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z"
    clipRule="evenodd"
  />
</svg>
              Smart scheduling
            </li>
            <li className="flex items-center">
              <svg
  xmlns="http://www.w3.org/2000/svg"
  className="h-5 w-5 text-gray-500 mr-2"
  viewBox="0 0 20 20"
  fill="currentColor"
>
  <path
    fillRule="evenodd"
    d="M10.293 15.707a1 1 0 010-1.414L13.586 11H4a1 1 0 110-2h9.586l-3.293-3.293a1 1 0 111.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z"
    clipRule="evenodd"
  />
</svg>
              Platform and tool integration
            </li>
            <li className="flex items-center">
               <svg
  xmlns="http://www.w3.org/2000/svg"
  className="h-5 w-5 text-gray-500 mr-2"
  viewBox="0 0 20 20"
  fill="currentColor"
>
  <path
    fillRule="evenodd"
    d="M10.293 15.707a1 1 0 010-1.414L13.586 11H4a1 1 0 110-2h9.586l-3.293-3.293a1 1 0 111.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z"
    clipRule="evenodd"
  />
</svg>
              Custom integration
            </li>
            <li className="flex items-center">
                <svg
  xmlns="http://www.w3.org/2000/svg"
  className="h-5 w-5 text-gray-500 mr-2"
  viewBox="0 0 20 20"
  fill="currentColor"
>
  <path
    fillRule="evenodd"
    d="M10.293 15.707a1 1 0 010-1.414L13.586 11H4a1 1 0 110-2h9.586l-3.293-3.293a1 1 0 111.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z"
    clipRule="evenodd"
  />
</svg>
              Tracking tools
            </li>
          </ul>
        </div>

        {/* Card Sections */}
        <div className="w-full md:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1 */}
          <div className="bg-white p-4 rounded-4xl shadow">
            <Image
              src="/images/card-image-1.png"
              alt="Card Image 1"
              width={100}
              height={100}
              className="mx-auto mb-4"
            />
            <h3 className="text-lg font-bold mb-2">Personalized content matching brand voice</h3>
            <p className="text-gray-400">
              Our AI analyzes your brand's existing content, tone of voice, and industry language to generate social media posts, ads, captions, and emails that feel authentically you.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white p-4 rounded-4xl   shadow">
            <Image
              src="/images/card-image-2.png"
              alt="Card Image 2"
              width={100}
              height={100}
              className="mx-auto mb-4"
            />
            <h3 className="text-lg font-bold mb-2">Trend-aware content suggestions based on industry</h3>
            <p className="text-gray-400">
              Our AI analyzes your brand's existing content, tone of voice, and industry language to generate social media posts, ads, captions, and emails that feel authentically you.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white p-4 rounded-4xl   shadow">
            <Image
              src="/images/card-image-3.png"
              alt="Card Image 3"
              width={100}
              height={100}
              className="mx-auto mb-4"
            />
            <h3 className="text-lg font-bold mb-2">Platform-specific formatting</h3>
            <p className="text-gray-400">
              Create content that's optimized for each social media platform—automatically. Our AI adapts tone, format, and structure to suit the unique requirements and audience behavior of Instagram, LinkedIn, Twitter (X), Facebook, and more.
            </p>
          </div>
        </div>
      </div>

      {/* Call-to-Action Button */}
      <div className="">
        <button className=" text-white px-4 py-2 rounded-lg cursor-pointer bg-gradient-to-r from-[#00C853] to-[#003305] 0 transition duration-300">
          Explore our AI toolkit features
        </button>
      </div>
    </div>
  </Container>
</section>
      {/* Pricing Section */}
      {/* <section className="py-20 bg-gray-900">
        <Container>
          <div className="text-center mb-16">
            <Typography variant="h2" className="text-white mb-4">
              Simple transparent <span className="text-green-500">Pricing</span>
            </Typography>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card 
                key={index} 
                className={`relative ${plan.highlighted ? 'ring-2 ring-green-500' : ''}`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-green-500 text-white px-4 py-2 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-8">
                  <Typography variant="h4" className="mb-2">
                    {plan.name}
                  </Typography>
                  <Typography variant="h2" className="mb-4">
                    {plan.price}
                    {plan.price !== 'Custom' && <span className="text-lg font-normal text-gray-500">/month</span>}
                  </Typography>
                  <Typography variant="body" color="secondary">
                    {plan.description}
                  </Typography>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <Typography variant="body" color="secondary">
                        {feature}
                      </Typography>
                    </li>
                  ))}
                </ul>

                <Link href={plan.buttonLink}>
                  <Button 
                    variant={plan.highlighted ? 'primary' : 'outline'} 
                    className="w-full"
                  >
                    {plan.buttonText}
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        </Container>
      </section> */}
<PricingComponent/>

<WorkflowHeroSection/>
      {/* Testimonials Section */}
      <TestimonialsSection />
   +
      {/* <section className="py-20">
        <Container>
          <div className="text-center mb-16">
            <Typography variant="h2" className="mb-4">
              What our <span className="text-green-500">clients</span> are saying
            </Typography>
            <Typography variant="body" color="secondary">
              The success of our users speaks louder than words
            </Typography>
          </div>

          {loading && (
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            </div>
          )}

          {error && (
            <div className="text-center text-red-500">
              <Typography variant="body">{error}</Typography>
            </div>
          )}

          {!loading && !error && testimonials.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {testimonials.map((testimonial) => (
                <Card key={testimonial.id}>
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full mr-4"></div>
                    <div>
                      <Typography variant="h6">{testimonial.name}</Typography>
                      <Typography variant="caption" color="secondary">
                        {testimonial.role} at {testimonial.company}
                      </Typography>
                    </div>
                  </div>
                  
                  <div className="flex mb-4">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-5 h-5 ${i < testimonial.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  
                  <Typography variant="body" color="secondary">
                    "{testimonial.content}"
                  </Typography>
                </Card>
              ))}
            </div>
          )}

          {!loading && !error && testimonials.length === 0 && (
            <div className="text-center">
              <Typography variant="body" color="secondary">
                No testimonials available at the moment.
              </Typography>
            </div>
          )}
        </Container>
      </section> */}

      {/* CTA Section */}
   <section className="w-full bg-[#F5F5F7] py-16 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-7xl">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
      
          <div className="flex-1 text-center lg:text-left ">
            <h2 className="text-xl sm:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-4 ">
              Ready to <span className="text-green-500">transfer</span> your marketing strategy...?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl">
              Join the future of marketing, using IriSync to automate, dominate, and elevate your marketing.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 mt-17 lg:flex-shrink-0">
            <button className="px-8 py-3 border border-gray-300 rounded-lg text-gray-800 font-medium hover:bg-gray-100 hover:border-gray-400 transition-colors">
              Contact Sales
            </button>
            <button className="px-8 py-3 cursor-pointer bg-gradient-to-r from-[#00C853] to-[#003305] rounded-lg text-white font-medium  transition-colors">
              Start free trial
            </button>
          </div>
        </div>
      </div>
    </section>
    </Layout>
  );
}