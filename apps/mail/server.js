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

// Debug endpoint to check what files are available
app.get('/debug/assets', (req, res) => {
  const fs = require('fs');
  const assetsPath = join(__dirname, 'build/client/assets');
  
  try {
    const files = fs.readdirSync(assetsPath);
    const jsFiles = files.filter(f => f.endsWith('.js'));
    res.json({
      totalFiles: files.length,
      jsFiles: jsFiles,
      assetsPath: assetsPath
    });
  } catch (error) {
    res.json({
      error: error.message,
      assetsPath: assetsPath
    });
  }
});

// Specific route handler for JavaScript files to ensure proper MIME types
app.get('*.js', (req, res) => {
  const fs = require('fs');
  const filePath = join(__dirname, 'build/client', req.path);
  
  console.log('JS file request:', req.path, '->', filePath);
  
  if (fs.existsSync(filePath)) {
    console.log('JS file found, serving with proper MIME type');
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(filePath);
  } else {
    console.log('JS file not found, returning 404');
    res.status(404).send('JavaScript file not found');
  }
});

// Serve static files from the build directory with proper MIME types
app.use(express.static(join(__dirname, 'build/client'), {
  setHeaders: (res, path) => {
    console.log('Serving static file:', path);
    
    // Set proper MIME types for JavaScript files
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
      console.log('Set Content-Type: application/javascript for:', path);
    } else if (path.endsWith('.mjs')) {
      res.setHeader('Content-Type', 'application/javascript');
      console.log('Set Content-Type: application/javascript for:', path);
    } else if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (path.endsWith('.woff2')) {
      res.setHeader('Content-Type', 'font/woff2');
    } else if (path.endsWith('.woff')) {
      res.setHeader('Content-Type', 'font/woff');
    } else if (path.endsWith('.ttf')) {
      res.setHeader('Content-Type', 'font/ttf');
    } else if (path.endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml');
    } else if (path.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    }
  }
}));

// Handle all other routes by serving the index.html file (SPA)
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