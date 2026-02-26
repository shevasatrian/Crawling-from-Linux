# Quest 4 - Web Crawling from Linux

Crawls **arXiv.org** for academic papers, saves results to JSON & CSV, with full logging and automated cron scheduling. Built for Linux environments.

## Requirements

- Node.js v16+
- npm
- Linux OS (Ubuntu/Debian recommended)
- Internet connection

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Single crawl run
npm start

# 3. Or start the cron scheduler (runs daily at 08:00 WIB)
npm run setup-cron
```

## Usage

### Single run (default query: "machine learning")
```bash
node src/index.js
```

### Custom query and result count
```bash
node src/index.js --query="deep learning" --max=20
```

### Start automated cron scheduler
```bash
node src/setup-cron.js
```

### Run in background (Linux production)
```bash
# Using nohup (keeps running after terminal closes)
nohup node src/setup-cron.js > logs/cron.out 2>&1 &

# Using PM2 (recommended for production)
pm2 start src/setup-cron.js --name "arxiv-crawler"
pm2 save
pm2 startup
```

## How It Works

```
[1/3] Crawl arXiv
      ↓ HTTP GET with axios (no browser needed — Linux compatible)
      ↓ Retry logic: up to 3 retries with exponential backoff
      ↓ Parallel fetching with concurrency limit (5 at once)
      ↓ Parse HTML with cheerio (server-side jQuery)

[2/3] Save Output
      ↓ JSON: results.json (deduplicates by arxiv_id across runs)
      ↓ CSV:  results.csv  (appends new rows each run)

[3/3] Logging
      ↓ All activity logged to logs/crawler.log with timestamps
      ↓ Log level: INFO / WARN / ERROR / OK
```

## Cron Schedule

Default: `0 8 * * *` = every day at 08:00 WIB (Asia/Jakarta)

To change, edit `src/config.js`:
```js
CRON_SCHEDULE: '0 8 * * *',     // Daily at 08:00
// CRON_SCHEDULE: '0 * * * *',  // Every hour
// CRON_SCHEDULE: '*/30 * * * *' // Every 30 minutes
```

## Error Handling

| Error Type | Behavior |
|---|---|
| Network timeout | Retry up to 3x with backoff |
| Connection reset | Retry up to 3x with backoff |
| HTTP 5xx error | Retry up to 3x with backoff |
| HTTP 4xx error | Log & skip (no retry) |
| Parse error | Log & continue with next item |
| Fatal error | Log & exit with code 1 |

## Output Files

```
output/
├── results.json    # All crawled papers (deduplicated)
└── results.csv     # Tabular format (Excel-compatible)

logs/
└── crawler.log     # Full activity log with timestamps
```

### JSON structure
```json
[
  {
    "arxiv_id": "2301.07041",
    "title": "A Survey of Deep Learning Techniques...",
    "authors": "John Doe, Jane Smith",
    "abstract": "This paper surveys...",
    "submitted": "Submitted 18 January 2023",
    "categories": "cs.LG, cs.AI",
    "paper_url": "https://arxiv.org/abs/2301.07041",
    "pdf_url": "https://arxiv.org/pdf/2301.07041",
    "crawled_at": "2026-02-25T06:00:00.000Z"
  }
]
```

### Sample Log Output
```
══════════════════════════════════════════════════════════════════════
  Quest 4: arXiv Crawler — Linux Edition
══════════════════════════════════════════════════════════════════════
[2026-02-25T06:00:01.000Z] [INFO ] Target     : https://arxiv.org
[2026-02-25T06:00:01.001Z] [INFO ] Query      : "machine learning"
[2026-02-25T06:00:01.002Z] [INFO ] Max Results: 10
──────────────────────────────────────────────────────────────────────
[2026-02-25T06:00:01.003Z] [INFO ] [1/3] Starting arXiv crawl...
[2026-02-25T06:00:02.841Z] [OK   ] Parsed 10 papers from arXiv
[2026-02-25T06:00:02.842Z] [INFO ] [2/3] Saving results...
[2026-02-25T06:00:02.850Z] [OK   ] JSON saved: output/results.json
[2026-02-25T06:00:02.855Z] [OK   ] CSV saved: output/results.csv
[2026-02-25T06:00:02.856Z] [INFO ] ⏱  Time Elapsed: 1.85s — 🏆 OPTIMAL (≤8s)!
```

## Project Structure

```
quest4-crawling-linux/
├── src/
│   ├── index.js        # Main orchestrator + runCrawl()
│   ├── scraper.js      # arXiv HTTP scraper (axios + cheerio)
│   ├── http.js         # Retry-enabled HTTP client
│   ├── writer.js       # JSON + CSV output writer
│   ├── logger.js       # Dual console + file logger
│   ├── setup-cron.js   # Cron scheduler
│   └── config.js       # All settings
├── output/
│   ├── results.json
│   └── results.csv
├── logs/
│   └── crawler.log
├── package.json
└── README.md
```

## Why No Browser?

Unlike Quest 1 (Puppeteer on Windows), this Linux crawler uses **pure HTTP + HTML parsing**:
- ✅ Faster (no browser startup overhead)
- ✅ Lower memory usage
- ✅ Better for server/headless Linux environments
- ✅ Easier to run in cron jobs & background processes
- ✅ arXiv doesn't require JavaScript rendering
