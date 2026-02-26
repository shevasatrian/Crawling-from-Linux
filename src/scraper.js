/**
 * scraper.js
 * Scrapes arXiv search results using cheerio (server-side jQuery).
 * No browser required — pure HTTP + HTML parsing.
 */

const cheerio = require('cheerio');
const config = require('./config');
const { get } = require('./http');
const logger = require('./logger');

const ARXIV_SEARCH_URL = 'https://arxiv.org/search/';

/**
 * Build the arXiv search URL for a given query.
 * @param {string} query
 * @param {number} start - Pagination offset
 * @returns {string}
 */
function buildSearchUrl(query, start = 0) {
  const params = new URLSearchParams({
    searchtype: 'all',
    query: query,
    start: start,
  });
  return `${ARXIV_SEARCH_URL}?${params.toString()}`;
}

/**
 * Scrape paper listings from an arXiv search result page.
 * @param {string} html - Raw HTML from arXiv search
 * @returns {Array} Array of paper objects
 */
function parseResults(html) {
  const $ = cheerio.load(html);
  const papers = [];

  // Each result is in <li class="arxiv-result">
  $('li.arxiv-result').each((i, el) => {
    const item = $(el);

    // arXiv ID
    const idEl = item.find('p.list-title a').first();
    const arxivId = idEl.text().trim().replace('arXiv:', '').trim();
    const paperUrl = idEl.attr('href') || `https://arxiv.org/abs/${arxivId}`;

    // Title
    const title = item.find('p.title').text().trim().replace(/\s+/g, ' ');

    // Authors
    const authors = item.find('p.authors a')
      .map((_, a) => $(a).text().trim())
      .get()
      .join(', ');

    // Abstract
    const abstract = item.find('span.abstract-full, span.abstract-short')
      .first()
      .text()
      .trim()
      .replace(/\s+/g, ' ')
      .replace('△ Less', '')
      .substring(0, 300);

    // Submitted date
    const submitted = item.find('p.is-size-7').text().trim().replace(/\s+/g, ' ').substring(0, 80);

    // Categories/tags
    const categories = item.find('div.tags span.tag')
      .map((_, t) => $(t).text().trim())
      .get()
      .join(', ');

    // PDF URL (always https://arxiv.org/pdf/{id})
    const pdfUrl = arxivId ? `https://arxiv.org/pdf/${arxivId}` : null;

    if (title && arxivId) {
      papers.push({
        arxiv_id: arxivId,
        title,
        authors,
        abstract,
        submitted,
        categories,
        paper_url: paperUrl,
        pdf_url: pdfUrl,
        crawled_at: new Date().toISOString(),
      });
    }
  });

  return papers;
}

/**
 * Crawl arXiv search for a given query.
 * @param {string} query
 * @param {number} maxResults
 * @returns {Promise<Array>}
 */
async function crawlArxiv(query, maxResults = config.MAX_RESULTS) {
  const url = buildSearchUrl(query);
  logger.info(`Fetching arXiv search: "${query}" → ${url}`);

  const html = await get(url);
  const papers = parseResults(html);

  logger.success(`Parsed ${papers.length} papers from arXiv`);
  return papers.slice(0, maxResults);
}

module.exports = { crawlArxiv };
