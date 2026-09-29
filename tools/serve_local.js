#!/usr/bin/env node
/**
 * serve_local.js - Zero-Dependency Localhost Production Preview Server
 *
 * Accurately mirrors Cloudflare Pages / Workers routing:
 * - GET / -> 302 Redirect to /landing/
 * - GET /landing/ -> Serves dist_web/landing/index.html (Interactive 3D Hardware Labs)
 * - GET /app/ -> Serves dist_web/app/index.html (Complete Clariora Exam Simulator)
 * - Full MIME type registry, byte-range streaming, and clean SPA fallbacks.
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist_web');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8'
};

function serveFile(req, res, filePath) {
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found: ' + filePath);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const totalSize = stats.size;

    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

      if (start >= totalSize || end >= totalSize) {
        res.writeHead(416, { 'Content-Range': `bytes */${totalSize}` });
        res.end();
        return;
      }

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${totalSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': (end - start) + 1,
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      });

      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': totalSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*'
      });
      fs.createReadStream(filePath).pipe(res);
    }
  });
}

function createServer() {
  return http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    let pathname = decodeURIComponent(parsedUrl.pathname);

    // Root redirect to marketing landing page (identical to Cloudflare Worker)
    if (pathname === '/' || pathname === '') {
      res.writeHead(302, { 'Location': '/landing/' + (parsedUrl.search || '') });
      res.end();
      return;
    }

    // App shell route
    if (pathname === '/app' || pathname === '/app/') {
      const appIndex = path.join(DIST, 'app', 'index.html');
      if (fs.existsSync(appIndex)) {
        serveFile(req, res, appIndex);
        return;
      }
      pathname = '/index.html';
    }

    // Landing directory index
    if (pathname === '/landing' || pathname === '/landing/') {
      pathname = '/landing/index.html';
    }

    let filePath = path.join(DIST, pathname);

    // If requesting directory, check for index.html
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    // Check if file exists in dist_web
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      serveFile(req, res, filePath);
      return;
    }

    // Fallback: check ROOT workspace directory
    let rootPath = path.join(ROOT, pathname);
    if (fs.existsSync(rootPath) && fs.statSync(rootPath).isDirectory()) {
      rootPath = path.join(rootPath, 'index.html');
    }
    if (fs.existsSync(rootPath) && fs.statSync(rootPath).isFile()) {
      serveFile(req, res, rootPath);
      return;
    }

    // Fallback for SPA sub-routes under /app/*
    if (pathname.startsWith('/app/')) {
      const appIndex = path.join(DIST, 'app', 'index.html');
      if (fs.existsSync(appIndex)) {
        serveFile(req, res, appIndex);
        return;
      }
    }

    // Default 404
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html><html><head><title>404 Not Found</title></head><body style="background:#0b0b0f;color:#f5f5f7;font-family:sans-serif;padding:40px;text-align:center;"><h2>Page Not Found</h2><p><a href="/landing/" style="color:#d4af37;">Go to Landing Page</a> | <a href="/app/" style="color:#d4af37;">Go to Exam Simulator App</a></p></body></html>`);
  });
}

function startServer(port) {
  const server = createServer();
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} in use, trying ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });

  server.listen(port, () => {
    console.log('\n==============================================================');
    console.log('CLARIORA A+ PRODUCTION LOCALHOST PREVIEW SERVER');
    console.log('==============================================================');
    console.log(`  * Landing Page (3D Labs): http://localhost:${port}/landing/`);
    console.log(`  * Exam Simulator App:     http://localhost:${port}/app/`);
    console.log(`  * Root Redirect:          http://localhost:${port}/ -> /landing/`);
    console.log('==============================================================\n');
  });
}

const defaultPort = parseInt(process.env.PORT || '8787', 10);
startServer(defaultPort);
