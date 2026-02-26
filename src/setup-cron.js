/**
 * setup-cron.js
 * Schedules the crawler to run automatically using node-cron.
 * Run this script on your Linux server to keep it running continuously.
 *
 * Usage:
 *   node src/setup-cron.js
 *
 * The crawler will run on the schedule defined in config.js (default: daily at 08:00 WIB).
 */

const cron = require('node-cron');
const path = require('path');
const config = require('./config');
const logger = require('./logger');
const { runCrawl } = require('./index');

logger.banner('Quest 4: arXiv Crawler — Cron Scheduler');
logger.info(`Schedule   : ${config.CRON_SCHEDULE} (${config.CRON_TIMEZONE})`);
logger.info(`Query      : "${config.SEARCH_QUERY}"`);
logger.info(`Max Results: ${config.MAX_RESULTS}`);
logger.info(`Log File   : ${config.LOG_FILE}`);
logger.separator();

// Validate cron expression
if (!cron.validate(config.CRON_SCHEDULE)) {
  logger.error(`Invalid cron schedule: "${config.CRON_SCHEDULE}"`);
  process.exit(1);
}

// Run immediately on startup so we don't have to wait for first schedule
logger.info('Running initial crawl on startup...');
runCrawl().catch((err) => logger.error(`Startup crawl failed: ${err.message}`));

// Schedule recurring crawl
cron.schedule(
  config.CRON_SCHEDULE,
  async () => {
    logger.separator();
    logger.info(`Cron triggered: ${new Date().toISOString()}`);
    try {
      await runCrawl();
    } catch (err) {
      logger.error(`Scheduled crawl failed: ${err.message}`);
    }
  },
  {
    timezone: config.CRON_TIMEZONE,
  }
);

logger.info('Cron scheduler is running. Press Ctrl+C to stop.');
logger.info(`Next run: ${config.CRON_SCHEDULE} (${config.CRON_TIMEZONE})`);
