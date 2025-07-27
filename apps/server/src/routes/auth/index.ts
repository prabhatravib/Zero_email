import { Hono } from 'hono';
import { auth } from '@hono/auth';
import Google from '@auth/core/providers/google';
import { googleCallbackHandler } from './callback-google.js';
import type { HonoContext } from '../../ctx';

export const registerAuthRoutes = (app: Hono<HonoContext>) => {
  // The @hono/auth middleware handles the /auth/login/google route automatically
  app.use('/auth/*', auth({
    // It's important that the secret is a string of at least 32 characters.
    secret: c => c.env.JWT_SECRET,
    providers: [
      Google({
        clientId: c => c.env.GOOGLE_CLIENT_ID,
        clientSecret: c => c.env.GOOGLE_CLIENT_SECRET,
        scope: ['https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile'],
      }),
    ],
  }));

  // We still need our custom callback handler to manage session creation
  app.get('/auth/google/callback', googleCallbackHandler);
}; 