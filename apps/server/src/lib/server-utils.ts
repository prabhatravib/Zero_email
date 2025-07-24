import { getContext } from 'hono/context-storage';
import { connection } from '../db/schema';
import type { HonoContext } from '../ctx';
import { env } from 'cloudflare:workers';
import { createDriver } from './driver';

export const getZeroDB = async (userId: string) => {
  const stub = env.ZERO_DB.get(env.ZERO_DB.idFromName(userId));
  // Initialize the Durable Object with the userId
  await stub.fetch('', { method: 'POST', body: JSON.stringify({ action: 'init', userId }) });
  return stub;
};

// Helper function to get connection data from Durable Objects
export const getConnectionFromDurableObject = async (connectionId: string) => {
  // Extract userId from connectionId (format: userId_email)
  const userId = connectionId.split('_')[0];
  if (!userId) return null;
  
  const db = await getZeroDB(userId);
  return await db.findUserConnection(connectionId);
};

export const getZeroAgent = async (connectionId: string) => {
  const stub = env.ZERO_DRIVER.get(env.ZERO_DRIVER.idFromName(connectionId));
  const rpcTarget = await stub.setMetaData(connectionId);
  await rpcTarget.setupAuth();
  return rpcTarget;
};

export const getZeroSocketAgent = async (connectionId: string) => {
  const stub = env.ZERO_AGENT.get(env.ZERO_AGENT.idFromName(connectionId));
  return stub;
};

export const getActiveConnection = async () => {
  const c = getContext<HonoContext>();
  const { sessionUser } = c.var;
  if (!sessionUser) throw new Error('Session Not Found');

  console.log('getActiveConnection - Session user:', { id: sessionUser.id, email: sessionUser.email });

  try {
    // Get session token from cookie or header
    const sessionToken = c.req.header('X-Session-Token') || 
      c.req.header('Cookie')?.split(';')
        .find(cookie => cookie.trim().startsWith('session='))
        ?.split('=')[1];

    if (!sessionToken) {
      throw new Error('No session token found');
    }

    const sessionData = JSON.parse(atob(sessionToken));
    console.log('getActiveConnection - Session data:', { 
      userId: sessionData.userId, 
      email: sessionData.email,
      connectionId: sessionData.connectionId,
      hasAccessToken: !!sessionData.access_token
    });

    // Check if session is expired
    if (sessionData.exp && Date.now() > sessionData.exp) {
      throw new Error('Session expired');
    }

    // Check if access token is expired
    if (sessionData.expiresAt && Date.now() > sessionData.expiresAt) {
      throw new Error('Access token expired');
    }

    // Create connection object from session data
    const connection = {
      id: sessionData.connectionId,
      userId: sessionData.userId,
      email: sessionData.email,
      name: sessionData.name,
      picture: sessionData.picture,
      accessToken: sessionData.access_token,
      refreshToken: sessionData.refresh_token,
      scope: sessionData.scope,
      providerId: sessionData.providerId,
      expiresAt: new Date(sessionData.expiresAt),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log('getActiveConnection - Created connection from session:', { id: connection.id, email: connection.email });
    return connection;
  } catch (error) {
    console.error('getActiveConnection - Error:', error);
    throw error;
  }
};

export const connectionToDriver = (activeConnection: typeof connection.$inferSelect) => {
  if (!activeConnection.accessToken || !activeConnection.refreshToken) {
    throw new Error(`Invalid connection ${JSON.stringify(activeConnection?.id)}`);
  }

  return createDriver(activeConnection.providerId, {
    auth: {
      userId: activeConnection.userId,
      accessToken: activeConnection.accessToken,
      refreshToken: activeConnection.refreshToken,
      email: activeConnection.email,
    },
  });
};

export const verifyToken = async (token: string) => {
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to verify token: ${await response.text()}`);
  }

  const data = (await response.json()) as any;
  return !!data;
};
