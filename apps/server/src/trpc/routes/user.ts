import { privateProcedure, router } from '../trpc';
import jwt from '@tsndr/cloudflare-worker-jwt';

export const userRouter = router({
  delete: privateProcedure.mutation(async ({ ctx }) => {
    // For now, return success since we're not using better-auth
    // TODO: Implement proper user deletion logic
    return { success: true, message: 'User deletion not implemented yet' };
  }),
  getIntercomToken: privateProcedure.query(async ({ ctx }) => {
    const token = await jwt.sign(
      {
        user_id: ctx.sessionUser.id,
        email: ctx.sessionUser.email,
        name: ctx.sessionUser.name || ctx.sessionUser.email,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour expiration
      },
      ctx.c.env.JWT_SECRET,
    );
    return token;
  }),
});
