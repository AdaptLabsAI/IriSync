"use client"

import { useState } from "react"
import { Plus, Minus } from "lucide-react"

const faqData = [
  {
    id: 1,
    question: "What's the difference between the Pro, Influencer, and Enterprise plans?",
    answer:
      "The Creator plan is perfect for individuals and small businesses getting started with social media management. The Influencer plan offers advanced features like unlimited AI content generation, team collaboration tools, and priority support. The Enterprise plan provides custom solutions with dedicated account management, advanced integrations, and white-label options for large organizations.",
  },
  {
    id: 2,
    question: "Can I switch between plans later?",
    answer:
      "Yes! You can upgrade or downgrade your plan at any time. When you upgrade, you'll get immediate access to new features. When you downgrade, changes take effect at your next billing cycle, and you'll retain access to premium features until then.",
  },
  {
    id: 3,
    question: "Is there a free trial available?",
    answer:
      "Yes! We offer a 7-day free trial for the Influencer Plan. During this trial, you'll get full access to our influencer discovery, content generation, and AI insights features no credit card required. This gives you a risk-free way to experience the platform before making a decision.",
  },
  {
    id: 4,
    question: "What happens after my free trial ends?",
    answer:
      "After your 7-day free trial ends, you can choose to subscribe to any of our paid plans to continue using the platform. If you don't subscribe, your account will be downgraded to our free tier with limited features. All your data and content will be preserved.",
  },
  {
    id: 5,
    question: "Do you offer custom plans for agencies or large teams?",
    answer:
      "Our Enterprise plan can be customized for agencies and large teams. We offer volume discounts, custom integrations, dedicated account management, and specialized features for agencies managing multiple client accounts. Contact our sales team to discuss your specific needs.",
  },
  {
    id: 6,
    question: "Do you offer support with all plans?",
    answer:
      "Yes, we provide support across all plans. Creator plan users get email support, Influencer plan users receive priority email and chat support, and Enterprise customers get dedicated account management with phone support and custom onboarding.",
  },
]

export default function PricingFAQ() {
  const [expandedItems, setExpandedItems] = useState<number[]>([3]) // Default to question 3 being expanded

  const toggleExpanded = (id: number) => {
    setExpandedItems((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  return (
    <section className="bg-gray-50">
    <div className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          {/* Left Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <h2 className="text-4xl font-semibold text-gray-900 mb-4">
                Pricing <span className="text-green-500">FAQ's</span>
              </h2>
              <p className="text-gray-600 text-base leading-relaxed">
                Got questions? We're here to help you find the plan that fits your goals
              </p>
            </div>
          </div>

          {/* FAQ Content */}
          <div className="lg:col-span-3">
            <div className="space-y-4">
              {faqData.map((faq) => {
                const isExpanded = expandedItems.includes(faq.id)

                return (
                  <div
                    key={faq.id}
                    className={`border-b border-b-gray-300 rounded-lg overflow-hidden transition-all duration-200 ${
                      isExpanded ? "shadow-md" : "hover:shadow-sm"
                    }`}
                  >
                    <button
                      onClick={() => toggleExpanded(faq.id)}
                      className={`w-full px-6 py-5 text-left flex items-center justify-between transition-colors duration-200 ${
                        isExpanded ? "bg-green-50" : "bg-white hover:bg-gray-50"
                      }`}
                    >
                      <span className="text-lg font-medium text-gray-900 pr-4">{faq.question}</span>
                      <div className="flex-shrink-0">
                        {isExpanded ? (
                          <Minus className="w-5 h-5 text-gray-600" />
                        ) : (
                          <Plus className="w-5 h-5 text-gray-600" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-6 py-5 bg-green-50 border-t border-green-100">
                        <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
    </section>
  )
}
