'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Layout, Container, Typography, Button, Card, Loading } from '@/components/ui/new';

export default function TestimonialSubmissionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    company: '',
    content: '',
    rating: 5,
    allowPublish: false,
    passcode: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  // Get passcode from URL
  useEffect(() => {
    const passcode = searchParams?.get('passcode');
    if (passcode) {
      setFormData(prev => ({
        ...prev,
        passcode
      }));
    }
  }, [searchParams]);
  
  // Check if user is authorized to submit a testimonial
  useEffect(() => {
    const validateRequest = async () => {
      if (status === 'loading') return;
      
      const passcode = searchParams?.get('passcode');
      
      // Redirect if no passcode provided
      if (!passcode) {
        router.push('/');
        return;
      }
      
      try {
        // Validate the passcode and check if the user has a valid testimonial request
        const response = await fetch(`/api/feedback/testimonial/validate?passcode=${passcode}${session?.user ? `&userId=${(session.user as any)?.id}` : ''}`);
        const data = await response.json();
        
        if (!response.ok || !data.valid) {
          setError('Invalid or expired testimonial request. Please use the link from your email.');
          setIsAuthorized(false);
        } else {
          setIsAuthorized(true);
          // Pre-fill form with data from the testimonial request
          if (data.userData) {
            setFormData(prev => ({
              ...prev,
              name: data.userData.name || prev.name,
              company: data.userData.company || prev.company,
              role: data.userData.role || prev.role
            }));
          }
        }
      } catch (err) {
        console.error('Error validating testimonial request:', err);
        setError('Failed to validate your testimonial request.');
        setIsAuthorized(false);
      } finally {
        setValidating(false);
      }
    };
    
    validateRequest();
  }, [searchParams, session, status, router]);
  
  // Pre-fill form with user data if available
  React.useEffect(() => {
    if (session?.user && isAuthorized) {
      setFormData(prevData => ({
        ...prevData,
        name: session.user?.name || prevData.name,
      }));
    }
  }, [session, isAuthorized]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, checked } = target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'allowPublish' ? checked : value
    }));
  };
  
  const handleRatingChange = (newValue: number) => {
    setFormData(prev => ({
      ...prev,
      rating: newValue
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Submit testimonial data with passcode for verification
      const response = await fetch('/api/feedback/testimonial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          isPublished: formData.allowPublish // Only publish if user allows
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to submit testimonial');
      }
      
      // Show success message
      setSuccess(true);
      
      // Reset form after successful submission
      setFormData({
        name: '',
        role: '',
        company: '',
        content: '',
        rating: 5,
        allowPublish: false,
        passcode: ''
      });
      
      // Redirect after 3 seconds
      setTimeout(() => {
        router.push('/');
      }, 3000);
      
    } catch (err) {
      console.error('Error submitting testimonial:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCloseSnackbar = () => {
    setSuccess(false);
  };
  
  // Star Rating Component
  const StarRating = ({ value, onChange }: { value: number; onChange: (rating: number) => void }) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`w-8 h-8 transition-colors ${
              star <= value ? 'text-yellow-400' : 'text-gray-300'
            } hover:text-yellow-400`}
          >
            <svg fill="currentColor" viewBox="0 0 20 20" className="w-full h-full">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
      </div>
    );
  };
  
  if (validating) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Container maxWidth="sm">
            <div className="text-center py-20">
              <Loading size="lg" className="mb-4" />
              <Typography variant="h6">
                Validating your testimonial request...
              </Typography>
            </div>
          </Container>
        </div>
      </Layout>
    );
  }
  
  if (!isAuthorized) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Container maxWidth="sm">
            <Card className="p-8 text-center">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
                <Typography variant="body" className="text-red-700">
                  {error || 'You are not authorized to access this page.'}
                </Typography>
              </div>
              <Button onClick={() => router.push('/')}>
                Return to Homepage
              </Button>
            </Card>
          </Container>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-12">
        <Container maxWidth="md">
          <Card className="p-8">
            <div className="text-center mb-8">
              <Typography variant="h2" className="mb-4">
                Share Your Experience with IriSync
              </Typography>
              <Typography variant="body" color="secondary" className="max-w-2xl mx-auto">
                Thank you for being a valued customer! Your feedback helps us improve and helps others discover our platform.
              </Typography>
            </div>
            
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
                <Typography variant="body" className="text-red-700">
                  {error}
                </Typography>
              </div>
            )}
            
            {success && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-6">
                <Typography variant="body" className="text-green-700">
                  Thank you for your testimonial! We appreciate your feedback.
                </Typography>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name *
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                />
              </div>
              
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Role
                </label>
                <input
                  id="role"
                  name="role"
                  type="text"
                  value={formData.role}
                  onChange={handleChange}
                  placeholder="e.g. Social Media Manager"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                />
              </div>
              
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                  Company
                </label>
                <input
                  id="company"
                  name="company"
                  type="text"
                  value={formData.company}
                  onChange={handleChange}
                  placeholder="e.g. Acme Inc."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                />
              </div>
              
              <div>
                <Typography variant="body" className="block text-sm font-medium text-gray-700 mb-3">
                  How would you rate your experience with IriSync?
                </Typography>
                <StarRating value={formData.rating} onChange={handleRatingChange} />
              </div>
              
              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Testimonial *
                </label>
                <textarea
                  id="content"
                  name="content"
                  required
                  value={formData.content}
                  onChange={handleChange}
                  rows={6}
                  placeholder="Share your experience with IriSync and how it has helped your social media management..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors resize-vertical"
                />
              </div>
              
              <div>
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    name="allowPublish"
                    checked={formData.allowPublish}
                    onChange={handleChange}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded mt-1"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    I allow IriSync to publish my testimonial on their website
                  </span>
                </label>
              </div>
              
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loading}
                isLoading={loading}
              >
                {loading ? 'Submitting...' : 'Submit Testimonial'}
              </Button>
            </form>
          </Card>
        </Container>
      </div>
    </Layout>
  );
} 