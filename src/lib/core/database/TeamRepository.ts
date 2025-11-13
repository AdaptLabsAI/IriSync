import { firestore as adminFirestore } from '../core/firebase/admin';
import { firestore } from '../core/firebase';
import { 
  doc, 
  collection, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  Timestamp, 
  writeBatch
} from 'firebase/firestore';
import { Team, FirestoreTeam } from '../core/models/Organization';

/**
 * Repository for team data in Firestore
 */
export class TeamRepository {
  private readonly organizationsCollection = 'organizations';
  private readonly teamsSubcollection = 'teams';
  
  /**
   * Create a new team within an organization
   * @param orgId Organization ID
   * @param team Team data to create
   * @returns Created team ID
   */
  async createTeam(orgId: string, team: Omit<Team, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      // Create team data with timestamps
      const now = new Date();
      const teamData: FirestoreTeam = {
        name: team.name,
        description: team.description,
        memberIds: team.memberIds || [],
        managers: team.managers || [],
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now)
      };
      
      // Generate a unique ID or use a custom ID generation method
      const orgRef = doc(firestore, this.organizationsCollection, orgId);
      const teamRef = doc(collection(orgRef, this.teamsSubcollection));
      const teamId = teamRef.id;
      
      // Save to Firestore
      await setDoc(teamRef, teamData);
      
      // Also create in Firebase Admin
      await adminFirestore
        .collection(this.organizationsCollection)
        .doc(orgId)
        .collection(this.teamsSubcollection)
        .doc(teamId)
        .set(teamData);
      
