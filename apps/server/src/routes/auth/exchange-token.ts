import type { HonoContext } from '../../ctx';

export const exchangeTokenHandler = async (c: HonoContext) => {
    // Handle exchange token exchange
    try {
        const body = await c.req.json();
        const { exchangeToken } = body;
        
        if (!exchangeToken) {
            return c.json({ error: 'Exchange token required' }, 400);
        }
        
        const env = c.env as any;
        const db = env.ZERO_DB;
        const sessionObj = db.get(db.idFromName('sessions'));
        
        const response = await sessionObj.fetch('http://localhost/exchange', {
            method: 'POST',
            body: JSON.stringify({ exchangeToken }),
        });
        
        if (response.ok) {
            const data = await response.json();
            return c.json({ 
                sessionId: data.sessionId,
                user: {
                    id: data.sessionData.email,
                    email: data.sessionData.email,
                    name: data.sessionData.name,
                    image: data.sessionData.picture,
                }
            });
        } else {
            const errorText = await response.text();
            return c.json({ error: errorText }, response.status);
        }
    } catch (error) {
        console.error('Exchange token error:', error);
        return c.json({ error: 'Exchange failed' }, 500);
    }
}; 