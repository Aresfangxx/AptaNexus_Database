import { toRecord, validateRecord, AptamerRecord } from './schema.js';

// Default URL if not specified
const DEFAULT_DATA_URL = 'https://www.aptanexus.com/APTAMERS.jsonl';

export function resolveDataURL(): string {
  return process.env.APTAMERS_URL || DEFAULT_DATA_URL;
}

// Load data from a URL with retry logic
async function loadFromURL(url: string, maxRetries = 3): Promise<AptamerRecord[]> {
  console.error(`Loading data from URL: ${url}`);

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.error(`Attempt ${attempt}/${maxRetries}...`);

      // Fetch with 60 second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'aptamer-mcp-server/0.1.0'
        }
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();
      const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
      const out: AptamerRecord[] = [];
      for (const line of lines) {
        try {
          const raw = JSON.parse(line);
          const rec = toRecord(raw);
          if (rec && validateRecord(rec)) out.push(rec);
        } catch {}
      }
      console.error(`✓ Successfully loaded ${out.length} records from URL`);
      return out;

    } catch (error: any) {
      lastError = error;
      const errorMsg = error.name === 'AbortError'
        ? 'Request timeout (60s)'
        : error.message;
      console.error(`✗ Attempt ${attempt} failed: ${errorMsg}`);

      if (attempt < maxRetries) {
        const waitTime = attempt * 2; // 2s, 4s, 6s
        console.error(`  Retrying in ${waitTime} seconds...`);
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
      }
    }
  }

  // All retries failed
  throw new Error(
    `Failed to load data after ${maxRetries} attempts.\n` +
    `URL: ${url}\n` +
    `Last error: ${lastError?.message}\n\n` +
    `Troubleshooting:\n` +
    `  1. Check your internet connection\n` +
    `  2. Try accessing ${url} in a browser\n` +
    `  3. Check if you're behind a firewall/proxy\n` +
    `  4. Contact support at https://github.com/Aresfangxx/Aptamer-Database`
  );
}

// Main loader - loads from URL only
export async function loadJSONL(url?: string): Promise<AptamerRecord[]> {
  const dataUrl = url || resolveDataURL();
  return await loadFromURL(dataUrl);
}
