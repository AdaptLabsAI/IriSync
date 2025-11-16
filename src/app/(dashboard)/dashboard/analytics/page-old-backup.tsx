"use client"
import React, { useState, useRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format } from 'date-fns';
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
} from "recharts"
import {
  TrendingUp,
  TrendingDown,
  Users,
  Heart,
  MessageCircle,
  Eye,
  Bookmark,
  Edit,
  Instagram,
  Download,
  Lock,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FaStar } from "react-icons/fa"

const platforms = [
  { name: "All", count: null },
  { name: "WhatsApp", count: null },
  { name: "Telegram", count: null },
  { name: "Instagram", count: null },
  { name: "Messenger", count: null },
  { name: "LinkedIn", count: null },
  { name: "Email", count: null },
  { name: "SMS", count: null },
]

const SocialMediaDashboard = () => {
  const [selectedPlatform, setSelectedPlatform] = useState("Instagram")
  const [dateRange, setDateRange] = useState("01-04-2025 to 10-05-2025")
  const [tab, setTab] = useState("Age")

  const data = [
    { name: "Link", value: 9.5, color: "#F4B400" },
    { name: "Carousels", value: 5.8, color: "#4285F4", posts: 12, impressions: 67200 },
    { name: "Images", value: 4.6, color: "#00BFAE" },
    { name: "Videos", value: 3.2, color: "#FB8C00" },
    { name: "Text", value: 2.7, color: "#9C27B0" },
  ]

  const CarouselTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length && payload[0].payload.name === "Carousels") {
      const { value, posts, impressions } = payload[0].payload
      return (
        <div className="bg-white shadow-md rounded-lg p-4 text-sm">
          <p className="font-semibold text-blue-700">Carousels</p>
          <p>
            Engagement Rate <span className="font-semibold">{value}%</span>
          </p>
          <p>
            Posts <span className="font-semibold">{posts}</span>
          </p>
          <p>
            Impressions <span className="font-semibold">{impressions.toLocaleString()}</span>
          </p>
        </div>
      )
    }
    return null
  }

  const growthData = [
    { date: "01-04-2025", followers: 21600, engagement: 11800, reach: 36500 },
    { date: "08-04-2025", followers: 22100, engagement: 12200, reach: 38200 },
    { date: "15-04-2025", followers: 22800, engagement: 13500, reach: 41800 },
    { date: "22-04-2025", followers: 23200, engagement: 14200, reach: 43200 },
    { date: "29-04-2025", followers: 23600, engagement: 14800, reach: 44800 },
    { date: "05-05-2025", followers: 23800, engagement: 15400, reach: 45600 },
  ]

  const datas = [
    { age: "18–24", value: 21, color: "#9C27B0" },
    { age: "25–34", value: 12, color: "#FB8C00" },
    { age: "35–44", value: 17, color: "#00BFAE" },
    { age: "45–54", value: 35, color: "#4285F4" },
    { age: "55–64", value: 6, color: "#F4B400" },
    { age: "65+", value: 2, color: "#EC407A" },
  ]

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-white p-2 rounded-md shadow text-sm">
          <p>{payload[0].payload.age}</p>
          <p className="font-semibold">{payload[0].value}%</p>
        </div>
      )
    }
    return null
  }

  const demographicsData = [
    { ageGroup: "45-54", percentage: 40, color: "#3b82f6", label: "45-54: 40%" },
    { ageGroup: "35-44", percentage: 30, color: "#14b8a6", label: "35-44: 30%" },
    { ageGroup: "25-34", percentage: 15, color: "#f97316", label: "25-34: 15%" },
    { ageGroup: "18-24", percentage: 10, color: "#a855f7", label: "18-24: 10%" },
    { ageGroup: "55-64", percentage: 5, color: "#eab308", label: "55-64: 5%" },
  ]

  const tableData = [
    {
      competitor: "My Account",
      followers: "23,800",
      engagement: "15,400",
      engagementRate: "3.2%",
      isMyAccount: true,
    },
    {
      competitor: "Competitor A",
      followers: "35,200",
      engagement: "18,500",
      engagementRate: "2.8%",
      isMyAccount: false,
    },
    {
      competitor: "Competitor B",
      followers: "19,600",
      engagement: "12,800",
      engagementRate: "3.4%",
      isMyAccount: false,
    },
    {
      competitor: "Competitor C",
      followers: "28,400",
      engagement: "16,200",
      engagementRate: "3.0%",
      isMyAccount: false,
    },
    {
      competitor: "Competitor D",
      followers: "25,700",
      engagement: "13,700",
      engagementRate: "2.9%",
      isMyAccount: false,
    },
  ]

  // Custom component for external labels
  const ExternalLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, ageGroup, color }: any) => {
    const RADIAN = Math.PI / 180
    const radius = outerRadius + 60 // Distance from chart
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    if (percent < 0.02) return null // Don't show labels for very small segments

    return (
      <g>
        {/* Connecting line */}
        <line
          x1={cx + (outerRadius + 10) * Math.cos(-midAngle * RADIAN)}
          y1={cy + (outerRadius + 10) * Math.sin(-midAngle * RADIAN)}
          x2={cx + (outerRadius + 40) * Math.cos(-midAngle * RADIAN)}
          y2={cy + (outerRadius + 40) * Math.sin(-midAngle * RADIAN)}
          stroke="#ccc"
          strokeWidth={1}
        />

        {/* Label background */}
      <rect
  x={x - 45}
  y={y - 12}
  width={87}
  height={24}
  fill={color}
  fillOpacity={0.1}
  stroke={color}
  strokeWidth={1}
  rx={12}
/>


        {/* Label text */}
        <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="text-sm font-medium " fill={color}>
          {`${ageGroup}: ${(percent * 100).toFixed(0)}%`}
        </text>
      </g>
    )
  }

  const MetricCard = ({ icon: Icon, title, value, change, isPositive }: any) => (
    <div className="bg-gray-10 p-4 rounded-lg shadow-md">
      <div className="flex items-center justify-between">
        <div className="space-y-4">
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-600 mt-1">{title}</p>
        </div>
        <div className="flex flex-col items-center space-y-4">
          {isPositive ? (
            <TrendingUp className="w-8 h-8 p-1.5 bg-green-200 rounded-full" />
          ) : (
            <TrendingDown className="w-8 h-8 p-1.5 bg-red-200 rounded-full" />
          )}
          <span className={`text-sm font-medium ${isPositive ? "text-green-600" : "text-red-600"}`}>{change}%</span>
        </div>
      </div>
    </div>
  )

  const setActiveFilter = (name: string) => {
    setSelectedPlatform(name)
  }

  const handleExportData = () => {
    console.log("Exporting data...")
  }

  const handleGetAISummary = () => {
    console.log("Getting AI summary...")
  }
  const [startDate, setStartDate] = useState(new Date('2025-04-01'));
  const [endDate, setEndDate] = useState(new Date('2025-05-10'));

  const startPickerRef = useRef(null);
  const endPickerRef = useRef(null);
  return (
    <div className="bg-gray-50 p-2 md:p-4">
      <div className="max-w-8xl mx-auto">
        {/* Header */}
        <div className="max-w-full bg-gray-50">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              {/* Platform Filters */}
              <div className="flex overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
                <div className="flex space-x-2">
                  {platforms.map((platform) => (
                    <button
                      key={platform.name}
                      onClick={() => setActiveFilter(platform.name)}
                      className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                        selectedPlatform === platform.name
                          ? "bg-green-100 text-green-700 border-2 border-green-300"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-transparent"
                      }`}
                    >
                      {platform.name}
                    </button>
                  ))}
                </div>
              </div>
              {/* Action Buttons */}
              <div className="flex space-x-3 w-full md:w-auto justify-end">
                <button
                  onClick={handleExportData}
                  className="flex items-center px-3 py-1.5 md:px-4 md:py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
                >
                  <Download className="w-4 h-4 mr-1 md:mr-2" />
                  <span className="font-semibold">Export Data</span>
                  <Lock className="w-4 h-4 ml-1 md:ml-2" />
                </button>
                <button
                  onClick={handleGetAISummary}
                  className="flex items-center px-3 py-1.5 md:px-4 md:py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
                >
                  <FaStar className="w-4 h-4 mr-1 md:mr-2" />
                  <span>Get AI Summary</span>
                </button>
              </div>
            </div>
          </div>

          {/* Date selector section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="text-lg font-semibold text-gray-900">Instagram Performance Overview</div>
            <div className="flex items-center gap-2 text-sm text-gray-600 flex-wrap">
              <div className="flex items-center gap-1 bg-gray-100 p-1.5 rounded">
                <span>Custom</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
             <div className="relative flex items-center gap-1 bg-gray-100 p-1.5 rounded">
        <span>{format(startDate, 'dd-MM-yyyy')}</span>
        <svg
          onClick={() => startPickerRef.current.setOpen(true)}
          className="w-4 h-4 cursor-pointer text-gray-600 hover:text-gray-800"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z"
          />
        </svg>
        <DatePicker
          selected={startDate}
          onChange={(date) => setStartDate(date)}
          dateFormat="dd-MM-yyyy"
          ref={startPickerRef}
          className="hidden"
          popperPlacement="bottom-start"
        />
      </div>

      <span>to</span>

      {/* End Date */}
      <div className="relative flex items-center gap-1 bg-gray-100 p-1.5 rounded">
        <span>{format(endDate, 'dd-MM-yyyy')}</span>
        <svg
          onClick={() => endPickerRef.current.setOpen(true)}
          className="w-4 h-4 cursor-pointer text-gray-600 hover:text-gray-800"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z"
          />
        </svg>
        <DatePicker
          selected={endDate}
          onChange={(date) => setEndDate(date)}
          dateFormat="dd-MM-yyyy"
          ref={endPickerRef}
          className="hidden"
          popperPlacement="bottom-start"
        />
      </div>
 
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6 mb-6 md:mb-8">
          <MetricCard icon={Users} title="Followers" value="23,800" change={3.8} isPositive={true} />
          <MetricCard icon={Heart} title="Likes" value="15,400" change={18.4} isPositive={true} />
          <MetricCard icon={MessageCircle} title="Comments" value="3,200" change={23.2} isPositive={true} />
          <MetricCard icon={Eye} title="Reach" value="45,600" change={14.8} isPositive={true} />
          <MetricCard icon={Bookmark} title="Saves" value="2,750" change={5.2} isPositive={false} />
        </div>

        {/* Growth Trends Chart */}
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm mb-6 md:mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 md:mb-6 gap-4">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900">Growth Trends</h2>
            <div className="flex flex-wrap gap-2 md:gap-4 text-xs md:text-sm">
              <div className="flex items-center gap-1 md:gap-2">
                <div className="w-2 h-2 md:w-3 md:h-3 bg-blue-500 rounded-full"></div>
                <span>Followers</span>
              </div>
              <div className="flex items-center gap-1 md:gap-2">
                <div className="w-2 h-2 md:w-3 md:h-3 bg-orange-500 rounded-full"></div>
                <span>Engagement</span>
              </div>
              <div className="flex items-center gap-1 md:gap-2">
                <div className="w-2 h-2 md:w-3 md:h-3 bg-teal-500 rounded-full"></div>
                <span>Reach</span>
              </div>
            </div>
          </div>
          <div className="h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} tickMargin={10} />
                <YAxis tick={{ fontSize: 12 }} tickMargin={10} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="followers"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="engagement"
                  stroke="#F97316"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="reach"
                  stroke="#14B8A6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Content Performance Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Content */}
          <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-base md:text-lg font-semibold text-gray-900">Top Content</h3>
              <Edit className="w-5 h-5" />
            </div>
            <div className="rounded-lg p-3 md:p-4 mb-3 md:mb-4">
              <img
                src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=200&fit=crop"
                alt="Top performing post"
                className="w-full h-48 md:h-60 object-cover rounded-lg mb-2 md:mb-3"
              />
              <div className="flex justify-between items-center gap-1">
                <p className="text-xs md:text-sm text-gray-700 font-medium mb-1 truncate">
                  Post caption snippet that goe...
                </p>
                <div className="flex items-center gap-1 text-xs text-gray-500 mb-1 bg-gray-100 rounded-md px-2 py-1">
                  <span className="flex items-center gap-1">
                    <Instagram className="w-3 h-3" />
                    Instagram
                  </span>
                </div>
              </div>
              <span className="text-xs text-gray-400 block mb-2 md:mb-3">Apr 24 at 5:30 PM</span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 text-xs md:text-sm text-gray-700">
                <div className="space-y-1">
                  <h2 className="font-bold text-base md:text-lg">1,204</h2>
                  <div className="flex items-center gap-1">
                    <Heart className="w-3 h-3 md:w-4 md:h-4 text-gray-500" />
                    <span>Likes</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <h2 className="font-bold text-base md:text-lg">132</h2>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-3 h-3 md:w-4 md:h-4 text-gray-500" />
                    <span>Comments</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <h2 className="font-bold text-base md:text-lg">8,452</h2>
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3 md:w-4 md:h-4 text-gray-500" />
                    <span>Impressions</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <h2 className="font-bold text-base md:text-lg">18.6%</h2>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-gray-500" />
                    <span>Engagement</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Type Performance */}
          <div className="p-2 md:p-4 bg-white rounded-xl shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4">
              <h2 className="text-base md:text-lg font-semibold text-gray-800">Content Type Performance</h2>
              <div className="flex items-center space-x-2 overflow-x-auto pb-2 md:pb-0">
                <button className="bg-gray-100 px-3 py-1 rounded-full text-xs md:text-sm font-medium text-black shadow-sm whitespace-nowrap">
                  Engagement
                </button>
                <button className="text-gray-400 text-xs md:text-sm font-medium whitespace-nowrap">Clicks</button>
                <button className="text-gray-400 text-xs md:text-sm font-medium whitespace-nowrap">Shares</button>
              </div>
            </div>
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={data} margin={{ top: 5, right: 10, left: 30, bottom: 5 }}>
                  <XAxis type="number" domain={[0, 10]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={80} />
                  <Tooltip content={<CarouselTooltip />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Audience Demographics */}
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 mb-6 md:mb-8">
          <h2 className="text-base md:text-lg font-semibold text-gray-800 mb-3 md:mb-4">Audience Demographics</h2>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-3 md:mb-4 gap-2">
            <div className="flex overflow-x-auto pb-2 md:pb-0 w-full">
              <div className="flex space-x-1 md:space-x-3 bg-gray-100 p-1 rounded-full">
                {["Age", "Gender", "Location", "Interest"].map((item) => (
                  <button
                    key={item}
                    className={`px-3 py-1 text-xs md:text-sm rounded-full font-medium whitespace-nowrap ${
                      tab === item ? "bg-white shadow text-black" : "text-gray-400"
                    }`}
                    onClick={() => setTab(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {/* Chart */}
            <div className="md:col-span-2 h-56 md:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={datas} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <XAxis dataKey="age" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 40]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {datas.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Side Panel */}
            <div className="bg-gray-50 p-3 md:p-4 rounded-lg text-xs md:text-sm">
              <h3 className="font-semibold mb-2">Age Distribution</h3>
              <ul className="space-y-1 md:space-y-2 mb-3 md:mb-4">
                {datas.map((item, index) => (
                  <li key={index} className="flex justify-between">
                    <span className="flex items-center space-x-2">
                      <span className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full" style={{ background: item.color }} />
                      <span>{item.age}</span>
                    </span>
                    <span>{item.value}%</span>
                  </li>
                ))}
              </ul>
              <p className="text-gray-600">
                Primary age range <span className="font-medium">25–34</span> (<span className="font-medium">35%</span>)
              </p>
              <p className="text-gray-400 mt-1 md:mt-2 text-xs">Data collected from all connected social platforms</p>
            </div>
          </div>
        </div>

        {/* Competitive Benchmarking */}
        <div className="w-full bg-gray-50 p-1 mt-2">
          <div className="max-w-8xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              {/* Updated Audience Demographics Donut Chart */}
              <Card className="bg-white">
              
                  <div className="text-base md:text-lg font-semibold text-gray-800">
                    Audience Demographics
                </div>
                <CardContent>
                  <div className="flex flex-col items-center">
                    {/* Updated Donut Chart with External Labels */}
                    <div className="w-full h-80 md:h-96 mb-3 md:mb-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={demographicsData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={(props) => <ExternalLabel {...props} />}
                            outerRadius={110}
                            innerRadius={60}
                            
                            fill="#8884d8"
                            dataKey="percentage"
                            stroke="none"
                          >
                            {demographicsData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Competitive Benchmarking */}
              <div className="max-w-4xl mx-auto p-2 md:p-4 bg-white rounded-lg shadow-sm">
                <h1 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6">Competitive Benchmarking</h1>

                <div className="rounded-lg overflow-hidden">
                  <div className="bg-blue-50 border-b border-blue-200">
                    <div className="grid grid-cols-4 gap-2 md:gap-4 p-2 md:p-4 text-xs md:text-sm">
                      <div className="font-semibold text-gray-700 uppercase tracking-wide truncate">Competitor</div>
                      <div className="font-semibold text-gray-700 uppercase tracking-wide truncate">Followers</div>
                      <div className="font-semibold text-gray-700 uppercase tracking-wide truncate">Engagement</div>
                      <div className="font-semibold text-gray-700 uppercase tracking-wide truncate">
                        Engagement Rate
                      </div>
                    </div>
                  </div>

                  <div className="bg-white">
                    {tableData.map((item, index) => (
                      <div
                        key={index}
                        className={`grid grid-cols-4 gap-2 md:gap-4 p-2 md:p-4 border-b border-gray-100 last:border-b-0 text-xs md:text-sm ${
                          item.isMyAccount ? "bg-green-50" : "hover:bg-gray-50"
                        }`}
                      >
                        <div
                          className={`font-medium truncate ${item.isMyAccount ? "text-green-800" : "text-gray-900"}`}
                        >
                          {item.competitor}
                        </div>
                        <div className="text-gray-700 font-medium truncate">{item.followers}</div>
                        <div className="text-gray-700 font-medium truncate">{item.engagement}</div>
                        <div className="text-gray-700 font-medium truncate">{item.engagementRate}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SocialMediaDashboard
