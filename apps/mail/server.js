import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createServer as createViteServer } from 'vite';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 10000;

// Parse JSON bodies
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Proxy auth endpoints to Cloudflare Workers backend
app.use('/auth', async (req, res) => {
  try {
    const upstreamUrl = 'https://pitext-mail.prabhatravib.workers.dev' + req.originalUrl;
    
    console.log(`Proxying auth ${req.method} ${req.originalUrl} -> ${upstreamUrl}`);
    
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
    console.error('Auth proxy error:', error);
    res.status(500).json({ 
      error: 'Auth proxy error', 
      message: error.message 
    });
  }
});

// Proxy API endpoints to Cloudflare Workers backend
app.use('/api', async (req, res) => {
  try {
    const upstreamUrl = 'https://pitext-mail.prabhatravib.workers.dev' + req.originalUrl;
    
    console.log(`Proxying API ${req.method} ${req.originalUrl} -> ${upstreamUrl}`);
    console.log('Request headers:', req.headers);
    
    // Prepare headers - remove host header to avoid conflicts
    const headers = { ...req.headers };
    delete headers.host;
    
    // Prepare request options
    const requestOptions = {
      method: req.method,
      headers,
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : req.body,
    };
    
    console.log('Making upstream request with options:', {
      method: requestOptions.method,
      headers: requestOptions.headers,
      hasBody: !!requestOptions.body
    });
    
    const upstreamResp = await fetch(upstreamUrl, requestOptions);
    
    console.log('Upstream response status:', upstreamResp.status);
    console.log('Upstream response headers:', Object.fromEntries(upstreamResp.headers.entries()));
    
    // Forward status and headers
    res.status(upstreamResp.status);
    upstreamResp.headers.forEach((value, key) => {
      res.set(key, value);
    });
    
    // Stream the response body
    upstreamResp.body.pipe(res);
    
  } catch (error) {
    console.error('API proxy error:', error);
    res.status(500).json({ 
      error: 'API proxy error', 
      message: error.message 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    proxy: 'enabled',
    origin: req.headers.origin,
    host: req.headers.host
  });
});

// Serve static files from the build directory
app.use(express.static(join(__dirname, 'build/client')));

// Handle all routes by serving the index.html file (SPA)
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'build/client/index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${port}`);
  console.log(`Proxying /auth/* -> https://pitext-mail.prabhatravib.workers.dev/auth/*`);
  console.log(`Proxying /api/* -> https://pitext-mail.prabhatravib.workers.dev/api/*`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
}); 