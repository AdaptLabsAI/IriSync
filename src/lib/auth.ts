import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { getFirestore, getAuth } from './firebase/admin';
import { serverTimestamp } from './firebase/admin';
import { compare } from 'bcryptjs';
import { generateOrganizationId, validateUserOrganizationConnections } from './utils';
import { UserRole } from './models/User';
import { SubscriptionTier as BaseSubscriptionTier } from './subscription/models/subscription';
import { getGoogleOAuthClientId } from '@/lib/server/env';

// Define authentication options
export const authOptions: NextAuthOptions = {
  // Configure JWT session
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  // Authentication providers
  providers: [
    // Google OAuth provider
    GoogleProvider({
      clientId: getGoogleOAuthClientId(),
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          role: "user",
        };
      },
    }),
    
    // Credentials (email/password) provider
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password required");
        }
        
        try {
          // Use Firebase Auth to authenticate
          const auth = getAuth();
          const firestore = getFirestore();
          
          // Check if user exists
          const userRecord = await auth.getUserByEmail(credentials.email).catch(() => null);
          
          if (!userRecord) {
            throw new Error("User not found");
          }
          
          // We can't verify password directly with Admin SDK, 
          // but we can get the user data from Firestore and check if it exists
          const userDoc = await firestore.collection('users').doc(userRecord.uid).get();
          
          if (!userDoc.exists) {
            throw new Error("User not found in database");
          }
          
          const userData = userDoc.data();
          
          // Create custom token for session
          const customToken = await auth.createCustomToken(userRecord.uid);
          
          // Return user data for session
          return {
            id: userRecord.uid,
            name: userData?.name || "",
            email: userRecord.email,
            image: userData?.image || "",
            role: userData?.role || "user",
            customToken: customToken
          };
        } catch (error) {
          console.error("Auth error:", error);
          throw new Error("Authentication failed");
        }
      }
    })
  ],
  
  // Custom pages
  pages: {
    signIn: "/login",
    signOut: "/logout",
    error: "/error",
    newUser: "/register",
  },
  
  // Callbacks to customize JWT and session
  callbacks: {
    // Add custom claims to JWT
    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
        token.role = user.role || "user";
        token.provider = account.provider;
        
        // Store organization ID if available
        if ((user as any).organizationId) {
          token.organizationId = (user as any).organizationId;
        }
        
        // Store the custom token if available (from credentials provider)
        if ((user as any).customToken) {
          token.customToken = (user as any).customToken;
        }
        
        // If this is the first time the user signs in with OAuth
        if (account.provider === 'google' || account.provider === 'apple') {
          try {
            const firestore = getFirestore();
            const auth = getAuth();
            
            // Try to find user by email
            const userRecord = await auth.getUserByEmail(user.email as string).catch(() => null);
            
            if (!userRecord) {
              // Create a new user in Firebase if doesn't exist
              const newUser = await auth.createUser({
                email: user.email as string,
                displayName: user.name,
                photoURL: user.image,
              });
              
              // Create user and organization using centralized service
              const userService = new (await import('./auth/user-service')).UserService();
              
              const result = await userService.createUser({
                email: user.email as string,
                displayName: user.name || user.email?.split('@')[0] || 'User',
                firstName: user.name?.split(' ')[0] || '',
                lastName: user.name?.split(' ').slice(1).join(' ') || '',
                firebaseAuthId: newUser.uid,
                role: UserRole.USER,
                status: 'active',
                organizations: []
              }, {
                subscriptionTier: BaseSubscriptionTier.CREATOR, // Default to creator tier
                organizationType: 'personal',
                customToken: true,
                userSettings: true,
                defaultFolders: false // Skip folders for social auth
              });
              
              // Update token with organization information
              token.personalOrganizationId = result.organizationId;
              token.currentOrganizationId = result.organizationId;
              token.customToken = result.customToken;
              
            } else {
              // Update existing user data
              await firestore.collection('users').doc(userRecord.uid).update({
                lastLogin: serverTimestamp(),
                updatedAt: serverTimestamp(),
                provider: account.provider,
              });
              
              // Generate custom token for session
              token.customToken = await auth.createCustomToken(userRecord.uid);
            }
          } catch (error) {
            console.error("Error updating user data:", error);
          }
        }
      }
      
      // Always fetch latest user data from Firestore to ensure we have the correct role/tier
      if (token.sub) {
        try {
          const firestore = getFirestore();
          const userDoc = await firestore.collection('users').doc(token.sub).get();
          
          if (userDoc.exists) {
            const userData = userDoc.data();
            
            // Validate and ensure proper organization connections
            const orgValidation = await validateUserOrganizationConnections(token.sub, userData, firestore);
            
            // Update user document if organization connections were fixed
            if (!orgValidation.isValid) {
              console.warn('Fixed organization connections for user during session refresh', { 
                userId: token.sub, 
                errors: orgValidation.errors 
              });
              
              await firestore.collection('users').doc(token.sub).update({
                personalOrganizationId: orgValidation.personalOrganizationId,
                currentOrganizationId: orgValidation.currentOrganizationId,
                updatedAt: serverTimestamp()
              });
            }
            
            // Update token with latest user data
            token.role = userData?.role || token.role;
            token.organizationId = orgValidation.currentOrganizationId;
            
            // Get organization details to get subscription tier
            if (token.organizationId) {
              const orgDoc = await firestore.collection('organizations').doc(token.organizationId as string).get();
              if (orgDoc.exists) {
                const orgData = orgDoc.data();
                token.subscriptionTier = orgData?.billing?.subscriptionTier || 'creator';
              }
            } else {
              // Fallback to deprecated user-level field for backward compatibility
              token.subscriptionTier = userData?.subscriptionTier || 'creator';
              console.warn('Using deprecated user.subscriptionTier field', { userId: token.sub });
            }
            
            // Log for debugging
            console.log(`Updated session for user ${token.sub}: Role=${token.role}, Tier=${token.subscriptionTier}, OrgId=${token.organizationId}`);
          } else {
            console.warn(`User document not found in Firestore for ID: ${token.sub}`);
          }
        } catch (error) {
          console.error("Error fetching user data for JWT:", error);
        }
      }
      
      return token;
    },
    
    // Add custom data to session
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as string;
        
        // Check admin role
        const isAdmin = token.role === 'admin' || token.role === 'super_admin';
        session.user.isAdmin = isAdmin;
        
        // Get organization ID if applicable (using organization-centric approach)
        if (token.organizationId) {
          (session.user as any).currentOrganizationId = token.organizationId as string;
          
          // Add deprecation warning if session.user.organizationId is accessed
          Object.defineProperty(session.user, 'organizationId', {
            get() {
              console.warn('Deprecated: session.user.organizationId is deprecated. Use currentOrganizationId instead.');
              return token.organizationId as string;
            },
            enumerable: false,
            configurable: true
          });
        }
        
        // Add subscription tier to session
        (session.user as any).subscriptionTier = token.subscriptionTier as string;
        
        // Add custom token to session
        (session as any).customToken = token.customToken;
      }
      return session;
    },
  },
  
  // Enable debug messages in development
  debug: process.env.NODE_ENV === "development",
}; 