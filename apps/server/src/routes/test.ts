import type { HonoContext } from '../ctx';

export const testHandler = (c: HonoContext) => c.json({ message: 'Server is working!' });

export const testDbHandler = async (c: HonoContext) => {
    try {
        const env = c.env as any;
        const db = env.ZERO_DB;
        
        if (!db) {
            return c.json({ error: 'ZERO_DB not available' }, 500);
        }
        
        const sessionObj = db.get(db.idFromName('sessions'));
        if (!sessionObj) {
            return c.json({ error: 'Failed to get session object' }, 500);
        }
        
        // Test the session object
        const testResponse = await sessionObj.fetch('http://localhost/test', {
            method: 'GET'
        });
        
        if (testResponse.ok) {
            return c.json({ message: 'ZERO_DB is working!', dbTest: 'success' });
        } else {
            return c.json({ error: 'ZERO_DB test failed', status: testResponse.status });
        }
    } catch (error) {
        return c.json({ error: 'ZERO_DB test error', details: error instanceof Error ? error.message : String(error) }, 500);
    }
};

export const testTrpcHandler = (c: HonoContext) => c.json({ message: 'tRPC test endpoint' }); 