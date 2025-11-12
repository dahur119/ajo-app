const http = require('http');
const { URL } = require('url');

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

function json(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function notFound(res) {
  json(res, 404, { error: 'Not Found' });
}

function parseBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        resolve({});
      }
    });
  });
}

function genId(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  // Simple health check
  if (req.method === 'GET' && path === '/health') {
    return json(res, 200, { ok: true });
  }

  // Groups: create
  if (req.method === 'POST' && path === '/transactions/groups') {
    const body = await parseBody(req);
    const id = genId('grp');
    return json(res, 201, { id, group: { id, name: body?.name || 'Group' } });
  }

  // Cycles: create
  if (req.method === 'POST' && path === '/transactions/cycles') {
    const id = genId('cyc');
    return json(res, 201, { id, cycle: { id } });
  }

  // Cycles: status
  const statusMatch = path.match(/^\/transactions\/cycles\/([^/]+)\/status$/);
  if (req.method === 'GET' && statusMatch) {
    const id = statusMatch[1];
    return json(res, 200, { id, status: 'active' });
  }

  return notFound(res);
});

server.listen(PORT, () => {
  console.log(`[mock-transaction-service] listening on http://localhost:${PORT}`);
});