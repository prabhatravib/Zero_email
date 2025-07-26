import express from 'express';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

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
  res.status(200).json({ status: 'ok', service: 'proxy' });
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

// Serve static files with proper MIME types
app.use('/assets', express.static(resolve(__dirname, 'dist/assets'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    }
  }
}));

// Serve other static files
app.use(express.static(resolve(__dirname, 'dist'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    }
  }
}));

// Handle SPA routing - serve index.html for all non-API routes
app.get('*', (req, res) => {
  // Skip API routes
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ 
      error: 'Not found', 
      message: 'This proxy only handles /api routes' 
    });
  }
  
  // Serve index.html for SPA routes
  res.sendFile(resolve(__dirname, 'dist', 'index.html'));
});

const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`🚀 Enhanced proxy server listening on port ${port}`);
  console.log(`📡 Proxying /api/* -> https://pitext-mail.prabhatravib.workers.dev/api/*`);
  console.log(`🔧 Fixed MIME types for JavaScript modules`);
}); 