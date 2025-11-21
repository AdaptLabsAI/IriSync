'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent
} from '@mui/material';
import { useSession } from 'next-auth/react';
import { Button } from './button';
import { Building, ChevronDown, Loader2 } from 'lucide-react';
import { getUserProfile } from '@/lib/features/auth/userProfile';

interface Organization {
  id: string;
  name: string;
  subscriptionTier: string;
  role: string;
}

export const OrganizationSwitcher = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [fetchingOrgs, setFetchingOrgs] = useState<boolean>(true);
  const [switchingOrg, setSwitchingOrg] = useState<boolean>(false);

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!session?.user) return;
      
      try {
        const userProfile = await getUserProfile(session.user.id);
        setProfile(userProfile);
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
      } finally {
        setLoading(false);
      }
    };

    if (session?.user) {
      fetchProfile();
    }
  }, [session]);

  // Fetch user's organizations
  useEffect(() => {
    const fetchOrganizations = async () => {
      if (!session?.user) return;

      try {
        const response = await fetch('/api/settings/organizations/user');
        if (response.ok) {
          const data = await response.json();
          setOrganizations(data.organizations || []);
          
          // If user has a current organization, select it
          if (profile?.organizationId && data.organizations.some((org: Organization) => org.id === profile.organizationId)) {
            setSelectedOrgId(profile.organizationId);
          } else if (data.organizations.length > 0) {
            // Otherwise select the first one
            setSelectedOrgId(data.organizations[0].id);
          }
        }
      } catch (error) {
        console.error('Failed to fetch organizations:', error);
      } finally {
        setFetchingOrgs(false);
      }
    };

    if (session?.user && !loading) {
      fetchOrganizations();
    }
  }, [session, profile, loading]);

  // Handle organization change
  const handleOrgChange = async (event: SelectChangeEvent<string>) => {
    const orgId = event.target.value;
    if (!orgId || orgId === selectedOrgId) return;
    
    setSwitchingOrg(true);
    try {
      const response = await fetch('/api/settings/organizations/switch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ organizationId: orgId }),
      });

      if (response.ok) {
        setSelectedOrgId(orgId);
        // Refresh the page to update the context
        router.refresh();
      } else {
        console.error('Failed to switch organization');
      }
    } catch (error) {
      console.error('Error switching organization:', error);
    } finally {
      setSwitchingOrg(false);
    }
  };

  if (fetchingOrgs || loading) {
    return (
      <Button variant="outline" size="small" disabled>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Loading...
      </Button>
    );
  }

  if (organizations.length <= 1) {
    // If user has only one or no organizations, just show the name
    return profile?.organizationId ? (
      <div className="flex items-center text-sm px-3 py-1 rounded-md bg-muted">
        <Building className="h-4 w-4 mr-2" />
        <span className="max-w-[150px] truncate">
          {organizations.find(org => org.id === profile.organizationId)?.name || 'Personal Account'}
        </span>
      </div>
    ) : null;
  }

  return (
    <FormControl variant="outlined" size="small" sx={{ minWidth: 200 }}>
      <InputLabel id="org-select-label">Organization</InputLabel>
      <Select
        labelId="org-select-label"
        id="org-select"
        value={selectedOrgId}
        onChange={handleOrgChange}
        disabled={switchingOrg}
        label="Organization"
        startAdornment={<Building className="h-4 w-4 mr-2" />}
      >
        {organizations.map((org) => (
          <MenuItem key={org.id} value={org.id}>
            <div className="flex justify-between w-full items-center">
              <div className="flex-1 truncate">{org.name}</div>
              <div className="text-xs opacity-70 ml-2">
                {org.subscriptionTier.charAt(0).toUpperCase() + org.subscriptionTier.slice(1)}
              </div>
            </div>
          </MenuItem>
        ))}
      </Select>
      {switchingOrg && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      )}
    </FormControl>
  );
}; 