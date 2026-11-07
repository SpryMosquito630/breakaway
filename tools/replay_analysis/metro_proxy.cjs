// Only the explicit analysis routes below are exposed. Uploaded bytes stream to localhost; no files served.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const MAX_BYTES = 50 * 1024 * 1024;
module.exports = function analysisMiddleware(next, projectRoot) {
  const runtimePath = path.join(projectRoot, 'work/replay-service/runtime.json');
  return (req, res, fallback) => {
    const route = req.url?.split('?')[0];
    const routes = { '/api/replay/health': '/health', '/api/replay/analyze': '/analyze', '/api/replay/chat': '/chat', '/api/replay/coach': '/coach', '/api/replay/pose': '/pose', '/api/replay/food': '/food' };
    if (!routes[route]) return next(req, res, fallback);
    const reply = (status, body) => {
      if (res.headersSent) return res.destroy();
      res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-User-Token',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' });
      res.end(JSON.stringify(body));
    };
    if (req.method === 'OPTIONS') return reply(200, { ok: true });
    if ((route.endsWith('/health') && req.method !== 'GET') || (!route.endsWith('/health') && req.method !== 'POST'))
      return reply(405, { error: { code: 'method_not_allowed', message: 'Unsupported request method.' } });
    const maxBytes = route.endsWith('/food') ? 5 * 1024 * 1024 : MAX_BYTES;
    let runtime;
    try { runtime = JSON.parse(fs.readFileSync(runtimePath, 'utf8')); } catch {
      return reply(503, { available: false, error: { code: 'service_unavailable', message: 'Connect to the analysis computer to use this feature.' } });
    }
    const port = Number(runtime.port);
    if (!Number.isInteger(port) || port < 1024 || port > 65535) return reply(503, { available: false });
    if (Number(req.headers['content-length'] || 0) > maxBytes) return reply(413, { error: { code: 'upload_too_large', message: route.endsWith('/food') ? 'Choose a photo smaller than 5 MB.' : 'Choose a video smaller than 50 MB.' } });
    const headers = { 'content-type': req.headers['content-type'] || 'application/octet-stream',
      authorization: req.headers.authorization || '', 'x-user-token': req.headers['x-user-token'] || '', connection: 'close' };
    if (req.headers['content-length']) headers['content-length'] = req.headers['content-length'];
    const upstream = http.request({ host: '127.0.0.1', port, path: routes[route], method: req.method, headers }, response => {
      res.writeHead(response.statusCode, { ...response.headers, 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' });
      response.pipe(res);
    });
    let bytes = 0;
    req.on('data', chunk => { bytes += chunk.length; if (bytes > maxBytes) { upstream.destroy(); reply(413, { error: { code: 'upload_too_large', message: route.endsWith('/food') ? 'Choose a photo smaller than 5 MB.' : 'Choose a video smaller than 50 MB.' } }); } });
    upstream.on('error', () => reply(503, { available: false, error: { code: 'service_unavailable', message: 'The analysis computer is unavailable. Try again when it is connected.' } }));
    upstream.setTimeout(125000, () => upstream.destroy());
    req.on('aborted', () => upstream.destroy());
    res.on('close', () => { if (!res.writableEnded) upstream.destroy(); });
    req.pipe(upstream);
  };
};
