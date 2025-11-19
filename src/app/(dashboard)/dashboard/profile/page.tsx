'use client';

import React, { useState, useEffect } from 'react';
import { getFirebaseClientAuth } from '@/lib/core/firebase/client';
import { getFirebaseFirestore } from '@/lib/core/firebase/client';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

interface UserProfile {
  displayName: string;
  email: string;
  company?: string;
  role?: string;
  phone?: string;
  location?: string;
  bio?: string;
  socialAccounts?: {
    platform: string;
    handle: string;
    connected: boolean;
  }[];
}

export default function ProfilePage() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const [formData, setFormData] = useState({
    displayName: '',
    company: '',
    role: '',
    phone: '',
    location: '',
    bio: ''
  });

  useEffect(() => {
    const auth = getFirebaseClientAuth();
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        await loadUserProfile(currentUser.uid);
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      const firestore = getFirebaseFirestore();
      if (!firestore) {
        setLoading(false);
        return;
      }

      const userDoc = await getDoc(doc(firestore, 'users', userId));

      if (userDoc.exists()) {
        const data = userDoc.data() as UserProfile;
        setProfile(data);
        setFormData({
          displayName: data.displayName || '',
          company: data.company || '',
          role: data.role || '',
          phone: data.phone || '',
          location: data.location || '',
          bio: data.bio || ''
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const firestore = getFirebaseFirestore();
      if (!firestore) return;

      const userRef = doc(firestore, 'users', user.uid);

      await updateDoc(userRef, {
        displayName: formData.displayName,
        company: formData.company,
        role: formData.role,
        phone: formData.phone,
        location: formData.location,
        bio: formData.bio
      });

      setProfile({
        ...profile!,
        ...formData
      });

      setEditing(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile');
    } finally {
      setSaving(false);
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
          <p className="text-gray-600">Please log in to view your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">My Profile</h1>
            <p className="text-sm text-gray-600">Manage your personal information and preferences</p>
          </div>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="px-6 py-3 bg-[#00CC44] text-white rounded-lg hover:bg-[#00AA33] transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Profile
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setEditing(false);
                  if (profile) {
                    setFormData({
                      displayName: profile.displayName || '',
                      company: profile.company || '',
                      role: profile.role || '',
                      phone: profile.phone || '',
                      location: profile.location || '',
                      bio: profile.bio || ''
                    });
                  }
                }}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-3 bg-[#00CC44] text-white rounded-lg hover:bg-[#00AA33] transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
          {/* Header Section */}
          <div className="h-32 bg-gradient-to-r from-[#00FF6A] to-[#00CC44]"></div>

          {/* Profile Info */}
          <div className="px-8 pb-8">
            <div className="flex items-end -mt-16 mb-6">
              <div className="w-32 h-32 bg-white rounded-full border-4 border-white shadow-lg flex items-center justify-center text-4xl font-bold text-[#00CC44]">
                {(formData.displayName || user.email || 'U')[0].toUpperCase()}
              </div>
              <div className="ml-6 mb-4">
                <h2 className="text-2xl font-bold text-gray-900">{formData.displayName || 'No name set'}</h2>
                <p className="text-gray-600">{user.email}</p>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00CC44] focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-900 py-3">{formData.displayName || 'Not set'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <p className="text-gray-900 py-3">{user.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00CC44] focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-900 py-3">{formData.company || 'Not set'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00CC44] focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-900 py-3">{formData.role || 'Not set'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                {editing ? (
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00CC44] focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-900 py-3">{formData.phone || 'Not set'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00CC44] focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-900 py-3">{formData.location || 'Not set'}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bio
                </label>
                {editing ? (
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00CC44] focus:border-transparent resize-none"
                  />
                ) : (
                  <p className="text-gray-900 py-3">{formData.bio || 'Not set'}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Account Info */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Email Verified</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                user.emailVerified
                  ? 'bg-[#00FF6A]/10 text-[#00CC44]'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {user.emailVerified ? 'Verified' : 'Not Verified'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">User ID</span>
              <span className="text-gray-900 font-mono text-sm">{user.uid.substring(0, 16)}...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Account Created</span>
              <span className="text-gray-900">{user.metadata.creationTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Last Sign In</span>
              <span className="text-gray-900">{user.metadata.lastSignInTime}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
