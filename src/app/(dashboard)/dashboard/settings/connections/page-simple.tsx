'use client';

import { useEffect, useState } from 'react';
import { getFirebaseClientAuth } from '@/lib/core/firebase/client';
import { getFirebaseFirestore } from '@/lib/core/firebase/client';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

const SOCIAL_PLATFORMS = [
  { id: 'twitter', name: 'Twitter/X', icon: '𝕏', color: 'bg-black' },
  { id: 'facebook', name: 'Facebook', icon: 'f', color: 'bg-blue-600' },
  { id: 'instagram', name: 'Instagram', icon: 'IG', color: 'bg-pink-500' },
  { id: 'linkedin', name: 'LinkedIn', icon: 'in', color: 'bg-blue-700' },
  { id: 'youtube', name: 'YouTube', icon: 'YT', color: 'bg-red-600' },
  { id: 'tiktok', name: 'TikTok', icon: 'TT', color: 'bg-black' },
];

interface Connection {
  platform: string;
  connected: boolean;
  handle?: string;
  connectedAt?: string;
}

export default function ConnectionsPage() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const auth = getFirebaseClientAuth();
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        await loadConnections(currentUser.uid);
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loadConnections = async (userId: string) => {
    try {
      const firestore = getFirebaseFirestore();
      if (!firestore) {
        setLoading(false);
        return;
      }

      const connectionsDoc = await getDoc(doc(firestore, 'userConnections', userId));

      if (connectionsDoc.exists()) {
        setConnections(connectionsDoc.data().platforms || []);
      } else {
        // Initialize with default platforms
        const defaultConnections = SOCIAL_PLATFORMS.map(platform => ({
          platform: platform.id,
          connected: false
        }));
        setConnections(defaultConnections);
      }
    } catch (error) {
      console.error('Error loading connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleConnection = async (platformId: string) => {
    if (!user) return;

    const connection = connections.find(c => c.platform === platformId);
    const isConnecting = !connection?.connected;

    if (isConnecting) {
      // Prompt for handle
      const handle = prompt(`Enter your ${platformId} handle/username:`);
      if (!handle) return;

      setSaving(true);

      try {
        const firestore = getFirebaseFirestore();
        if (!firestore) return;

        const updatedConnections = connections.map(c =>
          c.platform === platformId
            ? { ...c, connected: true, handle, connectedAt: new Date().toISOString() }
            : c
        );

        // Add platform if it doesn't exist
        if (!connection) {
          updatedConnections.push({
            platform: platformId,
            connected: true,
            handle,
            connectedAt: new Date().toISOString()
          });
        }

        await setDoc(doc(firestore, 'userConnections', user.uid), {
          platforms: updatedConnections,
          updatedAt: new Date().toISOString()
        });

        setConnections(updatedConnections);
      } catch (error) {
        console.error('Error saving connection:', error);
        alert('Failed to save connection');
      } finally {
        setSaving(false);
      }
    } else {
      // Disconnect
      if (!confirm(`Disconnect from ${platformId}?`)) return;

      setSaving(true);

      try {
        const firestore = getFirebaseFirestore();
        if (!firestore) return;

        const updatedConnections = connections.map(c =>
          c.platform === platformId
            ? { ...c, connected: false, handle: undefined, connectedAt: undefined }
            : c
        );

        await updateDoc(doc(firestore, 'userConnections', user.uid), {
          platforms: updatedConnections,
          updatedAt: new Date().toISOString()
        });

        setConnections(updatedConnections);
      } catch (error) {
        console.error('Error disconnecting:', error);
        alert('Failed to disconnect');
      } finally {
        setSaving(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00CC44]"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Not Logged In</h2>
          <p className="text-gray-600">Please log in to manage connections.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Connections</h1>
          <p className="text-sm text-gray-600">Manage your social media platform connections</p>
        </div>

        {/* Info Alert */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-blue-900 mb-1">Manual Connection Mode</h3>
          <p className="text-sm text-blue-800">
            Enter your social media handles to track which platforms you're using.
            Full OAuth integrations will be available in a future update.
          </p>
        </div>

        {/* Connections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SOCIAL_PLATFORMS.map(platform => {
            const connection = connections.find(c => c.platform === platform.id);
            const isConnected = connection?.connected || false;

            return (
              <div key={platform.id} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 ${platform.color} rounded-lg flex items-center justify-center text-white font-bold text-lg`}>
                      {platform.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{platform.name}</h3>
                      {isConnected && connection?.handle && (
                        <p className="text-sm text-gray-600">@{connection.handle}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleConnection(platform.id)}
                    disabled={saving}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                      isConnected
                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        : 'bg-[#00CC44] text-white hover:bg-[#00AA33]'
                    }`}
                  >
                    {isConnected ? 'Disconnect' : 'Connect'}
                  </button>
                </div>

                {isConnected && connection?.connectedAt && (
                  <div className="text-xs text-gray-500">
                    Connected {new Date(connection.connectedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Stats */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Connection Summary</h3>
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-[#00CC44]">
                {connections.filter(c => c.connected).length}
              </div>
              <div className="text-sm text-gray-600 mt-1">Connected</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-400">
                {SOCIAL_PLATFORMS.length - connections.filter(c => c.connected).length}
              </div>
              <div className="text-sm text-gray-600 mt-1">Available</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600">
                {SOCIAL_PLATFORMS.length}
              </div>
              <div className="text-sm text-gray-600 mt-1">Total Platforms</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
