'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Layout, Container, Typography, Button, Card } from '@/components/ui/new';

// Import icons
import { 
  FaFacebook, 
  FaInstagram, 
  FaTwitter, 
  FaLinkedin, 
  FaTiktok, 
  FaYoutube,
  FaSlack,
  FaMicrosoft,
  FaTrello,
  FaDropbox,
  FaGoogleDrive
} from 'react-icons/fa';

import { 
  SiCanva, 
  SiUnsplash, 
  SiFigma,
  SiGoogleanalytics,
  SiTableau,
  SiZendesk,
  SiHubspot,
  SiSalesforce,
  SiIntercom,
  SiNotion,
  SiBox,
  SiAsana,
  SiAdobecreativecloud
} from 'react-icons/si';

// Define type for integration
interface Integration {
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'active' | 'coming_soon';
}

// Define connection handling function types
interface ConnectionHandlers {
  [key: string]: () => Promise<void>;
}

// Define integration connection functions for each platform
const integrationConnections: ConnectionHandlers = {
  // Social media platforms
  'Facebook': async () => {
    window.open(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/platforms/callback/social?platform=facebook`, '_blank');
  },
  'Instagram': async () => {
    window.open(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/platforms/callback/social?platform=instagram`, '_blank');
  },
  'Twitter/X': async () => {
    window.open(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/platforms/callback/social?platform=twitter`, '_blank');
  },
  'LinkedIn': async () => {
    window.open(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/platforms/callback/social?platform=linkedin`, '_blank');
  },
  'TikTok': async () => {
    window.open(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/platforms/callback/social?platform=tiktok`, '_blank');
  },
  'YouTube': async () => {
    window.open(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/platforms/callback/social?platform=youtube`, '_blank');
  },
  
  // Design tools
  'Canva': async () => {
    window.open(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/platforms/callback/design?platform=canva`, '_blank');
  },
  'Adobe Express': async () => {
    window.open(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/platforms/callback/design?platform=adobe`, '_blank');
  },
  'Unsplash': async () => {
    window.open(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/platforms/callback/design?platform=unsplash`, '_blank');
  },
  
  // Analytics
  'Google Analytics': async () => {
    window.open(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/platforms/callback/analytics?platform=google_analytics`, '_blank');
  },
  'Tableau': async () => {
    window.open(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/platforms/callback/analytics?platform=tableau`, '_blank');
  },
  
  // CRM tools
  'Salesforce': async () => {
    window.open(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/platforms/callback/crm?platform=salesforce`, '_blank');
  },
  'HubSpot': async () => {
    window.open(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/platforms/callback/crm?platform=hubspot`, '_blank');
  },
  'Zendesk': async () => {
    window.open(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/platforms/callback/crm?platform=zendesk`, '_blank');
  },
  
  // Storage
  'Google Drive': async () => {
    window.open(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/platforms/callback/storage?platform=google_drive`, '_blank');
  },
  'Dropbox': async () => {
    window.open(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/platforms/callback/storage?platform=dropbox`, '_blank');
  },
  'One Drive': async () => {
    window.open(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/platforms/callback/storage?platform=onedrive`, '_blank');
  },
  
  // Productivity
  'Slack': async () => {
    window.open(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/platforms/callback/workflow?platform=slack`, '_blank');
  },
  'Microsoft Teams': async () => {
    window.open(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/platforms/callback/workflow?platform=teams`, '_blank');
  },
  'Asana': async () => {
    window.open(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/platforms/callback/workflow?platform=asana`, '_blank');
  },
  'Trello': async () => {
    window.open(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/platforms/callback/workflow?platform=trello`, '_blank');
  }
};

const IntegrationCard = ({ integration }: { integration: Integration }) => {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      // Find and execute the appropriate connection handler
      const connectionHandler = integrationConnections[integration.name];
      if (connectionHandler) {
        await connectionHandler();
      } else {
        console.error(`No connection handler found for ${integration.name}`);
        // Fallback to generic handler
        window.open('https://app.irisync.com/dashboard/settings/integrations', '_blank');
      }
    } catch (error) {
      console.error(`Error connecting to ${integration.name}:`, error);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Card className="h-full flex flex-col group hover:shadow-xl transition-all duration-200 hover:-translate-y-1">
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 flex items-center justify-center">
            {integration.icon}
          </div>
          {integration.status === 'coming_soon' && (
            <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full font-medium">
              Coming Soon
            </span>
          )}
        </div>
        
        <Typography variant="h6" className="mb-2 font-semibold">
          {integration.name}
        </Typography>
        
        <Typography variant="body" color="secondary" className="mb-6 flex-1">
          {integration.description}
        </Typography>
        
        <div className="mt-auto">
          {integration.status === 'active' ? (
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full"
              size="sm"
              isLoading={isConnecting}
            >
              {isConnecting ? 'Connecting...' : 'Connect'}
            </Button>
          ) : (
            <Button
              variant="outline"
              disabled
              className="w-full opacity-60"
              size="sm"
            >
              Coming Soon
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

// Define type for category
interface IntegrationCategory {
  id: string;
  name: string;
  description: string;
  integrations: Integration[];
}

// Integration Categories
const integrationCategories: IntegrationCategory[] = [
  {
    id: 'social',
    name: 'Social Media Platforms',
    description: 'Connect and manage content across all major social networks.',
    integrations: [
      {
        name: 'Facebook',
        description: 'Manage Pages and Groups, schedule posts, and analyze engagement.',
        icon: <FaFacebook color="#1877F2" size={32} />,
        status: 'active'
      },
      {
        name: 'Instagram',
        description: 'Schedule posts, stories, and reels while tracking performance.',
        icon: <FaInstagram color="#E4405F" size={32} />,
        status: 'active'
      },
      {
        name: 'Twitter/X',
        description: 'Schedule tweets, monitor mentions, and analyze engagement.',
        icon: <FaTwitter color="#1DA1F2" size={32} />,
        status: 'active'
      },
      {
        name: 'LinkedIn',
        description: 'Schedule updates for profiles and company pages.',
        icon: <FaLinkedin color="#0A66C2" size={32} />,
        status: 'active'
      },
      {
        name: 'TikTok',
        description: 'Schedule videos and analyze performance metrics.',
        icon: <FaTiktok color="#000000" size={32} />,
        status: 'active'
      },
      {
        name: 'YouTube',
        description: 'Manage uploads, descriptions, and analyze performance.',
        icon: <FaYoutube color="#FF0000" size={32} />,
        status: 'active'
      }
    ]
  },
  {
    id: 'design',
    name: 'Design & Creative Tools',
    description: 'Seamlessly integrate with your favorite design platforms.',
    integrations: [
      {
        name: 'Canva',
        description: 'Create beautiful graphics and import them directly to your content calendar.',
        icon: <SiCanva color="#00C4CC" size={32} />,
        status: 'active'
      },
      {
        name: 'Adobe Express',
        description: 'Design and edit images for your social media posts.',
        icon: <SiAdobecreativecloud color="#FF3366" size={32} />,
        status: 'active'
      },
      {
        name: 'Unsplash',
        description: 'Access millions of high-quality stock photos for your content.',
        icon: <SiUnsplash color="#000000" size={32} />,
        status: 'active'
      },
      {
        name: 'Figma',
        description: 'Import designs directly from your Figma projects.',
        icon: <SiFigma color="#F24E1E" size={32} />,
        status: 'coming_soon'
      }
    ]
  },
  {
    id: 'analytics',
    name: 'Analytics & Performance',
    description: 'Enhance your insights with powerful analytics integrations.',
    integrations: [
      {
        name: 'Google Analytics',
        description: 'Connect website analytics to measure social media impact on site traffic.',
        icon: <SiGoogleanalytics color="#E37400" size={32} />,
        status: 'active'
      },
      {
        name: 'Tableau',
        description: 'Create custom dashboards from your social media data.',
        icon: <SiTableau color="#E97627" size={32} />,
        status: 'active'
      },
      {
        name: 'Databox',
        description: 'Build custom performance dashboards with your social analytics.',
        icon: <div className="inline-flex items-center justify-center w-8 h-8 rounded bg-blue-600 text-white text-sm font-bold">Db</div>,
        status: 'coming_soon'
      }
    ]
  },
  {
    id: 'crm',
    name: 'CRM & Customer Engagement',
    description: 'Connect your customer data for more effective social engagement.',
    integrations: [
      {
        name: 'Salesforce',
        description: 'Sync customer data and social interactions with your CRM.',
        icon: <SiSalesforce color="#00A1E0" size={32} />,
        status: 'active'
      },
      {
        name: 'HubSpot',
        description: 'Integrate social media with your marketing automation.',
        icon: <SiHubspot color="#FF7A59" size={32} />,
        status: 'active'
      },
      {
        name: 'Zendesk',
        description: 'Turn social messages into support tickets automatically.',
        icon: <SiZendesk color="#03363D" size={32} />,
        status: 'active'
      },
      {
        name: 'Intercom',
        description: 'Manage customer conversations across social and chat.',
        icon: <SiIntercom color="#6C71F2" size={32} />,
        status: 'coming_soon'
      }
    ]
  },
  {
    id: 'storage',
    name: 'Cloud Storage & Content',
    description: 'Access your content from wherever it lives.',
    integrations: [
      {
        name: 'Google Drive',
        description: 'Import images and videos directly from your Drive.',
        icon: <FaGoogleDrive color="#0F9D58" size={32} />,
        status: 'active'
      },
      {
        name: 'Dropbox',
        description: 'Access your Dropbox files within the platform.',
        icon: <FaDropbox color="#0061FF" size={32} />,
        status: 'active'
      },
      {
        name: 'One Drive',
        description: 'Sync files from your Microsoft One Drive account.',
        icon: <FaMicrosoft color="#0078D7" size={32} />,
        status: 'active'
      },
      {
        name: 'Box',
        description: 'Enterprise file storage and collaboration platform.',
        icon: <SiBox color="#0061D5" size={32} />,
        status: 'coming_soon'
      }
    ]
  },
  {
    id: 'productivity',
    name: 'Productivity & Workflow',
    description: 'Streamline your workflow with productivity tool integrations.',
    integrations: [
      {
        name: 'Slack',
        description: 'Get notifications and updates directly in your Slack channels.',
        icon: <FaSlack color="#4A154B" size={32} />,
        status: 'active'
      },
      {
        name: 'Microsoft Teams',
        description: 'Collaborate with your team using Microsoft Teams integration.',
        icon: <FaMicrosoft color="#6264A7" size={32} />,
        status: 'active'
      },
      {
        name: 'Asana',
        description: 'Turn social media tasks into Asana projects automatically.',
        icon: <SiAsana color="#0D7377" size={32} />,
        status: 'active'
      },
      {
        name: 'Trello',
        description: 'Create Trello cards from social media content and campaigns.',
        icon: <FaTrello color="#0079BF" size={32} />,
        status: 'active'
      },
      {
        name: 'Notion',
        description: 'Sync your content calendar with Notion databases.',
        icon: <SiNotion color="#000000" size={32} />,
        status: 'coming_soon'
      }
    ]
  }
];

export default function IntegrationsPage() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [isScrolled, setIsScrolled] = useState(false);
  
  // Handle scrolling for sticky category tabs
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsScrolled(scrollPosition > 250);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Filter integrations based on search and active category
  const filteredCategories = integrationCategories
    .map(category => {
      // Filter integrations within this category by search term
      const filteredIntegrations = category.integrations
        .filter(integration => 
          integration.name.toLowerCase().includes(search.toLowerCase()) || 
          integration.description.toLowerCase().includes(search.toLowerCase())
        );
      
      // Return a new category object with filtered integrations
      return {
        ...category,
        integrations: filteredIntegrations
      };
    })
    // Filter categories that have matching integrations
    .filter(category => 
      category.integrations.length > 0 && 
      (activeCategory === 'all' || category.id === activeCategory)
    );
  
  // Count all active integrations
  const activeIntegrationsCount = integrationCategories.reduce(
    (total, category) => total + category.integrations.filter(i => i.status === 'active').length, 
    0
  );
  
  const handleCategoryChange = (newValue: string) => {
    setActiveCategory(newValue);
    
    // Scroll to the appropriate section
    if (newValue !== 'all') {
      const element = document.getElementById(newValue);
      if (element) {
        const yOffset = -100; // Offset for the sticky header
        const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    } else {
      // Scroll to top when "All" is selected
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-green-500 to-green-900 text-white py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-transparent"></div>
        <Container>
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <Typography variant="h1" className="text-white mb-6 font-bold">
                Supercharge Your Workflow
              </Typography>
              <Typography variant="h5" className="text-white/90 mb-8 max-w-2xl">
                Connect IriSync with your favorite tools and platforms for a seamless experience
              </Typography>
              
              {/* Integration count badge */}
              <div className="inline-block bg-white/15 backdrop-blur-sm px-6 py-3 rounded-full mb-8">
                <Typography variant="h6" className="text-white font-bold">
                  {activeIntegrationsCount}+ Active Integrations
                </Typography>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4 justify-center lg:justify-end">
              {/* Integration icon cloud - showing representative icons */}
              {[
                { icon: <FaFacebook />, key: 'facebook' },
                { icon: <SiCanva />, key: 'canva' },
                { icon: <FaSlack />, key: 'slack' },
                { icon: <SiHubspot />, key: 'hubspot' },
                { icon: <FaGoogleDrive />, key: 'drive' },
                { icon: <SiTableau />, key: 'tableau' }
              ].map((item, index) => (
                <div 
                  key={item.key}
                  className="w-15 h-15 rounded-full bg-white/90 shadow-lg flex items-center justify-center text-green-600 text-2xl transform hover:scale-110 transition-transform"
                  style={{
                    transform: `scale(${0.8 + Math.random() * 0.4}) translate(${-10 + Math.random() * 20}px, ${-10 + Math.random() * 20}px)`
                  }}
                >
                  {item.icon}
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>
      
      {/* Main Content */}
      <section className="py-12 relative">
        <Container>
          {/* Search and filter bar */}
          <Card className="p-6 mb-8 -mt-16 relative z-20 shadow-xl">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="w-full sm:w-1/2">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search integrations..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  />
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleCategoryChange('all')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    activeCategory === 'all' 
                      ? 'bg-green-500 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All ({activeIntegrationsCount})
                </button>
                
                {integrationCategories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryChange(category.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      activeCategory === category.id 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
          </Card>
          
          {/* Sticky category navigation for desktop */}
          <div className={`hidden md:block sticky top-20 z-30 mb-8 transition-all duration-300 ${
            isScrolled ? 'bg-white rounded-lg shadow-lg p-4' : ''
          }`}>
            <div className="flex gap-2 overflow-x-auto">
              <button
                onClick={() => handleCategoryChange('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeCategory === 'all' 
                    ? 'bg-green-500 text-white' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                All Integrations
              </button>
              {integrationCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryChange(category.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    activeCategory === category.id 
                      ? 'bg-green-500 text-white' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
          
          {/* No results message */}
          {filteredCategories.length === 0 && (
            <Card className="text-center py-16 bg-gray-50">
              <Typography variant="h5" className="mb-4">
                No integrations found
              </Typography>
              <Typography variant="body" color="secondary" className="mb-6">
                Try adjusting your search or filters to find what you're looking for.
              </Typography>
              <Button 
                variant="outline"
                onClick={() => { setSearch(''); setActiveCategory('all'); }}
              >
                Clear Filters
              </Button>
            </Card>
          )}
          
          {/* Integration Categories */}
          {filteredCategories.map((category) => (
            <div 
              id={category.id}
              key={category.id} 
              className="mb-16"
              style={{ scrollMarginTop: '100px' }}
            >
              <div className="flex items-center mb-2">
                <Typography variant="h3" className="mr-4">
                  {category.name}
                </Typography>
                <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                  {category.integrations.length} integrations
                </span>
              </div>
              
              <Typography variant="body" color="secondary" className="mb-8 max-w-4xl">
                {category.description}
              </Typography>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {category.integrations.map((integration, index) => (
                  <IntegrationCard key={index} integration={integration} />
                ))}
              </div>
            </div>
          ))}
          
          {/* Custom Integration Section */}
          <Card className="mt-16 overflow-hidden bg-gradient-to-br from-blue-50 to-purple-50">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="hidden lg:block relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg"></div>
              </div>
              <div className="p-8 lg:p-12">
                <div className="relative">
                  <Typography variant="h4" className="mb-6 font-bold relative">
                    Need a Custom Integration?
                    <div className="absolute bottom-0 left-0 w-16 h-1 bg-green-500 rounded-full mt-2"></div>
                  </Typography>
                </div>
                <Typography variant="body" className="mb-4">
                  Don't see the integration you need? Our team can build custom connections
                  to your existing tools and workflows. Enterprise plans include custom
                  integration development as part of our service.
                </Typography>
                <Typography variant="body" className="mb-8">
                  We also offer an API for developers to build their own integrations
                  with IriSync.
                </Typography>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/contact-sales">
                    <Button size="lg" className="w-full sm:w-auto">
                      Talk to Sales
                    </Button>
                  </Link>
                  <Link href="/docs/api">
                    <Button variant="outline" size="lg" className="w-full sm:w-auto">
                      API Documentation
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        </Container>
      </section>
    </Layout>
  );
} 