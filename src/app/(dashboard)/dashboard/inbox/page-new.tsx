"use client";

import React, { useState } from 'react';
import Image from 'next/image';

// Mock data for contacts/conversations
const conversations = [
  {
    id: 1,
    name: "Marvin McKinney",
    message: "Good Afternoon..! Tell me ho...",
    time: "02:15 PM",
    avatar: "/images/profile3.png",
    unreadCount: 0,
    isActive: true,
  },
  {
    id: 2,
    name: "Micky Williams",
    message: "Hello, Hope you are doing well.",
    time: "02:15 PM",
    avatar: "/images/profile3.png",
    unreadCount: 0,
  },
  {
    id: 3,
    name: "Jerome Bell",
    message: "Hello, Hope you are doing well.",
    time: "02:15 PM",
    avatar: "/images/profile3.png",
    unreadCount: 1,
  },
  {
    id: 4,
    name: "Wade Warren",
    message: "Hello, Hope you are doing well.",
    time: "02:15 PM",
    avatar: "/images/profile3.png",
    unreadCount: 2,
  },
  {
    id: 5,
    name: "Brigette Simmons",
    message: "Hello, Hope you are doing well.",
    time: "02:15 PM",
    avatar: "/images/profile3.png",
    unreadCount: 0,
  },
];

const teamMembers = [
  { id: 1, name: "Mike Anderson", role: "Manager", avatar: "/images/profile3.png" },
  { id: 2, name: "Henry Matthew", role: "Sales Member", avatar: "/images/profile3.png" },
];

