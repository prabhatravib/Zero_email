#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get port from environment or default to 10000
const port = process.env.PORT || 10000;

// Get wrangler environment from environment or default to render
const wranglerEnv = process.env.WRANGLER_ENV || 'render';

console.log(`Starting Wrangler with environment: ${wranglerEnv}, port: ${port}`);

// Start wrangler with proper host binding
const wrangler = spawn('npx', [
  'wrangler',
  'dev',
  '--port', port.toString(),
  '--host', '0.0.0.0',
  '--show-interactive-dev-session=false',
  '--env', wranglerEnv
], {
  stdio: 'inherit',
  cwd: __dirname,
  env: {
    ...process.env,
    WRANGLER_ENV: wranglerEnv
  }
});

wrangler.on('error', (error) => {
  console.error('Failed to start wrangler:', error);
  process.exit(1);
});

wrangler.on('exit', (code) => {
  console.log(`Wrangler process exited with code ${code}`);
  process.exit(code);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  wrangler.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  wrangler.kill('SIGINT');
}); 