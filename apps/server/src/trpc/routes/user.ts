import { privateProcedure, router } from '../trpc';
import jwt from '@tsndr/cloudflare-worker-jwt';

export const userRouter = router({
  delete: privateProcedure.mutation(async ({ ctx }) => {
    // For now, return success since we're not using better-auth
    // TODO: Implement proper user deletion logic
    return { success: true, message: 'User deletion not implemented yet' };
  }),
});
