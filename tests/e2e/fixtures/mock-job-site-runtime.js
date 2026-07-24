'use strict';

const http = require('http');
const {
  addApplication,
  getApplicationCount,
  getCookieCount,
  getRequestCount,
  recordRequest,
  resetMockState,
} = require('./mock-job-site-state');
const { getApplicationFormHtml, getMultiStepFormHtml } = require('./mock-job-site-markup');

function parseFormData(body, boundary) {
  const parts = body.split(`--${boundary}`);
  const data = {};
  for (const part of parts) {
    if (part.includes('name=')) {
      const match = part.match(/name="([^"]+)"/);
      if (match) {
        const contentMatch = part.match(/\r\n\r\n([\s\S]*?)\r\n/);
        if (contentMatch && match[1] !== 'resume') data[match[1]] = contentMatch[1].trim();
      }
    }
  }
  return data;
}

function createRequestHandler(port) {
  return async (req, res) => {
    recordRequest();
    const url = new URL(req.url, `http://localhost:${port}`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    if (url.pathname === '/__admin/reset' && req.method === 'POST') {
      resetMockState();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, count: getApplicationCount() }));
      return;
    }
    if (url.pathname === '/__admin/applications/count' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ count: getApplicationCount(), requestCount: getRequestCount() }));
      return;
    }
    if (url.pathname === '/stealth/check') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ userAgent: req.headers['user-agent'] || 'unknown', cookies: getCookieCount(), timestamp: Date.now() }));
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 200));
    if (url.pathname === '/error/500') {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error' }));
      return;
    }
    if (url.pathname === '/error/timeout') {
      await new Promise((resolve) => setTimeout(resolve, 30000));
      res.writeHead(200);
      res.end('ok');
      return;
    }
    if (url.pathname.match(/^\/jobs\/.+$/)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(getApplicationFormHtml(url.pathname.split('/').pop()));
      return;
    }
    if (url.pathname === '/apply' || url.pathname === '/apply/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(getApplicationFormHtml());
      return;
    }
    if (url.pathname === '/apply/multistep') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(getMultiStepFormHtml());
      return;
    }
    if (url.pathname === '/apply/submit' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          const contentType = req.headers['content-type'] || '';
          let applicationData = {};
          if (contentType.includes('multipart/form-data')) {
            applicationData = parseFormData(body, contentType.split('boundary=')[1]);
          } else if (contentType.includes('application/json')) {
            applicationData = JSON.parse(body);
          } else {
            applicationData = Object.fromEntries(new URLSearchParams(body));
          }
          if (!applicationData.name || !applicationData.email) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: '이름과 이메일은 필수입니다.' }));
            return;
          }
          const applicationId = `MOCK-${Date.now()}`;
          addApplication({ id: applicationId, ...applicationData, submittedAt: new Date().toISOString(), userAgent: req.headers['user-agent'] });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, applicationId, message: '지원이 완료되었습니다.' }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
      return;
    }
    if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', requestCount: getRequestCount() }));
    }
    if (url.pathname === '/favicon.ico' || url.pathname === '/favicon.png') {
      res.writeHead(204);
      res.end();
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  };
}

function createMockServerInternal(port = 9393) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(createRequestHandler(port));
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`[Mock Server] Port ${port} already in use - assuming singleton is running`);
        resolve(null);
      } else {
        reject(err);
      }
    });
    server.listen(port, () => {
      console.log(`[Mock Server] Server started on port ${port}`);
      resolve(server);
    });
  });
}

module.exports = { createMockServerInternal };
