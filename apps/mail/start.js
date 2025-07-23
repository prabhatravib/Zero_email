#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get port from environment or default to 10000
const port = process.env.PORT || 10000;

// Check if we're in production and should use static serving
const isProduction = process.env.NODE_ENV === 'production';
const useStaticServer = isProduction || process.env.USE_STATIC_SERVER === 'true';

if (useStaticServer) {
  console.log('Starting static server for production deployment...');
  
  // Check if build directory exists
  const buildPath = join(__dirname, 'build/client');
  if (!existsSync(buildPath)) {
    console.error('Build directory not found. Please run "pnpm run build" first.');
    process.exit(1);
  }
  
  // Start static server
  const server = spawn('node', ['server.js'], {
    stdio: 'inherit',
    cwd: __dirname,
    env: {
      ...process.env,
      PORT: port.toString()
    }
  });
  
  server.on('error', (error) => {
    console.error('Failed to start static server:', error);
    process.exit(1);
  });
  
  server.on('exit', (code) => {
    console.log(`Static server process exited with code ${code}`);
    process.exit(code);
  });
  
  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    server.kill('SIGTERM');
  });
  
  process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully...');
    server.kill('SIGINT');
  });
} else {
  // Get wrangler environment from environment or default to local
  const wranglerEnv = process.env.WRANGLER_ENV || 'local';
  
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
} 