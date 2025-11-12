'use client';

import React, { useState } from 'react';
import { ChevronDownIcon, CheckIcon, UsersIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { useTeam } from '../../context/TeamContext';
import { OrganizationRole, TeamRole } from '../../lib/user/types';

interface TeamSwitcherProps {
  className?: string;
  showFullName?: boolean;
}

export const TeamSwitcher: React.FC<TeamSwitcherProps> = ({ 
  className = '',
  showFullName = true 
}) => {
  const { 
    currentTeam, 
    teams, 
    switching, 
    switchTeam 
  } = useTeam();
  
  const [isOpen, setIsOpen] = useState(false);

  const handleTeamSwitch = async (teamId: string) => {
    setIsOpen(false);
    await switchTeam(teamId);
  };

  const getRoleBadgeColor = (orgRole: OrganizationRole, teamRole?: TeamRole) => {
    if (orgRole === OrganizationRole.OWNER) return 'bg-purple-100 text-purple-800';
    if (orgRole === OrganizationRole.ORG_ADMIN) return 'bg-red-100 text-red-800';
    if (orgRole === OrganizationRole.VIEWER) return 'bg-gray-100 text-gray-800';
    
    if (teamRole === TeamRole.TEAM_ADMIN) return 'bg-blue-100 text-blue-800';
    if (teamRole === TeamRole.EDITOR) return 'bg-green-100 text-green-800';
    if (teamRole === TeamRole.CONTRIBUTOR) return 'bg-yellow-100 text-yellow-800';
    if (teamRole === TeamRole.OBSERVER) return 'bg-gray-100 text-gray-600';
    
    return 'bg-gray-100 text-gray-600';
  };

  const getRoleDisplayName = (orgRole: OrganizationRole, teamRole?: TeamRole) => {
    if (orgRole === OrganizationRole.OWNER) return 'Owner';
    if (orgRole === OrganizationRole.ORG_ADMIN) return 'Org Admin';
    if (orgRole === OrganizationRole.VIEWER) return 'Viewer';
    
    if (teamRole === TeamRole.TEAM_ADMIN) return 'Team Admin';
    if (teamRole === TeamRole.EDITOR) return 'Editor';
    if (teamRole === TeamRole.CONTRIBUTOR) return 'Contributor';
    if (teamRole === TeamRole.OBSERVER) return 'Observer';
    
    return 'Member';
  };

  if (!currentTeam) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={switching}
        className={`
          flex items-center space-x-3 w-full px-3 py-2 text-left
          bg-white border border-gray-200 rounded-lg shadow-sm
          hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500
          transition-colors duration-200
          ${switching ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <UsersIcon className="w-4 h-4 text-blue-600" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          {showFullName ? (
            <div>
              <p className="text-sm font-medium text-gray-900 truncate">
                {currentTeam.teamName}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {currentTeam.organizationName}
              </p>
            </div>
          ) : (
            <p className="text-sm font-medium text-gray-900 truncate">
              {currentTeam.teamName}
            </p>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <span className={`
            inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
            ${getRoleBadgeColor(currentTeam.organizationRole, currentTeam.teamRole)}
          `}>
            {getRoleDisplayName(currentTeam.organizationRole, currentTeam.teamRole)}
          </span>
          
          <ChevronDownIcon 
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'transform rotate-180' : ''
            }`} 
          />
        </div>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 z-20 w-80 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Your Teams ({teams.length})
              </div>
              
              <div className="space-y-1">
                {teams.map((team) => (
                  <button
                    key={team.teamId}
                    onClick={() => handleTeamSwitch(team.teamId)}
                    className={`
                      w-full flex items-center space-x-3 px-3 py-2 text-left rounded-md
                      transition-colors duration-150
                      ${team.teamId === currentTeam.teamId 
                        ? 'bg-blue-50 text-blue-900' 
                        : 'text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    <div className="flex-shrink-0">
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center
                        ${team.teamId === currentTeam.teamId 
                          ? 'bg-blue-100' 
                          : 'bg-gray-100'
                        }
                      `}>
                        <UsersIcon className={`
                          w-4 h-4 
                          ${team.teamId === currentTeam.teamId 
                            ? 'text-blue-600' 
                            : 'text-gray-600'
                          }
                        `} />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate">
                          {team.teamName}
                        </p>
                        {team.teamId === currentTeam.teamId && (
                          <CheckIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-gray-500 truncate">
                          {team.organizationName}
                        </p>
                        <span className={`
                          inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                          ${getRoleBadgeColor(team.organizationRole, team.teamRole)}
                        `}>
                          {getRoleDisplayName(team.organizationRole, team.teamRole)}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              
              {teams.length === 0 && (
                <div className="px-3 py-8 text-center">
                  <BuildingOfficeIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No teams found</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Contact your administrator to join a team
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TeamSwitcher; 