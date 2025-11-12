'use client';

import React from 'react';
import { Layout, Container, Typography } from '@/components/ui/new';

export default function BlogPage() {
  return (
    <Layout>
      <section className="py-20">
        <Container>
          {/* Header */}
          <div className="text-center mb-16">
            <Typography variant="h1" className="mb-6">
              Blog
            </Typography>
            <Typography 
              variant="body" 
              color="secondary" 
              className="max-w-3xl mx-auto"
            >
              Insights, tips, and strategies for social media success
            </Typography>
          </div>
          
          <div className="border-t border-gray-200 mb-16"></div>
          
          {/* Empty state */}
          <div className="text-center py-20">
            <div className="max-w-2xl mx-auto">
              <div className="p-6 bg-blue-50 border border-blue-200 rounded-2xl mb-8">
                <Typography variant="body" className="text-blue-700">
                  Our blog is coming soon! Check back for articles, tips, and insights.
                </Typography>
              </div>
              
              <Typography variant="body" color="secondary">
                We&apos;re working on creating valuable content to help you optimize your social media strategy.
                Our team of experts will be sharing industry insights, tips, and best practices.
              </Typography>
            </div>
          </div>
        </Container>
      </section>
    </Layout>
  );
} 