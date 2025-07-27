import type { HonoContext } from '../ctx';
import jwt from '@tsndr/cloudflare-worker-jwt';

export const trpcContextMiddleware = async (c: HonoContext, next: () => Promise<void>) => {
    // Set up session and auth context for tRPC
    const env = c.env as any;
    
    // Try to get session from custom session token first
    const sessionToken = c.req.header('X-Session-Token');
    console.log('🔍 tRPC middleware - Session token:', sessionToken ? 'present' : 'missing');
    let sessionUser: any = null;
    
    if (sessionToken) {
        try {
            console.log('🔍 tRPC middleware - Attempting to verify JWT session token');
            
            // Verify the JWT token
            const isValid = await jwt.verify(sessionToken, env.JWT_SECRET);
            
            if (!isValid) {
                console.error('🔍 tRPC middleware - JWT token verification failed');
                throw new Error('Invalid JWT token');
            }
            
            // Decode the JWT payload
            const payload = jwt.decode(sessionToken);
            console.log('🔍 tRPC middleware - JWT token verified successfully');
            
            // Create session user from JWT payload
            sessionUser = {
                id: payload.email,
                email: payload.email,
                name: payload.name || payload.email,
                emailVerified: true,
                createdAt: new Date(),
                updatedAt: new Date(),
                image: payload.picture || null,
                // Include access token for API calls
                accessToken: payload.access_token,
                refreshToken: payload.refresh_token
            };
            
            console.log('🔍 tRPC middleware - Session user created from JWT:', sessionUser.email);
            
        } catch (error) {
            console.error('🔍 tRPC middleware - Error verifying JWT token:', error);
            
            // Fallback: try to decode as base64 (for backward compatibility)
            try {
                console.log('🔍 tRPC middleware - Trying fallback base64 decode');
                const decodedToken = atob(sessionToken);
                const userData = JSON.parse(decodedToken);
                
                sessionUser = {
                    id: userData.email,
                    email: userData.email,
                    name: userData.name || userData.email,
                    emailVerified: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    image: userData.picture || null,
                    accessToken: userData.access_token,
                    refreshToken: userData.refresh_token
                };
                
                console.log('🔍 tRPC middleware - Fallback session user created:', sessionUser.email);
            } catch (fallbackError) {
                console.error('🔍 tRPC middleware - Fallback decode also failed:', fallbackError);
                sessionUser = null;
            }
        }
    }
    
    // Set context variables that tRPC expects
    console.log('🔍 tRPC middleware - Final session user:', sessionUser ? 'present' : 'null');
    c.set('sessionUser', sessionUser as any || undefined);
    
    return next();
}; 