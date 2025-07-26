import express from 'express';
import { createServer as createViteServer } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function createDevServer() {
  const app = express();

  // Create Vite server in middleware mode
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });

  // Use vite's connect instance as middleware
  app.use(vite.middlewares);

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

  // Parse JSON bodies
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'dev-server' });
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

  // Handle SPA routing - serve index.html for all non-API routes
  app.get('*', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api')) {
      return next();
    }
    
    // Skip static assets
    if (req.path.includes('.')) {
      return next();
    }
    
    // Serve index.html for SPA routes
    res.sendFile(resolve(__dirname, 'dist', 'index.html'));
  });

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`🚀 Development server running on http://localhost:${port}`);
    console.log(`📡 Proxying /api/* -> https://pitext-mail.prabhatravib.workers.dev/api/*`);
  });
}

createDevServer().catch((err) => {
  console.error('Failed to start development server:', err);
  process.exit(1);
}); 