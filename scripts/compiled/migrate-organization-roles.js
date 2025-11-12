#!/usr/bin/env ts-node
"use strict";
/**
 * Migration script to update role system to dual-role architecture
 *
 * Changes:
 * - 'guest' -> 'viewer' (legacy cleanup)
 * - TeamMemberRole -> OrganizationRole + TeamRole separation
 * - Update role mappings and hierarchies
 *
 * Run with: npx ts-node scripts/migrate-organization-roles.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateOrganizationRoles = migrateOrganizationRoles;
exports.dryRun = dryRun;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
// Initialize Firebase Admin using environment variables (same pattern as existing codebase)
function initializeFirebaseAdmin() {
    try {
        if ((0, app_1.getApps)().length === 0) {
            // Use project ID from either admin or public variable
            const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID ||
                process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
                process.env.FIREBASE_PROJECT_ID;
            const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL ||
                process.env.FIREBASE_CLIENT_EMAIL;
            // Safely replace newlines in private key if it exists
            let privateKey;
            const rawPrivateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;
            if (rawPrivateKey) {
                privateKey = rawPrivateKey.replace(/\\n/g, '\n');
            }
            // Check if all required environment variables are present
            if (!projectId || !clientEmail || !privateKey) {
                console.error('❌ Missing required Firebase Admin environment variables:');
                console.error('   - FIREBASE_ADMIN_PROJECT_ID:', projectId ? '✅ set' : '❌ missing');
                console.error('   - FIREBASE_ADMIN_CLIENT_EMAIL:', clientEmail ? '✅ set' : '❌ missing');
                console.error('   - FIREBASE_ADMIN_PRIVATE_KEY:', privateKey ? '✅ set' : '❌ missing');
                throw new Error('Firebase Admin SDK is missing required environment variables');
            }
            // Initialize app with credentials
            (0, app_1.initializeApp)({
                credential: (0, app_1.cert)({
                    projectId,
                    clientEmail,
                    privateKey,
                }),
            });
            console.log('✅ Firebase Admin SDK initialized successfully');
        }
    }
    catch (error) {
        console.error('❌ Error initializing Firebase Admin SDK:', error);
        throw error;
    }
}
// Initialize Firebase Admin
initializeFirebaseAdmin();
const db = (0, firestore_1.getFirestore)();
/**
 * Convert legacy TeamMemberRole values to new dual-role system
 */
function convertLegacyRole(oldRole) {
    switch (oldRole) {
        case 'owner':
            return { orgRole: 'owner', teamRole: 'team_admin' };
        case 'org_admin':
            return { orgRole: 'org_admin', teamRole: 'team_admin' };
        case 'editor':
            return { orgRole: 'member', teamRole: 'editor' };
        case 'contributor':
            return { orgRole: 'member', teamRole: 'contributor' };
        case 'viewer':
            return { orgRole: 'viewer', teamRole: 'observer' };
        case 'guest':
            // Legacy guest -> viewer
            return { orgRole: 'viewer', teamRole: 'observer' };
        case 'admin':
            // This should not exist in org contexts, but handle gracefully
            console.warn(`Found 'admin' role in organization context - converting to org_admin`);
            return { orgRole: 'org_admin', teamRole: 'team_admin' };
        default:
            console.warn(`Unknown role: ${oldRole}, defaulting to member/contributor`);
            return { orgRole: 'member', teamRole: 'contributor' };
    }
}
/**
 * Migrate role values in organization member documents
 */
