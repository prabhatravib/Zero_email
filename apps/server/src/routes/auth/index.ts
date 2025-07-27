import { Hono } from 'hono';
import { googleAuth } from '@hono/oauth-providers/google';
import { googleCallbackHandler } from './callback-google.js';
import type { HonoContext } from '../../ctx';

export const registerAuthRoutes = (app: Hono<HonoContext>) => {
  // Use the googleAuth middleware to handle the entire OAuth flow
  app.use(
    '/auth/google/callback',
    googleAuth({
      client_id: c => c.env.GOOGLE_CLIENT_ID,
      client_secret: c => c.env.GOOGLE_CLIENT_SECRET,
      scope: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/gmail.readonly',
      ],
    })
  );

  // After the middleware, our custom callback handler will run.
  // The middleware places 'token' and 'user-google' in the context.
  app.get('/auth/google/callback', googleCallbackHandler);
}; 