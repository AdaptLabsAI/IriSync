'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getFirebaseFirestore } from '@/lib/core/firebase';
import { firestore } from '@/lib/core/firebase/client';
import { Organization, Team } from '@/lib/core/models/Organization';
import { logger } from '@/lib/core/logging/logger';

interface TeamContextType {
  currentTeam: Team | null;
  teams: Team[];
  switchTeam: (teamId: string) => Promise<void>;
  loading: boolean;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export const TeamProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, organization } = useAuth();
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeams = async () => {
      if (user && organization) {
        setLoading(true);
        try {
          const firestore = getFirebaseFirestore();

          if (!firestore) { console.error('Firestore not configured'); return; }

          const orgDocRef = doc(firestore, 'organizations', organization.id);
          const orgDoc = await getDoc(orgDocRef);

          if (orgDoc.exists()) {
            const orgData = orgDoc.data() as Organization;
            const userTeams = orgData.teams.filter(team => team.memberIds.includes(user.uid));
            setTeams(userTeams);

            if (user.currentTeamId && userTeams.some((team: any) => team.id === user.currentTeamId)) {
              setCurrentTeam(userTeams.find((team: any) => team.id === user.currentTeamId) || null);
            } else if (userTeams.length > 0) {
              setCurrentTeam(userTeams[0]);
              if (user.uid) {
                const firestore = getFirebaseFirestore();

                if (!firestore) { console.error('Firestore not configured'); return; }

                const userDocRef = doc(firestore, 'users', user.uid);
                await updateDoc(userDocRef, { currentTeamId: userTeams[0].id });
              }
            } else {
              setCurrentTeam(null);
            }
          }
        } catch (error) {
          logger.error('Failed to fetch teams:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchTeams();
  }, [user, organization]);

  const switchTeam = async (teamId: string) => {
    if (user && teams.some(team => team.id === teamId)) {
      setLoading(true);
      try {
        const firestore = getFirebaseFirestore();

        if (!firestore) { console.error('Firestore not configured'); return; }

        const userDocRef = doc(firestore, 'users', user.uid);
        await updateDoc(userDocRef, { currentTeamId: teamId });
        setCurrentTeam(teams.find(team => team.id === teamId) || null);
      } catch (error) {
        logger.error('Failed to switch team:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <TeamContext.Provider value={{ currentTeam, teams, switchTeam, loading }}>
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
