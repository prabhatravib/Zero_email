import type { HonoContext } from '../ctx';
import jwt from '@tsndr/cloudflare-worker-jwt';

export const testHandler = (c: HonoContext) => c.json({ message: 'Server is working!' });

export const testTrpcHandler = (c: HonoContext) => c.json({ message: 'tRPC test endpoint' });

export const testJwtHandler = async (c: HonoContext) => {
    const env = c.env as any;
    
    try {
        // Test JWT signing
        const testPayload = {
            email: 'test@example.com',
            name: 'Test User',
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