async function migrateOrganizationRoles() {
    const stats = {
        organizationsProcessed: 0,
        membersUpdated: 0,
        rolesConverted: 0,
        errors: []
    };
    try {
        console.log('🚀 Starting dual-role architecture migration...');
        // Get all organizations
        const organizationsSnapshot = await db.collection('organizations').get();
        for (const orgDoc of organizationsSnapshot.docs) {
            const orgId = orgDoc.id;
            console.log(`📁 Processing organization: ${orgId}`);
            try {
                // Get members subcollection
                const membersDoc = await db
                    .collection('organizations')
                    .doc(orgId)
                    .collection('members')
                    .doc('data')
                    .get();
                if (!membersDoc.exists) {
                    console.log(`  ⚠️  No members data found for organization ${orgId}`);
                    continue;
                }
                const membersData = membersDoc.data();
                if (!membersData) {
                    console.log(`  ⚠️  Empty members data for organization ${orgId}`);
                    continue;
                }
                let hasUpdates = false;
                const updatedMembers = { ...membersData };
                // Check each member for role updates
                for (const [userId, memberData] of Object.entries(membersData)) {
                    const member = memberData;
                    const oldRole = member.role;
                    if (oldRole === 'guest') {
                        console.log(`  🔄 Updating member ${userId}: guest -> viewer`);
                        updatedMembers[userId] = { ...member, role: 'viewer' };
                        hasUpdates = true;
                        stats.membersUpdated++;
                    }
                    else if (oldRole === 'admin') {
                        // SECURITY WARNING: 'admin' should never appear in organization contexts
                        console.log(`  ⚠️  WARNING: Member ${userId} has 'admin' role - converting to 'org_admin'`);
                        updatedMembers[userId] = { ...member, role: 'org_admin' };
                        hasUpdates = true;
                        stats.membersUpdated++;
                    }
                    // Convert to dual-role system (for future implementation)
                    const { orgRole, teamRole } = convertLegacyRole(oldRole);
                    if (orgRole !== oldRole) {
                        console.log(`  📝 Role conversion mapping: ${oldRole} -> org:${orgRole}, team:${teamRole}`);
                        stats.rolesConverted++;
                    }
                }
                // Update the document if there were changes
                if (hasUpdates) {
                    await db
                        .collection('organizations')
                        .doc(orgId)
                        .collection('members')
                        .doc('data')
                        .set(updatedMembers);
                    console.log(`  ✅ Updated members for organization ${orgId}`);
                }
                else {
                    console.log(`  ✅ No updates needed for organization ${orgId}`);
                }
                stats.organizationsProcessed++;
            }
            catch (error) {
                const errorMsg = `Error processing organization ${orgId}: ${error instanceof Error ? error.message : String(error)}`;
                console.error(`  ❌ ${errorMsg}`);
                stats.errors.push(errorMsg);
            }
        }
        console.log('\n🎉 Migration completed!');
        console.log(`📊 Statistics:`);
        console.log(`  - Organizations processed: ${stats.organizationsProcessed}`);
        console.log(`  - Members updated: ${stats.membersUpdated}`);
        console.log(`  - Role conversions mapped: ${stats.rolesConverted}`);
        console.log(`  - Errors: ${stats.errors.length}`);
        if (stats.errors.length > 0) {
            console.log('\n❌ Errors encountered:');
            stats.errors.forEach(error => console.log(`  - ${error}`));
        }
        console.log('\n📋 Next Steps:');
        console.log('  1. Update UI components to use new OrganizationRole + TeamRole enums');
        console.log('  2. Implement team-specific role assignments');
        console.log('  3. Update permission checking logic');
        console.log('  4. Test role hierarchy and mappings');
        return stats;
    }
    catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}
/**
 * Dry run to preview changes without making them
 */
async function dryRun() {
    console.log('🔍 Running dry run (no changes will be made)...');
    const organizationsSnapshot = await db.collection('organizations').get();
    for (const orgDoc of organizationsSnapshot.docs) {
        const orgId = orgDoc.id;
        const membersDoc = await db
            .collection('organizations')
            .doc(orgId)
            .collection('members')
            .doc('data')
            .get();
        if (!membersDoc.exists)
            continue;
        const membersData = membersDoc.data();
        if (!membersData)
            continue;
        let changesNeeded = false;
        for (const [userId, memberData] of Object.entries(membersData)) {
            const member = memberData;
            if (member.role === 'guest') {
                console.log(`  📝 Would update ${userId}: guest -> viewer`);
                changesNeeded = true;
            }
            else if (member.role === 'admin') {
                console.log(`  ⚠️  WARNING: Would update ${userId}: admin -> org_admin (admin should not be used in org contexts)`);
                changesNeeded = true;
            }
        }
        if (changesNeeded) {
            console.log(`📁 Organization ${orgId} needs updates`);
        }
    }
    console.log('🔍 Dry run completed');
}
// Main execution
async function main() {
    const args = process.argv.slice(2);
    const isDryRun = args.includes('--dry-run');
    try {
        if (isDryRun) {
            await dryRun();
        }
        else {
            const stats = await migrateOrganizationRoles();
            if (stats.errors.length > 0) {
                process.exit(1);
            }
        }
    }
    catch (error) {
        console.error('❌ Script failed:', error);
        process.exit(1);
    }
}
// Run the script
if (require.main === module) {
    main();
}
