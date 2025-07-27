// Types-only export for client-side usage
// This prevents server-side code from being bundled into the client

import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import type { appRouter } from './index';

// Export only the type, not the implementation
export type AppRouter = typeof appRouter;

// Export inferred types for client usage
export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>; 