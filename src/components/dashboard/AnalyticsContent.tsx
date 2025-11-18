"use client";

import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Heart,
  MessageCircle,
  Eye,
  Bookmark,
} from "lucide-react";

// Sample data for Growth Trends
const growthData = [
  { date: "01-04-2025", followers: 21600, engagement: 11800, reach: 36500 },
  { date: "08-04-2025", followers: 22100, engagement: 12200, reach: 38200 },
  { date: "15-04-2025", followers: 22800, engagement: 13500, reach: 41800 },
  { date: "22-04-2025", followers: 23200, engagement: 14200, reach: 43200 },
  { date: "29-04-2025", followers: 23600, engagement: 14800, reach: 44800 },
  { date: "05-05-2025", followers: 23800, engagement: 15400, reach: 45600 },
];

// Sample data for Content Type Performance
const contentTypeData = [
  { name: "Link", value: 9.5, color: "#F7B731" },
  { name: "Carousels", value: 5.8, color: "#3867D6" },
  { name: "Images", value: 4.6, color: "#0FB9B1" },
  { name: "Videos", value: 3.2, color: "#FA8231" },
  { name: "Text", value: 2.7, color: "#8854D0" },
];

// Sample data for Audience Demographics
const ageData = [
  { age: "18–24", value: 21, color: "#8854D0" },
  { age: "25–34", value: 12, color: "#FA8231" },
  { age: "35–44", value: 17, color: "#0FB9B1" },
  { age: "45–54", value: 35, color: "#3867D6" },
  { age: "55–64", value: 6, color: "#F7B731" },
  { age: "65+", value: 2, color: "#FC427B" },
];

// Sample data for Competitive Benchmarking
const competitorData = [
  { name: "My Account", followers: "23,800", engagement: "15,400", engagementRate: "3.2%" },
  { name: "Competitor A", followers: "35,200", engagement: "18,500", engagementRate: "2.8%" },
  { name: "Competitor B", followers: "19,600", engagement: "12,800", engagementRate: "3.4%" },
  { name: "Competitor C", followers: "28,400", engagement: "16,200", engagementRate: "3.0%" },
  { name: "Competitor D", followers: "25,700", engagement: "13,700", engagementRate: "2.9%" },
];

