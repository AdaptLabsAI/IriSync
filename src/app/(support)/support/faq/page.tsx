'use client';

import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  Breadcrumbs,
  Link as MuiLink,
  TextField,
  InputAdornment,
  Divider,
  Chip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import Link from 'next/link';

// FAQ categories and items
const FAQ_CATEGORIES = [
  {
    id: 'general',
    name: 'General',
    color: '#4285F4',
    faqs: [
      {
        question: 'What is IriSync?',
        answer: 'IriSync is a comprehensive social media management platform powered by AI that helps creators and brands manage their social media presence across multiple platforms. It offers content scheduling, analytics, AI-assisted content generation, and more.'
      },
      {
        question: 'Which social media platforms does IriSync support?',
        answer: 'IriSync supports all major social media platforms including Twitter, Facebook, Instagram, LinkedIn, Pinterest, TikTok, YouTube, Reddit, and Mastodon. We are continuously adding support for more platforms.'
      },
      {
        question: 'How do I get started with IriSync?',
        answer: 'To get started, create an account, connect your social media profiles in the Settings > Connections section, and you\'re ready to begin managing your social media presence. Check out our Getting Started guide in the Documentation for more detailed instructions.'
      }
    ]
  },
  {
    id: 'accounts',
    name: 'Accounts & Connections',
    color: '#34A853',
    faqs: [
      {
        question: 'How do I connect my social media accounts?',
        answer: 'Go to Settings > Connections in your dashboard. Click on the platform you want to connect and follow the authentication process. You\'ll need to authorize IriSync to access your accounts.'
      },
      {
        question: 'Is it safe to connect my social media accounts to IriSync?',
        answer: 'Yes, IriSync uses OAuth 2.0 for authentication which is the industry standard for secure authorization. We never store your passwords and you can revoke access at any time from your account settings or directly from your social media platform.'
      },
      {
        question: 'Why do I need to grant certain permissions to IriSync?',
        answer: 'IriSync requests specific permissions (like posting, reading analytics, etc.) based on the features you want to use. These permissions allow us to perform actions on your behalf, such as scheduling posts or retrieving analytics data.'
      }
    ]
  },
  {
    id: 'scheduling',
    name: 'Content & Scheduling',
    color: '#FBBC05',
    faqs: [
      {
        question: 'How do I schedule posts?',
        answer: 'To schedule a post, go to Content > Create New Post. Create your content, select the platforms you want to publish to, set the date and time, and click Schedule. You can also use the Calendar view to drag and drop scheduled posts.'
      },
      {
        question: 'Can I schedule the same post to multiple platforms?',
        answer: 'Yes! IriSync allows you to create content once and publish it to multiple platforms simultaneously. You can customize the content for each platform if needed.'
      },
      {
        question: 'How does the AI content generation work?',
        answer: 'Our AI content generator uses advanced language models to help you create engaging posts. Go to Content > AI Generator, select your content type, provide some guidance about the topic, and the AI will suggest content that you can edit before publishing.'
      }
    ]
  },
  {
    id: 'analytics',
    name: 'Analytics & Reporting',
    color: '#EA4335',
    faqs: [
      {
        question: 'What kind of analytics does IriSync provide?',
        answer: 'IriSync provides comprehensive analytics including engagement metrics (likes, comments, shares), audience demographics, post performance, best times to post, content type analysis, competitor insights, and custom reports.'
      },
      {
        question: 'How often is analytics data updated?',
        answer: 'Most analytics data is updated daily. Some metrics that rely on platform APIs may update at different intervals depending on the platform\'s data refresh rate.'
      },
      {
        question: 'Can I export analytics reports?',
        answer: 'Yes, you can export analytics reports in various formats including PDF, CSV, and Excel. Go to Dashboard > Analytics, select the metrics and date range you want, and click Export.'
      }
    ]
  },
  {
    id: 'billing',
    name: 'Billing & Subscription',
    color: '#8E24AA',
    faqs: [
      {
        question: 'How does IriSync pricing work?',
        answer: 'IriSync offers several subscription tiers based on your needs. Pricing is based on factors like the number of social profiles, users, and advanced features. Visit our Pricing page for detailed information.'
      },
      {
        question: 'How do I upgrade or downgrade my plan?',
        answer: 'You can change your subscription plan at any time by going to Settings > Billing. Select the new plan you want and follow the prompts to complete the change.'
      },
      {
        question: 'Do you offer a free trial?',
        answer: 'Yes, we offer a 14-day free trial with full access to all features. No credit card is required to start your trial.'
      }
    ]
  }
];

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  
  // Handle search input change
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };
  
  // Handle category expansion
  const handleCategoryToggle = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };
  
  // Filter FAQs based on search query
  const filteredFAQs = searchQuery === '' 
    ? FAQ_CATEGORIES 
    : FAQ_CATEGORIES.map(category => ({
        ...category,
        faqs: category.faqs.filter(faq => 
          faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
        )
      })).filter(category => category.faqs.length > 0);
  
  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      {/* Header & Breadcrumbs */}
      <Box mb={4}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <MuiLink component={Link} href="/" color="inherit">
            Home
          </MuiLink>
          <MuiLink component={Link} href="/support" color="inherit">
            Support
          </MuiLink>
          <Typography color="text.primary">FAQs</Typography>
        </Breadcrumbs>
        
        <Typography variant="h3" component="h1" gutterBottom>
          Frequently Asked Questions
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Find answers to common questions about IriSync
        </Typography>
      </Box>
      
      {/* Search */}
      <Box mb={6}>
        <TextField
          fullWidth
          placeholder="Search for answers..."
          value={searchQuery}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ bgcolor: 'background.paper', borderRadius: 1 }}
        />
      </Box>
      
      {/* Categories and FAQs */}
      {filteredFAQs.length > 0 ? (
        <Box>
          {filteredFAQs.map((category) => (
            <Box key={category.id} sx={{ mb: 4 }}>
              <Box 
                sx={{ 
                  display: 'flex',
                  alignItems: 'center',
                  mb: 2
                }}
              >
                <Chip 
                  label={category.name} 
                  sx={{ 
                    bgcolor: category.color,
                    color: 'white',
                    fontWeight: 'bold',
                    mr: 2
                  }}
                />
                <Divider sx={{ flexGrow: 1 }} />
              </Box>
              
              {category.faqs.map((faq, index) => (
                <Accordion 
                  key={`${category.id}-${index}`}
                  sx={{ mb: 1 }}
                  id={`${category.id}-${index}`}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography fontWeight="medium">{faq.question}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography>{faq.answer}</Typography>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          ))}
        </Box>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            No FAQs found matching your search
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Try a different search term or browse the categories
          </Typography>
        </Paper>
      )}
    </Container>
  );
} 