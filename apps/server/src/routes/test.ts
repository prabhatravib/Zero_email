import type { HonoContext } from '../ctx';
import jwt from '@tsndr/cloudflare-worker-jwt';

export const testHandler = (c: HonoContext) => c.json({ message: 'Server is working!' });

export const testTrpcHandler = (c: HonoContext) => c.json({ message: 'tRPC test endpoint' });

export const testJwtHandler = async (c: HonoContext) => {
    const env = c.env as any;
    
    try {
        // Test JWT signing with same structure as OAuth JWT
        const testPayload = {
            email: 'test@example.com',
            name: 'Test User',
            picture: 'https://example.com/test.jpg',
            access_token: 'test_access_token_12345',
            refresh_token: 'test_refresh_token_67890',
            exp: Math.floor(Date.now() / 1000) + 3600,
            iat: Math.floor(Date.now() / 1000)
        };
        
        console.log('🔍 Test JWT - Creating test token with payload:', testPayload);
        console.log('🔍 Test JWT - JWT_SECRET available:', !!env.JWT_SECRET);
        console.log('🔍 Test JWT - JWT_SECRET length:', env.JWT_SECRET ? env.JWT_SECRET.length : 0);
        
        const testToken = await jwt.sign(testPayload, env.JWT_SECRET);
        console.log('🔍 Test JWT - Test token created:', testToken.substring(0, 20) + '...');
        
        // Test JWT verification
        const isValid = await jwt.verify(testToken, env.JWT_SECRET);
        console.log('🔍 Test JWT - Verification result:', isValid);
        
        // Test JWT decoding
        const decodedPayload = jwt.decode(testToken);
        console.log('🔍 Test JWT - Decoded payload:', decodedPayload);
        
        return c.json({
            success: true,
            testToken: testToken,
            verificationResult: isValid,
            decodedPayload: decodedPayload,
            jwtSecretAvailable: !!env.JWT_SECRET,
            jwtSecretLength: env.JWT_SECRET ? env.JWT_SECRET.length : 0
        });
        
    } catch (error) {
        console.error('🔍 Test JWT - Error:', error);
        return c.json({
            success: false,
            error: error.message,
            stack: error.stack,
            jwtSecretAvailable: !!env.JWT_SECRET,
            jwtSecretLength: env.JWT_SECRET ? env.JWT_SECRET.length : 0
        }, 500);
    }
};

export const testDecodeHandler = async (c: HonoContext) => {
    const token = c.req.query('token');
    
    if (!token) {
        return c.json({ error: 'No token provided' }, 400);
    }
    
    try {
        console.log('🔍 Test Decode - Token provided:', token.substring(0, 20) + '...');
        
        // Try to decode without verification first
        const decoded = jwt.decode(token);
        console.log('🔍 Test Decode - Decoded payload:', decoded);
        
        return c.json({
            success: true,
            decoded: decoded,
            tokenLength: token.length
        });
        
    } catch (error) {
        console.error('🔍 Test Decode - Error:', error);
        return c.json({
            success: false,
            error: error.message
        }, 500);
    }
};

export const testJwtVerifyHandler = async (c: HonoContext) => {
    const token = c.req.query('token');
    const env = c.env as any;
    
    if (!token) {
        return c.json({ error: 'No token provided' }, 400);
    }
    
    try {
        console.log('🔍 Test JWT Verify - Token provided:', token.substring(0, 20) + '...');
        console.log('🔍 Test JWT Verify - JWT_SECRET available:', !!env.JWT_SECRET);
        console.log('🔍 Test JWT Verify - JWT_SECRET length:', env.JWT_SECRET ? env.JWT_SECRET.length : 0);
        
        // Test JWT verification
        const isValid = await jwt.verify(token, env.JWT_SECRET);
        console.log('🔍 Test JWT Verify - Verification result:', isValid);
        
        // Decode the token
        const decoded = jwt.decode(token);
        console.log('🔍 Test JWT Verify - Decoded payload:', decoded);
        
        return c.json({
            success: true,
            verificationResult: isValid,
            decoded: decoded,
            tokenLength: token.length,
            jwtSecretAvailable: !!env.JWT_SECRET,
            jwtSecretLength: env.JWT_SECRET ? env.JWT_SECRET.length : 0
        });
        
    } catch (error) {
        console.error('🔍 Test JWT Verify - Error:', error);
        return c.json({
            success: false,
            error: error.message,
            stack: error.stack,
            jwtSecretAvailable: !!env.JWT_SECRET,
            jwtSecretLength: env.JWT_SECRET ? env.JWT_SECRET.length : 0
        }, 500);
    }
};

