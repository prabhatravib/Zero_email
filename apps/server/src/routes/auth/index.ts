import { exchangeTokenHandler } from './exchange-token';
import { getSessionHandler } from './get-session';
import { signInSocialHandler } from './sign-in-social';
import { googleCallbackHandler } from './callback-google';
import type { HonoContext } from '../../ctx';
import type { Hono } from 'hono';

export const registerAuthRoutes = (app: Hono<HonoContext>) => {
    // Register all custom auth routes that the frontend expects
    app.post('/api/auth/exchange-token', exchangeTokenHandler)
       .get('/api/auth/get-session', getSessionHandler)
       .post('/api/auth/sign-in/social', signInSocialHandler)
       .get('/auth/callback/google', googleCallbackHandler);
}; 