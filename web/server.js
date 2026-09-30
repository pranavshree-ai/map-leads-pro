/**
 * MapsLead Studio Pro - Web UI & API Gateway Server
 * High-performance, zero-dependency Node.js server.
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = parseInt(process.env.PORT || '8080', 10);
const ENGINE_HOST = process.env.ENGINE_HOST || '127.0.0.1';
const ENGINE_PORT = parseInt(process.env.ENGINE_PORT || '8081', 10);
const PUBLIC_DIR = path.join(__dirname, 'public');

// Geocoding cache to minimize external requests
const geoCache = new Map();

// MIME Types map
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

/**
 * Robust CSV parser handling quotes, line breaks, and escaped characters
 */
function parseCSV(text) {
  const lines = [];
  let row = [];
  let inQuotes = false;
  let currentField = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(currentField);
      if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
        lines.push(row);
      }
      row = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField || row.length > 0) {
    row.push(currentField);
    lines.push(row);
  }

  if (lines.length === 0) return [];

  const headers = lines[0].map(h => h.trim());
  const results = [];

  for (let r = 1; r < lines.length; r++) {
    const values = lines[r];
    const entry = {};
    for (let c = 0; c < headers.length; c++) {
      entry[headers[c]] = values[c] !== undefined ? values[c].trim() : '';
    }
    results.push(entry);
  }

  return results;
}

/**
 * Handle Geocoding requests via OpenStreetMap Nominatim
 */
function handleGeocode(query, res) {
  if (!query || !query.trim()) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Missing query parameter "q"' }));
    return;
  }

  const cleanQuery = query.trim().toLowerCase();
  if (geoCache.has(cleanQuery)) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(geoCache.get(cleanQuery)));
    return;
  }

  const searchUrl = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
    format: 'json',
    limit: '1',
    q: query.trim()
  }).toString()}`;

  const req = https.get(searchUrl, {
    headers: {
      'User-Agent': 'MapsLead-Studio/2.0 (Local Intelligence Platform; support@mapslead.local)'
    }
  }, (apiRes) => {
    let body = '';
    apiRes.on('data', chunk => { body += chunk; });
    apiRes.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (data && data.length > 0) {
          const result = {
            lat: data[0].lat,
            lon: data[0].lon,
            displayName: data[0].display_name
          };
          geoCache.set(cleanQuery, result);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Location not found' }));
        }
      } catch (e) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Geocoding service error', details: e.message }));
      }
    });
  });

  req.on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Geocoding connection failed', details: err.message }));
  });
}

/**
 * Fetch and parse leads for a specific job ID
 */
function handleLeads(jobId, res) {
  const options = {
    hostname: ENGINE_HOST,
    port: ENGINE_PORT,
    path: `/api/v1/jobs/${encodeURIComponent(jobId)}/download`,
    method: 'GET',
    headers: { 'Accept': 'text/csv' }
  };

  const req = http.request(options, (engineRes) => {
    if (engineRes.statusCode !== 200) {
      res.writeHead(engineRes.statusCode, { 'Content-Type': 'application/json' });
      engineRes.pipe(res);
      return;
    }

    let csvBuffer = '';
    engineRes.setEncoding('utf8');
    engineRes.on('data', chunk => { csvBuffer += chunk; });
    engineRes.on('end', () => {
      try {
        const rows = parseCSV(csvBuffer);
        
        // Compute summary metrics
        let withEmail = 0;
        let withPhone = 0;
        let withWebsite = 0;
        let totalRating = 0;
        let ratingCount = 0;

        const cleanLeads = rows.map(r => {
          const emails = r.emails || r.email || '';
          const phone = r.phone || '';
          const website = r.website || '';
          const rating = parseFloat(r.review_rating || r.rating || '0') || 0;

          if (emails) withEmail++;
          if (phone) withPhone++;
          if (website) withWebsite++;
          if (rating > 0) {
            totalRating += rating;
            ratingCount++;
          }

          return {
            title: r.title || r.name || 'Unnamed Business',
            category: r.category || '',
            phone: phone,
            email: emails,
            website: website,
            address: r.address || r.complete_address || '',
            rating: rating,
            reviews: parseInt(r.review_count || r.reviews || '0', 10) || 0,
            latitude: r.latitude || '',
            longitude: r.longitude || '',
            googleUrl: r.link || ''
          };
        });

        const stats = {
          total: cleanLeads.length,
          withEmail,
          withPhone,
          withWebsite,
          avgRating: ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : 'N/A'
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ stats, leads: cleanLeads }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to parse results', details: err.message }));
      }
    });
  });

  req.on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Scraper engine unreachable', details: err.message }));
  });

  req.end();
}

/**
 * Proxy request directly to the backend scraper engine
 */
function proxyToEngine(req, res, targetPath) {
  const options = {
    hostname: ENGINE_HOST,
    port: ENGINE_PORT,
    path: targetPath,
    method: req.method,
    headers: { ...req.headers, host: `${ENGINE_HOST}:${ENGINE_PORT}` }
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Cannot connect to scraper engine',
      details: err.message,
      hint: 'Ensure gmaps-scraper container is running'
    }));
  });

  req.pipe(proxyReq);
}

/**
 * Serve static frontend assets
 */
function serveStatic(req, res, filePath) {
  let normalizedPath = path.normalize(filePath);
  if (normalizedPath === '/' || normalizedPath === '\\') {
    normalizedPath = '/index.html';
  }

  const safePath = path.join(PUBLIC_DIR, normalizedPath);

  // Security: prevent directory traversal
  if (!safePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Access Denied');
    return;
  }

  fs.stat(safePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html for client-side navigation
      const indexPath = path.join(PUBLIC_DIR, 'index.html');
      fs.readFile(indexPath, (readErr, content) => {
        if (readErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(content);
        }
      });
      return;
    }

    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=86400'
    });

    fs.createReadStream(safePath).pipe(res);
  });
}

// Create Main Server
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // CORS headers for local API flexibility
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 1. Helper API: Geocoding
  if (pathname === '/api/geocode' && req.method === 'GET') {
    handleGeocode(parsedUrl.query.q, res);
    return;
  }

  // 2. Helper API: Enriched Leads with Statistics
  const leadsMatch = pathname.match(/^\/api\/leads\/([a-zA-Z0-9_-]+)$/);
  if (leadsMatch && req.method === 'GET') {
    handleLeads(leadsMatch[1], res);
    return;
  }

  // 3. System Status / Health API
  if (pathname === '/api/health') {
    // Check engine connection
    const healthReq = http.request({
      hostname: ENGINE_HOST,
      port: ENGINE_PORT,
      path: '/api/v1/jobs',
      method: 'GET',
      timeout: 3000
    }, (engineRes) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'online',
        engineStatus: engineRes.statusCode === 200 ? 'connected' : 'error',
        timestamp: new Date().toISOString()
      }));
    });

    healthReq.on('error', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'online',
        engineStatus: 'disconnected',
        timestamp: new Date().toISOString()
      }));
    });

    healthReq.end();
    return;
  }

  // 4. Reverse Proxy for Scraper API (/api/v1/* and /api/docs)
  if (pathname.startsWith('/api/v1/') || pathname === '/api/docs') {
    proxyToEngine(req, res, req.url);
    return;
  }

  // 5. Static Assets (UI)
  serveStatic(req, res, pathname);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🚀 MapsLead Studio Pro Web UI running on port ${PORT}`);
  console.log(`📡 Connecting to Scraper Engine at ${ENGINE_HOST}:${ENGINE_PORT}`);
  console.log(`🌐 Open in your browser: http://localhost:${PORT}`);
  console.log(`=======================================================`);
});