export const testTrpcAuthHandler = async (c: HonoContext) => {
    const env = c.env as any;
    
    console.log('🔍 Test tRPC Auth - ENTRY POINT - Handler is being called');
    console.log('🔍 Test tRPC Auth - Request URL:', c.req.url);
    console.log('🔍 Test tRPC Auth - Request method:', c.req.method);
    
    // Try to get session from multiple possible headers
    let sessionToken = c.req.header('X-Session-Token');
    if (!sessionToken) {
        const authHeader = c.req.header('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            sessionToken = authHeader.substring(7); // Remove 'Bearer ' prefix
        }
    }
    
    console.log('🔍 Test tRPC Auth - Session token:', sessionToken ? 'present' : 'missing');
    console.log('🔍 Test tRPC Auth - JWT_SECRET available:', !!env.JWT_SECRET);
    console.log('🔍 Test tRPC Auth - JWT_SECRET length:', env.JWT_SECRET ? env.JWT_SECRET.length : 0);
    console.log('🔍 Test tRPC Auth - X-Session-Token header:', c.req.header('X-Session-Token') ? 'present' : 'missing');
    console.log('🔍 Test tRPC Auth - Authorization header:', c.req.header('Authorization') ? 'present' : 'missing');
    
    let sessionUser: any = null;
    
    if (sessionToken) {
        try {
            console.log('🔍 Test tRPC Auth - Attempting to verify JWT session token');
            console.log('🔍 Test tRPC Auth - Token starts with:', sessionToken.substring(0, 20) + '...');
            console.log('🔍 Test tRPC Auth - Token length:', sessionToken.length);
            
            // Check if token looks like a JWT (three parts separated by dots)
            const tokenParts = sessionToken.split('.');
            console.log('🔍 Test tRPC Auth - Token parts count:', tokenParts.length);
            
            if (tokenParts.length !== 3) {
                console.error('🔍 Test tRPC Auth - Token does not have 3 parts, not a valid JWT');
                return c.json({ error: 'Invalid JWT format' }, 401);
            }
            
            // Try to decode the header and payload for debugging
            try {
                const header = JSON.parse(atob(tokenParts[0]));
                const payload = JSON.parse(atob(tokenParts[1]));
                console.log('🔍 Test tRPC Auth - JWT header:', header);
                console.log('🔍 Test tRPC Auth - JWT payload:', payload);
                console.log('🔍 Test tRPC Auth - JWT expiration:', payload.exp ? new Date(payload.exp * 1000).toISOString() : 'no exp');
                console.log('🔍 Test tRPC Auth - Current time:', new Date().toISOString());
                
                // Check if token is expired
                if (payload.exp && Date.now() > payload.exp * 1000) {
                    console.error('🔍 Test tRPC Auth - JWT token is expired');
                    return c.json({ error: 'JWT token expired' }, 401);
                }
            } catch (decodeError) {
                console.error('🔍 Test tRPC Auth - Failed to decode JWT parts:', decodeError);
            }
            
            // Verify the JWT token
            const isValid = await jwt.verify(sessionToken, env.JWT_SECRET);
            console.log('🔍 Test tRPC Auth - JWT verification result:', isValid);
            
            if (!isValid) {
                console.error('🔍 Test tRPC Auth - JWT token verification failed');
                return c.json({ error: 'Invalid JWT token' }, 401);
            }
            
            // Decode the JWT payload
            const payload = jwt.decode(sessionToken);
            console.log('🔍 Test tRPC Auth - JWT payload:', payload);
            console.log('🔍 Test tRPC Auth - JWT token verified successfully');
            
            // Create session user from JWT payload
            sessionUser = {
                id: payload.email,
                email: payload.email,
                name: payload.name || payload.email,
                emailVerified: true,
                createdAt: new Date(),
                updatedAt: new Date(),
                image: payload.picture || null,
                // Include access token for API calls
                accessToken: payload.access_token,
                refreshToken: payload.refresh_token
            };
            
            console.log('🔍 Test tRPC Auth - Session user created from JWT:', sessionUser.email);
            
            return c.json({
                success: true,
                sessionUser: sessionUser,
                message: 'Authentication successful'
            });
            
        } catch (error) {
            console.error('🔍 Test tRPC Auth - Error verifying JWT token:', error);
            console.error('🔍 Test tRPC Auth - Error details:', {
                message: error.message,
                stack: error.stack,
                tokenLength: sessionToken.length,
                hasJWTSecret: !!env.JWT_SECRET,
                jwtSecretLength: env.JWT_SECRET ? env.JWT_SECRET.length : 0
            });
            
            return c.json({
                success: false,
                error: error.message,
                details: {
                    tokenLength: sessionToken.length,
                    hasJWTSecret: !!env.JWT_SECRET,
                    jwtSecretLength: env.JWT_SECRET ? env.JWT_SECRET.length : 0
                }
            }, 401);
        }
    } else {
        return c.json({
            success: false,
            error: 'No session token provided'
        }, 401);
    }
}; 