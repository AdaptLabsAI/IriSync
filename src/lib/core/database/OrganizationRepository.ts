import { firestore as adminFirestore } from '../core/firebase/admin';
import { firestore } from '../firebase';
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
import { 
  Organization,
  FirestoreOrganization,
  FirestoreOrganizationMember,
  FirestoreTeam,
  firestoreToOrganization,
  organizationToFirestore
} from '../core/models/Organization';
import { SubscriptionTier } from '../core/models/User';

/**
 * Repository for organization data in Firestore
 */
export class OrganizationRepository {
  private readonly organizationsCollection = 'organizations';
  private readonly membersSubcollection = 'members';
  private readonly teamsSubcollection = 'teams';
  
  /**
   * Create a new organization in Firestore
   * @param org Organization data to create
   * @returns Created organization ID
   */
  async createOrganization(
    org: Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      // Create organization data with timestamps
      const now = new Date();
      const { org: firestoreOrg, members, teams } = organizationToFirestore({
        ...org,
        id: '', // Will be set after creating the document
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now)
      });
      
      // Generate a unique ID or use a custom ID generation method
      const orgRef = doc(collection(firestore, this.organizationsCollection));
      const orgId = orgRef.id;
      
      // Use a batch to save everything atomically
      const batch = writeBatch(firestore);
      
      // Save organization
      batch.set(orgRef, firestoreOrg);
      
      // Save members
      for (const [memberId, memberData] of Object.entries(members)) {
        const memberRef = doc(collection(orgRef, this.membersSubcollection), memberId);
        batch.set(memberRef, memberData);
      }
      
      // Save teams
      for (const [teamId, teamData] of Object.entries(teams)) {
        const teamRef = doc(collection(orgRef, this.teamsSubcollection), teamId);
        batch.set(teamRef, teamData);
      }
      
      // Commit the batch
      await batch.commit();
      
      // Also create in Firebase Admin for server operations
      await this.createOrganizationInAdmin(orgId, firestoreOrg, members, teams);
      
