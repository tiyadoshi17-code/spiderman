const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, 'public');

// Mock in-memory leaderboard if Upstash isn't provided
let inMemoryScores = [];
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

async function readScores() {
  if (!UPSTASH_URL) return inMemoryScores;
  try {
    const res = await fetch(`${UPSTASH_URL}/get/scores`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
    });
    const data = await res.json();
    return data.result ? JSON.parse(data.result) : [];
  } catch (err) {
    console.error('readScores failed', err);
    return [];
  }
}

async function writeScores(list) {
  if (!UPSTASH_URL) {
    inMemoryScores = list;
    return;
  }
  await fetch(`${UPSTASH_URL}/set/scores`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    body: JSON.stringify(list),
  });
}

const server = http.createServer((req, res) => {
  // API: leaderboard
  if (req.url === '/leaderboard' && req.method === 'GET') {
    readScores().then(list => {
      list.sort((a, b) => {
         if (a.time === null) return 1;
         if (b.time === null) return -1;
         return a.time - b.time;
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(list));
    });
    return;
  }

  // API: score
  if (req.method === 'POST' && req.url === '/register') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const { name } = JSON.parse(body);
        if (name) {
          const list = await readScores();
          if (!list.find(s => s.name === name)) {
            list.push({ name, time: null, status: 'PLAYING' });
            await writeScores(list);
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } else {
          res.writeHead(400); res.end('Bad Request');
        }
      } catch (err) {
        res.writeHead(400); res.end('Bad Request');
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/score') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const entry = JSON.parse(body);
        if (!entry.name || typeof entry.time !== 'number') {
          res.writeHead(400); res.end('Invalid entry'); return;
        }
        
        entry.name = entry.name.slice(0, 20);
        const list = await readScores();
        
        const existing = list.find(e => e.name === entry.name);
        if (existing) {
          existing.time = entry.time;
          existing.status = 'FINISHED';
        } else {
          entry.status = 'FINISHED';
          list.push(entry);
        }
        
        await writeScores(list);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, duplicate: false }));
      } catch (err) {
        res.writeHead(400); res.end('Bad request');
      }
    });
    return;
  }

  // Static file serving
  // Remove query params if any
  let cleanUrl = req.url.split('?')[0];
  let filePath = cleanUrl === '/' ? '/index.html' : cleanUrl;
  filePath = path.join(ROOT, filePath);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  const ext = path.extname(filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) { 
      res.writeHead(404); res.end('Not found'); return; 
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
