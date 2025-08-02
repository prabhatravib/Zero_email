import { getContext } from 'hono/context-storage';
import { connection } from '../db/schema';
import type { HonoContext } from '../ctx';
import { env } from 'cloudflare:workers';
import { createDriver } from './driver';
import { eq } from 'drizzle-orm';
import { createDb } from '../db';

export const getZeroDB = async (userId: string) => {
  const stub = env.ZERO_DB.get(env.ZERO_DB.idFromName(userId));
  const rpcTarget = await stub.setMetaData(userId);
  return rpcTarget;
};

export const getZeroAgent = async (connectionId: string) => {
  try {
    console.log('[getZeroAgent] Starting with connectionId:', connectionId);
    const stub = env.ZERO_DRIVER.get(env.ZERO_DRIVER.idFromName(connectionId));
    console.log('[getZeroAgent] Got stub, setting metadata...');
    const rpcTarget = await stub.setMetaData(connectionId);
    console.log('[getZeroAgent] Got rpcTarget, setting up auth...');
    await rpcTarget.setupAuth();
    console.log('[getZeroAgent] Auth setup complete, returning rpcTarget');
    return rpcTarget;
  } catch (error) {
    console.error('[getZeroAgent] Error:', error);
    console.error('[getZeroAgent] Error stack:', error.stack);
    console.error('[getZeroAgent] Error name:', error.name);
    console.error('[getZeroAgent] Error message:', error.message);
    throw error;
  }
};

export const getZeroSocketAgent = async (connectionId: string) => {
  const stub = env.ZERO_AGENT.get(env.ZERO_AGENT.idFromName(connectionId));
  return stub;
};

export const getActiveConnection = async () => {
  const c = getContext<HonoContext>();
  const { sessionUser } = c.var;
  if (!sessionUser) throw new Error('Session Not Found');

  const db = await getZeroDB(sessionUser.id);

  const userData = await db.findUser();

  if (userData?.defaultConnectionId) {
    const activeConnection = await db.findUserConnection(userData.defaultConnectionId);
    if (activeConnection) return activeConnection;
  }

  const firstConnection = await db.findFirstConnection();
  if (!firstConnection) {
    console.error(`No connections found for user ${sessionUser.id}`);
    throw new Error('No connections found for user');
  }

  return firstConnection;
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

export const resetConnection = async (connectionId: string) => {
  const { db, conn } = createDb(env.HYPERDRIVE.connectionString);
  await db
    .update(connection)
    .set({
      accessToken: null,
      refreshToken: null,
    })
    .where(eq(connection.id, connectionId));
  await conn.end();
};