      return orgId;
    } catch (error) {
      console.error('Error creating organization:', error);
      throw error;
    }
  }
  
  /**
   * Get organization by ID
   * @param orgId Organization ID
   * @returns Organization or null if not found
   */
  async getOrganizationById(orgId: string): Promise<Organization | null> {
    try {
      const orgSnapshot = await getDoc(doc(firestore, this.organizationsCollection, orgId));
      
      if (!orgSnapshot.exists()) {
        return null;
      }
      
      // Get organization data
      const orgData = orgSnapshot.data() as FirestoreOrganization;
      
      // Get members
      const membersSnapshot = await getDocs(collection(orgSnapshot.ref, this.membersSubcollection));
      const members: FirestoreOrganizationMember[] = membersSnapshot.docs.map(doc => doc.data() as FirestoreOrganizationMember);
      
      // Get teams
      const teamsSnapshot = await getDocs(collection(orgSnapshot.ref, this.teamsSubcollection));
      const teams: Record<string, FirestoreTeam> = {};
      teamsSnapshot.docs.forEach(doc => {
        teams[doc.id] = doc.data() as FirestoreTeam;
      });
      
      // Convert to Organization
      return firestoreToOrganization(orgId, orgData, members, teams);
    } catch (error) {
      console.error('Error getting organization:', error);
      throw error;
    }
  }
  
  /**
   * Update organization
   * @param orgId Organization ID
   * @param updates Updates to apply
   * @returns Updated organization
   */
  async updateOrganization(
    orgId: string, 
    updates: Partial<Organization>
  ): Promise<Organization> {
    try {
      const orgRef = doc(firestore, this.organizationsCollection, orgId);
      const orgSnapshot = await getDoc(orgRef);
      
      if (!orgSnapshot.exists()) {
        throw new Error(`Organization with ID ${orgId} not found`);
      }
      
      // Get current organization
      const organization = await this.getOrganizationById(orgId);
      
      if (!organization) {
        throw new Error(`Organization with ID ${orgId} not found`);
      }
      
      // Merge updates with current data
      const updatedOrg: Organization = {
        ...organization,
        ...updates,
        updatedAt: Timestamp.fromDate(new Date())
      };
      
      // Convert to Firestore format
      const { org: firestoreOrg, members, teams } = organizationToFirestore(updatedOrg);
      
      // Update in Firestore
      const batch = writeBatch(firestore);
      
      // Update organization main document - use spread operator to avoid type issues
      batch.update(orgRef, { ...firestoreOrg });
      
      // Update members if provided in updates
      if (updates.members) {
        // First get existing members to find ones to delete
        const membersSnapshot = await getDocs(collection(orgRef, this.membersSubcollection));
        const existingMemberIds = new Set(membersSnapshot.docs.map(doc => doc.id));
        
        // New member IDs
        const updatedMemberIds = new Set(Object.keys(members));
        
        // Delete members that are no longer in the organization
        for (const memberId of Array.from(existingMemberIds)) {
          if (!updatedMemberIds.has(memberId)) {
            batch.delete(doc(collection(orgRef, this.membersSubcollection), memberId));
          }
        }
        
        // Update or create members
        for (const [memberId, memberData] of Object.entries(members)) {
          batch.set(doc(collection(orgRef, this.membersSubcollection), memberId), memberData, { merge: true });
        }
      }
      
      // Update teams if provided in updates
      if (updates.teams) {
        // First get existing teams to find ones to delete
        const teamsSnapshot = await getDocs(collection(orgRef, this.teamsSubcollection));
        const existingTeamIds = new Set(teamsSnapshot.docs.map(doc => doc.id));
        
        // New team IDs
        const updatedTeamIds = new Set(Object.keys(teams));
        
        // Delete teams that are no longer in the organization
        for (const teamId of Array.from(existingTeamIds)) {
          if (!updatedTeamIds.has(teamId)) {
            batch.delete(doc(collection(orgRef, this.teamsSubcollection), teamId));
          }
        }
        
        // Update or create teams
        for (const [teamId, teamData] of Object.entries(teams)) {
          batch.set(doc(collection(orgRef, this.teamsSubcollection), teamId), teamData, { merge: true });
        }
      }
      
      // Commit the batch
      await batch.commit();
      
      // Also update in Firebase Admin
      await this.updateOrganizationInAdmin(orgId, firestoreOrg, members, teams);
      
      // Return updated organization
      return this.getOrganizationById(orgId) as Promise<Organization>;
    } catch (error) {
      console.error('Error updating organization:', error);
      throw error;
    }
  }
  
  /**
   * Delete an organization
   * @param orgId Organization ID
   */
  async deleteOrganization(orgId: string): Promise<void> {
    try {
      const orgRef = doc(firestore, this.organizationsCollection, orgId);
      
      // Delete members
      const membersSnapshot = await getDocs(collection(orgRef, this.membersSubcollection));
      const batch = writeBatch(firestore);
      
      membersSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Delete teams
      const teamsSnapshot = await getDocs(collection(orgRef, this.teamsSubcollection));
      teamsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Delete organization document
      batch.delete(orgRef);
      
      // Commit the batch
      await batch.commit();
      
      // Also delete in Firebase Admin
      await this.deleteOrganizationInAdmin(orgId);
    } catch (error) {
      console.error('Error deleting organization:', error);
      throw error;
    }
  }
  
  /**
   * Get organizations by owner
   * @param ownerId Owner user ID
   * @returns Array of organizations
   */
  async getOrganizationsByOwner(ownerId: string): Promise<Organization[]> {
    try {
      const orgsRef = collection(firestore, this.organizationsCollection);
      const q = query(orgsRef, where('ownerId', '==', ownerId));
      const querySnapshot = await getDocs(q);
      
      const organizations: Organization[] = [];
      
      // Get organizations one by one (including members and teams)
      for (const doc of querySnapshot.docs) {
        const org = await this.getOrganizationById(doc.id);
        if (org) {
          organizations.push(org);
        }
      }
      
      return organizations;
    } catch (error) {
      console.error('Error getting organizations by owner:', error);
      throw error;
    }
  }
  
  /**
   * Get organizations by member
   * @param userId Member user ID
   * @returns Array of organizations
   */
  async getOrganizationsByMember(userId: string): Promise<Organization[]> {
    try {
      // This is less efficient than a direct query, but structure requires it
      const orgsRef = collection(firestore, this.organizationsCollection);
      const querySnapshot = await getDocs(orgsRef);
      
      const organizations: Organization[] = [];
      
      // Check each organization for the member
      for (const orgDoc of querySnapshot.docs) {
        const membersRef = collection(orgDoc.ref, this.membersSubcollection);
        const memberDoc = await getDoc(doc(membersRef, userId));
        
        if (memberDoc.exists()) {
          const org = await this.getOrganizationById(orgDoc.id);
          if (org) {
            organizations.push(org);
          }
        }
      }
      
      return organizations;
    } catch (error) {
      console.error('Error getting organizations by member:', error);
      throw error;
    }
  }
  
  /**
   * Create organization in Firebase Admin
   */
  private async createOrganizationInAdmin(
    orgId: string,
    orgData: FirestoreOrganization,
    members: Record<string, FirestoreOrganizationMember>,
    teams: Record<string, FirestoreTeam>
  ): Promise<void> {
    try {
      // Create a new batch
      const batch = adminFirestore.batch();
      
      // Set organization
      const orgRef = adminFirestore.collection(this.organizationsCollection).doc(orgId);
      batch.set(orgRef, orgData);
      
      // Set members
      for (const [memberId, memberData] of Object.entries(members)) {
        const memberRef = orgRef.collection(this.membersSubcollection).doc(memberId);
        batch.set(memberRef, memberData);
      }
      
      // Set teams
      for (const [teamId, teamData] of Object.entries(teams)) {
        const teamRef = orgRef.collection(this.teamsSubcollection).doc(teamId);
        batch.set(teamRef, teamData);
      }
      
      // Commit the batch
      await batch.commit();
    } catch (error) {
      console.error('Error creating organization in admin:', error);
      throw error;
    }
  }
  
  /**
   * Update organization in Firebase Admin
   */
  private async updateOrganizationInAdmin(
    orgId: string,
    orgData: FirestoreOrganization,
    members: Record<string, FirestoreOrganizationMember>,
    teams: Record<string, FirestoreTeam>
  ): Promise<void> {
    try {
      // Create a new batch
      const batch = adminFirestore.batch();
      
      // Update organization
      const orgRef = adminFirestore.collection(this.organizationsCollection).doc(orgId);
      batch.update(orgRef, { ...orgData });
      
      // Handle members
      // First get existing members
      const membersSnapshot = await orgRef.collection(this.membersSubcollection).get();
      const existingMemberIds = new Set(membersSnapshot.docs.map((doc: any) => doc.id));
      
      // New member IDs
      const updatedMemberIds = new Set(Object.keys(members));
      
      // Delete members that are no longer in the organization
      for (const memberId of Array.from(existingMemberIds)) {
        if (!updatedMemberIds.has(memberId)) {
          batch.delete(orgRef.collection(this.membersSubcollection).doc(memberId));
        }
      }
      
      // Update or create members
      for (const [memberId, memberData] of Object.entries(members)) {
        batch.set(orgRef.collection(this.membersSubcollection).doc(memberId), memberData, { merge: true });
      }
      
      // Handle teams
      // First get existing teams
      const teamsSnapshot = await orgRef.collection(this.teamsSubcollection).get();
      const existingTeamIds = new Set(teamsSnapshot.docs.map((doc: any) => doc.id));
      
      // New team IDs
      const updatedTeamIds = new Set(Object.keys(teams));
      
      // Delete teams that are no longer in the organization
      for (const teamId of Array.from(existingTeamIds)) {
        if (!updatedTeamIds.has(teamId)) {
          batch.delete(orgRef.collection(this.teamsSubcollection).doc(teamId));
        }
      }
      
      // Update or create teams
      for (const [teamId, teamData] of Object.entries(teams)) {
        batch.set(orgRef.collection(this.teamsSubcollection).doc(teamId), teamData, { merge: true });
      }
      
      // Commit the batch
      await batch.commit();
    } catch (error) {
      console.error('Error updating organization in admin:', error);
      throw error;
    }
  }
  
  /**
   * Delete organization in Firebase Admin
   */
  private async deleteOrganizationInAdmin(orgId: string): Promise<void> {
    try {
      const orgRef = adminFirestore.collection(this.organizationsCollection).doc(orgId);
      
      // Delete members
      const membersSnapshot = await orgRef.collection(this.membersSubcollection).get();
      const batch = adminFirestore.batch();
      
      membersSnapshot.docs.forEach((doc: any) => {
        batch.delete(doc.ref);
      });
      
      // Delete teams
      const teamsSnapshot = await orgRef.collection(this.teamsSubcollection).get();
      teamsSnapshot.docs.forEach((doc: any) => {
        batch.delete(doc.ref);
      });
      
      // Delete organization document
      batch.delete(orgRef);
      
      // Commit the batch
      await batch.commit();
    } catch (error) {
      console.error('Error deleting organization in admin:', error);
      throw error;
    }
  }
} 