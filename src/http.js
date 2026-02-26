/**
 * http.js
 * Robust HTTP client with:
 * - Automatic retry on failure (network errors, 5xx, timeouts)
 * - Exponential backoff between retries
 * - Timeout handling
 * - Detailed error reporting
 */

const axios = require('axios');
const config = require('./config');
const logger = require('./logger');

/**
 * Sleep for ms milliseconds.
 */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Perform an HTTP GET with retry logic.
 * @param {string} url
 * @param {number} retries - Remaining retries
 * @returns {Promise<string>} Response HTML/text
 */
async function get(url, retries = config.MAX_RETRIES) {
  try {
    const response = await axios.get(url, {
      headers: config.HEADERS,
      timeout: config.REQUEST_TIMEOUT_MS,
      maxRedirects: 5,
    });
    return response.data;
  } catch (err) {
    const isRetryable =
      err.code === 'ECONNRESET' ||
      err.code === 'ETIMEDOUT' ||
      err.code === 'ENOTFOUND' ||
      err.code === 'ECONNREFUSED' ||
      err.code === 'ERR_NETWORK' ||
      (err.response && err.response.status >= 500);

    if (isRetryable && retries > 0) {
      const delay = config.RETRY_DELAY_MS * (config.MAX_RETRIES - retries + 1);
      logger.warn(`Request failed (${err.code || err.response?.status}), retrying in ${delay}ms... [${retries} left] → ${url}`);
      await sleep(delay);
      return get(url, retries - 1);
    }

    // Non-retryable or out of retries
    const status = err.response?.status || err.code || 'UNKNOWN';
    throw new Error(`HTTP ${status}: ${url}`);
  }
}

/**
 * Perform multiple HTTP GETs in parallel with concurrency limit.
 * @param {string[]} urls
 * @param {number} concurrency
 * @returns {Promise<Array<{url, data, error}>>}
 */
async function getAll(urls, concurrency = config.CONCURRENCY) {
  const results = [];
  const queue = [...urls];

  async function worker() {
    while (queue.length > 0) {
      const url = queue.shift();
      try {
        const data = await get(url);
        results.push({ url, data, error: null });
      } catch (err) {
        results.push({ url, data: null, error: err.message });
        logger.warn(`Failed to fetch: ${url} — ${err.message}`);
      }
    }
  }

  // Run N workers in parallel
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

module.exports = { get, getAll };
