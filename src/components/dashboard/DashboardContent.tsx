"use client"
import React, { useState } from 'react';
import { ChevronDown, Plus, MoreHorizontal, Calendar, List, ArrowRight, MessageCircle, FileText, Ticket, Star, ArrowDownLeft, ArrowUpRight, FilePenLine, ClockPlus, ChartLine, Link, Calendar1, Clock, Instagram, InstagramIcon, Linkedin, CirclePlus } from 'lucide-react';
import Image from 'next/image';

const Dashboard = () => {
   const posts = [
    {
      id: 1,
      title: 'Tech Conference',
      description: 'We are excited to be attending the tech conference next month.',
      platform: 'Instagram',
      platformColor: 'from-pink-500 to-yellow-500',
      emoji:"",
      date: '05 May, 2025',
      time: '04:00 PM',
      image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=60&h=60&fit=crop',
      hashtags: ['#conference', '#tech', '#networking'],
    },
    {
      id: 2,
      title: 'Webinar Series',
      description: 'Don\'t miss our upcoming webinar series focusing on emerging trends in technology.',
      platform: 'LinkedIn',
      platformColor: 'bg-blue-600',
      emoji: <Linkedin/>,
      date: '20 July, 2025',
      time: '01:00 PM',
      image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=60&h=60&fit=crop',
      hashtags: ['#webinar', '#trends', '#education'],
    },
  ];

const [showPosts, setShowPosts] = useState(true);
const [showCalendar, setShowCalendar] = useState(false);

// Calendar data with platform indicators
const calendarData = {
  2025: {
    5: { // May
      1: [
        { platform: 'WhatsApp', color: 'bg-green-500' },
        { platform: 'Instagram', color: 'bg-pink-500' },
        { platform: 'Telegram', color: 'bg-blue-500' },
        { platform: 'Email', color: 'bg-purple-500' }
      ],
      10: [
        { platform: 'Telegram', color: 'bg-blue-500' },
        { platform: 'LinkedIn', color: 'bg-blue-600' }
      ],
      15: [
        { platform: 'Messenger', color: 'bg-blue-500' },
        { platform: 'Instagram', color: 'bg-pink-500' }
      ],
      25: [
        { platform: 'WhatsApp', color: 'bg-green-500' },
        { platform: 'SMS', color: 'bg-orange-500' },
        { platform: 'Email', color: 'bg-purple-500' }
      ]
    }
  }
};

const getDaysInMonth = (year, month) => {
  return new Date(year, month, 0).getDate();
};

const getFirstDayOfMonth = (year, month) => {
  return new Date(year, month - 1, 1).getDay();
};

const renderCalendar = () => {
  const year = 2025;
  const month = 5; // May
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const days = [];

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) {
    const prevMonthDay = getDaysInMonth(year, month - 1) - (firstDay === 0 ? 6 : firstDay - 1) + i + 1;
    days.push(
      <div key={`prev-${i}`} className="h-12 flex flex-col items-center justify-center text-gray-300 text-sm">
        {prevMonthDay}
      </div>
    );
  }

  // Add days of the current month
  for (let day = 1; day <= daysInMonth; day++) {
    const dayPosts = calendarData[year]?.[month]?.[day] || [];
    days.push(
      <div key={day} className="h-12 flex flex-col items-center justify-center text-sm relative">
        <span className={`${day === new Date().getDate() && month === new Date().getMonth() + 1 ? 'font-bold' : ''}`}>
          {String(day).padStart(2, '0')}
        </span>
        {dayPosts.length > 0 && (
          <div className="flex space-x-0.5 mt-0.5">
            {dayPosts.slice(0, 4).map((post, idx) => (
              <div
                key={idx}
                className={`w-1.5 h-1.5 rounded-full ${post.color}`}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Add empty cells for days after the last day of the month
  const remainingCells = 42 - days.length; // 6 rows * 7 days
  for (let i = 1; i <= remainingCells && days.length < 42; i++) {
    days.push(
      <div key={`next-${i}`} className="h-12 flex flex-col items-center justify-center text-gray-300 text-sm">
        {String(i).padStart(2, '0')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <button className="p-1 hover:bg-gray-100 rounded-full">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h4 className="font-semibold text-gray-900">MAY 2025</h4>
        <button className="p-1 hover:bg-gray-100 rounded-full">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day Names */}
      <div className="grid grid-cols-7 gap-1 text-xs text-gray-500 font-medium">
        {dayNames.map(day => (
          <div key={day} className="text-center py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days}
      </div>

      {/* Legend */}
      <div className="space-y-2 text-xs">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-gray-600">WhatsApp</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-gray-600">Telegram</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
            <span className="text-gray-600">Instagram</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-gray-600">Messenger</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            <span className="text-gray-600">LinkedIn</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            <span className="text-gray-600">Email</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            <span className="text-gray-600">SMS</span>
          </div>
        </div>
      </div>
    </div>
  );
};
const stats = [
  { label: "Total Posts", value: "05", change: "01% from last month", isUp: false, changeColor: "text-red-500", bgColor: "bg-red-100" },
  { label: "Engagement", value: "16%", change: "07% from last month", isUp: true, changeColor: "text-green-500", bgColor: "bg-green-100" },
  { label: "Reach", value: "27%", change: "02% from last month", isUp: true, changeColor: "text-green-500", bgColor: "bg-green-100" },
  { label: "Growth", value: "10%", change: "05% from last month", isUp: true, changeColor: "text-green-500", bgColor: "bg-green-100" },
];
  return (
    
    <div className="w-full bg-gray-50 ">
      <div className="max-w-full mx-auto">
        {/* Top Stats */}
<div className="flex flex-wrap gap-2 space-y-2">
  {stats.map((stat, idx) => (
    <div
      key={idx}
      className="bg-white rounded-xl p-4 flex justify-between items-center w-full h-[110px] sm:w-[48%] lg:w-[306px] shadow-sm"
    >
      <div className="space-y-4">
        <div className="text-xl sm:text-2xl font-bold text-gray-900">{stat.value}</div>
        <div className="text-sm text-black font-semibold whitespace-nowrap">{stat.label}</div>
      </div>
      <div className="flex flex-col items-end justify-center space-y-6">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${stat.bgColor}`}>
          {stat.isUp ? (
            <ArrowUpRight size={16} className="text-green-500" />
          ) : (
            <ArrowDownLeft size={16} className="text-red-500" />
          )}
        </div>
        <span className={`text-xs ${stat.changeColor} whitespace-nowrap`}>{stat.change}</span>
      </div>
    </div>
  ))}
</div>


        <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
  {/* Left Column - Full width on mobile, 3 cols on desktop */}
  <div className="md:col-span-3 space-y-1">
    {/* Creator Profile */}
 <div className="bg-gradient-to-t from-green-200 to-white rounded-2xl p-5 w-[360px]">
  <div className="flex items-center justify-between">
    {/* Left: Profile and Info */}
    <div className="flex items-center space-x-4">
      <div className="relative">
        <img
          src="/images/profile2.png"
          alt="Sophia Adam"
          className="w-16 h-16 rounded-full object-cover"
        />
        <div className="absolute -bottom-1 left-1 bg-white rounded-full px-2 py-0.5 text-[10px] font-semibold text-gray-700 shadow">
          CREATOR
        </div>
      </div>
      <div>
        <div className="text-[18px] font-semibold text-gray-900 leading-tight">
          Sophia Adam
        </div>
        <div className="text-gray-500 text-sm">Black Rust Corp.</div>
      </div>
    </div>

    {/* Right: Coins */}
 <div className="bg-white flex items-center space-x-1 rounded-full mr-7 -mt-10 px-1 py-1 shadow-sm sm:mr-8 sm:-mt-12  ">
  <span className="text-yellow-500 text-[14px] sm:text-[12px]">🪙</span>
  <span className="text-gray-800 text-[13px] font-medium sm:text-[11px]">8090</span>
  <span className="text-yellow-400 cursor-pointer">
    <CirclePlus className="w-4 h-4 sm:w-3 sm:h-3" />
  </span>
</div>

  </div>
</div>


    {/* Social Accounts */}
    <div className="bg-white rounded-2xl p-3 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Social Accounts</h3>
        <button className="text-gray-500 text-sm flex items-center">
          <Plus className="w-4 h-4 mr-1 underline cursor-pointer" />
          Connect more
        </button>
      </div>
      
      <div className="space-y-5">
        <div className="flex items-center">
          <div className="flex items-center justify-center mr-3">
            <Image
              src="/icons/vecteezy_whatsapp-for-business-icon_16716483.png" 
              alt="Phone Icon"
              width={35}
              height={35}
              className="rounded-full" 
            />
          </div>
          <div>
            <div className="text-sm font-medium">+1 23 456 7890</div>
            <div className="text-xs text-gray-500">WhatsApp for business</div>
          </div>
        </div>
        
        <div className="flex items-center">
          <div className="flex items-center justify-center mr-3">
            <Image
              src="/icons/vecteezy_telegram-png-icon_16716472.png" 
              alt="Phone Icon"
              width={35}
              height={35}
              className="rounded-full" 
            />
          </div>
          <div>
            <div className="text-sm font-medium">+1 23 456 7890</div>
            <div className="text-xs text-gray-500">Telegram for business</div>
          </div>
        </div>
        
        <div className="flex items-center">
          <div className="flex items-center justify-center mr-3">
            <Image
              src="/icons/vecteezy_instagram-logo-png-instagram-icon-transparent_18930415.png" 
              alt="Phone Icon"
              width={38}
              height={38}
              className="rounded-full" 
            />
          </div>
          <div>
            <div className="text-sm font-medium">@weareblackrust</div>
            <div className="text-xs text-gray-500">Instagram</div>
          </div>
        </div>
      </div>
    </div>

    {/* Quick Actions */}
    <div className="bg-white rounded-2xl p-2 shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3">
        <button className="flex flex-col items-start p-4 bg-gray-100 rounded-xl hover:bg-orange-100 transition-colors">
          <div className="w-8 h-8 text-orange-500 mb-2"><FilePenLine /></div>
          <span className="text-sm font-medium text-gray-900 whitespace-nowrap">Create Post</span>
        </button>

        <button className="flex flex-col items-start p-4 bg-gray-100 rounded-xl hover:bg-blue-100 transition-colors">
          <div className="w-8 h-8 text-[#0FB9B1] mb-2"><ClockPlus /></div>
          <span className="text-sm font-medium text-gray-900 whitespace-nowrap">Schedule Post</span>
        </button>

        <button className="flex flex-col items-start p-4 bg-gray-100 rounded-xl hover:bg-green-100 transition-colors">
          <div className="w-8 h-8 text-[#20BF6B] mb-2"><ChartLine /></div>
          <span className="text-sm font-medium text-gray-900 whitespace-nowrap">View Analytics</span>
        </button>

        <button className="flex flex-col items-start p-4 bg-gray-100 rounded-xl hover:bg-purple-100 transition-colors">
          <div className="w-8 h-8 text-[#3867D6] mb-2"><Link /></div>
          <span className="text-sm font-medium text-gray-900 whitespace-nowrap">Connect Account</span>
        </button>
      </div>
    </div>
  </div>

  {/* Middle Column - Full width on mobile, 6 cols on desktop */}
  <div className="md:col-span-6 space-y-2">
    {/* Recent Activity */}
    <div className="bg-white rounded-2xl p-[14px] shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-gray-900">Recent Activity</h3>
        <button className="text-blue-600 text-sm">Go to Inbox</button>
      </div>
      
      <div className="space-y-5">
        <div className="flex items-start space-x-3">
          <img 
            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face" 
            alt="Robert Fox" 
            className="w-10 h-10 rounded-full"
          />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Robert Fox</h4>
              <span className="text-xs text-gray-500">5:30 PM</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Track performance metrics across all channels with customizable, real-time dashboards.
            </p>
          </div>
        </div>
        
        <div className="flex items-start space-x-3">
          <img 
            src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face" 
            alt="Ronald Richards" 
            className="w-10 h-10 rounded-full"
          />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Ronald Richards</h4>
              <span className="text-xs text-gray-500">4:41 PM</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Evaluate quarterly outcomes and adjust strategies with performance benchmarks and goal assessments.
            </p>
          </div>
        </div>
        
        <div className="flex items-start space-x-3">
          <img 
            src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face" 
            alt="Esther Howard" 
            className="w-10 h-10 rounded-full"
          />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Esther Howard</h4>
              <span className="text-xs text-gray-500">Yesterday</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Conduct a thorough annual review to set objectives for the upcoming year based on comprehensive data analysis.
            </p>
          </div>
        </div>
      </div>
    </div>

    {/* Smart Suggestions and Support - Stack on mobile, side by side on desktop */}
    <div className='flex flex-col md:flex-row gap-2'>
      <div className="bg-white rounded-2xl p-2 w-full md:w-[50%] h-[250px] shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-gray-900">Smart Suggestions</h3>
          <button className="text-gray-500 text-sm flex items-center">
            🔄 Refresh
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <img 
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face" 
              alt="Esther" 
              className="w-8 h-8 rounded-full"
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900 text-sm">Reply to Esther</div>
              <div className="text-xs text-gray-500">Messaged received on May 15 at 09:00 PM</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm">W</span>
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-900 text-sm">Run campaign on WhatsApp</div>
              <div className="text-xs text-gray-500">WhatsApp campaign can be run today for better reach</div>
            </div>
          </div>
        </div>
      </div>

      {/* Get Support */}
      <div className="bg-white rounded-2xl p-2 w-full md:w-[50%] shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">Get Support</h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
            <div className="flex items-center space-x-3">
              <FileText className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-900">Document</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400" />
          </div>
          
          <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
            <div className="flex items-center space-x-3">
              <MessageCircle className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-900">Chat</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400" />
          </div>
          
          <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
            <div className="flex items-center space-x-3">
              <Ticket className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-900">Ticket</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>
    </div>
  </div>

  {/* Right Column - Full width on mobile, 3 cols on desktop */}
  <div className="md:col-span-3 space-y-2">
    {/* Create Post Button */}
    <button className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-4 px-6 rounded-2xl flex items-center justify-center space-x-2 transition-colors">
      <Plus className="w-5 h-5" />
      <span>Create Post</span>
    </button>

    {/* Upcoming Posts */}
    <div className="bg-white rounded-2xl p-4  shadow-sm w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-gray-900 text-lg">Upcoming posts</h3>
        <div className="flex space-x-2">
          {/* List View Button */}
          <button
            onClick={() => {
              setShowPosts(true);
              setShowCalendar(false);
            }}
            className={`p-2 rounded-full hover:bg-gray-100 transition ${
              showPosts ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <List className="w-5 h-5" />
          </button>

          {/* Calendar View Button */}
          <button
            onClick={() => {
              setShowPosts(false);
              setShowCalendar(true);
            }}
            className={`p-2 rounded-full hover:bg-gray-100 transition ${
              showCalendar ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Calendar className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Post List */}
      {showPosts && (
        <div className="space-y-6">
          {posts.map((post) => (
            <div key={post.id} className="border border-gray-200 rounded-xl p-3">
              <div className="flex items-start space-x-3">
                <img
                  src={post.image}
                  alt={post.title}
                  className="w-12 h-12 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{post.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{post.description}</p>
                </div>
              </div>

              {/* Post Info Line */}
              <div className="flex flex-wrap items-center gap-1 mt-3 text-xs text-gray-500">
                {post.platform === 'Instagram' ? (
                  <div className="w-4 h-4 bg-gradient-to-r from-pink-500 to-yellow-500 rounded flex items-center justify-center text-white">
                    <InstagramIcon />
                  </div>
                ) : (
                  <div className="w-4 h-4 bg-blue-600 rounded flex items-center justify-center text-white text-[8px]">
                    {post.emoji}
                  </div>
                )}
                <span>{post.platform}</span>
                <span className="text-gray-300 hidden sm:inline"></span>
                <span className="flex items-center space-x-1">
                  <Calendar1 className="w-3 h-3" />
                  <span>{post.date}</span>
                </span>
                <span className="text-gray-300 hidden sm:inline"></span>
                <span className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{post.time}</span>
                </span>
              </div>

              {/* Hashtags */}
              <div className="flex flex-wrap gap-2  mt-4">
                {post.hashtags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Calendar View */}
      {showCalendar && renderCalendar()}
    </div>
  </div>
</div>
      </div>
    </div>
  );
};

export default Dashboard;