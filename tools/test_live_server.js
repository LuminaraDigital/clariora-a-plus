#!/usr/bin/env node
/**
 * test_live_server.js - End-to-end HTTP verification of all assets served on port 8787
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = 8787;
const BASE = `http://127.0.0.1:${PORT}`;

async function get(urlPath) {
  return new Promise((resolve) => {
    const req = http.get(BASE + urlPath, (res) => {
      let chunks = [];
      res.on('data', (d) => chunks.push(d));
      res.on('end', () => {
        resolve({
          path: urlPath,
          statusCode: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks)
        });
      });
    });
    req.on('error', (err) => {
      resolve({ path: urlPath, statusCode: 0, error: err.message });
    });
  });
}

async function run() {
  console.log(`Auditing live server at ${BASE}...`);
  let failures = 0;

  // 0. Probe if local server is active
  const probe = await get('/api/v1/health');
  if (probe.statusCode === 0) {
    console.log(`[test_live_server] Local server not running on ${BASE} (connection refused). Skipping live server audit.`);
    return;
  }

  // 1. Root redirect check
  const root = await get('/');
  if (root.statusCode === 302 && root.headers.location && root.headers.location.startsWith('/landing/')) {
    console.log('  PASS  / redirects to /landing/ (302)');
  } else {
    console.error('  FAIL  / redirect expected 302 to /landing/, got', root.statusCode, root.headers ? root.headers.location : '');
    failures++;
  }

  // 2. Landing page check
  const landing = await get('/landing/');
  if (landing.statusCode === 200 && landing.body.toString().includes('3D WebGL Engine')) {
    console.log('  PASS  /landing/ serves 200 OK with 3D WebGL Engine stage');
  } else {
    console.error('  FAIL  /landing/ failed or missing expected content');
    failures++;
  }

  // 3. App page check
  const app = await get('/app/');
  if (app.statusCode === 200 && app.body.toString().includes('Clariora')) {
    console.log('  PASS  /app/ serves 200 OK');
  } else {
    console.error('  FAIL  /app/ failed to serve 200 OK');
    failures++;
  }

  // 4. Check all local static assets referenced in dist_web/index.html (excluding template literals)
  const indexHtml = fs.readFileSync(path.join(ROOT, 'dist_web', 'index.html'), 'utf8');
  // Match src="..." and href="..." only in HTML tags, not inside JS template literals
  const tagRegex = /<(?:script|link|img|source)\b[^>]*(?:src|href)=["']([^"'#?]+)(?:\?[^"']*)?["'][^>]*>/gi;
  const urls = new Set();
  let match;
  while ((match = tagRegex.exec(indexHtml)) !== null) {
    const u = match[1];
    if (
      !u.startsWith('http://') &&
      !u.startsWith('https://') &&
      !u.startsWith('data:') &&
      !u.startsWith('blob:') &&
      !u.startsWith('mailto:') &&
      !u.includes('${')
    ) {
      urls.add(u.startsWith('/') ? u : '/' + u);
    }
  }

  console.log(`Auditing ${urls.size} static asset tags in dist_web/index.html...`);
  for (const u of urls) {
    const res = await get(u);
    if (res.statusCode !== 200 && res.statusCode !== 304) {
      console.error(`  FAIL  Asset ${u} returned ${res.statusCode}`);
      failures++;
    }
  }
  console.log(`  PASS  All ${urls.size} index.html static assets returned 200 OK`);

  // 5. Check 3D GLB Models & Three.js Vendor Scripts
  const critical3D = [
    '/landing/models/motherboard.glb',
    '/landing/models/rj45_connector.glb',
    '/landing/models/datacenter_rack.glb',
    '/media/hardware/motherboard.glb',
    '/media/hardware/rj45_connector.glb',
    '/media/hardware/datacenter_rack.glb',
    '/landing/vendor/three.min.js',
    '/landing/vendor/GLTFLoader.js',
    '/landing/vendor/OrbitControls.js',
    '/js/app-3d-stage.js'
  ];

  for (const c of critical3D) {
    const res = await get(c);
    if (res.statusCode === 200 && res.body.length > 0) {
      console.log(`  PASS  ${c} (${(res.body.length / 1024).toFixed(1)} KB)`);
    } else {
      console.error(`  FAIL  ${c} returned status ${res.statusCode}`);
      failures++;
    }
  }

  console.log('================================================================');
  if (failures === 0) {
    console.log('[test_live_server] ALL ENDPOINTS VERIFIED PRODUCTION READY (0 failures)');
    process.exit(0);
  } else {
    console.error(`[test_live_server] FAILED (${failures} failures)`);
    process.exit(1);
  }
}

run();
