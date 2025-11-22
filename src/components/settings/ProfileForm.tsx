'use client';

import React, { useState, useEffect } from 'react';
import { Box, Button, TextField, Typography, Alert, CircularProgress, Stack, Divider } from '@mui/material';
import Grid from '@/components/ui/grid';
import { FileUpload } from '@/components/ui/fileupload/FileUpload';
import Avatar from '@mui/material/Avatar';
import { getAuth, updateProfile } from 'firebase/auth';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseFirestore, firestore } from '@/lib/core/firebase';
import { useSession } from 'next-auth/react';

export default function ProfileForm() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState({
    name: session?.user?.name || '',
    firstName: '',
    lastName: '',
    avatar: session?.user?.image || '',
    email: session?.user?.email || '',
    company: '',
    jobTitle: '',
    bio: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Fetch user profile data on component mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const auth = getAuth();
        const currentUser = auth.currentUser;
        
        if (!currentUser) {
          setError('User not authenticated');
          setLoading(false);
          return;
        }
        
        if (!firestore) {
          setError('Firestore not initialized');
          setLoading(false);
          return;
        }
        
        // Get user data from Firestore
        const firestore = getFirebaseFirestore();

        if (!firestore) { console.error('Firestore not configured'); return; }

        const userRef = doc(firestore, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          
          setProfile({
            name: userData.name || currentUser.displayName || '',
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            avatar: userData.photoURL || currentUser.photoURL || '',
            email: currentUser.email || userData.email || '',
            company: userData.company || '',
            jobTitle: userData.jobTitle || '',
            bio: userData.bio || '',
          });
        } else {
          // Use basic data from Firebase Auth if no Firestore profile
          setProfile({
            name: currentUser.displayName || '',
            firstName: '',
            lastName: '',
            avatar: currentUser.photoURL || '',
            email: currentUser.email || '',
            company: '',
            jobTitle: '',
            bio: '',
          });
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setError('Failed to load profile information');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserProfile();
  }, []);
  
  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    try {
      setSaving(true);
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser || !firestore) {
        throw new Error('User not authenticated or Firestore not initialized');
      }
      
      // Update Firebase Auth profile
      await updateProfile(currentUser, {
        displayName: profile.name,
        photoURL: profile.avatar
      });
      
      // Update Firestore profile
      const firestore = getFirebaseFirestore();

      if (!firestore) { console.error('Firestore not configured'); return; }

      const userRef = doc(firestore, 'users', currentUser.uid);
      await updateDoc(userRef, {
        name: profile.name,
        firstName: profile.firstName,
        lastName: profile.lastName,
        photoURL: profile.avatar,
        company: profile.company,
        jobTitle: profile.jobTitle,
        bio: profile.bio,
        updatedAt: serverTimestamp()
      });
      
      setSuccess('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile information');
    } finally {
      setSaving(false);
    }
  };
  
  // Handle avatar upload
  const handleAvatarUpload = async (files: File[]) => {
    if (files.length === 0) return;
    
    // In a real app, implement file upload to storage
    // For now, just create a local blob URL for preview
    const file = files[0];
    const imageUrl = URL.createObjectURL(file);
    setProfile((prev) => ({ ...prev, avatar: imageUrl }));
  };
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      {success && <Alert severity="success" sx={{ mb: 2 }}>Profile updated successfully!</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            required
            fullWidth
            id="name"
            label="Full Name"
            name="name"
            value={profile.name}
            onChange={handleChange}
            disabled={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            type="email"
            value={profile.email}
            onChange={handleChange}
            disabled={loading || Boolean(session?.user?.email)}
            helperText={session?.user?.email ? "Email can't be changed" : ""}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            id="company"
            label="Company"
            name="company"
            value={profile.company}
            onChange={handleChange}
            disabled={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            id="jobTitle"
            label="Job Title"
            name="jobTitle"
            value={profile.jobTitle}
            onChange={handleChange}
            disabled={loading}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            id="bio"
            label="Bio"
            name="bio"
            multiline
            rows={4}
            value={profile.bio}
            onChange={handleChange}
            disabled={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar src={profile.avatar} alt={profile.name} sx={{ width: 64, height: 64 }} />
            <FileUpload
              onFileSelect={handleAvatarUpload}
              accept="image/*"
              maxSize={2 * 1024 * 1024}
              multiple={false}
              label="Change Avatar"
              buttonText="Upload"
              showPreview={false}
            />
          </Box>
        </Grid>
        <Grid item xs={12}>
          <Button
            type="submit"
            variant="primary"
            color="primary"
            disabled={loading}
            sx={{ mt: 1 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Save Changes'}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
} 