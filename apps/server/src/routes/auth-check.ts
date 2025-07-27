import type { HonoContext } from '../ctx';

export const authCheckHandler = async (c: HonoContext) => {
    try {
        console.log('🔍 Auth check - Request headers:', Object.fromEntries(c.req.header()));
        console.log('🔍 Auth check - Session user from context:', c.var.sessionUser ? 'present' : 'null');
        
        const sessionUser = c.var.sessionUser;
        if (sessionUser) {
            console.log('🔍 Auth check - User authenticated:', sessionUser.email);
            return c.json({
                authenticated: true,
                user: {
                    id: sessionUser.id,
                    email: sessionUser.email,
                    name: sessionUser.name
                },
                headers: {
                    hasSessionToken: !!c.req.header('X-Session-Token'),
                    hasAuthorization: !!c.req.header('Authorization'),
                    origin: c.req.header('Origin')
                }
            });
        } else {
            console.log('🔍 Auth check - No session found');
            return c.json({
                authenticated: false,
                message: 'No session found',
                headers: {
                    hasSessionToken: !!c.req.header('X-Session-Token'),
                    hasAuthorization: !!c.req.header('Authorization'),
                    origin: c.req.header('Origin')
                }
            }, 401);
        }
    } catch (error) {
        console.error('🔍 Auth check - Error:', error);
        return c.json({
            authenticated: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        }, 500);
    }
}; 