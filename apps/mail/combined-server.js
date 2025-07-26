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
    
    // Handle redirects properly to break the loop
    if (upstreamResp.status >= 300 && upstreamResp.status < 400) {
      const location = upstreamResp.headers.get('location');
      if (location) {
        console.log(`Following redirect to: ${location}`);
        // Always fetch the redirected content instead of redirecting
        // This prevents the redirect loop
        try {
          console.log(`Fetching redirected content from: ${location}`);
          const redirectResp = await fetch(location, {
            method: 'GET',
            headers: {
              'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
              'Accept-Encoding': 'gzip, deflate',
              'Connection': 'keep-alive',
            },
          });
          
          console.log(`Redirect response status: ${redirectResp.status}`);
          
          // Forward the redirect response status and headers
          res.status(redirectResp.status);
          redirectResp.headers.forEach((value, key) => {
            const lowerKey = key.toLowerCase();
            // Don't forward problematic headers
            if (!['content-encoding', 'content-length', 'transfer-encoding', 'connection'].includes(lowerKey)) {
              res.set(key, value);
            }
          });
          
          // Stream the response body
          redirectResp.body.pipe(res);
          return;
        } catch (redirectError) {
          console.error('Failed to fetch redirected content:', redirectError);
          // Fallback: return the original redirect response
          res.status(upstreamResp.status);
          upstreamResp.headers.forEach((value, key) => {
            res.set(key, value);
          });
          upstreamResp.body.pipe(res);
          return;
        }
      }
    }
    
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
  
  // Serve index.html for all non-API and non-auth routes (SPA routing)
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/auth')) {
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
    if (!req.path.startsWith('/api') && !req.path.startsWith('/auth')) {
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
  console.log(`Proxying /auth/* -> https://pitext-mail.prabhatravib.workers.dev/auth/* (with content fetching)`);
  console.log(`Proxying /api/* -> https://pitext-mail.prabhatravib.workers.dev/api/*`);
  console.log(`Serving frontend from: ${buildDir}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}); 