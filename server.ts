import express from 'express';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import JSZip from 'jszip';

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const ROOT_DIR = __dirname;
const SQLITE_DB_PATH = path.join(ROOT_DIR, 'public', 'data', 'netflix_insights.db');

const EXCLUDED_DIRS = new Set([
  'node_modules',
  'dist',
  '.git',
  '.next',
  '.cache',
]);

function addDirectoryToZip(zip: JSZip, dirPath: string, zipBase = '') {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (EXCLUDED_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dirPath, entry.name);
    const relPath = zipBase ? `${zipBase}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      addDirectoryToZip(zip, fullPath, relPath);
    } else if (entry.isFile()) {
      const content = fs.readFileSync(fullPath);
      zip.file(relPath, content);
    }
  }
}

function validateReadOnlySql(sql: string): string {
  const trimmed = sql.trim().replace(/;+\s*$/, '');
  if (!trimmed) {
    throw new Error('Query cannot be empty.');
  }
  if (trimmed.includes(';')) {
    throw new Error('Only a single SQL statement may be executed at a time.');
  }
  const strippedComments = trimmed
    .replace(/--[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim();
  if (!/^(SELECT|WITH)\b/i.test(strippedComments)) {
    throw new Error('Only read-only SELECT or WITH queries are permitted.');
  }
  const forbidden = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|ATTACH|DETACH|REPLACE|VACUUM|REINDEX|PRAGMA)\b/i;
  if (forbidden.test(strippedComments)) {
    throw new Error('Write or schema-modifying SQL statements are not allowed.');
  }
  return trimmed;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '64kb' }));

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', project: 'Netflix Insights', author: 'Rohit Shinde' });
  });

  // Read-only live SQLite query execution endpoint
  app.post('/api/sql-query', async (req, res) => {
    try {
      const rawSql = typeof req.body?.sql === 'string' ? req.body.sql : '';
      const safeSql = validateReadOnlySql(rawSql);

      if (!fs.existsSync(SQLITE_DB_PATH)) {
        res.status(503).json({ error: 'SQLite database is not initialized.' });
        return;
      }

      const pyScript = `
import json, sqlite3, sys, time
db_path = sys.argv[1]
sql = sys.argv[2]
start = time.perf_counter()
conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
cur = conn.cursor()
cur.execute(sql)
cols = [d[0] for d in (cur.description or [])]
rows = cur.fetchmany(500)
elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
print(json.dumps({"columns": cols, "rows": rows, "rowCount": len(rows), "truncated": len(rows) == 500, "executionMs": elapsed_ms}))
`;
      const { stdout } = await execFileAsync('python3', ['-c', pyScript, SQLITE_DB_PATH, safeSql], {
        timeout: 5000,
        maxBuffer: 2 * 1024 * 1024,
      });

      const parsed = JSON.parse(stdout);
      res.json(parsed);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'SQL execution failed';
      res.status(400).json({ error: msg });
    }
  });

  // Download complete exportable project ZIP (source code + cleaned data + SQL + README + scripts)
  app.get('/api/export-project-zip', async (_req, res) => {
    try {
      const zip = new JSZip();
      addDirectoryToZip(zip, ROOT_DIR);
      const buffer = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="netflix-insights-rohit-shinde.zip"'
      );
      res.setHeader('Content-Length', buffer.length.toString());
      res.send(buffer);
    } catch (err) {
      console.error('Error building project ZIP:', err);
      res.status(500).json({ error: 'Failed to generate project archive' });
    }
  });

  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(ROOT_DIR, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Netflix Insights server running at http://localhost:${PORT}`);
  });
}

startServer();
