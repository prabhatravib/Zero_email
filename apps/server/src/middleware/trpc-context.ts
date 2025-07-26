import { createAuth } from '../lib/auth';
import type { HonoContext } from '../ctx';

export const trpcContextMiddleware = async (c: HonoContext, next: () => Promise<void>) => {
    // Set up session and auth context for tRPC
    const auth = createAuth();
    
    // Try to get session from custom session token first
    const sessionToken = c.req.header('X-Session-Token');
    console.log('🔍 tRPC middleware - Session token:', sessionToken ? 'present' : 'missing');
    console.log('🔍 tRPC middleware - RAW X-Session-Token header:', sessionToken);
    console.log('🔍 tRPC middleware - Session token length:', sessionToken?.length || 0);
    let sessionUser: any = null;
    
    if (sessionToken) {
        try {
            console.log('🔍 tRPC middleware - Attempting to get session data for token:', sessionToken);
            
            // Decode the session token to get user data
            let userData;
            try {
                // Use Buffer for base64 decoding in Cloudflare Workers
                const decodedToken = Buffer.from(sessionToken, 'base64').toString('utf-8');
                userData = JSON.parse(decodedToken);
                console.log('🔍 tRPC middleware - Decoded session token:', userData);
            } catch (decodeError) {
                console.error('🔍 tRPC middleware - Failed to decode session token:', decodeError);
                // Fallback: try to use the token as email directly
                userData = { email: sessionToken };
            }
            
            // Use the email from the decoded token to get session data from Durable Object
            const env = c.env as any;
            const db = env.ZERO_DB;
            if (db && userData.email) {
                const sessionObj = db.get(db.idFromName('sessions'));
                const response = await sessionObj.fetch(`http://localhost/get?sessionId=${encodeURIComponent(userData.email)}`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                if (response.ok) {
                    const sessionData = await response.json();
                    console.log('🔍 tRPC middleware - Session data retrieved:', sessionData);
                    sessionUser = {
                        id: sessionData.email,
                        email: sessionData.email,
                        name: sessionData.name || sessionData.email,
                        emailVerified: true,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        image: sessionData.picture || null
                    };
                } else {
                    console.log('🔍 tRPC middleware - Failed to get session data, status:', response.status);
                    // Fallback: use data from the decoded token
                    sessionUser = {
                        id: userData.email,
                        email: userData.email,
                        name: userData.name || userData.email,
                        emailVerified: true,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        image: userData.picture || null
                    };
                }
            } else {
                // Fallback: use data from the decoded token
                sessionUser = {
                    id: userData.email,
                    email: userData.email,
                    name: userData.name || userData.email,
                    emailVerified: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    image: userData.picture || null
                };
            }
        } catch (error) {
            console.error('Error getting session from token:', error);
        }
    }
    
    // Fallback to better-auth session if no custom token
    if (!sessionUser) {
        const session = await auth.api.getSession({ headers: c.req.raw.headers });
        sessionUser = session?.user || null;
    }
    
    // Set context variables that tRPC expects
    console.log('🔍 tRPC middleware - Final session user:', sessionUser ? 'present' : 'null');
    c.set('sessionUser', sessionUser as any || undefined);
    c.set('auth', auth);
    
    return next();
}; 