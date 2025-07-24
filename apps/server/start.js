#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get port from environment or default to 10000
const port = process.env.PORT || 10000;

console.log(`Starting proxy server on port: ${port}`);

// Start the proxy server
const proxy = spawn('node', [
  'proxy.js'
], {
  stdio: 'inherit',
  cwd: __dirname,
  env: {
    ...process.env,
    PORT: port.toString()
  }
});

proxy.on('error', (error) => {
  console.error('Failed to start proxy:', error);
  process.exit(1);
});

proxy.on('exit', (code) => {
  console.log(`Proxy process exited with code ${code}`);
  process.exit(code);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  proxy.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  proxy.kill('SIGINT');
}); 