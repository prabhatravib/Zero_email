import jwt from '@tsndr/cloudflare-worker-jwt';
import type { HonoContext } from '../../ctx';

export const sessionHandler = async (c: any) => {
  const env = c.env as any;
  
  try {
    // Get session cookie
    const sessionCookie = c.req.header('Cookie')?.match(/session=([^;]+)/)?.[1];
    
    if (!sessionCookie) {
      return c.json({ error: 'No session found' }, 401);
    }
    
    // Verify and decode the JWT token
    const verified = await jwt.verify(sessionCookie, env.JWT_SECRET);
    if (!verified) {
      return c.json({ error: 'Invalid session' }, 401);
    }
    
    // Decode the JWT payload
    const decoded = jwt.decode(sessionCookie);
    const sessionData = decoded.payload;
    
    // Check if session is expired
    if (sessionData.expiresAt && Date.now() > sessionData.expiresAt) {
      return c.json({ error: 'Session expired' }, 401);
    }
    
    // Return user data (without sensitive tokens)
    return c.json({
      id: sessionData.userId,
      email: sessionData.email,
      name: sessionData.name,
      picture: sessionData.picture,
      scope: sessionData.scope,
    });
    
  } catch (error) {
    console.error('Session verification error:', error);
    return c.json({ error: 'Session verification failed' }, 401);
  }
};

export const signOutHandler = async (c: any) => {
  try {
    // Create a response that clears the session cookie
    const response = c.json({ success: true });
    response.headers.set('Set-Cookie', 'session=; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=0');
    return response;
  } catch (error) {
    console.error('Sign out error:', error);
    return c.json({ error: 'Sign out failed' }, 500);
  }
}; 