// src/googleAuth.ts
import { SignJWT, importPKCS8 } from 'jose';

export type SAEnv = { GOOGLE_SERVICE_ACCOUNT: string };

let cachedToken: { value: string; exp: number } | null = null;

export async function getAccessToken(env: SAEnv, scope = 'https://www.googleapis.com/auth/cloud-platform') {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.value;

  console.log('Getting access token for scope:', scope);
  
  const sa = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT);
  const privateKey = String(sa.private_key).replace(/\\n/g, '\n');
  const clientEmail = sa.client_email;
  
  console.log('Service account client email:', clientEmail);
  console.log('Private key length:', privateKey.length);

  try {
    const pk = await importPKCS8(privateKey, 'RS256');
    console.log('Private key imported successfully');

  // JWT assertion for OAuth2 SA flow
  const iat = now;
  const exp = now + 3600;
  console.log('Creating JWT assertion...');
  const jwt = await new SignJWT({ scope })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(clientEmail)     // iss
    .setSubject(clientEmail)    // sub
    .setAudience('https://oauth2.googleapis.com/token') // aud
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .sign(pk);
  
  console.log('JWT created successfully, length:', jwt.length);

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: jwt
  });

  console.log('Exchanging JWT for access token...');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  console.log('Token exchange response status:', res.status);
  
  if (!res.ok) {
    const text = await res.text();
    console.error('Token exchange failed:', text);
    throw new Error(`Token exchange failed ${res.status}: ${text}`);
  }

  const { access_token, expires_in } = await res.json() as { access_token: string; expires_in: number };
  console.log('Access token received, length:', access_token.length);
  cachedToken = { value: access_token, exp: now + Math.min(expires_in, 3600) };
  return access_token;
  } catch (error) {
    console.error('Error in getAccessToken:', error);
    throw error;
  }
} 