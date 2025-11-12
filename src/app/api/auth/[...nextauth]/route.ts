import NextAuth from "next-auth";
import { authOptions } from "@/lib/features/auth";
import { cookies } from "next/headers";
import { logger } from "@/lib/core/logging/logger";
import { handleApiError } from "@/lib/features/auth/utils";
import { NextResponse } from "next/server";
import { ensureUserDocument } from "@/lib/features/auth/sync";

// Extend the handler to synchronize cookies and ensure Firestore documents
const handler = async (req: Request, context: any) => {
  try {
    // Get the NextAuth response
    const response = await NextAuth(authOptions)(req, context);
    
    // Check if there's an active session with a token and it's a sign-in operation
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      
      // If it's a callback or credentials sign-in with a successful response
      if (body?.json?.customToken || body?.credentials) {
        try {
          // Extract session data to get the user info
          const sessionData = await fetch(`${process.env.NEXTAUTH_URL}/api/auth/session`, {
            headers: { cookie: response.headers.get('set-cookie') || '' }
          }).then(res => res.json());
          
          // If we have a token, set it in the session cookie
          if (sessionData?.customToken) {
            cookies().set({
              name: 'session',
              value: sessionData.customToken,
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 60 * 60 * 24 * 7, // 1 week
              path: '/',
            });
          }
          
          // If we have a user ID, ensure they have a Firestore document
          if (sessionData?.user?.id) {
            try {
              await ensureUserDocument(sessionData.user.id);
              logger.debug(`Ensured Firestore document for user ${sessionData.user.id} during NextAuth sign-in`);
            } catch (syncError) {
              logger.error(`Error ensuring Firestore document during NextAuth sign-in: ${String(syncError)}`);
            }
          }
        } catch (error) {
          console.error('Error syncing session cookies:', error);
          logger.error({ error: String(error) }, 'NextAuth session cookie sync error');
        }
      }
    }
    
    return response;
  } catch (error) {
    console.error('NextAuth handler error:', error);
    return NextResponse.json(
      handleApiError(error, '/api/auth/[...nextauth]', 'NextAuth handler'),
      { status: 500 }
    );
  }
};

// Export handler for GET and POST methods
export { handler as GET, handler as POST }; 