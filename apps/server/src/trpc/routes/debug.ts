import { privateProcedure, router } from '../trpc';
import { getZeroDB } from '../../lib/server-utils';
import { TRPCError } from '@trpc/server';

export const debugRouter = router({
  checkUserConnections: privateProcedure.query(async ({ ctx }) => {
    const { sessionUser } = ctx;
    
    try {
      const db = await getZeroDB(sessionUser.id);
      
      // Check if user exists
      const userData = await db.findUser();
      
      // Get all connections for the user
      const connections = await db.findManyConnections();
      
      return {
        userId: sessionUser.id,
        userExists: !!userData,
        userData: userData ? {
          id: userData.id,
          email: userData.email,
          name: userData.name,
          defaultConnectionId: userData.defaultConnectionId,
        } : null,
        connectionsCount: connections.length,
        connections: connections.map(conn => ({
          id: conn.id,
          email: conn.email,
          providerId: conn.providerId,
          hasAccessToken: !!conn.accessToken,
          hasRefreshToken: !!conn.refreshToken,
          expiresAt: conn.expiresAt,
        })),
      };
    } catch (error) {
      console.error('Debug error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }),
  
  checkDatabaseTables: privateProcedure.query(async ({ ctx }) => {
    const { sessionUser } = ctx;
    
    try {
      const db = await getZeroDB(sessionUser.id);
      
      // Try to query the connection table directly
      const result = await db.findManyConnections();
      
      return {
        success: true,
        connectionsFound: result.length,
        message: 'Database connection working',
      };
    } catch (error) {
      console.error('Database check error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Database connection failed',
      };
    }
  }),
}); 