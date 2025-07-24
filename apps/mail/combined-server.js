import express from 'express';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Parse JSON bodies
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'combined-server' });
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

// Serve static files from the build directory
const buildDir = join(__dirname, 'build', 'client');
if (existsSync(buildDir)) {
  app.use(express.static(buildDir));
  
  // Serve index.html for all non-API routes (SPA routing)
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      const indexPath = join(buildDir, 'index.html');
      if (existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Frontend not built yet');
      }
    }
  });
} else {
  // Fallback if build directory doesn't exist
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.status(404).json({ 
        error: 'Frontend not available', 
        message: 'Build directory not found' 
      });
    }
  });
}

const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`Combined server listening on port ${port}`);
  console.log(`Proxying /api/* -> https://pitext-mail.prabhatravib.workers.dev/api/*`);
  console.log(`Serving frontend from: ${buildDir}`);
}); 