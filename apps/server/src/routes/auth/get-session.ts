import type { HonoContext } from '../../ctx';
import jwt from '@tsndr/cloudflare-worker-jwt';

export const getSessionHandler = async (c: HonoContext) => {
    // Set proper headers to prevent content decoding issues
    c.header('Content-Type', 'application/json');
    c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    c.header('Pragma', 'no-cache');
    c.header('Expires', '0');
    
    try {
        // Get session ID from cookies or headers (for cross-domain access)
        let sessionId = null;
        
        // First try to get from cookies
        const cookies = c.req.header('Cookie') || '';
        const sessionMatch = cookies.match(/session=([^;]+)/);
        
        if (sessionMatch) {
            sessionId = sessionMatch[1];
            console.log('Session ID found in cookies:', sessionId);
        } else {
            // Try to get from headers (for cross-domain access)
            sessionId = c.req.header('X-Session-Token');
            if (sessionId) {
                console.log('Session ID found in headers:', sessionId);
            }
        }
        
        if (!sessionId) {
            console.log('No session ID found in cookies or headers');
            return c.json({ user: null });
        }
        
        // Try to decode JWT session token first
        try {
            // Verify and decode the JWT token
            const env = c.env as any;
            const verified = await jwt.verify(sessionId, env.JWT_SECRET);
            if (!verified) {
                console.log('JWT token verification failed');
                return c.json({ user: null });
            }
            
            // Decode the JWT payload
            const decoded = jwt.decode(sessionId);
            const sessionData = decoded.payload;
            
            // Check if session is expired (JWT exp is in seconds, Date.now() is in milliseconds)
            if (sessionData.exp && Date.now() > sessionData.exp * 1000) {
                console.log('Session expired');
                return c.json({ user: null });
            }
            
            console.log('Valid JWT session found for:', sessionData.email);
            return c.json({
                user: {
                    id: sessionData.userId || sessionData.email, // Use Google's user ID, fallback to email
                    email: sessionData.email,
                    name: sessionData.name,
                    image: sessionData.picture,
                }
            });
        } catch (jwtError) {
            console.log('Failed to decode session token as JWT, trying base64 fallback');
        }
        
        // Fallback: Try to decode session token from headers (base64 encoded JSON)
        try {
            // Safely decode base64 session token
            let sessionData;
            try {
                // Ensure the base64 string is properly padded
                const paddedToken = sessionId + '='.repeat((4 - sessionId.length % 4) % 4);
                const decodedToken = atob(paddedToken);
                sessionData = JSON.parse(decodedToken);
            } catch (error) {
                console.error('Failed to decode session token:', error);
                throw new Error('Invalid session token format');
            }
            
            // Check if session is expired
            if (sessionData.expires_at && Date.now() > sessionData.expires_at) {
                console.log('Session expired');
                return c.json({ user: null });
            }
            
            console.log('Valid base64 session found for:', sessionData.email);
            return c.json({
                user: {
                    id: sessionData.userId || sessionData.email, // Use Google's user ID, fallback to email
                    email: sessionData.email,
                    name: sessionData.name,
                    image: sessionData.picture,
                }
            });
        } catch (decodeError) {
            console.log('Failed to decode session token as base64 JSON, trying Durable Object lookup');
        }
        
        // Final fallback: Try to retrieve session data from ZeroDB Durable Object
        try {
            const env = c.env as any;
            const db = env.ZERO_DB;
            const sessionObj = db.get(db.idFromName('sessions')); // Use same fixed ID
            
            const response = await sessionObj.fetch(`http://localhost/get?sessionId=${encodeURIComponent(sessionId)}`);
            
            if (response.ok) {
                const sessionData = await response.json();
                
                // Check if session is expired
                if (sessionData.expires_at && Date.now() > sessionData.expires_at) {
                    console.log('Session expired');
                    return c.json({ user: null });
                }
                
                console.log('Valid session found for:', sessionData.email);
                return c.json({
                    user: {
                        id: sessionData.userId || sessionData.email, // Use Google's user ID, fallback to email
                        email: sessionData.email,
                        name: sessionData.name,
                        image: sessionData.picture,
                    }
                });
            } else {
                console.log('Session not found in ZeroDB');
                return c.json({ user: null });
            }
        } catch (dbError) {
            console.error('Failed to retrieve session from ZeroDB:', dbError);
            return c.json({ user: null });
        }
        
    } catch (error) {
        console.error('Get session error:', error);
        return c.json({ user: null });
    }
}; 