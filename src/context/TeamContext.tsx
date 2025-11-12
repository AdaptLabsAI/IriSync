'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { OrganizationRole, TeamRole } from '../lib/user/types';

interface TeamMembership {
  teamId: string;
  teamName: string;
  organizationId: string;
  organizationName: string;
  organizationRole: OrganizationRole;
  teamRole?: TeamRole;
  joinedAt: string;
  isActive: boolean;
  permissions: string[];
}

interface TeamContextType {
  // Current team context
  currentTeam: TeamMembership | null;
  currentTeamId: string | null;
  currentOrganizationId: string | null;
  
  // All user's team memberships
  teams: TeamMembership[];
  
  // Loading states
  loading: boolean;
  switching: boolean;
  
  // Actions
  switchTeam: (teamId: string) => Promise<void>;
  refreshTeams: () => Promise<void>;
  
  // Permissions for current team
  canCreateContent: boolean;
  canManageTeam: boolean;
  canViewAnalytics: boolean;
  canManageSettings: boolean;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export const TeamProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  
  const [currentTeam, setCurrentTeam] = useState<TeamMembership | null>(null);
  const [teams, setTeams] = useState<TeamMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  // Load teams and set initial team context
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      loadUserTeams();
    } else if (status === 'unauthenticated') {
      setCurrentTeam(null);
      setTeams([]);
      setLoading(false);
    }
  }, [session, status]);

  // Handle URL-based team context
  useEffect(() => {
    if (teams.length > 0 && pathname) {
      const teamIdFromUrl = extractTeamIdFromPath(pathname);
      if (teamIdFromUrl && teamIdFromUrl !== currentTeam?.teamId) {
        const team = teams.find(t => t.teamId === teamIdFromUrl);
        if (team) {
          setCurrentTeam(team);
          localStorage.setItem('currentTeamId', team.teamId);
        }
      }
    }
  }, [pathname, teams, currentTeam]);

  const loadUserTeams = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/settings/teams/memberships');
      if (!response.ok) {
        throw new Error('Failed to load team memberships');
      }
      
      const data = await response.json();
      const userTeams = data.teams || [];
      
      setTeams(userTeams);
      
      // Set current team from localStorage or default to first team
      const savedTeamId = localStorage.getItem('currentTeamId');
      let initialTeam = null;
      
      if (savedTeamId) {
        initialTeam = userTeams.find((t: TeamMembership) => t.teamId === savedTeamId);
      }
      
      if (!initialTeam && userTeams.length > 0) {
        initialTeam = userTeams[0];
      }
      
      if (initialTeam) {
        setCurrentTeam(initialTeam);
        localStorage.setItem('currentTeamId', initialTeam.teamId);
      }
      
    } catch (error) {
      console.error('Error loading user teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const switchTeam = async (teamId: string) => {
    if (switching || teamId === currentTeam?.teamId) return;
    
    try {
      setSwitching(true);
      
      const team = teams.find(t => t.teamId === teamId);
      if (!team) {
        throw new Error('Team not found');
      }
      
      // Update current team
      setCurrentTeam(team);
      localStorage.setItem('currentTeamId', teamId);
      
      // Navigate to team-specific dashboard if not already there
      if (!pathname.includes(`/dashboard/${teamId}`)) {
        router.push(`/dashboard/${teamId}`);
      }
      
    } catch (error) {
      console.error('Error switching team:', error);
    } finally {
      setSwitching(false);
    }
  };

  const refreshTeams = async () => {
    await loadUserTeams();
  };

  // Extract team ID from URL path
  const extractTeamIdFromPath = (path: string): string | null => {
    const dashboardMatch = path.match(/\/dashboard\/([^\/]+)/);
    return dashboardMatch ? dashboardMatch[1] : null;
  };

  // Calculate permissions for current team
  const canCreateContent = React.useMemo(() => {
    if (!currentTeam) return false;
    
    return (
      currentTeam.organizationRole === OrganizationRole.OWNER ||
      currentTeam.organizationRole === OrganizationRole.ORG_ADMIN ||
      (currentTeam.organizationRole === OrganizationRole.MEMBER && 
       currentTeam.teamRole && 
       [TeamRole.TEAM_ADMIN, TeamRole.EDITOR, TeamRole.CONTRIBUTOR].includes(currentTeam.teamRole))
    );
  }, [currentTeam]);

  const canManageTeam = React.useMemo(() => {
    if (!currentTeam) return false;
    
    return (
      currentTeam.organizationRole === OrganizationRole.OWNER ||
      currentTeam.organizationRole === OrganizationRole.ORG_ADMIN ||
      (currentTeam.organizationRole === OrganizationRole.MEMBER && 
       currentTeam.teamRole === TeamRole.TEAM_ADMIN)
    );
  }, [currentTeam]);

  const canViewAnalytics = React.useMemo(() => {
    if (!currentTeam) return false;
    
    return (
      currentTeam.organizationRole === OrganizationRole.OWNER ||
      currentTeam.organizationRole === OrganizationRole.ORG_ADMIN ||
      currentTeam.organizationRole === OrganizationRole.VIEWER ||
      (currentTeam.organizationRole === OrganizationRole.MEMBER && 
       currentTeam.teamRole && 
       [TeamRole.TEAM_ADMIN, TeamRole.EDITOR].includes(currentTeam.teamRole))
    );
  }, [currentTeam]);

  const canManageSettings = React.useMemo(() => {
    if (!currentTeam) return false;
    
    return (
      currentTeam.organizationRole === OrganizationRole.OWNER ||
      currentTeam.organizationRole === OrganizationRole.ORG_ADMIN
    );
  }, [currentTeam]);

  const value: TeamContextType = {
    currentTeam,
    currentTeamId: currentTeam?.teamId || null,
    currentOrganizationId: currentTeam?.organizationId || null,
    teams,
    loading,
    switching,
    switchTeam,
    refreshTeams,
    canCreateContent,
    canManageTeam,
    canViewAnalytics,
    canManageSettings
  };

  return (
    <TeamContext.Provider value={value}>
      {children}
    </TeamContext.Provider>
  );
};

export const useTeam = (): TeamContextType => {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
};

export default TeamContext; 