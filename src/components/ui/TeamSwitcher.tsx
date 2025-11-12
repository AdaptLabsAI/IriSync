'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, CheckIcon, PlusIcon } from '@heroicons/react/24/outline';
import { Button } from './button/Button';
import { Card, CardBody } from './card';
import { Spinner } from './spinner/Spinner';
import { useToast } from './use-toast';
import { OrganizationRole, TeamRole } from '../../lib/user/types';

interface Team {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  memberCount: number;
  userRole: {
    organizationRole: OrganizationRole;
    teamRole?: TeamRole;
  };
  isDefault: boolean;
}

interface TeamSwitcherProps {
  currentTeamId?: string;
  currentOrganizationId: string;
  onTeamChange: (team: Team) => void;
  className?: string;
  showCreateButton?: boolean;
}

export const TeamSwitcher: React.FC<TeamSwitcherProps> = ({
  currentTeamId,
  currentOrganizationId,
  onTeamChange,
  className = '',
  showCreateButton = true
}) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const currentTeam = teams.find(team => team.id === currentTeamId);

  // Fetch user's teams
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/settings/teams?organizationId=${currentOrganizationId}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch teams');
        }
        
        const data = await response.json();
        setTeams(data.teams || []);
        
        // If no current team is set and there are teams, select the default or first team
        if (!currentTeamId && data.teams?.length > 0) {
          const defaultTeam = data.teams.find((t: Team) => t.isDefault) || data.teams[0];
          onTeamChange(defaultTeam);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch teams';
        setError(errorMessage);
        console.error('Error fetching teams:', error);
        
        toast({
          title: "Error loading teams",
          description: errorMessage,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    if (currentOrganizationId) {
      fetchTeams();
    }
  }, [currentOrganizationId, currentTeamId, onTeamChange, toast]);

  const handleTeamSwitch = async (team: Team) => {
    if (team.id === currentTeamId) {
      setIsOpen(false);
      return;
    }

    try {
      setSwitching(true);
      
      // Call API to update user's current team
      const response = await fetch('/api/settings/teams/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: team.id,
          organizationId: currentOrganizationId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to switch teams');
      }

      // Update local state and notify parent
      onTeamChange(team);
      setIsOpen(false);
      
      toast({
        title: "Team switched",
        description: `Switched to ${team.name}`,
        variant: "success"
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to switch teams';
      console.error('Error switching teams:', error);
      
      toast({
        title: "Error switching teams",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setSwitching(false);
    }
  };

  const getRoleDisplay = (team: Team) => {
    if (team.userRole.organizationRole === OrganizationRole.OWNER) {
      return 'Owner';
    }
    if (team.userRole.organizationRole === OrganizationRole.ORG_ADMIN) {
      return 'Org Admin';
    }
    if (team.userRole.teamRole) {
      switch (team.userRole.teamRole) {
        case TeamRole.TEAM_ADMIN:
          return 'Team Admin';
        case TeamRole.EDITOR:
          return 'Editor';
        case TeamRole.CONTRIBUTOR:
          return 'Contributor';
        case TeamRole.OBSERVER:
          return 'Observer';
        default:
          return 'Member';
      }
    }
    return 'Viewer';
  };

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Spinner size="sm" />
        <span className="text-sm text-gray-500">Loading teams...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-sm text-red-600 ${className}`}>
        Error loading teams
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        disabled={switching}
        className="w-full justify-between"
      >
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full" />
          <div className="text-left">
            <div className="font-medium text-sm">
              {currentTeam?.name || 'Select Team'}
            </div>
            {currentTeam && (
              <div className="text-xs text-gray-500">
                {getRoleDisplay(currentTeam)} • {currentTeam.memberCount} members
              </div>
            )}
          </div>
        </div>
        <ChevronDownIcon 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50">
          <Card className="shadow-lg border">
            <CardBody className="p-2">
              <div className="space-y-1">
                {teams.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => handleTeamSwitch(team)}
                    disabled={switching}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      team.id === currentTeamId
                        ? 'bg-blue-50 text-blue-700'
                        : 'hover:bg-gray-50'
                    } ${switching ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          team.isDefault ? 'bg-green-500' : 'bg-blue-500'
                        }`} />
                        <div>
                          <div className="font-medium">{team.name}</div>
                          <div className="text-xs text-gray-500">
                            {getRoleDisplay(team)} • {team.memberCount} members
                          </div>
                        </div>
                      </div>
                      {team.id === currentTeamId && (
                        <CheckIcon className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                  </button>
                ))}
                
                {teams.length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500">
                    No teams available
                  </div>
                )}
                
                {showCreateButton && (
                  <>
                    <div className="border-t my-1" />
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        // Navigate to team creation page
                        window.location.href = '/dashboard/settings/teams/create';
                      }}
                      className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <PlusIcon className="w-4 h-4" />
                      <span>Create new team</span>
                    </button>
                  </>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      )}
      
      {/* Overlay to close dropdown when clicking outside */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default TeamSwitcher; 