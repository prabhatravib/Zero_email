import { privateProcedure, router } from '../trpc';

// Simplified user router that returns mock data
export const userRouter = router({
  delete: privateProcedure.mutation(async ({ ctx }) => {
    // Return mock success
    return { success: true, message: 'User deleted successfully' };
  }),
  getIntercomToken: privateProcedure.query(async ({ ctx }) => {
    // Return mock JWT token
    return 'mock-intercom-token';
  }),
});
