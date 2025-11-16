"use client";

import React, { useState } from 'react';
import Image from 'next/image';

export default function AIToolkitPage() {
  const [inputMessage, setInputMessage] = useState("");

  const quickPrompts = [
    "What could be the best time to post on Instagram?",
    "Highlight my most trending post across all platform",
    "Analyse my competitor on Facebook",
    "Predict upcoming post performance"
  ];

  const features = [
    {
      title: "Growth Trends",
      description: "Track your followers, engagement, and reach over time with detailed analytics",
    },
    {
      title: "Competitive Benchmarking",
      description: "Compare your performance against competitors and industry standards",
    },
    {
      title: "Best Time to Post",
      description: "AI-powered recommendations for optimal posting times on each platform",
    }
  ];

  const bestTimePosts = [
    { platform: "WhatsApp Business", time: "10 am - 4 pm", icon: "whatsapp", color: "bg-green-500" },
    { platform: "Telegram", time: "06 pm - 10 pm", icon: "telegram", color: "bg-blue-500" },
    { platform: "Instagram", time: "09 am - 12 pm", icon: "instagram", color: "bg-pink-500" },
  ];

  return (
    <div className="min-h-screen bg-[#0D0D0D] font-['Inter'] relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-[#00C853] h-[234px]"></div>
      <div className="absolute inset-0 bg-white/10 backdrop-blur-[200px]"></div>
      
      {/* Main Container */}
      <div className="relative">
        {/* Main Content Area */}
        <div className="ml-[284px] bg-[#F5F5F7] rounded-tl-3xl rounded-bl-3xl min-h-screen">
          {/* Header */}
          <div className="bg-white rounded-tl-3xl px-8 py-6 flex items-center justify-between">
            <h1 className="text-2xl font-medium text-[#131A13]">AI Toolkit</h1>
            <div className="flex items-center gap-4">
              <input
                type="text"
                placeholder="Search"
                className="px-4 py-3 bg-[#F5F5F7] border-0 rounded-2xl text-sm text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 w-[300px]"
              />
              <button className="p-3 bg-[#F5F5F7] rounded-2xl">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content Grid */}
          <div className="px-8 py-8 flex gap-8">
            {/* Left Column - Features */}
            <div className="flex-1 space-y-8">
              {/* Growth Trends Card */}
              <div className="bg-white rounded-2xl p-8 shadow-sm">
                <h2 className="text-2xl font-medium text-[#131A13] mb-4">Growth Trends</h2>
                <p className="text-gray-600 mb-6">Track your followers, engagement, and reach over time with detailed analytics and insights</p>
                <div className="h-[410px] bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-24 h-24 mx-auto mb-4 bg-white rounded-full flex items-center justify-center shadow-lg">
                      <svg className="w-12 h-12 text-[#00C853]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <p className="text-gray-500 text-sm">Chart visualization</p>
                  </div>
                </div>
              </div>

              {/* Competitive Benchmarking Card */}
              <div className="bg-white rounded-2xl p-8 shadow-sm">
                <h2 className="text-2xl font-medium text-[#131A13] mb-4">Competitive Benchmarking</h2>
                <p className="text-gray-600 mb-6">Compare your performance metrics against competitors in your industry</p>
                <div className="space-y-4">
                  {[
                    { label: "My Account", value: "3.2%", color: "bg-green-500" },
                    { label: "Competitor A", value: "2.8%", color: "bg-blue-500" },
                    { label: "Competitor B", value: "3.4%", color: "bg-purple-500" },
                    { label: "Competitor C", value: "3.0%", color: "bg-orange-500" },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                      <span className="flex-1 text-sm text-gray-700">{item.label}</span>
                      <span className="text-sm font-semibold text-[#131A13]">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - AI Assistant */}
            <div className="w-[420px] flex flex-col">
              {/* AI Chat Interface */}
              <div className="bg-white/10 backdrop-blur-[150px] rounded-2xl p-8 flex-1 flex flex-col">
                {/* Greeting */}
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-medium text-[#131A13] mb-2">Hello Sophia</h2>
                  <p className="text-2xl">
                    <span className="text-[#131A13] font-medium">How may </span>
                    <span className="text-[#00C853] font-medium">I assist you today?</span>
                  </p>
                </div>

                {/* Quick Prompts */}
                <div className="flex-1 flex flex-col justify-center">
                  <div className="flex flex-wrap gap-2">
                    {quickPrompts.map((prompt, index) => (
                      <button
                        key={index}
                        className="px-4 py-3 bg-[#F5F5F7] rounded-full text-sm text-[#0D0D0D] hover:bg-gray-200 transition-colors text-left"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input Area */}
                <div className="mt-auto">
                  <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
                    <input
                      type="text"
                      placeholder="Ask IriSync..."
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      className="w-full border-0 outline-none text-sm text-gray-600 placeholder-gray-400"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-3">
                    <button className="w-[52px] h-[52px] flex items-center justify-center bg-[#F5F5F7] rounded-full hover:bg-gray-200">
                      <svg className="w-6 h-6 text-[#131A13]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </button>
                    <button className="w-[52px] h-[52px] flex items-center justify-center bg-[#F5F5F7] rounded-full hover:bg-gray-200">
                      <svg className="w-6 h-6 text-[#131A13]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                    </button>
                    <button className="w-[52px] h-[52px] flex items-center justify-center bg-gradient-to-br from-[#00C853] to-[#003305] rounded-full hover:shadow-lg transition-shadow">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Best Time to Post Card */}
              <div className="bg-white rounded-2xl p-6 mt-8 shadow-sm">
                <h3 className="text-2xl font-medium text-[#131A13] mb-6">Best Time to Post</h3>
                <div className="space-y-4">
                  {bestTimePosts.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 ${item.color} rounded-lg flex items-center justify-center`}>
                          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-[#131A13]">{item.platform}</div>
                        </div>
                      </div>
                      <div className="px-3 py-2 bg-gray-100 rounded-lg border border-gray-200 flex items-center gap-2">
                        <svg className="w-4 h-4 text-[#131A13]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-medium text-[#131A13]">{item.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
