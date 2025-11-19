'use client';

import React from 'react';
import { DashboardData } from '@/lib/features/dashboard/types';

interface DashboardClientProps {
  data: DashboardData;
  permissionError?: boolean;
  errorMessage?: string;
}

export function DashboardClient({ data, permissionError, errorMessage }: DashboardClientProps) {
  if (permissionError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">{errorMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {data.stats.map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`flex items-center text-sm ${
                stat.increasing ? 'text-green-600' : 'text-red-600'
              }`}>
                <span>{stat.increasing ? '+' : ''}{stat.change}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Platform Metrics */}
      {data.platforms.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Platform Performance</h2>
          <div className="space-y-4">
            {data.platforms.map((platform, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: platform.color }}
                  />
                  <span className="font-medium">{platform.name}</span>
                  <span className="text-sm text-gray-500">
                    {platform.followers.toLocaleString()} followers
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{platform.engagement}% engagement</div>
                  <div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
                    <div
                      className="bg-[#00CC44] h-2 rounded-full"
                      style={{ width: `${platform.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Posts */}
      {data.topPosts.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Top Performing Posts</h2>
          <div className="space-y-4">
            {data.topPosts.map((post) => (
              <div key={post.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                {post.imageUrl && (
                  <img 
                    src={post.imageUrl} 
                    alt={post.title}
                    className="w-12 h-12 rounded object-cover"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-medium">{post.title}</h3>
                  <p className="text-sm text-gray-500">{post.platform}</p>
                </div>
                <div className="text-right text-sm">
                  <div>{post.likes} likes</div>
                  <div>{post.comments} comments</div>
                  <div>{post.shares} shares</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activities */}
      {data.recentActivities.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {data.recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-center space-x-3 p-2">
                <div className="w-8 h-8 bg-[#00FF6A]/10 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-[#00CC44]">
                    {activity.user.name.charAt(0)}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm">{activity.content}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(activity.timestamp).toLocaleDateString()}
                  </p>
                </div>
                {activity.isNew && (
                  <span className="bg-[#00FF6A]/10 text-[#00CC44] text-xs px-2 py-1 rounded-full">
                    New
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Posts */}
      {data.upcomingPosts.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Upcoming Posts</h2>
          <div className="space-y-3">
            {data.upcomingPosts.map((post) => (
              <div key={post.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h3 className="font-medium">{post.title}</h3>
                  <p className="text-sm text-gray-500">{post.platform}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm">{new Date(post.scheduledFor).toLocaleDateString()}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    post.status === 'ready'
                      ? 'bg-[#00FF6A]/10 text-[#00CC44]'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {post.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notifications */}
      {data.notifications.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Notifications</h2>
          <div className="space-y-3">
            {data.notifications.map((notification) => (
              <div 
                key={notification.id} 
                className={`p-3 border-l-4 ${
                  notification.priority === 'high' 
                    ? 'border-red-500 bg-red-50' 
                    : notification.priority === 'medium'
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-blue-500 bg-blue-50'
                }`}
              >
                <h4 className="font-medium">{notification.title}</h4>
                <p className="text-sm text-gray-600">{notification.message}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(notification.time).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 