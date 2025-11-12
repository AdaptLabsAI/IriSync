'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Layout, Container, Typography, Button, Card } from '@/components/ui/new';
import { registerUser, loginWithGoogle, getFirebaseErrorMessage } from '@/lib/auth/customAuth';
import { getEarlyRegistrationPrice } from '@/lib/subscription/earlyRegistration';
import { SubscriptionTier } from '@/lib/subscription/utils';

// Add a client-side check function to verify dashboard redirection is safe
const safeDashboardRedirect = (router: any) => {
  const url = '/dashboard';
  console.log('Safely redirecting to dashboard...');
  
  // Using window.location.href for more reliable redirection
  // especially after Google sign-in popup which can cause issues with Next.js router
  setTimeout(() => {
    try {
      // Try Next.js router first
      router.push(url);
      
      // Add a fallback in case router push fails silently
      setTimeout(() => {
        if (window.location.pathname !== url) {
          console.log('Router push may have failed, using direct location change');
          window.location.href = url;
        }
      }, 300);
    } catch (err) {
      console.error('Router redirect failed, falling back to location:', err);
      window.location.href = url;
    }
  }, 100);
};

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    businessType: 'company', // Default to company
    companyName: '',
    companySize: '',
    subscriptionTier: 'creator', // Default subscription tier
    acceptTerms: false
  });
  const [useEarlyDiscount, setUseEarlyDiscount] = useState(false);

  type FormField = keyof typeof formData;
  
  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    businessType: '',
    companyName: '',
    companySize: '',
    subscriptionTier: '',
    acceptTerms: '',
    general: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target;
    const value = target.type === 'checkbox' ? (target as HTMLInputElement).checked : target.value;
    const name = target.name;
    
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear error when typing
    if (errors[name as FormField]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  const validateForm = () => {
    const newErrors = {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      businessType: '',
      companyName: '',
      companySize: '',
      subscriptionTier: '',
      acceptTerms: '',
      general: ''
    };
    
    // Simple validation
    if (!formData.firstName) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!formData.lastName) {
      newErrors.lastName = 'Last name is required';
    }
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    if (!formData.businessType) {
      newErrors.businessType = 'Business type is required';
    }
    
    // Only validate company name if business type is company
    if (formData.businessType === 'company' && !formData.companyName) {
      newErrors.companyName = 'Company name is required';
    }
    
    if (!formData.subscriptionTier) {
      newErrors.subscriptionTier = 'Subscription tier is required';
    }
    
    if (!formData.acceptTerms) {
      newErrors.acceptTerms = 'You must accept the terms and conditions';
    }
    
    setErrors(newErrors);
    
    // Check if there are any errors
    return !Object.values(newErrors).some(error => error !== '');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Use our custom registration function with correct parameters
      const result = await registerUser(
        formData.email,
        formData.password,
        formData.firstName,
        formData.lastName,
        {
          businessType: formData.businessType,
          companyName: formData.companyName,
          companySize: formData.companySize,
          subscriptionTier: formData.subscriptionTier as SubscriptionTier,
          useEarlyDiscount,
          acceptTerms: formData.acceptTerms
        }
      );
      
      if (result.success) {
        // Registration successful, redirect to dashboard
        safeDashboardRedirect(router);
      } else {
        // Registration failed
        setErrors({
          ...errors,
          general: result.error || 'Failed to create account. Please try again.'
        });
      }
    } catch (error: any) {
      setErrors({
        ...errors,
        general: getFirebaseErrorMessage(error)
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    
    try {
      console.log('Attempting Google sign-in...');
      
      const result = await loginWithGoogle();
      
      console.log('Google sign-in result:', result.success ? 'Success' : 'Failed', result.error || '');
      
      if (result.success) {
        safeDashboardRedirect(router);
      } else {
        setErrors({
          ...errors,
          general: result.error || 'Failed to sign in with Google'
        });
      }
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      setErrors({
        ...errors,
        general: getFirebaseErrorMessage(error)
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get pricing information
  const creatorPrice = getEarlyRegistrationPrice('creator');
  const influencerPrice = getEarlyRegistrationPrice('influencer');

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <Container maxWidth="md">
          <div className="text-center mb-8">
            <Typography variant="h2" className="mb-4">
              Create your account
            </Typography>
            <Typography variant="body" color="secondary">
              Join thousands of businesses using IriSync to grow their online presence
            </Typography>
          </div>

          <Card className="p-8">
            {/* Error Messages */}
            {errors.general && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <Typography variant="body" className="text-red-700">
                  {errors.general}
                </Typography>
              </div>
            )}

            {/* Early Registration Banner */}
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg">
              <Typography variant="h6" className="text-white font-bold mb-2">
                🎉 Limited Time: Early Registration Pricing
              </Typography>
              <Typography variant="body" className="text-white mb-3">
                Get 50% off our regular pricing when you sign up during our launch period!
              </Typography>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={useEarlyDiscount}
                  onChange={(e) => setUseEarlyDiscount(e.target.checked)}
                  className="h-4 w-4 text-white focus:ring-white border-white rounded"
                />
                <span className="ml-2 text-white">Apply early registration discount (50% off for life)</span>
              </label>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                    First Name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
                      errors.firstName ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter your first name"
                  />
                  {errors.firstName && (
                    <Typography variant="caption" className="text-red-600 mt-1">
                      {errors.firstName}
                    </Typography>
                  )}
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
                      errors.lastName ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter your last name"
                  />
                  {errors.lastName && (
                    <Typography variant="caption" className="text-red-600 mt-1">
                      {errors.lastName}
                    </Typography>
                  )}
                </div>
              </div>

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter your email"
                />
                {errors.email && (
                  <Typography variant="caption" className="text-red-600 mt-1">
                    {errors.email}
                  </Typography>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
                      errors.password ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Create a password (min. 8 characters)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {errors.password && (
                  <Typography variant="caption" className="text-red-600 mt-1">
                    {errors.password}
                  </Typography>
                )}
              </div>

              {/* Business Type */}
              <div>
                <label htmlFor="businessType" className="block text-sm font-medium text-gray-700 mb-2">
                  Business Type
                </label>
                <select
                  id="businessType"
                  name="businessType"
                  value={formData.businessType}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
                    errors.businessType ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="company">Company</option>
                  <option value="individual">Individual Creator</option>
                  <option value="agency">Agency</option>
                  <option value="nonprofit">Non-profit</option>
                </select>
                {errors.businessType && (
                  <Typography variant="caption" className="text-red-600 mt-1">
                    {errors.businessType}
                  </Typography>
                )}
              </div>

              {/* Company Name (conditional) */}
              {formData.businessType === 'company' && (
                <div>
                  <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name
                  </label>
                  <input
                    id="companyName"
                    name="companyName"
                    type="text"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
                      errors.companyName ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter your company name"
                  />
                  {errors.companyName && (
                    <Typography variant="caption" className="text-red-600 mt-1">
                      {errors.companyName}
                    </Typography>
                  )}
                </div>
              )}

              {/* Company Size */}
              <div>
                <label htmlFor="companySize" className="block text-sm font-medium text-gray-700 mb-2">
                  Company Size (Optional)
                </label>
                <select
                  id="companySize"
                  name="companySize"
                  value={formData.companySize}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                >
                  <option value="">Select company size</option>
                  <option value="1">Just me</option>
                  <option value="2-10">2-10 employees</option>
                  <option value="11-50">11-50 employees</option>
                  <option value="51-200">51-200 employees</option>
                  <option value="201-1000">201-1000 employees</option>
                  <option value="1000+">1000+ employees</option>
                </select>
              </div>

              {/* Subscription Tier */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Choose Your Plan
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className={`relative p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    formData.subscriptionTier === 'creator' ? 'border-green-500 bg-green-50' : 'border-gray-200'
                  }`}>
                    <input
                      type="radio"
                      name="subscriptionTier"
                      value="creator"
                      checked={formData.subscriptionTier === 'creator'}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <div className="flex items-center justify-between mb-2">
                      <Typography variant="h6">Creator</Typography>
                      <div className="text-right">
                        {useEarlyDiscount && (
                          <div className="text-sm text-gray-500 line-through">${creatorPrice.originalPrice}/mo</div>
                        )}
                        <div className="text-lg font-bold">${creatorPrice.discountedPrice}/mo</div>
                      </div>
                    </div>
                    <Typography variant="caption" color="secondary">
                      Perfect for solo creators and small businesses
                    </Typography>
                  </label>

                  <label className={`relative p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    formData.subscriptionTier === 'influencer' ? 'border-green-500 bg-green-50' : 'border-gray-200'
                  }`}>
                    <input
                      type="radio"
                      name="subscriptionTier"
                      value="influencer"
                      checked={formData.subscriptionTier === 'influencer'}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <div className="flex items-center justify-between mb-2">
                      <Typography variant="h6">Influencer</Typography>
                      <div className="text-right">
                        {useEarlyDiscount && (
                          <div className="text-sm text-gray-500 line-through">${influencerPrice.originalPrice}/mo</div>
                        )}
                        <div className="text-lg font-bold">${influencerPrice.discountedPrice}/mo</div>
                      </div>
                    </div>
                    <Typography variant="caption" color="secondary">
                      Ideal for growing brands and influencers
                    </Typography>
                  </label>
                </div>
                {errors.subscriptionTier && (
                  <Typography variant="caption" className="text-red-600 mt-1">
                    {errors.subscriptionTier}
                  </Typography>
                )}
              </div>

              {/* Terms and Conditions */}
              <div>
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    name="acceptTerms"
                    checked={formData.acceptTerms}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded mt-1"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    I agree to the{' '}
                    <Link href="/terms" className="text-green-600 hover:text-green-800">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy" className="text-green-600 hover:text-green-800">
                      Privacy Policy
                    </Link>
                  </span>
                </label>
                {errors.acceptTerms && (
                  <Typography variant="caption" className="text-red-600 mt-1">
                    {errors.acceptTerms}
                  </Typography>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                isLoading={isLoading}
              >
                Create Account
              </Button>
            </form>

            {/* Divider */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>
            </div>

            {/* Google Sign In */}
            <div className="mt-6">
              <Button
                variant="outline"
                onClick={handleGoogleSignIn}
                className="w-full"
                size="lg"
                isLoading={isLoading}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </Button>
            </div>

            {/* Sign In Link */}
            <div className="mt-6 text-center">
              <Typography variant="body" color="secondary">
                Already have an account?{' '}
                <Link href="/login" className="text-green-600 hover:text-green-800 font-medium">
                  Sign in
                </Link>
              </Typography>
            </div>
          </Card>
        </Container>
      </div>
    </Layout>
  );
} 