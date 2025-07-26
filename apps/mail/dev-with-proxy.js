import express from 'express';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Parse JSON bodies
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Custom middleware to fix MIME types
app.use((req, res, next) => {
  // Fix MIME types for JavaScript files
  if (req.url.endsWith('.js')) {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  } else if (req.url.endsWith('.mjs')) {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  } else if (req.url.endsWith('.css')) {
    res.setHeader('Content-Type', 'text/css; charset=utf-8');
  } else if (req.url.endsWith('.json')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
  }
  
  // Set CORS headers for development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-Token');
  
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'dev-with-proxy' });
});

// Proxy all /api requests to the Cloudflare Workers backend
app.use('/api', async (req, res) => {
  try {
    const upstreamUrl = 'https://pitext-mail.prabhatravib.workers.dev' + req.originalUrl;
    
    console.log(`Proxying ${req.method} ${req.originalUrl} -> ${upstreamUrl}`);
    
    // Prepare headers - remove host header to avoid conflicts
    const headers = { ...req.headers };
    delete headers.host;
    
    // Prepare request options
    const requestOptions = {
      method: req.method,
      headers,
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : req.body,
    };
    
    const upstreamResp = await fetch(upstreamUrl, requestOptions);
    
    // Forward status and headers
    res.status(upstreamResp.status);
    upstreamResp.headers.forEach((value, key) => {
      res.set(key, value);
    });
    
    // Stream the response body
    upstreamResp.body.pipe(res);
    
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      error: 'Proxy error', 
      message: error.message 
    });
  }
});

// Proxy all other requests to React Router dev server
app.use('*', (req, res) => {
  // Forward to React Router dev server on port 3000
  const targetUrl = `http://localhost:3000${req.originalUrl}`;
  
  fetch(targetUrl, {
    method: req.method,
    headers: req.headers,
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : req.body,
  })
  .then(response => {
    // Forward status and headers
    res.status(response.status);
    response.headers.forEach((value, key) => {
      res.set(key, value);
    });
    
    // Stream the response body
    response.body.pipe(res);
  })
  .catch(error => {
    console.error('Forward error:', error);
    res.status(500).json({ 
      error: 'Forward error', 
      message: error.message 
    });
  });
});

// Start React Router dev server
console.log('🚀 Starting React Router dev server...');
const reactRouterDev = spawn('npx', ['react-router', 'dev'], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    PORT: '3000'
  }
});

reactRouterDev.on('error', (error) => {
  console.error('Failed to start React Router dev server:', error);
  process.exit(1);
});

// Start proxy server
const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`🚀 Enhanced development server running on http://localhost:${port}`);
  console.log(`📡 Proxying /api/* -> https://pitext-mail.prabhatravib.workers.dev/api/*`);
  console.log(`🔧 Fixed MIME types for JavaScript modules`);
  console.log(`🔄 Forwarding other requests to React Router dev server on port 3000`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down servers...');
  reactRouterDev.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down servers...');
  reactRouterDev.kill();
  process.exit(0);
}); 