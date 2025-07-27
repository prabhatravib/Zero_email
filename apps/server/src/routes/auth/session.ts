import { jwtVerify } from 'jose';
import { getCookie } from 'hono/cookie';
import type { HonoContext } from '../../ctx';

export const sessionHandler = async (c: any) => {
  const env = c.env as any;
  
  try {
    // Get session cookie using Hono's getCookie helper
    const token = getCookie(c, 'zero_session');
    
    if (!token) {
      return c.json({ error: 'No session found' }, 401);
    }
    
    // Verify and decode the JWT token
    const payload = await jwtVerify(
      token,
      new TextEncoder().encode(env.JWT_SECRET),
    );
    
    const sessionData = payload.payload as any;
    
    // Check if session is expired
    if (sessionData.expiresAt && Date.now() > sessionData.expiresAt) {
      return c.json({ error: 'Session expired' }, 401);
    }
    
    // Return user data (without sensitive tokens)
    return c.json(
      { user: sessionData }, 
      200,
      {
        'Access-Control-Allow-Origin': env.VITE_PUBLIC_APP_URL || 'https://pitext-email.onrender.com',
        'Access-Control-Allow-Credentials': 'true',
      },
    );
    
  } catch (error) {
    console.error('Session verification error:', error);
    return c.json({ error: 'Session verification failed' }, 401);
  }
};

export const signOutHandler = async (c: any) => {
  try {
    // Clear the session cookie
    const response = c.json({ success: true });
    response.headers.set('Set-Cookie', 'zero_session=; HttpOnly; Secure; Path=/; SameSite=None; Max-Age=0');
    return response;
  } catch (error) {
    console.error('Sign out error:', error);
    return c.json({ error: 'Sign out failed' }, 500);
  }
}; 