export default function InboxPage() {
  const [selectedConversation, setSelectedConversation] = useState(conversations[0]);
  const [messageInput, setMessageInput] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  const filters = ["All", "Unread", "Assigned", "Mentions"];
  const channels = ["All", "WhatsApp", "Telegram", "Instagram", "Messenger", "LinkedIn", "Email", "SMS"];

  const messages = [
    {
      id: 1,
      text: "Hello, Good Afternoon",
      time: "03:45 pm",
      sender: "contact"
    },
    {
      id: 2,
      text: "Hope you're doing well..!",
      time: "03:45 pm",
      sender: "contact"
    },
    {
      id: 3,
      text: "Good Afternoon..! Yes i am good. Thanks for asking. Tell me how can I help you?",
      time: "03:55 pm",
      sender: "user"
    }
  ];

  return (
    <div className="h-screen flex bg-[#F5F5F7] font-['Inter']">
      {/* Left Sidebar - Conversations List */}
      <div className="w-[420px] bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="px-4 py-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-medium text-[#131A13]">Inbox</h1>
            <div className="flex items-center gap-2 bg-[#00C853] text-white px-3 py-1.5 rounded-full">
              <span className="text-xs font-medium">03</span>
            </div>
          </div>

          {/* Channels */}
          <div className="mb-4">
            <h3 className="text-base font-medium text-[#131A13] mb-3">Channels</h3>
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {channels.map((channel) => (
                <button
                  key={channel}
                  className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all ${
                    channel === "All"
                      ? "bg-[#00C853] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {channel}
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4 mb-4">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`text-base transition-colors ${
                  activeFilter === filter
                    ? "text-[#00C853] font-medium"
                    : "text-gray-500"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button className="flex-1 py-3 text-sm font-medium text-[#131A13] bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
              Start Conversation
            </button>
            <button className="flex-1 py-3 text-sm font-medium text-[#131A13] bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
              Archived Chats
            </button>
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => setSelectedConversation(conversation)}
              className={`px-4 py-4 border-b border-gray-100 cursor-pointer transition-colors ${
                selectedConversation.id === conversation.id
                  ? "bg-gray-50"
                  : "hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden">
                    {conversation.avatar ? (
                      <Image
                        src={conversation.avatar}
                        alt={conversation.name}
                        width={48}
                        height={48}
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500">
                        {conversation.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  {conversation.isActive && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#00C853] border-2 border-white rounded-full"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-base ${conversation.id === selectedConversation.id ? 'font-medium' : ''} text-[#131A13]`}>
                      {conversation.name}
                    </span>
                    <span className="text-xs text-gray-500">{conversation.time}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 truncate">{conversation.message}</span>
                    {conversation.unreadCount > 0 && (
                      <div className="ml-2 flex items-center justify-center w-5 h-5 bg-[#00C853] text-white rounded-full text-[10px] font-semibold">
                        {conversation.unreadCount}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-200"></div>
            <div>
              <h2 className="text-base font-medium text-[#131A13]">{selectedConversation.name}</h2>
              <p className="text-xs text-gray-500">Active 3 hours ago</p>
            </div>
          </div>
          <div className="px-3 py-1.5 bg-[#F5F5F7] rounded-full border border-gray-100">
            <span className="text-xs font-medium text-[#131A13]">Customer</span>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-8">
          {/* Date Separator */}
          <div className="flex justify-center mb-10">
            <div className="px-4 py-2 bg-[#F5F5F7] rounded-full">
              <span className="text-xs font-medium text-gray-500">Today</span>
            </div>
          </div>

          {/* Messages */}
          <div className="space-y-6">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
                <div className={`flex flex-col ${message.sender === 'user' ? 'items-end' : 'items-start'} max-w-xl`}>
                  <div className={`px-4 py-3 rounded-2xl ${
                    message.sender === 'user'
                      ? 'bg-green-50 rounded-br-none'
                      : 'bg-[#F5F5F7] rounded-bl-none'
                  }`}>
                    <p className={`text-base ${message.sender === 'user' ? 'text-[#003305]' : 'text-[#131A13]'}`}>
                      {message.text}
                    </p>
                  </div>
                  <span className="text-xs text-[#AAADB2] mt-2">{message.time}</span>
                </div>
                {message.sender === 'contact' && (
                  <button className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Message Input */}
        <div className="px-4 py-4 bg-white border-t border-gray-200">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 px-4 py-3 bg-[#F5F6F7] rounded-full">
              <input
                type="text"
                placeholder="Type your message here..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                className="flex-1 bg-transparent border-0 outline-none text-base text-[#131A13] placeholder-gray-400"
              />
              <div className="flex items-center gap-2">
                <button className="w-10 h-10 flex items-center justify-center bg-white rounded-full hover:bg-gray-50">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>
                <button className="w-10 h-10 flex items-center justify-center bg-white rounded-full hover:bg-gray-50">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                <button className="w-10 h-10 flex items-center justify-center bg-white rounded-full border border-[#00C853] hover:bg-green-50">
                  <svg className="w-5 h-5 text-[#00C853]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </button>
              </div>
            </div>
            <button className="w-[52px] h-[52px] flex items-center justify-center bg-gradient-to-br from-[#00C853] to-[#003305] rounded-full hover:shadow-lg transition-shadow">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Team & Sentiment */}
      <div className="w-[420px] bg-white border-l border-gray-200 flex flex-col">
        {/* Team Section */}
        <div className="p-4">
          <h2 className="text-2xl font-medium text-[#131A13] mb-6">Team Black Rust Corp.</h2>
          
          {/* Actions */}
          <div className="flex items-center gap-2 mb-6 py-5 border-t border-b border-gray-100">
            <button className="flex-1 flex flex-col items-center gap-1 py-2">
              <svg className="w-6 h-6 text-[#131A13]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <span className="text-sm font-medium text-[#131A13]">Add Members</span>
            </button>
            <div className="w-px h-12 bg-gray-200"></div>
            <button className="flex-1 flex flex-col items-center gap-1 py-2">
              <svg className="w-6 h-6 text-[#131A13]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="text-sm font-medium text-[#131A13]">View All</span>
            </button>
          </div>

          {/* Team Members */}
          <div className="space-y-4">
            {teamMembers.map((member) => (
              <div key={member.id} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                <div className="flex-1">
                  <div className="text-base font-medium text-[#131A13]">{member.name}</div>
                  <div className="text-xs text-gray-500">{member.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notes Section */}
        <div className="p-4 mt-auto">
          <div className="bg-[#F5F5F7] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
              <h3 className="text-2xl font-medium text-[#131A13]">Notes</h3>
              <button className="text-sm font-medium text-[#131A13]">View All</button>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[#131A13]">by Sam Hougton</span>
              <div className="flex items-center gap-3">
                <button className="text-blue-600 hover:text-blue-700">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                  </svg>
                </button>
                <button className="text-red-600 hover:text-red-700">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s
            </p>
          </div>
        </div>

        {/* Sentiment Analysis */}
        <div className="p-4">
          <h2 className="text-2xl font-medium text-[#131A13] mb-6">Sentiment Analysis</h2>
          <div className="relative w-36 h-36 mx-auto mb-6">
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-20 h-20 text-[#00C853] opacity-30 blur-[43px]" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
              </svg>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-20 h-20 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Upgrade Button */}
        <div className="p-4">
          <button className="w-full px-6 py-4 bg-gradient-to-br from-[#00C853] to-[#003305] text-white rounded-xl font-semibold hover:shadow-lg transition-shadow flex items-center justify-center gap-2">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            Upgrade to Influencer+
          </button>
        </div>
      </div>
    </div>
  );
}
