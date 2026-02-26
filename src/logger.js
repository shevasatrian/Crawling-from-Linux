/**
 * logger.js
 * Dual-output logger — writes to console AND a persistent log file.
 * Every crawl session is timestamped for audit trail.
 */

const fs = require('fs');
const path = require('path');
const config = require('./config');

// Ensure logs directory exists
function ensureLogDir() {
  const logDir = path.dirname(config.LOG_FILE);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

/**
 * Format a log line with timestamp and level.
 */
function format(level, message) {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.padEnd(5)}] ${message}`;
}

/**
 * Write a line to the log file.
 */
function writeToFile(line) {
  try {
    ensureLogDir();
    fs.appendFileSync(config.LOG_FILE, line + '\n', 'utf8');
  } catch {
    // Never crash the crawler because of a logging error
  }
}

const logger = {
  info(msg) {
    const line = format('INFO', msg);
    console.log(line);
    writeToFile(line);
  },
  warn(msg) {
    const line = format('WARN', msg);
    console.warn(line);
    writeToFile(line);
  },
  error(msg) {
    const line = format('ERROR', msg);
    console.error(line);
    writeToFile(line);
  },
  success(msg) {
    const line = format('OK', msg);
    console.log(line);
    writeToFile(line);
  },
  separator() {
    const line = '─'.repeat(70);
    console.log(line);
    writeToFile(line);
  },
  banner(title) {
    const line = `${'═'.repeat(70)}\n  ${title}\n${'═'.repeat(70)}`;
    console.log(line);
    writeToFile(line);
  },
};

module.exports = logger;