      return teamId;
    } catch (error) {
      console.error('Error creating team:', error);
      throw error;
    }
  }
  
  /**
   * Get team by ID
   * @param orgId Organization ID
   * @param teamId Team ID
   * @returns Team or null if not found
   */
  async getTeamById(orgId: string, teamId: string): Promise<Team | null> {
    try {
      const orgRef = doc(firestore, this.organizationsCollection, orgId);
      const teamSnapshot = await getDoc(doc(collection(orgRef, this.teamsSubcollection), teamId));
      
      if (!teamSnapshot.exists()) {
        return null;
      }
      
      const teamData = teamSnapshot.data() as FirestoreTeam;
      
      return {
        id: teamSnapshot.id,
        name: teamData.name,
        description: teamData.description,
        memberIds: teamData.memberIds || [],
        managers: teamData.managers || [],
        createdAt: teamData.createdAt,
        updatedAt: teamData.updatedAt
      };
    } catch (error) {
      console.error('Error getting team:', error);
      throw error;
    }
  }
  
  /**
   * Get all teams for an organization
   * @param orgId Organization ID
   * @returns Array of teams
   */
  async getTeamsByOrganization(orgId: string): Promise<Team[]> {
    try {
      const orgRef = doc(firestore, this.organizationsCollection, orgId);
      const teamsSnapshot = await getDocs(collection(orgRef, this.teamsSubcollection));
      
      return teamsSnapshot.docs.map(doc => {
        const teamData = doc.data() as FirestoreTeam;
        
        return {
          id: doc.id,
          name: teamData.name,
          description: teamData.description,
          memberIds: teamData.memberIds || [],
          managers: teamData.managers || [],
          createdAt: teamData.createdAt,
          updatedAt: teamData.updatedAt
        };
      });
    } catch (error) {
      console.error('Error getting teams by organization:', error);
      throw error;
    }
  }
  
  /**
   * Update team
   * @param orgId Organization ID
   * @param teamId Team ID
   * @param updates Updates to apply
   * @returns Updated team
   */
  async updateTeam(orgId: string, teamId: string, updates: Partial<Team>): Promise<Team> {
    try {
      const orgRef = doc(firestore, this.organizationsCollection, orgId);
      const teamRef = doc(collection(orgRef, this.teamsSubcollection), teamId);
      const teamSnapshot = await getDoc(teamRef);
      
      if (!teamSnapshot.exists()) {
        throw new Error(`Team with ID ${teamId} not found in organization ${orgId}`);
      }
      
      const teamData = teamSnapshot.data() as FirestoreTeam;
      
      // Create updated data
      const updatedData: Partial<FirestoreTeam> = {
        ...updates,
        updatedAt: Timestamp.fromDate(new Date())
      };
      
      // Update in Firestore
      await updateDoc(teamRef, updatedData);
      
      // Update in Firebase Admin
      await adminFirestore
        .collection(this.organizationsCollection)
        .doc(orgId)
        .collection(this.teamsSubcollection)
        .doc(teamId)
        .update(updatedData);
      
      // Return updated team
      const updatedTeamSnapshot = await getDoc(teamRef);
      const updatedTeamData = updatedTeamSnapshot.data() as FirestoreTeam;
      
      return {
        id: teamId,
        name: updatedTeamData.name,
        description: updatedTeamData.description,
        memberIds: updatedTeamData.memberIds || [],
        managers: updatedTeamData.managers || [],
        createdAt: updatedTeamData.createdAt,
        updatedAt: updatedTeamData.updatedAt
      };
    } catch (error) {
      console.error('Error updating team:', error);
      throw error;
    }
  }
  
  /**
   * Delete a team
   * @param orgId Organization ID
   * @param teamId Team ID
   */
  async deleteTeam(orgId: string, teamId: string): Promise<void> {
    try {
      const orgRef = doc(firestore, this.organizationsCollection, orgId);
      const teamRef = doc(collection(orgRef, this.teamsSubcollection), teamId);
      
      // Delete in Firestore
      await deleteDoc(teamRef);
      
      // Delete in Firebase Admin
      await adminFirestore
        .collection(this.organizationsCollection)
        .doc(orgId)
        .collection(this.teamsSubcollection)
        .doc(teamId)
        .delete();
    } catch (error) {
      console.error('Error deleting team:', error);
      throw error;
    }
  }
  
  /**
   * Add a member to a team
   * @param orgId Organization ID
   * @param teamId Team ID
   * @param userId User ID to add
   */
  async addTeamMember(orgId: string, teamId: string, userId: string): Promise<void> {
    try {
      const orgRef = doc(firestore, this.organizationsCollection, orgId);
      const teamRef = doc(collection(orgRef, this.teamsSubcollection), teamId);
      const teamSnapshot = await getDoc(teamRef);
      
      if (!teamSnapshot.exists()) {
        throw new Error(`Team with ID ${teamId} not found in organization ${orgId}`);
      }
      
      const teamData = teamSnapshot.data() as FirestoreTeam;
      const memberIds = teamData.memberIds || [];
      
      // Check if user is already a member
      if (memberIds.includes(userId)) {
        return; // Already a member, nothing to do
      }
      
      // Add to the team
      const updatedMemberIds = [...memberIds, userId];
      
      // Update in Firestore
      await updateDoc(teamRef, {
        memberIds: updatedMemberIds,
        updatedAt: Timestamp.fromDate(new Date())
      });
      
      // Update in Firebase Admin
      await adminFirestore
        .collection(this.organizationsCollection)
        .doc(orgId)
        .collection(this.teamsSubcollection)
        .doc(teamId)
        .update({
          memberIds: updatedMemberIds,
          updatedAt: Timestamp.fromDate(new Date())
        });
    } catch (error) {
      console.error('Error adding team member:', error);
      throw error;
    }
  }
  
  /**
   * Remove a member from a team
   * @param orgId Organization ID
   * @param teamId Team ID
   * @param userId User ID to remove
   */
  async removeTeamMember(orgId: string, teamId: string, userId: string): Promise<void> {
    try {
      const orgRef = doc(firestore, this.organizationsCollection, orgId);
      const teamRef = doc(collection(orgRef, this.teamsSubcollection), teamId);
      const teamSnapshot = await getDoc(teamRef);
      
      if (!teamSnapshot.exists()) {
        throw new Error(`Team with ID ${teamId} not found in organization ${orgId}`);
      }
      
      const teamData = teamSnapshot.data() as FirestoreTeam;
      const memberIds = teamData.memberIds || [];
      
      // Check if user is not a member
      if (!memberIds.includes(userId)) {
        return; // Not a member, nothing to do
      }
      
      // Remove from the team
      const updatedMemberIds = memberIds.filter(id => id !== userId);
      
      // Update in Firestore
      await updateDoc(teamRef, {
        memberIds: updatedMemberIds,
        updatedAt: Timestamp.fromDate(new Date())
      });
      
      // Update in Firebase Admin
      await adminFirestore
        .collection(this.organizationsCollection)
        .doc(orgId)
        .collection(this.teamsSubcollection)
        .doc(teamId)
        .update({
          memberIds: updatedMemberIds,
          updatedAt: Timestamp.fromDate(new Date())
        });
    } catch (error) {
      console.error('Error removing team member:', error);
      throw error;
    }
  }
  
  /**
   * Get teams by member
   * @param orgId Organization ID
   * @param userId User ID
   * @returns Array of teams the user is a member of
   */
  async getTeamsByMember(orgId: string, userId: string): Promise<Team[]> {
    try {
      const orgRef = doc(firestore, this.organizationsCollection, orgId);
      const teamsSnapshot = await getDocs(collection(orgRef, this.teamsSubcollection));
      
      const teams: Team[] = [];
      
      for (const doc of teamsSnapshot.docs) {
        const teamData = doc.data() as FirestoreTeam;
        const memberIds = teamData.memberIds || [];
        
        if (memberIds.includes(userId)) {
          teams.push({
            id: doc.id,
            name: teamData.name,
            description: teamData.description,
            memberIds,
            managers: teamData.managers || [],
            createdAt: teamData.createdAt,
            updatedAt: teamData.updatedAt
          });
        }
      }
      
      return teams;
    } catch (error) {
      console.error('Error getting teams by member:', error);
      throw error;
    }
  }
} 