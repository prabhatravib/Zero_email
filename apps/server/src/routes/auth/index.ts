import { exchangeTokenHandler } from './exchange-token';
import { getSessionHandler } from './get-session';
import { signInSocialHandler } from './sign-in-social';
import { googleCallbackHandler } from './callback-google';
import type { HonoContext } from '../../ctx';
import type { Hono } from 'hono';
import { googleAuth } from '@hono/auth-js/providers/google';
import { Hono } from 'hono';

export const registerAuthRoutes = (app: Hono<any>) => {
    app.get('/auth/login/google', async (c) => {
        const auth = googleAuth({
            clientId: c.env.GOOGLE_CLIENT_ID,
            clientSecret: c.env.GOOGLE_CLIENT_SECRET,
            scope: ['https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile'],
        });
        return auth(c);
    })
    .get('/auth/google/callback', googleCallbackHandler);
}; 