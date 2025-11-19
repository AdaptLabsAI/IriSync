'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Layout, Container, Typography, Button, Card } from '@/components/ui/new';
import {
  FaCheckCircle,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaLinkedin,
  FaTwitter
} from 'react-icons/fa';

export default function ContactSalesPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    phone: '',
    employees: '',
    message: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/contact/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSubmitted(true);
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          company: '',
          phone: '',
          employees: '',
          message: ''
        });
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to submit form. Please try again.');
      }
    } catch (err) {
      console.error('Error submitting form:', err);
      setError('An error occurred. Please try again or contact us directly at sales@irisync.com');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#00FF6A] to-[#00CC44] text-white py-20">
        <Container className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <Typography variant="h1" className="text-white mb-6 font-bold">
              Let's Transform Your Business Together
            </Typography>
            <Typography variant="h5" className="text-white/90 mb-8">
              Connect with our sales team to discover how IriSync can help your organization automate,
              dominate, and elevate your marketing strategy.
            </Typography>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-lg">
                <FaCheckCircle className="text-white" />
                <span>Trusted by 500+ companies</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-lg">
                <FaCheckCircle className="text-white" />
                <span>24/7 Support</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-lg">
                <FaCheckCircle className="text-white" />
                <span>Custom Solutions</span>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Main Content */}
      <section className="py-16 bg-gray-50">
        <Container className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Contact Form */}
            <div className="lg:col-span-2">
              <Card className="p-8">
                {!submitted ? (
                  <>
                    <Typography variant="h3" className="mb-6">
                      Get in Touch
                    </Typography>
                    <Typography variant="body" className="text-gray-600 mb-8">
                      Fill out the form below and our sales team will get back to you within 24 hours.
                    </Typography>

                    {error && (
                      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-700 text-sm">{error}</p>
                      </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                            First Name *
                          </label>
                          <input
                            type="text"
                            id="firstName"
                            name="firstName"
                            required
                            value={formData.firstName}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00FF6A] focus:border-transparent"
                            placeholder="John"
                          />
                        </div>

                        <div>
                          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                            Last Name *
                          </label>
                          <input
                            type="text"
                            id="lastName"
                            name="lastName"
                            required
                            value={formData.lastName}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00FF6A] focus:border-transparent"
                            placeholder="Doe"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                            Business Email *
                          </label>
                          <input
                            type="email"
                            id="email"
                            name="email"
                            required
                            value={formData.email}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00FF6A] focus:border-transparent"
                            placeholder="john@company.com"
                          />
                        </div>

                        <div>
                          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            id="phone"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00FF6A] focus:border-transparent"
                            placeholder="+1 (555) 123-4567"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                            Company Name *
                          </label>
                          <input
                            type="text"
                            id="company"
                            name="company"
                            required
                            value={formData.company}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00FF6A] focus:border-transparent"
                            placeholder="Acme Inc."
                          />
                        </div>

                        <div>
                          <label htmlFor="employees" className="block text-sm font-medium text-gray-700 mb-2">
                            Company Size *
                          </label>
                          <select
                            id="employees"
                            name="employees"
                            required
                            value={formData.employees}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00FF6A] focus:border-transparent"
                          >
                            <option value="">Select company size</option>
                            <option value="1-10">1-10 employees</option>
                            <option value="11-50">11-50 employees</option>
                            <option value="51-200">51-200 employees</option>
                            <option value="201-500">201-500 employees</option>
                            <option value="501-1000">501-1000 employees</option>
                            <option value="1000+">1000+ employees</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                          How can we help? *
                        </label>
                        <textarea
                          id="message"
                          name="message"
                          required
                          rows={5}
                          value={formData.message}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00FF6A] focus:border-transparent"
                          placeholder="Tell us about your needs and goals..."
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-4 bg-gradient-to-r from-[#00FF6A] to-[#00CC44] text-white font-medium rounded-lg hover:from-[#00CC44] hover:to-[#00A046] focus:outline-none focus:ring-2 focus:ring-[#00FF6A] focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? 'Submitting...' : 'Contact Sales Team'}
                      </button>

                      <p className="text-sm text-gray-500 text-center">
                        By submitting this form, you agree to our{' '}
                        <Link href="/privacy" className="text-[#00FF6A] hover:text-[#00CC44] underline">
                          Privacy Policy
                        </Link>
                        .
                      </p>
                    </form>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-[#00FF6A]/10 rounded-full mb-6">
                      <FaCheckCircle className="text-[#00FF6A] text-3xl" />
                    </div>
                    <Typography variant="h3" className="mb-4">
                      Thank You!
                    </Typography>
                    <Typography variant="body" className="text-gray-600 mb-8">
                      We've received your request and our sales team will be in touch within 24 hours.
                      In the meantime, feel free to explore our platform features.
                    </Typography>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <Link href="/features-pricing">
                        <Button variant="outline">
                          Explore Features
                        </Button>
                      </Link>
                      <button
                        onClick={() => setSubmitted(false)}
                        className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Submit Another Request
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* Contact Information Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Direct Contact Card */}
              <Card className="p-6">
                <Typography variant="h5" className="mb-4 font-bold">
                  Direct Contact
                </Typography>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <FaEnvelope className="text-[#00FF6A] mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Email</p>
                      <a href="mailto:sales@irisync.com" className="text-[#00FF6A] hover:text-[#00CC44] text-sm">
                        sales@irisync.com
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <FaPhone className="text-[#00FF6A] mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Phone</p>
                      <a href="tel:+18885551234" className="text-[#00FF6A] hover:text-[#00CC44] text-sm">
                        +1 (888) 555-1234
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <FaMapMarkerAlt className="text-[#00FF6A] mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Office</p>
                      <p className="text-gray-600 text-sm">
                        123 Tech Boulevard<br />
                        San Francisco, CA 94102<br />
                        United States
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Social Links Card */}
              <Card className="p-6">
                <Typography variant="h5" className="mb-4 font-bold">
                  Follow Us
                </Typography>
                <div className="flex gap-4">
                  <a
                    href="https://linkedin.com/company/irisync"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-[#00FF6A] hover:text-white transition-colors"
                  >
                    <FaLinkedin className="text-lg" />
                  </a>
                  <a
                    href="https://twitter.com/irisync"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-[#00FF6A] hover:text-white transition-colors"
                  >
                    <FaTwitter className="text-lg" />
                  </a>
                </div>
              </Card>

              {/* Business Hours Card */}
              <Card className="p-6">
                <Typography variant="h5" className="mb-4 font-bold">
                  Business Hours
                </Typography>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Monday - Friday</span>
                    <span className="font-medium">9:00 AM - 6:00 PM PST</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Saturday</span>
                    <span className="font-medium">10:00 AM - 4:00 PM PST</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sunday</span>
                    <span className="font-medium">Closed</span>
                  </div>
                </div>
              </Card>

              {/* Quick Links Card */}
              <Card className="p-6 bg-gradient-to-br from-[#00FF6A]/5 to-[#00FF6A]/10">
                <Typography variant="h6" className="mb-4 font-bold">
                  Need Help Sooner?
                </Typography>
                <Typography variant="body" className="text-sm text-gray-700 mb-4">
                  Check out our resources or start a free trial to experience IriSync yourself.
                </Typography>
                <div className="space-y-2">
                  <Link href="/documentation" className="block text-sm text-[#00FF6A] hover:text-[#00CC44] underline">
                    → View Documentation
                  </Link>
                  <Link href="/pricing" className="block text-sm text-[#00FF6A] hover:text-[#00CC44] underline">
                    → See Pricing Plans
                  </Link>
                  <Link href="/register" className="block text-sm text-[#00FF6A] hover:text-[#00CC44] underline">
                    → Start Free Trial
                  </Link>
                </div>
              </Card>
            </div>
          </div>
        </Container>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-white">
        <Container className="max-w-screen-lg mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Typography variant="h2" className="mb-4">
              Frequently Asked Questions
            </Typography>
            <Typography variant="body" className="text-gray-600">
              Here are some common questions about working with our sales team
            </Typography>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="p-6">
              <Typography variant="h6" className="mb-2 font-bold">
                How quickly will I hear back?
              </Typography>
              <Typography variant="body" className="text-gray-600 text-sm">
                Our sales team responds to all inquiries within 24 hours during business days.
                Urgent requests are prioritized and may receive faster responses.
              </Typography>
            </Card>

            <Card className="p-6">
              <Typography variant="h6" className="mb-2 font-bold">
                Do you offer custom pricing?
              </Typography>
              <Typography variant="body" className="text-gray-600 text-sm">
                Yes! For Enterprise clients and organizations with unique needs, we offer
                custom pricing plans tailored to your specific requirements.
              </Typography>
            </Card>

            <Card className="p-6">
              <Typography variant="h6" className="mb-2 font-bold">
                Can I schedule a demo?
              </Typography>
              <Typography variant="body" className="text-gray-600 text-sm">
                Absolutely! After submitting this form, our team will reach out to schedule
                a personalized demo at your convenience.
              </Typography>
            </Card>

            <Card className="p-6">
              <Typography variant="h6" className="mb-2 font-bold">
                What information should I provide?
              </Typography>
              <Typography variant="body" className="text-gray-600 text-sm">
                Please share your company size, current challenges, and goals. The more
                details you provide, the better we can tailor our solution to your needs.
              </Typography>
            </Card>
          </div>
        </Container>
      </section>
    </Layout>
  );
}
