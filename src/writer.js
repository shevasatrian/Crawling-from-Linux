/**
 * writer.js
 * Saves crawled data to JSON and CSV formats.
 * Appends to existing files so each cron run adds new data.
 */

const fs = require('fs');
const path = require('path');
const config = require('./config');
const logger = require('./logger');

function ensureOutputDir() {
  if (!fs.existsSync(config.OUTPUT_DIR)) {
    fs.mkdirSync(config.OUTPUT_DIR, { recursive: true });
  }
}

/**
 * Save papers array to a JSON file.
 * Merges with existing data (deduplicates by arxiv_id).
 * @param {Array} papers
 * @returns {string} Output file path
 */
function saveJSON(papers) {
  ensureOutputDir();

  let existing = [];
  if (fs.existsSync(config.JSON_FILE)) {
    try {
      existing = JSON.parse(fs.readFileSync(config.JSON_FILE, 'utf8'));
    } catch {
      existing = [];
    }
  }

  // Deduplicate by arxiv_id
  const existingIds = new Set(existing.map((p) => p.arxiv_id));
  const newPapers = papers.filter((p) => !existingIds.has(p.arxiv_id));
  const merged = [...existing, ...newPapers];

  fs.writeFileSync(config.JSON_FILE, JSON.stringify(merged, null, 2), 'utf8');
  logger.success(`JSON saved: ${config.JSON_FILE} (${merged.length} total, ${newPapers.length} new)`);
  return config.JSON_FILE;
}

/**
 * Save papers array to a CSV file.
 * Appends new rows (skips header if file already exists).
 * @param {Array} papers
 * @returns {string} Output file path
 */
function saveCSV(papers) {
  ensureOutputDir();

  const headers = ['arxiv_id', 'title', 'authors', 'categories', 'submitted', 'paper_url', 'pdf_url', 'crawled_at'];

  const fileExists = fs.existsSync(config.CSV_FILE);

  // Escape CSV field (wrap in quotes, escape inner quotes)
  const escape = (val) => `"${String(val || '').replace(/"/g, '""')}"`;

  const rows = papers.map((p) =>
    headers.map((h) => escape(p[h] || '')).join(',')
  );

  let content = '';
  if (!fileExists) {
    content += headers.join(',') + '\n';
  }
  content += rows.join('\n') + '\n';

  fs.appendFileSync(config.CSV_FILE, content, 'utf8');
  logger.success(`CSV saved: ${config.CSV_FILE} (${papers.length} rows appended)`);
  return config.CSV_FILE;
}

module.exports = { saveJSON, saveCSV };
