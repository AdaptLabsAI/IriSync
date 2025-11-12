#!/usr/bin/env ts-node
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';
import { firestore as db } from '../src/lib/firebase';
import { collection, doc, setDoc, Timestamp } from 'firebase/firestore';
import { logger } from '../src/lib/logging/logger';
import { 
  KnowledgeContent, 
  KnowledgeContentType, 
  KnowledgeStatus, 
  KnowledgeAccessLevel 
} from '../src/lib/knowledge/models';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

/**
 * Script to seed the database with initial data
 */
async function seedDatabase() {
  try {
    logger.info('Starting database seeding...');
    
    // Get parameters from command line arguments
    const args = process.argv.slice(2);
    const dataType = args[0] || 'all'; // Can be 'all', 'knowledge', 'blog', etc.
    
    // Seed based on data type
    if (dataType === 'all' || dataType === 'knowledge') {
      await seedKnowledgeContent();
    }
    
    if (dataType === 'all' || dataType === 'blog') {
      await seedBlogPosts();
    }
    
    if (dataType === 'all' || dataType === 'careers') {
      await seedCareerPosts();
    }
    
    logger.info('Database seeding completed successfully');
  } catch (error) {
    logger.error(`Error seeding database: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

/**
 * Seed knowledge base content
 */
async function seedKnowledgeContent() {
  logger.info('Seeding knowledge content...');
  
  // Common categories
  const categories = [
    'Getting Started',
    'Account Management',
    'Billing',
    'Content Creation',
    'Social Media',
    'Analytics',
    'AI Features',
    'Troubleshooting'
  ];
  
  // Add categories to database
  for (const category of categories) {
    await setDoc(doc(db, 'knowledgeCategories', category), {
      name: category,
      createdAt: Timestamp.now()
    });
  }
  
  // Sample knowledge content - just a few examples
  const knowledgeItems: Partial<KnowledgeContent>[] = [
    {
      title: 'How to connect your social media accounts',
      slug: 'how-to-connect-social-accounts',
      content: `
        <h2>Connecting Your Social Media Accounts</h2>
        <p>Follow these steps to connect your social media accounts to IriSync:</p>
        <ol>
          <li>Navigate to Settings > Connections in your dashboard</li>
          <li>Click "Add New Connection"</li>
          <li>Select the platform you wish to connect</li>
          <li>Follow the authorization process for that platform</li>
          <li>Once authorized, your account will appear in the connections list</li>
        </ol>
        <p>Note that each subscription tier has different limits on the number of accounts you can connect.</p>
      `,
      contentType: KnowledgeContentType.TUTORIAL,
      category: 'Getting Started',
      tags: ['social media', 'connections', 'setup'],
      status: KnowledgeStatus.PUBLISHED,
      accessLevel: KnowledgeAccessLevel.PUBLIC,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      publishedAt: Timestamp.now(),
      createdBy: 'system',
      vectorIds: []
    },
    {
      title: 'Understanding your Analytics Dashboard',
      slug: 'understanding-analytics-dashboard',
      content: `
        <h2>Understanding Your Analytics Dashboard</h2>
        <p>The IriSync analytics dashboard provides comprehensive insights into your social media performance.</p>
        <h3>Key Metrics</h3>
        <ul>
          <li><strong>Engagement Rate</strong>: Total engagement divided by impressions</li>
          <li><strong>Audience Growth</strong>: Change in follower count over time</li>
          <li><strong>Content Performance</strong>: How individual posts are performing</li>
          <li><strong>Conversion Tracking</strong>: Track link clicks and conversions</li>
        </ul>
        <p>You can adjust the time period using the date selector at the top of the dashboard.</p>
      `,
      contentType: KnowledgeContentType.DOCUMENTATION,
      category: 'Analytics',
      tags: ['analytics', 'dashboard', 'metrics'],
      status: KnowledgeStatus.PUBLISHED,
      accessLevel: KnowledgeAccessLevel.REGISTERED,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      publishedAt: Timestamp.now(),
      createdBy: 'system',
      vectorIds: []
    },
    {
      title: 'Frequently Asked Questions',
      slug: 'frequently-asked-questions',
      content: `
        <h2>Frequently Asked Questions</h2>
        
        <h3>What is IriSync?</h3>
        <p>IriSync is an AI-powered social media management platform that helps you create, schedule, and analyze content across multiple social networks.</p>
        
        <h3>What platforms does IriSync support?</h3>
        <p>IriSync currently supports Facebook, Instagram, Twitter/X, LinkedIn, Pinterest, TikTok, YouTube, Reddit, Mastodon, and Threads.</p>
        
        <h3>How do I cancel my subscription?</h3>
        <p>You can cancel your subscription at any time by going to Settings > Billing > Subscription and clicking "Cancel Subscription".</p>
      `,
      contentType: KnowledgeContentType.FAQ,
      category: 'Getting Started',
      tags: ['faq', 'general'],
      status: KnowledgeStatus.PUBLISHED,
      accessLevel: KnowledgeAccessLevel.PUBLIC,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      publishedAt: Timestamp.now(),
      createdBy: 'system',
      vectorIds: []
    },
  ];
  
  // Add knowledge content to database
  for (const item of knowledgeItems) {
    const docRef = doc(collection(db, 'knowledgeContent'));
    await setDoc(docRef, {
      ...item,
      id: docRef.id
    });
    logger.info(`Added knowledge content: ${item.title}`);
  }
  
  logger.info(`Seeded ${knowledgeItems.length} knowledge content items`);
}

/**
 * Seed blog posts
 */
async function seedBlogPosts() {
  logger.info('Seeding blog posts...');
  
  // Sample blog posts
  const blogPosts = [
    {
      title: 'Introducing IriSync: AI-Powered Social Media Management',
      slug: 'introducing-irisync',
      content: `
        <h2>Introducing IriSync: AI-Powered Social Media Management</h2>
        <p>Today, we're excited to announce the launch of IriSync, a comprehensive AI-powered social media management platform designed for creators, influencers, and enterprises.</p>
        <p>With IriSync, you can:</p>
        <ul>
          <li>Create compelling content with AI assistance</li>
          <li>Schedule posts across multiple platforms</li>
          <li>Analyze performance with detailed metrics</li>
          <li>Engage with your audience through a unified inbox</li>
        </ul>
        <p>We've built IriSync to solve the real challenges faced by social media managers and content creators in today's fast-paced digital landscape.</p>
      `,
      excerpt: 'Announcing the launch of IriSync, an AI-powered social media management platform for creators, influencers, and enterprises.',
      publishedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      author: 'Sarah Johnson',
      authorRole: 'CEO & Co-Founder',
      categories: ['Product', 'Announcement'],
      tags: ['launch', 'social media', 'AI'],
      featuredImage: 'https://example.com/images/introducing-irisync.jpg'
    }
  ];
  
  // Add blog posts to database
  for (const post of blogPosts) {
    const docRef = doc(collection(db, 'blogPosts'));
    await setDoc(docRef, {
      ...post,
      id: docRef.id,
      createdAt: Timestamp.now()
    });
    logger.info(`Added blog post: ${post.title}`);
  }
  
  logger.info(`Seeded ${blogPosts.length} blog posts`);
}

/**
 * Seed career posts
 */
async function seedCareerPosts() {
  logger.info('Seeding career posts...');
  
  // Sample career posts
  const careerPosts = [
    {
      title: 'Senior Full-Stack Developer',
      slug: 'senior-full-stack-developer',
      department: 'Engineering',
      location: 'Remote (US/Canada)',
      type: 'Full-time',
      description: `
        <h2>Senior Full-Stack Developer</h2>
        <p>We're looking for an experienced Full-Stack Developer to join our engineering team and help build the future of IriSync.</p>
        
        <h3>Responsibilities</h3>
        <ul>
          <li>Design, develop, and maintain web applications using React, TypeScript, and Node.js</li>
          <li>Collaborate with product managers, designers, and other engineers</li>
          <li>Contribute to architectural decisions and technical specifications</li>
          <li>Write clean, efficient, and well-documented code</li>
        </ul>
        
        <h3>Requirements</h3>
        <ul>
          <li>5+ years of experience in full-stack development</li>
          <li>Strong proficiency in React, TypeScript, and Node.js</li>
          <li>Experience with Next.js and Firestore is a plus</li>
          <li>Understanding of CI/CD pipelines and DevOps practices</li>
        </ul>
      `,
      publishedAt: Timestamp.now(),
      isActive: true
    }
  ];
  
  // Add career posts to database
  for (const post of careerPosts) {
    const docRef = doc(collection(db, 'careerPosts'));
    await setDoc(docRef, {
      ...post,
      id: docRef.id,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    logger.info(`Added career post: ${post.title}`);
  }
  
  logger.info(`Seeded ${careerPosts.length} career posts`);
}

// Run the script
if (require.main === module) {
  seedDatabase()
    .then(() => {
      logger.info('Database seeding completed successfully');
      process.exit(0);
    })
    .catch(error => {
      logger.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    });
}

export default seedDatabase; 