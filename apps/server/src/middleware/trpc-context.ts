import type { HonoContext } from '../ctx';

export const trpcContextMiddleware = async (c: HonoContext, next: () => Promise<void>) => {
    // Set up session and auth context for tRPC
    const env = c.env as any;
    
    // Try to get session from custom session token first
    const sessionToken = c.req.header('X-Session-Token');
    console.log('🔍 tRPC middleware - Session token:', sessionToken ? 'present' : 'missing');
    let sessionUser: any = null;
    
    if (sessionToken) {
        try {
            console.log('🔍 tRPC middleware - Attempting to get session data for token:', sessionToken);
            
            // Decode the session token to get user data
            let userData;
            try {
                // Use atob for base64 decoding in Cloudflare Workers (no Buffer available)
                const decodedToken = atob(sessionToken);
                userData = JSON.parse(decodedToken);
                console.log('🔍 tRPC middleware - Decoded session token successfully');
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
                    console.log('🔍 tRPC middleware - Session data retrieved successfully');
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
    
    // Set context variables that tRPC expects
    console.log('🔍 tRPC middleware - Final session user:', sessionUser ? 'present' : 'null');
    c.set('sessionUser', sessionUser as any || undefined);
    
    return next();
}; 