/**
 * config.js
 * Central configuration for Quest 4 crawler.
 */

const path = require('path');

module.exports = {
  // ── Target ───────────────────────────────────────────────────────
  TARGET_URL: 'https://arxiv.org',
  SEARCH_QUERY: 'machine learning',      // Keyword to search
  MAX_RESULTS: 10,                        // Max papers to crawl per run

  // ── Output ───────────────────────────────────────────────────────
  OUTPUT_DIR: path.join(__dirname, '../output'),
  JSON_FILE: path.join(__dirname, '../output/results.json'),
  CSV_FILE: path.join(__dirname, '../output/results.csv'),
  LOG_FILE: path.join(__dirname, '../logs/crawler.log'),

  // ── Performance ──────────────────────────────────────────────────
  TARGET_TIME_SECONDS: 16,
  OPTIMAL_TIME_SECONDS: 8,

  // ── Retry / Error Handling ────────────────────────────────────────
  MAX_RETRIES: 3,                         // Retry attempts on failure
  RETRY_DELAY_MS: 2000,                   // Wait before retry (ms)
  REQUEST_TIMEOUT_MS: 10000,              // Per-request timeout (ms)
  CONCURRENCY: 5,                         // Parallel requests at once

  // ── Cron Schedule ────────────────────────────────────────────────
  // Default: every day at 08:00
  // Format: second minute hour day month weekday
  CRON_SCHEDULE: '0 8 * * *',
  CRON_TIMEZONE: 'Asia/Jakarta',

  // ── HTTP Headers ─────────────────────────────────────────────────
  HEADERS: {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Connection': 'keep-alive',
  },
};
