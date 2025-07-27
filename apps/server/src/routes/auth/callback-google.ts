import type { HonoContext } from '../../ctx';
import jwt from '@tsndr/cloudflare-worker-jwt';

type GoogleUser = {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
};

type GoogleToken = {
  token: string;
  expires_in: number;
};

export const googleCallbackHandler = async (c: HonoContext) => {
  const env = c.env as any;
  const publicUrl = env.VITE_PUBLIC_APP_URL || 'https://pitext-email.onrender.com';

  // Data is placed in context by the googleAuth middleware
  const googleUser = c.get('user-google') as GoogleUser;
  const token = c.get('token') as GoogleToken;

  if (!googleUser || !token) {
    console.error('Google auth middleware did not provide user or token.');
    return c.redirect(`${publicUrl}/auth/google/callback?error=auth_middleware_failed`);
  }

  try {
    // Create a session JWT for our application
    const sessionPayload = {
      userId: googleUser.id,
      email: googleUser.email,
      name: googleUser.name,
      picture: googleUser.picture,
      accessToken: token.token,
      // Note: @hono/oauth-providers does not provide a refresh token directly in this flow.
      // This may need to be handled differently if long-lived sessions are required.
      refreshToken: undefined, 
      scope: c.get('granted-scopes')?.join(' '),
      expiresAt: Date.now() + (token.expires_in || 3600) * 1000,
      iat: Math.floor(Date.now() / 1000),
    };

    const sessionToken = await jwt.sign(sessionPayload, env.JWT_SECRET);

    // Redirect back to the frontend with the session token
    const successUrlParams = new URLSearchParams({
      success: 'true',
      email: googleUser.email,
      name: googleUser.name || '',
      picture: googleUser.picture || '',
      session: sessionToken,
    });

    const successUrl = `${publicUrl}/auth/google/callback?${successUrlParams.toString()}`;
    
    return c.redirect(successUrl);

  } catch (err) {
    console.error('Failed to create session JWT in googleCallbackHandler:', err);
    return c.redirect(`${publicUrl}/auth/google/callback?error=session_creation_failed`);
  }
}; 