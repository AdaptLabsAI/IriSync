"use client";

import React, { useState } from 'react';
import Image from 'next/image';

export default function ProfilePage() {
  const [autoRenew, setAutoRenew] = useState(true);

  const socialAccounts = [
    {
      platform: "WhatsApp Business",
      handle: "+1 23 456 7890",
      icon: "whatsapp",
      color: "bg-green-500",
      connected: true,
    },
    {
      platform: "Telegram for business",
      handle: "+1 23 456 7890",
      icon: "telegram",
      color: "bg-blue-500",
      connected: true,
    },
    {
      platform: "Instagram",
      handle: "@weareblackrust",
      icon: "instagram",
      color: "bg-pink-500",
      connected: true,
    },
    {
      platform: "x",
      handle: "@weareblackrust",
      icon: "x",
      color: "bg-black",
      connected: false,
    },
    {
      platform: "LinkedIn",
      handle: "@weareblackrust",
      icon: "linkedin",
      color: "bg-blue-600",
      connected: false,
    },
  ];

  const teamMembers = [
    { name: "Mike Anderson", role: "Admin • Manager", avatar: "/images/profile3.png" },
    { name: "Kristin Watson", role: "Admin • Manager", avatar: "/images/profile3.png" },
    { name: "Darrell Steward", role: "Team Member", avatar: "/images/profile3.png" },
    { name: "Annette Black", role: "Team Member", avatar: "/images/profile3.png" },
    { name: "Jannie Cooper", role: "Team Member", avatar: "/images/profile3.png" },
    { name: "Devon Lane", role: "Team Member", avatar: "/images/profile3.png" },
    { name: "Darlene Robertson", role: "Team Member", avatar: "/images/profile3.png" },
  ];

  const actionsRequired = [
    {
      message: "Few leads require urgent attention. Check it out",
      channel: "WhatsApp",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F5F5F7] font-['Inter']">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6 flex items-center justify-between">
        <h1 className="text-2xl font-medium text-[#131A13]">My Profile</h1>
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

      {/* Main Content */}
      <div className="p-8 grid grid-cols-12 gap-8">
        {/* Left Column */}
        <div className="col-span-4 space-y-8">
          {/* Profile Card */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <div className="h-[420px] relative">
              <div className="absolute top-4 right-4 px-3 py-1.5 bg-white rounded-full">
                <span className="text-xs font-semibold text-[#131A13] uppercase">Creator</span>
              </div>
              <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300"></div>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-4xl font-semibold text-[#131A13]">Sophia</h2>
                    <h2 className="text-4xl font-light text-[#131A13]">Adam</h2>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-2 py-1 bg-yellow-50 rounded-full">
                  <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  <span className="text-sm font-semibold text-[#131A13]">8090</span>
                  <button>
                    <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3z"/>
                    </svg>
                  </button>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm">CEO at</span>
                  <span className="text-sm font-medium text-[#131A13]">Black Rust Corp.</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm text-gray-500">sophia@blackrustcorp.com</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button className="flex-1 py-3 px-4 bg-white border border-gray-200 rounded-xl font-medium text-[#131A13] hover:bg-gray-50 flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Profile
                </button>
                <button className="flex-1 py-3 px-6 bg-gradient-to-br from-[#00C853] to-[#003305] text-white rounded-xl font-semibold hover:shadow-lg transition-shadow flex items-center justify-center gap-2">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                  Upgrade Now
                </button>
              </div>
            </div>
          </div>

          {/* Actions Required */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-medium text-[#131A13]">Actions Required</h3>
              <div className="flex items-center gap-4">
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <svg className="w-6 h-6 rotate-180" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                  </svg>
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                  </svg>
                </button>
              </div>
            </div>
            {actionsRequired.map((action, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-2.5 h-2.5 bg-red-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-base font-medium text-[#131A13] mb-1">{action.message}</p>
                  <p className="text-sm text-gray-500">Channel : {action.channel}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Middle Column */}
        <div className="col-span-4 space-y-8">
          {/* Company Card */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <div className="h-40 bg-gradient-to-r from-blue-500 to-purple-600 relative">
              <div className="absolute -bottom-12 left-6">
                <div className="w-30 h-30 bg-[#F5F5F7] rounded-full p-3">
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-16 h-16 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V5c0-1.1-.89-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-16 px-6 pb-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-medium text-[#131A13] mb-1">Black Rust Corp.</h3>
                  <p className="text-base text-gray-500">IT Company</p>
                </div>
                <button className="p-3 bg-white border border-gray-200 rounded-full hover:bg-gray-50">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500 mb-1">Head Office</p>
                  <p className="text-base font-medium text-[#131A13]">New York, United States</p>
                </div>
                <div className="text-center border-l border-r border-gray-200">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500 mb-1">Email</p>
                  <p className="text-base font-medium text-[#131A13]">contact@blackrustcorp.com</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500 mb-1">Phone</p>
                  <p className="text-base font-medium text-[#131A13]">+1 23 456 7890</p>
                </div>
              </div>
            </div>
          </div>

          {/* Team Section */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-medium text-[#131A13] mb-1">Team Black Rust Corp.</h3>
                <p className="text-base text-gray-500">3 Admin</p>
              </div>
              <button className="p-3 bg-white border border-gray-200 rounded-full hover:bg-gray-50">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {teamMembers.map((member, index) => (
                <div key={index} className="flex items-center gap-3 pb-4 border-b border-gray-100 last:border-0">
                  <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                  <div className="flex-1">
                    <div className="text-base font-medium text-[#131A13]">{member.name}</div>
                    <div className="text-xs text-gray-500">{member.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="col-span-4 space-y-8">
          {/* Social Accounts */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-medium text-[#131A13]">Social Accounts</h3>
              <button className="flex items-center gap-1 text-sm font-medium text-[#131A13] underline">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                Connect more
              </button>
            </div>

            <div className="space-y-4">
              {socialAccounts.map((account, index) => (
                <div key={index} className="flex items-center justify-between pb-4 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${account.color} rounded-lg flex items-center justify-center`}>
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-[#131A13]">{account.handle}</div>
                      <div className="text-xs text-gray-500">{account.platform}</div>
                    </div>
                  </div>
                  <button className={`px-3 py-2 rounded-lg text-sm font-medium ${
                    account.connected
                      ? "bg-gray-100 text-[#131A13] border border-gray-200"
                      : "bg-green-50 text-[#00C853] border border-green-200"
                  }`}>
                    {account.connected ? "Disconnect" : "Connect"}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Billing Info */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="text-2xl font-medium text-[#131A13] mb-6">Billing Info</h3>
            
            {/* Current Plan */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-16 h-16 bg-white shadow-lg rounded-full"></div>
                <div className="w-7 h-7 bg-yellow-400 rounded-full"></div>
                <div className="w-16 h-16 bg-white/10 backdrop-blur-xl border border-yellow-100 rounded-full"></div>
              </div>
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-lg font-medium text-[#131A13]">Creator</span>
                  <button className="px-3 py-2 bg-white border border-[#00C853] text-[#00C853] rounded-lg text-xs font-semibold uppercase">
                    upgrade now
                  </button>
                </div>
                <p className="text-sm text-gray-500">Expires on 30 Jun 2025</p>
              </div>
            </div>

            {/* Billing Details */}
            <div className="bg-[#F5F5F7] rounded-2xl overflow-hidden">
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Base Price</span>
                  <span className="text-sm font-medium text-[#131A13]">$30.00</span>
                </div>
                <div className="h-px bg-gray-200"></div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Tax</span>
                  <span className="text-sm font-medium text-[#131A13]">$01.80</span>
                </div>
                <div className="h-px bg-gray-200"></div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Discount</span>
                  <span className="text-sm font-medium text-[#131A13]">$00.00</span>
                </div>
              </div>
              <div className="px-4 py-4 bg-green-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Total Paid</span>
                  <span className="text-sm font-medium text-[#131A13]">$31.80</span>
                </div>
              </div>
            </div>

            {/* Auto Renew */}
            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={autoRenew}
                  onChange={() => setAutoRenew(!autoRenew)}
                  className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                />
                <span className="text-sm font-medium text-[#131A13]">Auto renew - Never miss a beat</span>
              </div>
              <button className="flex items-center gap-2 text-sm font-medium text-[#131A13] underline">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Invoice
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
