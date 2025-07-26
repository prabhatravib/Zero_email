// Cloudflare Workers types - simplified for build compatibility
declare global {
    interface Env {
        [key: string]: any;
    }
}

// Configuration for the server
export const createConfig = (env: any) => ({
    // Google OAuth Configuration
    google: {
        clientId: env.GOOGLE_CLIENT_ID || 'REPLACE_WITH_YOUR_GOOGLE_CLIENT_ID',
        clientSecret: env.GOOGLE_CLIENT_SECRET || 'REPLACE_WITH_YOUR_GOOGLE_CLIENT_SECRET',
        redirectUri: env.GOOGLE_REDIRECT_URI || 'https://pitext-mail.prabhatravib.workers.dev/auth/callback/google',
        scopes: [
            'https://www.googleapis.com/auth/gmail.modify',
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email'
        ].join(' ')
    },
    
    // Application URLs
    app: {
        publicUrl: env.VITE_PUBLIC_APP_URL || 'https://pitext-email.onrender.com'
    },
    
    // CORS Configuration
    cors: {
        allowedOrigins: [
            env.VITE_PUBLIC_APP_URL || 'https://pitext-email.onrender.com',
            'http://localhost:3000', 
            'http://localhost:8787',
            'http://localhost:5173',
            'http://127.0.0.1:5173'
        ],
        allowHeaders: [
            'Content-Type', 
            'Authorization', 
            'X-Session-Token', 
            'Origin', 
            'Accept', 
            'X-Requested-With'
        ],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        exposeHeaders: ['X-Zero-Redirect', 'Set-Cookie'],
        maxAge: 86400 // 24 hours
    }
});

// Helper function to get Google OAuth URL
export function getGoogleOAuthUrl(env: any): string {
    const config = createConfig(env);
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${config.google.clientId}&redirect_uri=${encodeURIComponent(config.google.redirectUri)}&response_type=code&scope=${encodeURIComponent(config.google.scopes)}&access_type=offline`;
} 