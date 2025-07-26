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
    
    // Prepare headers - remove problematic headers to prevent content decoding issues
    const headers = { ...req.headers };
    delete headers.host;
    delete headers['accept-encoding']; // Prevent compression issues
    delete headers['content-encoding'];
    
    // Set explicit headers for better compatibility
    headers['accept'] = 'application/json, text/plain, */*';
    headers['content-type'] = headers['content-type'] || 'application/json';
    
    // Prepare request options
    let body = undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      // If body is already parsed as JSON, stringify it back
      if (typeof req.body === 'object') {
        body = JSON.stringify(req.body);
      } else {
        body = req.body;
      }
    }
    
    const requestOptions = {
      method: req.method,
      headers,
      body,
    };
    
    console.log('Request body being sent:', body);
    
    const upstreamResp = await fetch(upstreamUrl, requestOptions);
    
    // Forward status
    res.status(upstreamResp.status);
    
    // Forward headers but exclude problematic ones
    upstreamResp.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(lowerKey)) {
        res.set(key, value);
      }
    });
    
    // Set explicit content type for JSON responses
    if (upstreamResp.headers.get('content-type')?.includes('application/json')) {
      res.set('Content-Type', 'application/json');
    }
    
    // Handle response body properly to avoid content decoding issues
    const responseText = await upstreamResp.text();
    
    // Try to parse as JSON if it looks like JSON
    if (responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
      try {
        const jsonData = JSON.parse(responseText);
        res.json(jsonData);
      } catch (parseError) {
        // If JSON parsing fails, send as text
        res.send(responseText);
      }
    } else {
      // Send as text for non-JSON responses
      res.send(responseText);
    }
    
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
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}); 