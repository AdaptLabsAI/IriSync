"use client"

import {
  Search,
  ChevronRight,
  Paperclip,
  Send,
  CircleHelp,
  Instagram,
  Calendar,
  Clock,
  Facebook,
  Twitter,
} from "lucide-react"
import Image from "next/image"
import { useState } from "react"
import {
  FaHubspot,
  FaSalesforce,
  FaMicrosoft,
  FaGoogle,
  FaDropbox,
  FaFacebook,
  FaInstagram,
  FaTwitter,
  FaYoutube,
  FaPinterest,
  FaReddit,
  FaTiktok,
  FaLinkedin,
  FaHandshake,
} from "react-icons/fa"
import { SiZoho, SiNotion, SiAirtable, SiCanva, SiAdobecreativecloud } from "react-icons/si"

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("AI content creation")

  const featureTabs = [
    "AI content creation",
    "Smart scheduling",
    "Platform and tool integration",
    "Custom integration",
    "Tracking tools",
  ]

  const featureCards = [
    {
      title: "Personalized content matching brand voice",
      body: "Our AI analyzes your brand's existing content, tone of voice, and industry language to generate social media posts, ads, captions, and emails that feel authentically you.",
    },
    {
      title: "Platform‑specific formatting",
      body: "Create content that's optimized for each social media platform automatically. Our AI adopts tone, format, and structure to suit the unique requirements of social media platform",
    },
    {
      title: "Trending content suggestions",
      body: "Our AI analyzes your brand's existing content, tone of voice, and industry language to generate social media posts, ads, captions, and emails that feel authentically you.",
    },
  ]

  const posts = [
    {
      status: "PUBLISHED",
      thumbnail: "/images/post1.jpg",
      author: "Nikolas",
      type: "POST",
      title: "Tech Conference",
      excerpt: "We are excited to be attending the tech conference next month.",
      platform: "Instagram",
      date: "05 May, 2025",
      time: "04:00 PM",
      tags: ["conference", "tech", "networking"],
    },
    {
      status: "DRAFT",
      thumbnail: "/images/post2.jpg",
      author: "Maria",
      type: "POST",
      title: "AI Innovations",
      excerpt: "Exploring the latest advancements in artificial intelligence and their impact on various industries.",
      platform: "X (Twitter)",
      date: "15 June, 2025",
      time: "10:30 AM",
      tags: ["AI", "innovation", "future"],
    },
    {
      status: "SCHEDULED",
      thumbnail: "/images/post3.jpg",
      author: "James",
      type: "BLOG",
      title: "Sustainable Practices",
      excerpt: "A comprehensive guide on implementing sustainable practices in daily life.",
      platform: "Facebook",
      date: "23 Aug, 2025",
      time: "11:15 AM",
      tags: ["sustainability", "eco‑friendly", "greenLiving"],
    },
  ]

  const quickPrompts = [
    "Summarize Top Inbox Threads",
    "Generate Weekly Analytics Summary",
    "Create Post from Top Trends",
  ]

  const [integrations, setIntegrations] = useState([
    {
      name: "Instagram",
      username: "@weareblacklist",
      connected: false,
      icon: <FaInstagram className="text-pink-500" />,
    },
    { name: "Facebook", username: "@weareblacklist", connected: false, icon: <FaFacebook className="text-blue-600" /> },
    { name: "X", username: "@weareblacklist", connected: false, icon: <FaTwitter className="text-blue-400" /> },
    { name: "YouTube", username: "@weareblacklist", connected: false, icon: <FaYoutube className="text-red-600" /> },
    { name: "Pinterest", username: "—", connected: true, icon: <FaPinterest className="text-red-500" /> },
    { name: "Reddit", username: "—", connected: true, icon: <FaReddit className="text-orange-600" /> },
    { name: "TikTok", username: "—", connected: true, icon: <FaTiktok className="text-black" /> },
    { name: "LinkedIn", username: "—", connected: true, icon: <FaLinkedin className="text-blue-700" /> },
  ]);

  const toggleConnection = (name: string) => {
    setIntegrations((prev) =>
      prev.map((integration) =>
        integration.name === name
          ? { ...integration, connected: !integration.connected }
          : integration
      )
    );
  };


  const contentMediaTools = [
    { name: "Canva", username: "@blackrustdesign", connected: false, icon: <SiCanva className="text-blue-500" /> },
    {
      name: "Adobe Express",
      username: "@blackrustdesign",
      connected: false,
      icon: <SiAdobecreativecloud className="text-red-600" />,
    },
    {
      name: "Google Drive",
      username: "@weareblackrust",
      connected: false,
      icon: <FaGoogle className="text-blue-500" />,
    },
    { name: "Dropbox", username: "—", connected: true, icon: <FaDropbox className="text-blue-600" /> },
    { name: "Notion", username: "—", connected: true, icon: <SiNotion className="text-black" /> },
    { name: "Airtable", username: "—", connected: true, icon: <SiAirtable className="text-yellow-500" /> },
    { name: "OneDrive", username: "—", connected: true, icon: <FaMicrosoft className="text-blue-600" /> },
  ]

  const crmSystems = [
    { name: "HubSpot", username: "account@br.com", connected: false, icon: <FaHubspot className="text-orange-500" /> },
    {
      name: "Salesforce",
      username: "account@br.com",
      connected: false,
      icon: <FaSalesforce className="text-blue-500" />,
    },
    { name: "Zoho", username: "—", connected: true, icon: <SiZoho className="text-red-600" /> },
    { name: "Pipedrive", username: "—", connected: true, icon: <FaHandshake className="text-green-500" /> },
    { name: "Microsoft Dynamics", username: "—", connected: true, icon: <FaMicrosoft className="text-blue-600" /> },
    {
      name: "Sugar CRM",
      username: "—",
      connected: true,
      icon: <div className="text-green-600 font-bold text-lg">S</div>,
    },
  ]

  const analyticsTrackingTools = [
    {
      name: "Google Analytics",
      username: "account@br.com",
      connected: false,
      icon: <FaGoogle className="text-blue-500" />,
    },
    {
      name: "META Pixel",
      username: "account@br.com",
      connected: false,
      icon: <FaFacebook className="text-blue-600" />,
    },
    { name: "LinkedIn Insights", username: "—", connected: true, icon: <FaLinkedin className="text-blue-700" /> },
    { name: "TikTok Pixel", username: "—", connected: true, icon: <FaTiktok className="text-black" /> },
  ]



  const Tag = ({ label }: { label: string }) => (
    <span className="text-xs font-medium text-gray-600 px-2 py-0.5 bg-gray-100 rounded-full whitespace-nowrap">
      {label}
    </span>
  )

  const StatusBadge = ({ status }: { status: string }) => (
    <span
      className={
        {
          PUBLISHED: "bg-green-100 text-green-600",
          DRAFT: "bg-gray-100 text-gray-600",
          SCHEDULED: "bg-yellow-100 text-yellow-700",
        }[status] + " text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-sm absolute top-2 left-2"
      }
    >
      {status}
    </span>
  )

  // Function to get platform icon
  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "Instagram":
        return <Instagram className="w-3 h-3" />
      case "X (Twitter)":
        return <Twitter className="w-3 h-3" />
      case "Facebook":
        return <Facebook className="w-3 h-3" />
      default:
        return <Instagram className="w-3 h-3" />
    }
  }

  const IntegrationsView = () => (
    <div className="space-y-8 mt-5">
      {/* Original Feature cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        {featureCards.map(({ title, body }) => (
          <div
            key={title}
            className="border border-gray-200 bg-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold mb-2 leading-snug line-clamp-2">{title}</h3>
            <p className="text-xs text-gray-600 line-clamp-5 mb-4">{body}</p>
            <a
              href="#"
              className="group flex items-center gap-1 underline text-xs font-medium text-gray-700 hover:text-green-600"
            >
              Learn More <ChevronRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>
        ))}
      </div>

      {/* Original Recently Created and Buttons */}
      <div className="flex justify-between items-center mb-4 py-2">
        <h2 className="font-semibold text-lg">Recently Created</h2>
        <div className="flex items-center gap-2">
          <button className="border border-gray-200 bg-white px-4 py-3 rounded-lg text-xs font-medium hover:bg-gray-50">
            + AI Templates
          </button>
          <button className="bg-green-500 text-white px-4 py-3 rounded-lg text-xs font-medium hover:bg-green-600">
            + Create New
          </button>
        </div>
      </div>

      {/* Original Posts Grid */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        {posts.map((post) => (
          <div
            key={post.title}
            className="relative rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            {/* Status badge */}
            <StatusBadge status={post.status} />

            {/* Thumbnail */}
            <Image
              src={post.thumbnail || "/placeholder.svg"}
              width={600}
              height={300}
              alt={post.title}
              className="h-40 w-full object-cover"
            />

            {/* Card body */}
            <div className="p-4 flex flex-col gap-2 bg-white">
              <div className="flex items-center text-[10px] text-gray-500 gap-1 uppercase tracking-wide">
                <span>Created by {post.author}</span>·<span>{post.type}</span>
              </div>

              <h3 className="font-semibold text-sm leading-snug line-clamp-2">{post.title}</h3>

              <p className="text-xs text-gray-600 line-clamp-3">{post.excerpt}</p>

              {/* Platform, Date, Time in one line */}
              <div className="flex items-center justify-between text-[10px] text-gray-500 mt-1">
                <div className="flex items-center gap-1">
                  {getPlatformIcon(post.platform)}
                  <span>{post.platform}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{post.date}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{post.time}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mt-2">
                {post.tags.map((t) => (
                  <Tag key={t} label={t} />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Social Media Integrations */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Integrations and Plug-ins</h2>
          <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option>Social Media</option>
          </select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
      {integrations.map((integration) => (
        <div key={integration.name} className="text-center">
          <div className="w-16 h-16 mx-auto mb-2 rounded-lg border border-gray-200 flex items-center justify-center text-2xl bg-white">
            {integration.icon}
          </div>
          <div className="text-xs font-medium mb-1">{integration.name}</div>
          <div className="text-xs text-gray-500 mb-2">{integration.username}</div>
          <button
            onClick={() => toggleConnection(integration.name)}
            className={`text-xs px-3 py-1 rounded-full font-medium transition ${
              integration.connected
                ? "bg-green-100 text-green-600 hover:bg-green-200"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {integration.connected ? "Disconnect" : "Connect"}
          </button>
        </div>
      ))}
    </div>

      </div>

      {/* Performance Tracker */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Performance Tracker</h2>
          <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option>Instagram</option>
          </select>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex justify-end mb-4 space-x-4 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
              <span>Followers</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
              <span>Engagement</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span>Reach</span>
            </div>
          </div>

          {/* Chart placeholder */}
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center relative">
            <div className="absolute top-4 left-4 bg-teal-500 text-white px-3 py-1 rounded text-sm">Apr 15</div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-400 mb-2">Chart Visualization</div>
              <div className="text-sm text-gray-500">Performance metrics over time</div>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            <div>Followers Rate: 21,600</div>
            <div>Engagement: 11,800</div>
            <div>Reach: 56,800</div>
          </div>
        </div>
      </div>

      {/* Request Advance Tool Access */}
      <div className="bg-gray-50 rounded-xl p-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold mb-2">Request Advance Tool Access</h3>
            <p className="text-sm text-gray-600 max-w-2xl">
              Request Advanced Tool Access is available exclusively with the Enterprise Plan. Upgrade now to unlock
              premium AI features and custom integrations or contact our team for any help.
            </p>
          </div>
          <button className="bg-green-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-600 whitespace-nowrap">
            Request Now
          </button>
        </div>
      </div>
    </div>
  )

  const SmartSchedulingView = () => (
    <div className="space-y-8 mt-5">
      {/* Original Feature cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        {featureCards.map(({ title, body }) => (
          <div
            key={title}
            className="border border-gray-200 bg-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold mb-2 leading-snug line-clamp-2">{title}</h3>
            <p className="text-xs text-gray-600 line-clamp-5 mb-4">{body}</p>
            <a
              href="#"
              className="group flex items-center gap-1 underline text-xs font-medium text-gray-700 hover:text-green-600"
            >
              Learn More <ChevronRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>
        ))}
      </div>

      {/* Original Recently Created and Buttons */}
      <div className="flex justify-between items-center mb-4 py-2">
        <h2 className="font-semibold text-lg">Recently Created</h2>
        <div className="flex items-center gap-2">
          <button className="border border-gray-200 bg-white px-4 py-3 rounded-lg text-xs font-medium hover:bg-gray-50">
            + AI Templates
          </button>
          <button className="bg-green-500 text-white px-4 py-3 rounded-lg text-xs font-medium hover:bg-green-600">
            + Create New
          </button>
        </div>
      </div>

      {/* Original Posts Grid */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        {posts.map((post) => (
          <div
            key={post.title}
            className="relative rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            {/* Status badge */}
            <StatusBadge status={post.status} />

            {/* Thumbnail */}
            <Image
              src={post.thumbnail || "/placeholder.svg"}
              width={600}
              height={300}
              alt={post.title}
              className="h-40 w-full object-cover"
            />

            {/* Card body */}
            <div className="p-4 flex flex-col gap-2 bg-white">
              <div className="flex items-center text-[10px] text-gray-500 gap-1 uppercase tracking-wide">
                <span>Created by {post.author}</span>·<span>{post.type}</span>
              </div>

              <h3 className="font-semibold text-sm leading-snug line-clamp-2">{post.title}</h3>

              <p className="text-xs text-gray-600 line-clamp-3">{post.excerpt}</p>

              {/* Platform, Date, Time in one line */}
              <div className="flex items-center justify-between text-[10px] text-gray-500 mt-1">
                <div className="flex items-center gap-1">
                  {getPlatformIcon(post.platform)}
                  <span>{post.platform}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{post.date}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{post.time}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mt-2">
                {post.tags.map((t) => (
                  <Tag key={t} label={t} />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Content & Media Tools Integrations */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Integrations and Plug-ins</h2>
          <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option>Content & Media Tools</option>
          </select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          {contentMediaTools.map((tool) => (
            <div key={tool.name} className="text-center">
              <div className="w-16 h-16 mx-auto mb-2 rounded-lg border border-gray-200 flex items-center justify-center text-2xl bg-white">
                {tool.icon}
              </div>
              <div className="text-xs font-medium mb-1">{tool.name}</div>
              <div className="text-xs text-gray-500 mb-2">{tool.username}</div>
              <button
                className={`text-xs px-3 py-1 rounded-full font-medium ${
                  tool.connected ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-600"
                }`}
              >
                {tool.connected ? "Connect" : "Disconnect"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Tracker */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Performance Tracker</h2>
          <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option>Instagram</option>
          </select>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex justify-end mb-4 space-x-4 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
              <span>Followers</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
              <span>Engagement</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span>Reach</span>
            </div>
          </div>

          {/* Chart placeholder */}
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center relative">
            <div className="absolute top-4 left-4 bg-teal-500 text-white px-3 py-1 rounded text-sm">Apr 15</div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-400 mb-2">Chart Visualization</div>
              <div className="text-sm text-gray-500">Performance metrics over time</div>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            <div>Followers Rate: 21,600</div>
            <div>Engagement: 11,800</div>
            <div>Reach: 56,800</div>
          </div>
        </div>
      </div>

      {/* Request Advance Tool Access */}
      <div className="bg-gray-50 rounded-xl p-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold mb-2">Request Advance Tool Access</h3>
            <p className="text-sm text-gray-600 max-w-2xl">
              Request Advanced Tool Access is available exclusively with the Enterprise Plan. Upgrade now to unlock
              premium AI features and custom integrations or contact our team for any help.
            </p>
          </div>
          <button className="bg-green-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-600 whitespace-nowrap">
            Request Now
          </button>
        </div>
      </div>
    </div>
  )

  const PlatformIntegrationView = () => (
    <div className="space-y-8 mt-5">
      {/* Original Feature cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        {featureCards.map(({ title, body }) => (
          <div
            key={title}
            className="border border-gray-200 bg-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold mb-2 leading-snug line-clamp-2">{title}</h3>
            <p className="text-xs text-gray-600 line-clamp-5 mb-4">{body}</p>
            <a
              href="#"
              className="group flex items-center gap-1 underline text-xs font-medium text-gray-700 hover:text-green-600"
            >
              Learn More <ChevronRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>
        ))}
      </div>

      {/* Original Recently Created and Buttons */}
      <div className="flex justify-between items-center mb-4 py-2">
        <h2 className="font-semibold text-lg">Recently Created</h2>
        <div className="flex items-center gap-2">
          <button className="border border-gray-200 bg-white px-4 py-3 rounded-lg text-xs font-medium hover:bg-gray-50">
            + AI Templates
          </button>
          <button className="bg-green-500 text-white px-4 py-3 rounded-lg text-xs font-medium hover:bg-green-600">
            + Create New
          </button>
        </div>
      </div>

      {/* Original Posts Grid */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        {posts.map((post) => (
          <div
            key={post.title}
            className="relative rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            {/* Status badge */}
            <StatusBadge status={post.status} />

            {/* Thumbnail */}
            <Image
              src={post.thumbnail || "/placeholder.svg"}
              width={600}
              height={300}
              alt={post.title}
              className="h-40 w-full object-cover"
            />

            {/* Card body */}
            <div className="p-4 flex flex-col gap-2 bg-white">
              <div className="flex items-center text-[10px] text-gray-500 gap-1 uppercase tracking-wide">
                <span>Created by {post.author}</span>·<span>{post.type}</span>
              </div>

              <h3 className="font-semibold text-sm leading-snug line-clamp-2">{post.title}</h3>

              <p className="text-xs text-gray-600 line-clamp-3">{post.excerpt}</p>

              {/* Platform, Date, Time in one line */}
              <div className="flex items-center justify-between text-[10px] text-gray-500 mt-1">
                <div className="flex items-center gap-1">
                  {getPlatformIcon(post.platform)}
                  <span>{post.platform}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{post.date}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{post.time}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mt-2">
                {post.tags.map((t) => (
                  <Tag key={t} label={t} />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CRM Systems Integrations */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Integrations and Plug-ins</h2>
          <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option>CRM Systems</option>
          </select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {crmSystems.map((crm) => (
            <div key={crm.name} className="text-center">
              <div className="w-16 h-16 mx-auto mb-2 rounded-lg border border-gray-200 flex items-center justify-center text-2xl bg-white">
                {crm.icon}
              </div>
              <div className="text-xs font-medium mb-1">{crm.name}</div>
              <div className="text-xs text-gray-500 mb-2">{crm.username}</div>
              <button
                className={`text-xs px-3 py-1 rounded-full font-medium ${
                  crm.connected ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-600"
                }`}
              >
                {crm.connected ? "Connect" : "Disconnect"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Tracker */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Performance Tracker</h2>
          <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option>Instagram</option>
          </select>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex justify-end mb-4 space-x-4 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
              <span>Followers</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
              <span>Engagement</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span>Reach</span>
            </div>
          </div>

          {/* Chart placeholder */}
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center relative">
            <div className="absolute top-4 left-4 bg-teal-500 text-white px-3 py-1 rounded text-sm">Apr 15</div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-400 mb-2">Chart Visualization</div>
              <div className="text-sm text-gray-500">Performance metrics over time</div>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            <div>Followers Rate: 21,600</div>
            <div>Engagement: 11,800</div>
            <div>Reach: 56,800</div>
          </div>
        </div>
      </div>

      {/* Request Advance Tool Access */}
      <div className="bg-gray-50 rounded-xl p-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold mb-2">Request Advance Tool Access</h3>
            <p className="text-sm text-gray-600 max-w-2xl">
              Request Advanced Tool Access is available exclusively with the Enterprise Plan. Upgrade now to unlock
              premium AI features and custom integrations or contact our team for any help.
            </p>
          </div>
          <button className="bg-green-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-600 whitespace-nowrap">
            Request Now
          </button>
        </div>
      </div>
    </div>
  )

  const CustomIntegrationView = () => (
    <div className="space-y-8 mt-5">
      {/* Original Feature cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        {featureCards.map(({ title, body }) => (
          <div
            key={title}
            className="border border-gray-200 bg-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold mb-2 leading-snug line-clamp-2">{title}</h3>
            <p className="text-xs text-gray-600 line-clamp-5 mb-4">{body}</p>
            <a
              href="#"
              className="group flex items-center gap-1 underline text-xs font-medium text-gray-700 hover:text-green-600"
            >
              Learn More <ChevronRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>
        ))}
      </div>

      {/* Original Recently Created and Buttons */}
      <div className="flex justify-between items-center mb-4 py-2">
        <h2 className="font-semibold text-lg">Recently Created</h2>
        <div className="flex items-center gap-2">
          <button className="border border-gray-200 bg-white px-4 py-3 rounded-lg text-xs font-medium hover:bg-gray-50">
            + AI Templates
          </button>
          <button className="bg-green-500 text-white px-4 py-3 rounded-lg text-xs font-medium hover:bg-green-600">
            + Create New
          </button>
        </div>
      </div>

      {/* Original Posts Grid */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        {posts.map((post) => (
          <div
            key={post.title}
            className="relative rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            <StatusBadge status={post.status} />
            <Image
              src={post.thumbnail || "/placeholder.svg"}
              width={600}
              height={300}
              alt={post.title}
              className="h-40 w-full object-cover"
            />
            <div className="p-4 flex flex-col gap-2 bg-white">
              <div className="flex items-center text-[10px] text-gray-500 gap-1 uppercase tracking-wide">
                <span>Created by {post.author}</span>·<span>{post.type}</span>
              </div>
              <h3 className="font-semibold text-sm leading-snug line-clamp-2">{post.title}</h3>
              <p className="text-xs text-gray-600 line-clamp-3">{post.excerpt}</p>
              <div className="flex items-center justify-between text-[10px] text-gray-500 mt-1">
                <div className="flex items-center gap-1">
                  {getPlatformIcon(post.platform)}
                  <span>{post.platform}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{post.date}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{post.time}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {post.tags.map((t) => (
                  <Tag key={t} label={t} />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Analytics & Tracking Tools Integrations */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Integrations and Plug-ins</h2>
          <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option>Analytics and Trackings</option>
          </select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {analyticsTrackingTools.map((tool) => (
            <div key={tool.name} className="text-center">
              <div className="w-16 h-16 mx-auto mb-2 rounded-lg border border-gray-200 flex items-center justify-center text-2xl bg-white">
                {tool.icon}
              </div>
              <div className="text-xs font-medium mb-1">{tool.name}</div>
              <div className="text-xs text-gray-500 mb-2">{tool.username}</div>
              <button
                className={`text-xs px-3 py-1 rounded-full font-medium ${
                  tool.connected ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-600"
                }`}
              >
                {tool.connected ? "Connect" : "Disconnect"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Enhanced Performance Tracker with Real Chart */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Performance Tracker</h2>
          <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option>Instagram</option>
          </select>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex justify-end mb-4 space-x-4 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
              <span>Followers</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
              <span>Engagement</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span>Reach</span>
            </div>
          </div>

          {/* Enhanced Chart with SVG */}
          <div className="h-64 bg-gray-50 rounded-lg relative overflow-hidden">
            <div className="absolute top-4 left-4 bg-teal-500 text-white px-3 py-1 rounded text-sm">Apr 15</div>

            <svg className="w-full h-full" viewBox="0 0 800 300">
              {/* Grid lines */}
              <defs>
                <pattern id="grid" width="80" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 80 0 L 0 0 0 30" fill="none" stroke="#e5e7eb" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* Y-axis labels */}
              <text x="30" y="50" fontSize="12" fill="#6b7280">
                60000
              </text>
              <text x="30" y="100" fontSize="12" fill="#6b7280">
                45000
              </text>
              <text x="30" y="150" fontSize="12" fill="#6b7280">
                30000
              </text>
              <text x="30" y="200" fontSize="12" fill="#6b7280">
                15000
              </text>
              <text x="30" y="250" fontSize="12" fill="#6b7280">
                0
              </text>

              {/* X-axis labels */}
              <text x="100" y="280" fontSize="10" fill="#6b7280">
                01-04-2025
              </text>
              <text x="200" y="280" fontSize="10" fill="#6b7280">
                08-04-2025
              </text>
              <text x="300" y="280" fontSize="10" fill="#6b7280">
                15-04-2025
              </text>
              <text x="400" y="280" fontSize="10" fill="#6b7280">
                22-04-2025
              </text>
              <text x="500" y="280" fontSize="10" fill="#6b7280">
                29-04-2025
              </text>
              <text x="600" y="280" fontSize="10" fill="#6b7280">
                05-05-2025
              </text>

              {/* Followers line (blue) */}
              <polyline
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                points="80,180 150,170 220,160 290,150 360,140 430,130 500,120 570,110 640,100 710,90"
              />

              {/* Engagement line (orange) */}
              <polyline
                fill="none"
                stroke="#f97316"
                strokeWidth="2"
                points="80,220 150,215 220,210 290,205 360,200 430,195 500,190 570,185 640,180 710,175"
              />

              {/* Reach line (green) */}
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
                points="80,200 150,195 220,190 290,185 360,180 430,175 500,170 570,165 640,160 710,155"
              />

              {/* Data points */}
              <circle cx="360" cy="140" r="4" fill="#3b82f6" />
              <circle cx="360" cy="200" r="4" fill="#f97316" />
              <circle cx="360" cy="180" r="4" fill="#10b981" />
            </svg>
          </div>

          <div className="mt-4 text-sm text-gray-600 space-y-1">
            <div>Followers Rate: 21,600</div>
            <div>Engagement: 11,800</div>
            <div>Reach: 36,500</div>
          </div>
        </div>
      </div>

      {/* Request Advance Tool Access */}
      <div className="bg-gray-50 rounded-xl p-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold mb-2">Request Advance Tool Access</h3>
            <p className="text-sm text-gray-600 max-w-2xl">
              Request Advanced Tool Access is available exclusively with the Enterprise Plan. Upgrade now to unlock
              premium AI features and custom integrations or contact our team for any help.
            </p>
          </div>
          <button className="bg-green-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-600 whitespace-nowrap">
            Request Now
          </button>
        </div>
      </div>
    </div>
  )


  return (
    <div className="min-h-screen bg-white text-gray-900 p-6">
      {/* Search bar */}
      <header className="flex justify-end mb-6">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search"
            className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-[3fr_1fr] gap-6">
        {/* Left column */}
        <div>
          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-4">
            {featureTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`${
                  activeTab === tab
                    ? "py-3 border border-green-400 text-green-500"
                    : "border border-gray-400 text-gray-500"
                } text-xs font-medium px-3 py-1 rounded-full transition-colors`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Conditional Content */}
          {activeTab === "AI content creation" ? (
            <IntegrationsView />
          ) : activeTab === "Smart scheduling" ? (
            <SmartSchedulingView />
          ) : activeTab === "Platform and tool integration" ? (
            <PlatformIntegrationView />
          ) : activeTab === "Custom integration" ? (
            <CustomIntegrationView />
          ) : (
            <>
              {/* Feature cards - Original Content */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                {featureCards.map(({ title, body }) => (
                  <div
                    key={title}
                    className="border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <h3 className="font-semibold mb-2 leading-snug line-clamp-2">{title}</h3>
                    <p className="text-xs text-gray-600 line-clamp-5 mb-4">{body}</p>
                    <a
                      href="#"
                      className="group flex items-center gap-1 text-xs font-medium text-gray-700 hover:text-green-600"
                    >
                      Learn More <ChevronRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                    </a>
                  </div>
                ))}
              </div>

              {/* Recently Created and Buttons - Original Content */}
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold text-lg">Recently Created</h2>
                <div className="flex items-center gap-2">
                  <button className="border border-gray-200 bg-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-gray-50">
                    + AI Templates
                  </button>
                  <button className="bg-green-500 text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-green-600">
                    + Create New
                  </button>
                </div>
              </div>

              {/* Posts Grid - Original Content */}
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {posts.map((post) => (
                  <div
                    key={post.title}
                    className="relative rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  >
                    {/* Status badge */}
                    <StatusBadge status={post.status} />

                    {/* Thumbnail */}
                    <Image
                      src={post.thumbnail || "/placeholder.svg"}
                      width={600}
                      height={300}
                      alt={post.title}
                      className="h-40 w-full object-cover"
                    />

                    {/* Card body */}
                    <div className="p-4 flex flex-col gap-2 bg-white">
                      <div className="flex items-center text-[10px] text-gray-500 gap-1 uppercase tracking-wide">
                        <span>Created by {post.author}</span>·<span>{post.type}</span>
                      </div>

                      <h3 className="font-semibold text-sm leading-snug line-clamp-2">{post.title}</h3>

                      <p className="text-xs text-gray-600 line-clamp-3">{post.excerpt}</p>

                      <div className="flex items-center justify-between text-[10px] text-gray-500 mt-1">
                        <span>{post.platform}</span>
                        <span>{post.date}</span>
                        <span>{post.time}</span>
                      </div>

                      <div className="flex flex-wrap gap-1 mt-2">
                        {post.tags.map((t) => (
                          <Tag key={t} label={t} />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Right sidebar */}
        <aside className="space-y-6">
          {/* Metrics */}
          <div className="grid grid-cols-2 gap-4">
            {/* Stat Card */}
            <div className="rounded-xl border border-gray-200 p-4 flex flex-col items-start">
              <span className="text-3xl font-bold">205</span>
              <span className="text-xs text-gray-500 mt-1">Monthly AI Generation</span>
            </div>

            <div className="rounded-xl border border-gray-200 p-4 flex flex-col items-start">
              <span className="text-3xl font-bold">128</span>
              <span className="text-xs text-gray-500 mt-1">Estimated Time Saved (mins)</span>
            </div>
          </div>

          {/* Greeting Card */}
          <div className="bg-gradient-to-br from-green-100 to-green-50 rounded-2xl h-[35%] p-2 space-y-4">
      <div className="flex flex-col items-center justify-center py-10 mt-[150px]">
  <h3 className="text-lg font-semibold leading-snug text-center">
    Hello <span className="text-green-600">Sophia</span>,<br />
    How may I <span className="text-green-600">assist you today</span>?
  </h3>
</div>

            {/* Quick prompt chips */}
            <div className="mt-[110px] p"> 
            <div className="space-y-2 py-2">
              {quickPrompts.map((qp) => (
                <button
                  key={qp}
                  className=" text-left px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-50 rounded-xl border border-gray-200"
                >
                  {qp}
                </button>
              ))}
            </div>

            {/* Ask AI input */}
            <div className="bg-white rounded-lg border border-gray-200 flex items-center px-2 py-1 gap-2">
              <input type="text" placeholder="Ask ai..." className="flex-1 text-xs focus:outline-none py-1.5" />
              <div className="flex items-center gap-1 text-gray-500">
                <Paperclip className="w-4 h-4 cursor-pointer hover:text-gray-700" />
                <CircleHelp className="w-4 h-4 cursor-pointer hover:text-gray-700" />
                <Send className="w-4 h-4 cursor-pointer hover:text-green-600" />
              </div>
            </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
