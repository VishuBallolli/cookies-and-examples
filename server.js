const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const PORT = process.env.PORT || 3000;
const SESSION_MAX_AGE = 60 * 60;
const sessions = new Map();
const publicDir = path.join(__dirname, 'public');

const demoUser = {
  username: 'demo',
  name: 'Demo User',
  password: 'cookies123'
};

function parseCookies(request) {
  return Object.fromEntries((request.headers.cookie || '')
    .split(';')
    .map((part) => part.trim().split('='))
    .filter(([name]) => name)
    .map(([name, ...value]) => [name, decodeURIComponent(value.join('='))]));
}

function setCookie(response, name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  parts.push('Path=/');
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  if (options.secure) parts.push('Secure');
  response.setHeader('Set-Cookie', parts.join('; '));
}

function sendJson(response, status, body) {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  response.end(payload);
}

function currentUser(request) {
  const sessionId = parseCookies(request).sid;
  const session = sessionId && sessions.get(sessionId);
  if (!session || session.expiresAt < Date.now()) {
    if (sessionId) sessions.delete(sessionId);
    return null;
  }
  return session.user;
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let data = '';
    request.on('data', (chunk) => { data += chunk; });
    request.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    request.on('error', reject);
  });
}

function serveStatic(request, response) {
  const requested = request.url === '/' ? '/index.html' : request.url;
  const filePath = path.normalize(path.join(publicDir, requested.split('?')[0]));
  if (!filePath.startsWith(publicDir)) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }
    const type = filePath.endsWith('.css') ? 'text/css' : 'text/html';
    response.writeHead(200, { 'Content-Type': `${type}; charset=utf-8` });
    response.end(content);
  });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);

  if (url.pathname === '/api/session' && request.method === 'GET') {
    const user = currentUser(request);
    sendJson(response, 200, { authenticated: Boolean(user), user });
    return;
  }

  if (url.pathname === '/api/login' && request.method === 'POST') {
    try {
      const { username, password } = await readBody(request);
      if (username !== demoUser.username || password !== demoUser.password) {
        sendJson(response, 401, { message: 'Incorrect username or password.' });
        return;
      }

      const sessionId = crypto.randomBytes(32).toString('hex');
      sessions.set(sessionId, {
        user: { username: demoUser.username, name: demoUser.name },
        expiresAt: Date.now() + SESSION_MAX_AGE * 1000
      });
      setCookie(response, 'sid', sessionId, {
        maxAge: SESSION_MAX_AGE,
        httpOnly: true,
        sameSite: 'Lax'
      });
      sendJson(response, 200, { message: 'Logged in.' });
    } catch {
      sendJson(response, 400, { message: 'Please send valid login details.' });
    }
    return;
  }

  if (url.pathname === '/api/logout' && request.method === 'POST') {
    const sessionId = parseCookies(request).sid;
    if (sessionId) sessions.delete(sessionId);
    setCookie(response, 'sid', '', { maxAge: 0, httpOnly: true, sameSite: 'Lax' });
    sendJson(response, 200, { message: 'Logged out.' });
    return;
  }

  if (url.pathname === '/api/private-data' && request.method === 'GET') {
    const user = currentUser(request);
    if (!user) {
      sendJson(response, 401, { message: 'Log in to view this section.' });
      return;
    }
    sendJson(response, 200, {
      message: `Welcome to the private section, ${user.name}.`,
      tip: 'The browser only has a session id; the user record stays on the server.'
    });
    return;
  }

  if (request.method === 'GET') serveStatic(request, response);
  else sendJson(response, 404, { message: 'Not found.' });
});

server.listen(PORT, () => {
  console.log(`Cookie sections demo running at http://localhost:${PORT}`);
});