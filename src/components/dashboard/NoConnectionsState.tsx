"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Link2, Instagram, Facebook, Twitter, Linkedin, Youtube } from 'lucide-react';

interface NoConnectionsStateProps {
  title?: string;
  description?: string;
  showPlatformIcons?: boolean;
}

export default function NoConnectionsState({
  title = "Connect Your Social Media Accounts",
  description = "To view analytics and manage your content, please connect at least one social media platform.",
  showPlatformIcons = true,
}: NoConnectionsStateProps) {
  const router = useRouter();

  const platforms = [
    { name: 'Instagram', icon: Instagram, color: 'text-pink-500' },
    { name: 'Facebook', icon: Facebook, color: 'text-blue-600' },
    { name: 'Twitter', icon: Twitter, color: 'text-blue-400' },
    { name: 'LinkedIn', icon: Linkedin, color: 'text-blue-700' },
    { name: 'YouTube', icon: Youtube, color: 'text-red-600' },
  ];

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-sm p-12 text-center">
        {/* Icon */}
        <div className="w-20 h-20 bg-[#00FF6A]/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Link2 className="w-10 h-10 text-[#00CC44]" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-semibold text-[#131A13] mb-3">
          {title}
        </h2>

        {/* Description */}
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          {description}
        </p>

        {/* Platform Icons */}
        {showPlatformIcons && (
          <div className="flex items-center justify-center gap-4 mb-8">
            {platforms.map((platform) => (
              <div
                key={platform.name}
                className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                title={platform.name}
              >
                <platform.icon className={`w-6 h-6 ${platform.color}`} />
              </div>
            ))}
          </div>
        )}

        {/* CTA Button */}
        <button
          onClick={() => router.push('/dashboard/settings/connections')}
          className="px-8 py-3 bg-[#00CC44] text-white rounded-full font-medium hover:bg-[#00AA33] transition-colors inline-flex items-center gap-2"
        >
          <Link2 className="w-5 h-5" />
          Connect Platforms
        </button>

        {/* Helper Text */}
        <p className="text-sm text-gray-500 mt-6">
          You can connect multiple platforms in{' '}
          <button
            onClick={() => router.push('/dashboard/settings/connections')}
            className="text-[#00CC44] hover:text-[#00AA33] font-medium underline"
          >
            Settings → Connections
          </button>
        </p>
      </div>
    </div>
  );
}
