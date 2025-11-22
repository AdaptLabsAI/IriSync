'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  Box,
  Chip,
} from '@mui/material';
import { useTeam } from '@/context/TeamContext';
import { Users, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from './button';

export const TeamSwitcher = () => {
  const { currentTeam, teams, switchTeam, loading } = useTeam();
  const router = useRouter();
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    if (currentTeam) {
      setSelectedTeamId(currentTeam.id);
    }
  }, [currentTeam]);

  const handleTeamChange = async (event: SelectChangeEvent<string>) => {
    const teamId = event.target.value;
    if (!teamId || teamId === selectedTeamId) return;

    setIsSwitching(true);
    try {
      await switchTeam(teamId);
      setSelectedTeamId(teamId);
      router.refresh();
    } catch (error) {
      console.error('Failed to switch team', error);
    } finally {
      setIsSwitching(false);
    }
  };

  if (loading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Loading Teams...
      </Button>
    );
  }

  if (teams.length <= 1) {
    return currentTeam ? (
      <div className="flex items-center text-sm px-3 py-1 rounded-md bg-muted">
        <Users className="h-4 w-4 mr-2" />
        <span className="max-w-[150px] truncate">{currentTeam.name}</span>
      </div>
    ) : null;
  }

  return (
    <FormControl variant="outlined" size="sm" sx={{ minWidth: 200 }}>
      <InputLabel id="team-select-label">Team</InputLabel>
      <Select
        labelId="team-select-label"
        id="team-select"
        value={selectedTeamId}
        onChange={handleTeamChange}
        disabled={isSwitching}
        label="Team"
        startAdornment={<Users className="h-4 w-4 mr-2" />}
      >
        {teams.map((team) => (
          <MenuItem key={team.id} value={team.id}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <span className="truncate">{team.name}</span>
              <Chip label={`${team.memberIds.length} members`} size="small" />
            </Box>
          </MenuItem>
        ))}
      </Select>
      {isSwitching && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      )}
    </FormControl>
  );
};
