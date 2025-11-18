"use client";

import React, { useState, useEffect } from 'react';
import NoConnectionsState from '@/components/dashboard/NoConnectionsState';
import LoadingState from '@/components/dashboard/LoadingState';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  DollarSign,
  Calendar,
  BarChart3,
} from 'lucide-react';

export default function CampaignsPage() {
  const [hasConnections, setHasConnections] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);

  useEffect(() => {
    async function checkPlatformConnections() {
      try {
        const response = await fetch('/api/platforms/status');

        if (!response.ok) {
          throw new Error('Failed to check platform connections');
        }

        const data = await response.json();
        setHasConnections(data.hasAnyConnection || false);

        // If connected, load campaigns
        if (data.hasAnyConnection) {
          loadCampaigns();
        }
      } catch (err) {
        console.error('Error checking platform connections:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        // Default to showing content if there's an error checking
        setHasConnections(true);
        loadCampaigns();
      } finally {
        setLoading(false);
      }
    }

    checkPlatformConnections();
  }, []);

  async function loadCampaigns() {
    try {
      setLoadingCampaigns(true);
      const response = await fetch('/api/campaigns?limit=10');

      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.campaigns || []);
      }
    } catch (err) {
      console.error('Error loading campaigns:', err);
    } finally {
      setLoadingCampaigns(false);
    }
  }

  // Show loading state while checking connections
  if (loading) {
    return <LoadingState message="Loading campaigns..." />;
  }

  // Show no connections state if no platforms are connected
  if (!hasConnections && !error) {
    return (
      <NoConnectionsState
        title="Connect Platforms to Create Campaigns"
        description="Campaign management requires connected social media accounts. Connect your platforms to start creating and managing multi-post marketing campaigns."
        showPlatformIcons={true}
      />
    );
  }

  // Show campaigns content when platforms are connected
  return (
    <div className="min-h-screen bg-[#F5F5F7] font-['Inter']">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-medium text-[#131A13]">Campaigns</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage your multi-post marketing campaigns
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button className="px-6 py-2.5 bg-green-600 text-white rounded-full font-medium hover:bg-green-700 transition-colors inline-flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Create Campaign
            </button>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search campaigns..."
                className="pl-10 pr-4 py-2 bg-[#F5F5F7] border-0 rounded-2xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 w-80"
              />
            </div>
            <button className="px-4 py-2 bg-[#F5F5F7] rounded-2xl text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors inline-flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filter
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <Target className="w-6 h-6 text-gray-400" />
              <div className="flex items-center gap-1 text-sm font-medium text-green-600">
                <TrendingUp className="w-4 h-4" />
                +12%
              </div>
            </div>
            <div className="text-3xl font-semibold text-[#131A13] mb-1">
              {campaigns.length}
            </div>
            <div className="text-sm text-gray-500">Active Campaigns</div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-6 h-6 text-gray-400" />
              <div className="flex items-center gap-1 text-sm font-medium text-green-600">
                <TrendingUp className="w-4 h-4" />
                +18%
              </div>
            </div>
            <div className="text-3xl font-semibold text-[#131A13] mb-1">245K</div>
            <div className="text-sm text-gray-500">Total Reach</div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <BarChart3 className="w-6 h-6 text-gray-400" />
              <div className="flex items-center gap-1 text-sm font-medium text-green-600">
                <TrendingUp className="w-4 h-4" />
                +8%
              </div>
            </div>
            <div className="text-3xl font-semibold text-[#131A13] mb-1">3.2%</div>
            <div className="text-sm text-gray-500">Avg Engagement</div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="w-6 h-6 text-gray-400" />
              <div className="flex items-center gap-1 text-sm font-medium text-red-600">
                <TrendingDown className="w-4 h-4" />
                -5%
              </div>
            </div>
            <div className="text-3xl font-semibold text-[#131A13] mb-1">$2.4K</div>
            <div className="text-sm text-gray-500">Total Spend</div>
          </div>
        </div>

        {/* Campaigns List */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-[#131A13]">All Campaigns</h2>
          </div>

          {loadingCampaigns ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-green-600 rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-gray-500 text-sm">Loading campaigns...</p>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No campaigns yet
              </h3>
              <p className="text-gray-500 mb-6">
                Create your first campaign to start tracking multi-post performance
              </p>
              <button className="px-6 py-2.5 bg-green-600 text-white rounded-full font-medium hover:bg-green-700 transition-colors inline-flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Create Your First Campaign
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-base font-semibold text-gray-900">
                          {campaign.name}
                        </h3>
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          {campaign.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        {campaign.description || 'No description'}
                      </p>
                      <div className="flex items-center gap-6 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {campaign.startDate
                              ? new Date(campaign.startDate).toLocaleDateString()
                              : 'No start date'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Target className="w-4 h-4" />
                          <span>{campaign.posts?.length || 0} posts</span>
                        </div>
                        {campaign.metrics && (
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{campaign.metrics.totalReach?.toLocaleString() || 0} reach</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <MoreVertical className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
