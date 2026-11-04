const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = Number(process.env.PORT) || 8080;
const ROOT = __dirname;
const PHP_BIN = fs.existsSync('C:\\xampp\\php\\php.exe') ? 'C:\\xampp\\php\\php.exe' : 'php';
const BACKUP_FILE = path.join(ROOT, 'data_backup.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.sql': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  const [pathname, queryString = ''] = req.url.split('?');

  // Endpoint penyimpanan cadangan otomatis di disk (data_backup.json)
  if (pathname === '/backup.json') {
    if (req.method === 'POST') {
      let chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        try {
          const raw = Buffer.concat(chunks).toString('utf8');
          fs.writeFileSync(BACKUP_FILE, raw, 'utf8');
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: true }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: false, error: e.message }));
        }
      });
      return;
    } else {
      if (fs.existsSync(BACKUP_FILE)) {
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-cache'
        });
        res.end(fs.readFileSync(BACKUP_FILE, 'utf8'));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false }));
      }
      return;
    }
  }

  // Route API CRUD ke MySQL (phpMyAdmin) via PHP
  if (pathname === '/api.php') {
    let bodyChunks = [];
    req.on('data', (chunk) => bodyChunks.push(chunk));
    req.on('end', () => {
      const rawBody = Buffer.concat(bodyChunks);
      const phpScript = path.join(ROOT, 'api.php');
      const child = spawn(PHP_BIN, [phpScript, queryString], {
        cwd: ROOT,
        env: {
          ...process.env,
          REQUEST_METHOD: req.method
        }
      });

      let stdoutChunks = [];
      let stderrChunks = [];

      child.stdout.on('data', (d) => stdoutChunks.push(d));
      child.stderr.on('data', (d) => stderrChunks.push(d));

      child.on('close', (code) => {
        const out = Buffer.concat(stdoutChunks).toString('utf8').trim();
        const errOut = Buffer.concat(stderrChunks).toString('utf8').trim();
        if (code !== 0 && !out) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: false, error: errOut || 'PHP execution error' }));
          return;
        }
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-cache'
        });
        res.end(out);
      });

      if (rawBody.length > 0) {
        child.stdin.write(rawBody);
      }
      child.stdin.end();
    });
    return;
  }

  const relPath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const filePath = path.join(ROOT, path.normalize(decodeURIComponent(relPath)));

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Server BAST (Terhubung ke MySQL db_bast_pjlp & Auto-Backup) berjalan di http://localhost:${PORT}`);
});
