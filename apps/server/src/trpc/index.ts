import { type inferRouterInputs, type inferRouterOutputs } from '@trpc/server';
import { cookiePreferencesRouter } from './routes/cookies';
import { connectionsRouter } from './routes/connections';
import { categoriesRouter } from './routes/categories';
import { shortcutRouter } from './routes/shortcut';
import { settingsRouter } from './routes/settings';
import { getContext } from 'hono/context-storage';
import { draftsRouter } from './routes/drafts';
import { labelsRouter } from './routes/label';
import { notesRouter } from './routes/notes';
// import { brainRouter } from './routes/brain'; // Temporarily disabled for startup optimization
import { userRouter } from './routes/user';
import { mailRouter } from './routes/mail';
import { bimiRouter } from './routes/bimi';
import type { HonoContext } from '../ctx';
// AI router temporarily disabled for startup optimization
// import { aiRouter } from './routes/ai';
import { router } from './trpc';

export const appRouter = router({
  // ai: aiRouter, // Temporarily disabled for startup optimization
  bimi: bimiRouter,
  // brain: brainRouter, // Temporarily disabled for startup optimization
  categories: categoriesRouter,
  connections: connectionsRouter,
  cookiePreferences: cookiePreferencesRouter,
  drafts: draftsRouter,
  labels: labelsRouter,
  mail: mailRouter,
  notes: notesRouter,
  shortcut: shortcutRouter,
  settings: settingsRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;

export type Inputs = inferRouterInputs<AppRouter>;
export type Outputs = inferRouterOutputs<AppRouter>;

export const serverTrpc = () => {
  const c = getContext<HonoContext>();
  return appRouter.createCaller({
    c,
    sessionUser: c.var.sessionUser,
    auth: c.var.auth,
    autumn: c.var.autumn,
  });
};
