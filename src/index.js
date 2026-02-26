/**
 * Quest 4: Web Crawling from Linux
 * Target: arXiv.org — Academic paper search
 *
 * Features:
 * ✅ Pure HTTP crawling (no browser needed) — fast & Linux compatible
 * ✅ Parallel requests with concurrency control
 * ✅ Robust retry logic (network errors, timeouts, 5xx)
 * ✅ Dual output: JSON + CSV
 * ✅ Persistent log file
 * ✅ Cron job support (via setup-cron.js)
 *
 * Usage:
 *   node src/index.js                          # Single run
 *   node src/index.js --query="deep learning"  # Custom query
 *   node src/index.js --max=20                 # More results
 *   node src/setup-cron.js                     # Start scheduled runs
 */

const config = require('./config');
const logger = require('./logger');
const { runSystemChecks } = require('./system-check');
const { crawlArxiv } = require('./scraper');
const { saveJSON, saveCSV } = require('./writer');

// Parse CLI arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  args.forEach((arg) => {
    const [key, value] = arg.replace('--', '').split('=');
    result[key] = value;
  });
  return result;
}

/**
 * Main crawl function — exported so cron can call it too.
 */
async function runCrawl(overrides = {}) {
  const args = parseArgs();
  const query = overrides.query || args.query || config.SEARCH_QUERY;
  const maxResults = parseInt(overrides.max || args.max || config.MAX_RESULTS, 10);

  logger.banner('Quest 4: arXiv Crawler — Linux Edition');
  logger.info(`Target     : ${config.TARGET_URL}`);
  logger.info(`Query      : "${query}"`);
  logger.info(`Max Results: ${maxResults}`);
  logger.info(`Concurrency: ${config.CONCURRENCY}`);
  logger.info(`Max Retries: ${config.MAX_RETRIES}`);
  logger.info(`Platform   : ${require('os').platform()} (${require('os').arch()})`);
  logger.separator();

  const startTime = Date.now();

  // ── Step 0: System Checks ────────────────────────────────────────
  logger.info('[0/3] Running Linux system checks...');
  await runSystemChecks();

  // ── Step 1: Crawl arXiv ──────────────────────────────────────────
  logger.info('[1/3] Starting arXiv crawl...');
  const papers = await crawlArxiv(query, maxResults);

  if (papers.length === 0) {
    logger.warn('No papers found. Check query or network connection.');
    return;
  }

  logger.info(`[1/3] ✅ Crawled ${papers.length} papers`);

  // ── Step 2: Save Output ──────────────────────────────────────────
  logger.info('[2/3] Saving results...');
  const jsonPath = saveJSON(papers);
  const csvPath = saveCSV(papers);
  logger.info('[2/3] ✅ Data saved to JSON and CSV');

  // ── Step 3: Summary ──────────────────────────────────────────────
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  const perfLabel =
    elapsed <= config.OPTIMAL_TIME_SECONDS ? '🏆 OPTIMAL (≤8s)!' :
    elapsed <= config.TARGET_TIME_SECONDS  ? '✅ TARGET MET (≤16s)' :
                                             '⚠️  OVER TARGET';

  logger.separator();
  logger.info('[3/3] Crawl Summary:');
  logger.info(`   Papers Crawled : ${papers.length}`);
  logger.info(`   JSON Output    : ${jsonPath}`);
  logger.info(`   CSV Output     : ${csvPath}`);
  logger.info(`   Log File       : ${config.LOG_FILE}`);
  logger.info(`   ⏱  Time Elapsed: ${elapsed}s — ${perfLabel}`);
  logger.separator();

  // Print sample results to console
  logger.info('📄 Sample Results:');
  papers.slice(0, 3).forEach((p, i) => {
    logger.info(`   ${i + 1}. [${p.arxiv_id}] ${p.title.substring(0, 65)}...`);
    logger.info(`      Authors : ${p.authors.substring(0, 60)}`);
    logger.info(`      PDF     : ${p.pdf_url}`);
    logger.info(`      Tags    : ${p.categories}`);
  });

  logger.separator();
  return papers;
}

// Run directly if called as main script
if (require.main === module) {
  runCrawl()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error(`Fatal: ${err.message}`);
      process.exit(1);
    });
}

module.exports = { runCrawl };