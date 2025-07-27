import type { HonoContext } from '../../ctx';

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
        
        // Try to decode session token from headers (base64 encoded JSON)
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
            
            console.log('Valid session found for:', sessionData.email);
            return c.json({
                user: {
                    id: sessionData.userId || sessionData.email, // Use userId if available, fallback to email
                    email: sessionData.email,
                    name: sessionData.name,
                    image: sessionData.picture,
                }
            });
        } catch (decodeError) {
            console.log('Failed to decode session token as base64 JSON, trying Durable Object lookup');
        }
        
        // Fallback: Try to retrieve session data from ZeroDB Durable Object
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
                        id: sessionData.userId || sessionData.email, // Use userId if available, fallback to email
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