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
// Temporarily disabled brain router to fix Cloudflare startup timeout
// import { brainRouter } from './routes/brain';
import { userRouter } from './routes/user';
import { mailRouter } from './routes/mail';
import { bimiRouter } from './routes/bimi';
import type { HonoContext } from '../ctx';
// Temporarily disabled AI router to fix Cloudflare startup timeout
// import { aiRouter } from './routes/ai';
import { router } from './trpc';

export const appRouter = router({
  // Temporarily disabled AI functionality to fix Cloudflare startup timeout
  // ai: aiRouter,
  bimi: bimiRouter,
  // Temporarily disabled brain functionality to fix Cloudflare startup timeout
  // brain: brainRouter,
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
  });
};