export default function AnalyticsPage() {
  const [selectedPlatform, setSelectedPlatform] = useState("Instagram");
  const [selectedContentTab, setSelectedContentTab] = useState("Engagement");
  const [selectedDateRange, setSelectedDateRange] = useState("Last 30 days");

  const platforms = [
    { name: "All", icon: null },
    { name: "WhatsApp", icon: null },
    { name: "Telegram", icon: null },
    { name: "Instagram", icon: null },
    { name: "Messenger", icon: null },
    { name: "LinkedIn", icon: null },
    { name: "Email", icon: null },
    { name: "SMS", icon: null },
  ];

  const contentTabs = ["Engagement", "Clicks", "Shares"];
  const dateRanges = ["Last 7 days", "Last 30 days", "Last 90 days", "Custom"];

  return (
    <div className="min-h-screen bg-[#F5F5F7] font-['Inter']">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-medium text-[#131A13]">Analytics</h1>
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search"
              className="px-4 py-2 bg-[#F5F5F7] border-0 rounded-2xl text-sm text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 w-full sm:w-64 md:w-80"
            />
            <button className="p-2 bg-[#F5F5F7] rounded-2xl">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Platform Filter Pills */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center gap-3 overflow-x-auto pb-2 sm:pb-0">
          {platforms.map((platform) => (
            <button
              key={platform.name}
              onClick={() => setSelectedPlatform(platform.name)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                selectedPlatform === platform.name
                  ? "bg-green-100 text-green-600"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {platform.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8 space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {[
            { label: "Followers", value: "23.8k", change: "+12%", trend: "up", icon: Users },
            { label: "Likes", value: "45.2k", change: "+8%", trend: "up", icon: Heart },
            { label: "Comments", value: "3.4k", change: "-3%", trend: "down", icon: MessageCircle },
            { label: "Reach", value: "67.5k", change: "+15%", trend: "up", icon: Eye },
            { label: "Saves", value: "5.2k", change: "+20%", trend: "up", icon: Bookmark },
          ].map((kpi, index) => (
            <div key={index} className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <kpi.icon className="w-6 h-6 text-gray-400" />
                <div className={`flex items-center gap-1 text-sm font-medium ${
                  kpi.trend === "up" ? "text-green-600" : "text-red-600"
                }`}>
                  {kpi.trend === "up" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {kpi.change}
                </div>
              </div>
              <div className="text-3xl font-semibold text-[#131A13] mb-1">{kpi.value}</div>
              <div className="text-sm text-gray-500">{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* Growth Trends Chart */}
        <div className="bg-white rounded-2xl p-8 shadow-sm">
          <h2 className="text-2xl font-medium text-[#131A13] mb-6">Growth Trends</h2>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip />
                <Line type="monotone" dataKey="followers" stroke="#3867D6" strokeWidth={2} />
                <Line type="monotone" dataKey="engagement" stroke="#FA8231" strokeWidth={2} />
                <Line type="monotone" dataKey="reach" stroke="#0FB9B1" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-end gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-[#3867D6]"></div>
              <span className="text-xs text-gray-600">Followers</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-[#FA8231]"></div>
              <span className="text-xs text-gray-600">Engagement</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-[#0FB9B1]"></div>
              <span className="text-xs text-gray-600">Reach</span>
            </div>
          </div>
        </div>

        {/* Instagram Performance Overview & Content Type Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Instagram Performance Overview */}
          <div className="bg-white rounded-2xl p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-medium text-[#131A13]">Instagram Performance Overview</h2>
            </div>
            <div className="flex items-center gap-3 mb-6">
              {dateRanges.map((range) => (
                <button
                  key={range}
                  onClick={() => setSelectedDateRange(range)}
                  className={`px-4 py-2 rounded-full text-sm transition-all ${
                    selectedDateRange === range
                      ? "bg-[#00C853] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <span className="text-sm text-gray-600">Total Posts</span>
                <span className="text-lg font-semibold text-[#131A13]">127</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <span className="text-sm text-gray-600">Total Engagement</span>
                <span className="text-lg font-semibold text-[#131A13]">48.6k</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <span className="text-sm text-gray-600">Avg. Engagement Rate</span>
                <span className="text-lg font-semibold text-[#131A13]">5.2%</span>
              </div>
            </div>
          </div>

          {/* Content Type Performance */}
          <div className="bg-white rounded-2xl p-8 shadow-sm">
            <h2 className="text-2xl font-medium text-[#131A13] mb-6">Content Type Performance</h2>
            <div className="flex items-center gap-3 mb-6">
              {contentTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSelectedContentTab(tab)}
                  className={`px-4 py-2 text-sm font-medium transition-all ${
                    selectedContentTab === tab
                      ? "text-[#00C853] border-b-2 border-[#00C853]"
                      : "text-gray-600"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={contentTypeData} layout="vertical">
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                    {contentTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Competitive Benchmarking */}
        <div className="bg-white rounded-2xl p-8 shadow-sm">
          <h2 className="text-2xl font-medium text-[#131A13] mb-6">Competitive Benchmarking</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-500 uppercase">Competitor</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-500 uppercase">Followers</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-500 uppercase">Engagement</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-500 uppercase">Engagement Rate</th>
                </tr>
              </thead>
              <tbody>
                {competitorData.map((competitor, index) => (
                  <tr key={index} className={`border-b border-gray-100 ${index === 0 ? 'bg-green-50' : ''}`}>
                    <td className="py-4 px-4 text-sm font-semibold text-[#131A13]">{competitor.name}</td>
                    <td className="py-4 px-4 text-sm text-[#131A13]">{competitor.followers}</td>
                    <td className="py-4 px-4 text-sm text-[#131A13]">{competitor.engagement}</td>
                    <td className="py-4 px-4 text-sm text-[#131A13]">{competitor.engagementRate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audience Demographics */}
        <div className="bg-white rounded-2xl p-8 shadow-sm">
          <h2 className="text-2xl font-medium text-[#131A13] mb-6">Audience Demographics</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageData}>
                  <XAxis dataKey="age" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {ageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col justify-center gap-4">
              {ageData.map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }}></div>
                  <span className="text-sm text-gray-600 flex-1">{item.age}</span>
                  <span className="text-sm font-semibold text-[#131A13]">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-4">
          <button className="px-8 py-3 bg-[#00C853] text-white rounded-xl font-medium hover:bg-green-700 transition-colors">
            Get AI Summary
          </button>
          <button className="px-8 py-3 bg-gray-100 text-[#131A13] rounded-xl font-medium hover:bg-gray-200 transition-colors">
            Export Data
          </button>
        </div>
      </div>
    </div>
  );
}
