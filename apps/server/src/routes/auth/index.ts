import { Hono } from 'hono';
import { registerGoogleAuthRoutes } from './google.js';
import { sessionHandler, signOutHandler } from './session.js';
import type { HonoContext } from '../../ctx';

export const registerAuthRoutes = (app: Hono<HonoContext>) => {
  // Register the unified Google OAuth routes
  registerGoogleAuthRoutes(app);
  
  // Session management endpoints
  app.get('/auth/session', sessionHandler);
  app.post('/auth/signout', signOutHandler);
}; 