import http from 'http';
import url from 'url';
import { loadJSONL } from './loader.js';
import { searchByTarget, getByDoi, listTargets, getByExternalId, topByPkd } from './search.js';

const data = loadJSONL();
const port = Number(process.env.PORT || 3333);

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url || '', true);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  try {
    if (parsed.pathname === '/search') {
      const q = String(parsed.query.q || '');
      const limit = parsed.query.limit ? Number(parsed.query.limit) : 50;
      const offset = parsed.query.offset ? Number(parsed.query.offset) : 0;
      const out = searchByTarget(data, q, limit, offset);
      res.end(JSON.stringify(out));
      return;
    }
    if (parsed.pathname === '/bydoi') {
      const doi = String(parsed.query.doi || '');
      const out = getByDoi(data, doi);
      res.end(JSON.stringify(out));
      return;
    }
    if (parsed.pathname === '/targets') {
      const q = parsed.query.q ? String(parsed.query.q) : undefined;
      const out = listTargets(data, q);
      res.end(JSON.stringify(out));
      return;
    }
    if (parsed.pathname === '/byid') {
      const id = String(parsed.query.id || '');
      const out = getByExternalId(data, id);
      res.end(JSON.stringify(out));
      return;
    }
    if (parsed.pathname === '/top') {
      const q = String(parsed.query.q || '');
      const n = parsed.query.n ? Number(parsed.query.n) : 3;
      const out = topByPkd(data, q, n);
      res.end(JSON.stringify(out));
      return;
    }
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'not found' }));
  } catch (e: any) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: String(e?.message || e) }));
  }
});

server.listen(port, () => {
  process.stdout.write(JSON.stringify({ http_port: port }) + '\n');
});
