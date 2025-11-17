'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Layout, Container, Typography } from '@/components/ui/new';

export default function IntegrationsPage() {
  return (
    <Layout>
      {/* Main Content */}
      <section className="py-20 bg-white">
        <Container className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Social Platforms Section */}
          <div className="bg-gray-50 rounded-3xl p-8 md:p-12 mb-8">
            <div className="text-center mb-12">
              <Typography variant="h2" className="text-gray-900 font-semibold mb-4">
                Social Platforms
              </Typography>
              <Typography variant="body" className="text-gray-600 max-w-2xl mx-auto">
                Connect all your favourite platforms in one place. Our toolkit supports seamless integration with major social media channels.
              </Typography>
            </div>

            {/* Circular Platform Layout */}
            <div className="relative max-w-xl mx-auto h-96 flex items-center justify-center">
              {/* Center Circle */}
              <div className="absolute w-20 h-20 bg-white rounded-full shadow-lg flex items-center justify-center z-10">
                <Image src="/IriSync Figma Photos/Frame.png" alt="X" width={32} height={32} className="opacity-80" />
              </div>

              {/* Concentric Circles */}
              <div className="absolute w-48 h-48 border-2 border-dashed border-gray-300 rounded-full"></div>
              <div className="absolute w-80 h-80 border-2 border-dashed border-gray-200 rounded-full"></div>

              {/* Platform Icons - Positioned in circular pattern */}
              <div className="absolute top-8 left-1/2 transform -translate-x-1/2 w-14 h-14 bg-white rounded-full shadow-md flex items-center justify-center">
                <Image src="/IriSync Figma Photos/Frame-8.png" alt="YouTube" width={28} height={28} />
              </div>

              <div className="absolute top-16 right-12 w-14 h-14 bg-white rounded-full shadow-md flex items-center justify-center">
                <Image src="/IriSync Figma Photos/Frame-6.svg" alt="LinkedIn" width={28} height={28} />
              </div>

              <div className="absolute right-8 top-1/2 transform -translate-y-1/2 w-14 h-14 bg-white rounded-full shadow-md flex items-center justify-center">
                <Image src="/IriSync Figma Photos/Frame-2.svg" alt="Facebook" width={28} height={28} />
              </div>

              <div className="absolute bottom-16 right-16 w-14 h-14 bg-white rounded-full shadow-md flex items-center justify-center">
                <Image src="/IriSync Figma Photos/Frame-7.svg" alt="Mastodon" width={28} height={28} />
              </div>

              <div className="absolute top-20 left-12 w-14 h-14 bg-white rounded-full shadow-md flex items-center justify-center">
                <Image src="/IriSync Figma Photos/Frame-1.svg" alt="Reddit" width={28} height={28} />
              </div>

              <div className="absolute left-8 top-1/2 transform -translate-y-1/2 w-14 h-14 bg-white rounded-full shadow-md flex items-center justify-center">
                <Image src="/IriSync Figma Photos/Frame-3.svg" alt="Threads" width={28} height={28} />
              </div>

              <div className="absolute bottom-16 left-16 w-14 h-14 bg-white rounded-full shadow-md flex items-center justify-center">
                <Image src="/IriSync Figma Photos/fi_3536505.png" alt="TikTok" width={28} height={28} />
              </div>

              <div className="absolute top-1/3 left-24 w-14 h-14 bg-white rounded-full shadow-md flex items-center justify-center">
                <Image src="/IriSync Figma Photos/fi_15713434.png" alt="Pinterest" width={28} height={28} />
              </div>

              <div className="absolute top-1/3 right-24 w-14 h-14 bg-white rounded-full shadow-md flex items-center justify-center">
                <Image src="/IriSync Figma Photos/fi_252851.svg" alt="Instagram" width={28} height={28} />
              </div>
            </div>
          </div>

          {/* Two Column Section */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">

            {/* Content & Media Tools */}
            <div className="bg-gray-50 rounded-3xl p-8 md:p-12">
              <div className="text-center mb-8">
                <Typography variant="h2" className="text-gray-900 font-semibold mb-4">
                  Content & Media Tools
                </Typography>
                <Typography variant="body" className="text-gray-600">
                  Easily connect your favourite content creation and media platforms for a seamless workflow. Our system supports integration with leading tools.
                </Typography>
              </div>

              {/* Tool Icons Grid */}
              <div className="grid grid-cols-3 gap-6 max-w-sm mx-auto">
                <div className="flex items-center justify-center">
                  <Image src="/IriSync Figma Photos/vecteezy_canva-icon-logo-symbol_32329171 2.png" alt="Adobe" width={48} height={48} />
                </div>
                <div className="flex items-center justify-center">
                  <Image src="/IriSync Figma Photos/fi_3602188.png" alt="Google Drive" width={48} height={48} />
                </div>
                <div className="flex items-center justify-center">
                  <Image src="/IriSync Figma Photos/fi_12382553.svg" alt="Dropbox" width={40} height={40} />
                </div>
                <div className="flex items-center justify-center">
                  <Image src="/IriSync Figma Photos/fi_3589915.svg" alt="OneDrive" width={48} height={48} />
                </div>
                <div className="flex items-center justify-center">
                  <Image src="/IriSync Figma Photos/fi_5968991.png" alt="Loom" width={48} height={48} />
                </div>
                <div className="flex items-center justify-center">
                  <Image src="/IriSync Figma Photos/notion 1.png" alt="Notion" width={40} height={40} />
                </div>
              </div>
            </div>

            {/* Analytics & Tracking */}
            <div className="bg-gradient-to-b from-gray-50 to-green-50 rounded-3xl p-8 md:p-12">
              <div className="text-center mb-8">
                <Typography variant="h2" className="text-gray-900 font-semibold mb-4">
                  Analytics & Tracking
                </Typography>
                <Typography variant="body" className="text-gray-600">
                  Get complete visibility into your marketing performance by connecting your favourite analytics tools. Our platform supports seamless integrations.
                </Typography>
              </div>

              {/* Analytics Tools - Circular Layout */}
              <div className="relative max-w-xs mx-auto h-64">
                {/* Center Circle with Google Analytics */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-white rounded-full shadow-lg flex items-center justify-center z-10">
                  <Image src="/IriSync Figma Photos/fi_2910845.png" alt="Google Analytics" width={36} height={36} />
                </div>

                {/* Surrounding tools with badges */}
                <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-black text-white px-3 py-1 rounded-full text-xs whitespace-nowrap">
                  Google Analytics
                </div>

                <div className="absolute top-12 right-8 bg-black text-white px-3 py-1 rounded-full text-xs whitespace-nowrap">
                  Facebook Pixel
                </div>

                <div className="absolute bottom-16 right-4 bg-black text-white px-3 py-1 rounded-full text-xs whitespace-nowrap">
                  Meta Pixel
                </div>

                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-black text-white px-3 py-1 rounded-full text-xs whitespace-nowrap">
                  LinkedIn Insights
                </div>

                <div className="absolute top-20 left-4 flex items-center gap-2">
                  <div className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center">
                    <Image src="/IriSync Figma Photos/fi_5968914.png" alt="TikTok" width={24} height={24} />
                  </div>
                </div>

                <div className="absolute top-1/2 right-2 transform -translate-y-1/2">
                  <div className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center">
                    <Image src="/IriSync Figma Photos/Frame-6.svg" alt="LinkedIn" width={24} height={24} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Two Column Section - CRM and Workflow */}
          <div className="grid md:grid-cols-2 gap-8">

            {/* CRM Systems */}
            <div className="bg-gray-50 rounded-3xl p-8 md:p-12">
              <div className="text-center mb-8">
                <Typography variant="h2" className="text-gray-900 font-semibold mb-4">
                  CRM Systems
                </Typography>
                <Typography variant="body" className="text-gray-600">
                  Easily connect your favourite CRM systems to streamline your marketing and customer engagement workflows.
                </Typography>
              </div>

              {/* CRM Logos - Scattered Layout */}
              <div className="relative h-48">
                <div className="absolute top-4 left-8">
                  <Image src="/IriSync Figma Photos/fi_4138124.png" alt="HubSpot" width={80} height={32} />
                </div>
                <div className="absolute top-4 right-8">
                  <Image src="/IriSync Figma Photos/fi_5968804.png" alt="Salesforce" width={100} height={40} />
                </div>
                <div className="absolute top-20 right-16">
                  <Image src="/IriSync Figma Photos/fi_5968872.png" alt="Pipedrive" width={80} height={32} />
                </div>
                <div className="absolute bottom-8 left-12">
                  <Image src="/IriSync Figma Photos/fi_5969045.png" alt="Zoho" width={60} height={32} />
                </div>
                <div className="absolute bottom-8 right-20">
                  <Image src="/IriSync Figma Photos/sugarcrm-logo-blk 1.png" alt="SugarCRM" width={90} height={32} />
                </div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <Image src="/IriSync Figma Photos/fi_5968896.png" alt="Microsoft Dynamics" width={100} height={40} />
                </div>
              </div>
            </div>

            {/* Workflow & Project Management Tools */}
            <div className="bg-gray-50 rounded-3xl p-8 md:p-12">
              <div className="text-center mb-8">
                <Typography variant="h2" className="text-gray-900 font-semibold mb-4">
                  Workflow & Project Management Tools
                </Typography>
                <Typography variant="body" className="text-gray-600">
                  Easily connect your favourite CRM systems to streamline your marketing and customer engagement workflows.
                </Typography>
              </div>

              {/* Workflow Tools - Pill Layout */}
              <div className="space-y-3">
                <div className="flex flex-wrap gap-3 justify-center">
                  <div className="bg-white px-4 py-2 rounded-full text-sm border border-gray-200">Monday.com</div>
                  <div className="bg-white px-4 py-2 rounded-full text-sm border border-gray-200">Jira</div>
                  <div className="bg-white px-4 py-2 rounded-full text-sm border border-gray-200">Slack</div>
                  <div className="bg-white px-4 py-2 rounded-full text-sm border border-gray-200">ClickUp</div>
                </div>
                <div className="flex flex-wrap gap-3 justify-center">
                  <div className="bg-[#00C853] text-white px-5 py-2 rounded-full text-sm font-medium shadow-md">Microsoft Teams</div>
                  <div className="bg-white px-4 py-2 rounded-full text-sm border border-gray-200">Basecamp</div>
                  <div className="bg-white px-4 py-2 rounded-full text-sm border border-gray-200">Asana</div>
                </div>
                <div className="flex flex-wrap gap-3 justify-center">
                  <div className="bg-white px-4 py-2 rounded-full text-sm border border-gray-200">Wrike</div>
                  <div className="bg-white px-4 py-2 rounded-full text-sm border border-gray-200">ClickUp</div>
                  <div className="bg-white px-4 py-2 rounded-full text-sm border border-gray-200">Airtable</div>
                  <div className="bg-white px-4 py-2 rounded-full text-sm border border-gray-200">Trello</div>
                </div>
                <div className="flex flex-wrap gap-3 justify-center">
                  <div className="bg-white px-4 py-2 rounded-full text-sm border border-gray-200">Zapier</div>
                  <div className="bg-white px-4 py-2 rounded-full text-sm border border-gray-200">Coda</div>
                  <div className="bg-white px-4 py-2 rounded-full text-sm border border-gray-200">Make</div>
                  <div className="bg-white px-4 py-2 rounded-full text-sm border border-gray-200">n8n</div>
                </div>
              </div>
            </div>
          </div>

        </Container>
      </section>
    </Layout>
  );
}
