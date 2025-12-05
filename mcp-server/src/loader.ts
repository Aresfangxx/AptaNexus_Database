import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { toRecord, validateRecord, AptamerRecord } from './schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function resolveDataPath(): string {
  const envPath = process.env.APTAMERS_PATH;
  if (envPath && fs.existsSync(envPath)) return envPath;
  const p = path.resolve(__dirname, '../../APTAMERS.jsonl');
  return p;
}

export function loadJSONL(filePath?: string): AptamerRecord[] {
  const p = filePath || resolveDataPath();
  const text = fs.readFileSync(p, 'utf8');
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  const out: AptamerRecord[] = [];
  for (const line of lines) {
    try {
      const raw = JSON.parse(line);
      const rec = toRecord(raw);
      if (rec && validateRecord(rec)) out.push(rec);
    } catch {}
  }
  return out;
}
