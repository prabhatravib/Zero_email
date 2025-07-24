#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Google OAuth Credentials Setup');
console.log('=====================================');
console.log('');
console.log('To set your actual Google OAuth credentials:');
console.log('');
console.log('1. Replace the placeholder values in .dev.vars with your actual credentials:');
console.log('');
console.log('   GOOGLE_CLIENT_ID=your_actual_google_client_id_here');
console.log('   GOOGLE_CLIENT_SECRET=your_actual_google_client_secret_here');
console.log('');
console.log('2. Replace "your_actual_google_client_id_here" with your real Google Client ID');
console.log('3. Replace "your_actual_google_client_secret_here" with your real Google Client Secret');
console.log('');
console.log('4. Then run: wrangler deploy');
console.log('');
console.log('This approach is secure because:');
console.log('- .dev.vars is in .gitignore (not committed to GitHub)');
console.log('- Credentials are only stored locally');
console.log('- wrangler.jsonc uses environment variables');
console.log('');
console.log('Current .dev.vars content:');
console.log('------------------------');

const devVarsPath = path.join(__dirname, '.dev.vars');
if (fs.existsSync(devVarsPath)) {
  const content = fs.readFileSync(devVarsPath, 'utf8');
  console.log(content);
} else {
  console.log('File does not exist yet');
} 