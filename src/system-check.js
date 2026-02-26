/**
 * system-check.js
 * Linux system compatibility checks before crawling:
 * 1. Network connectivity check
 * 2. Output directory permission check
 * 3. Log directory permission check
 * 4. Node.js version check
 * 5. DNS resolution check
 */

const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');
const axios = require('axios');
const config = require('./config');
const logger = require('./logger');

/**
 * Check if running on Linux.
 */
function checkOS() {
  const platform = os.platform();
  const isLinux = platform === 'linux';
  logger.info(`OS Platform  : ${platform} ${isLinux ? '✅' : '⚠️  (not Linux, but compatible)'}`);
  return true; // Allow running on non-Linux for development
}

/**
 * Check Node.js version (minimum v16).
 */
function checkNodeVersion() {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0], 10);
  if (major < 16) {
    throw new Error(`Node.js v16+ required. Current: ${version}`);
  }
  logger.info(`Node.js      : ${version} ✅`);
}

/**
 * Check if a directory is writable. If not, attempt to create it with proper permissions.
 * @param {string} dirPath
 * @param {string} label
 */
function checkDirectoryPermission(dirPath, label) {
  try {
    // Create directory if it doesn't exist
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true, mode: 0o755 });
      logger.info(`${label.padEnd(13)}: created with chmod 755 ✅`);
      return;
    }

    // Test write permission by creating a temp file
    const testFile = `${dirPath}/.permission_test_${Date.now()}`;
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    logger.info(`${label.padEnd(13)}: writable ✅ (${dirPath})`);
  } catch (err) {
    // Try to fix permissions on Linux
    if (os.platform() === 'linux') {
      try {
        execSync(`chmod 755 "${dirPath}"`, { stdio: 'ignore' });
        logger.warn(`${label.padEnd(13)}: fixed permissions with chmod 755`);
      } catch {
        throw new Error(`${label} directory not writable: ${dirPath}\nRun: chmod 755 "${dirPath}"`);
      }
    } else {
      throw new Error(`${label} directory not writable: ${dirPath}`);
    }
  }
}

/**
 * Check internet connectivity by pinging the target host.
 * @param {string} url
 */
async function checkNetworkConnectivity(url) {
  try {
    const hostname = new URL(url).hostname;

    // DNS resolution check (Linux: uses system resolver)
    logger.info(`DNS Check    : resolving ${hostname}...`);

    const response = await axios.head(url, {
      timeout: 5000,
      headers: config.HEADERS,
    });

    logger.info(`Network      : connected ✅ (HTTP ${response.status})`);
    return true;
  } catch (err) {
    if (err.code === 'ENOTFOUND') {
      throw new Error(`DNS resolution failed for ${url}. Check your network connection.\nLinux tip: check /etc/resolv.conf or run: ping -c 1 arxiv.org`);
    }
    if (err.code === 'ECONNREFUSED') {
      throw new Error(`Connection refused to ${url}. The server may be down.`);
    }
    if (err.code === 'ETIMEDOUT' || err.code === 'ECONNABORTED') {
      throw new Error(`Connection timed out to ${url}. Check firewall rules.\nLinux tip: run: curl -I ${url}`);
    }
    // If HEAD returns 4xx/5xx, network is still reachable
    if (err.response) {
      logger.info(`Network      : connected ✅ (HTTP ${err.response.status})`);
      return true;
    }
    throw new Error(`Network check failed: ${err.message}`);
  }
}

/**
 * Check available disk space (Linux only).
 * Warns if less than 100MB available.
 */
function checkDiskSpace() {
  if (os.platform() !== 'linux') return;

  try {
    const output = execSync(`df -BM "${config.OUTPUT_DIR}" 2>/dev/null || df -BM /tmp`, {
      encoding: 'utf8',
      timeout: 3000,
    });

    const lines = output.trim().split('\n');
    if (lines.length >= 2) {
      const parts = lines[1].split(/\s+/);
      const available = parseInt(parts[3], 10);
      if (available < 100) {
        logger.warn(`Disk Space   : only ${available}MB available — low disk space!`);
      } else {
        logger.info(`Disk Space   : ${available}MB available ✅`);
      }
    }
  } catch {
    // Non-critical, skip if df not available
  }
}

/**
 * Run all system checks before crawling.
 * Throws on critical failures, warns on non-critical issues.
 */
async function runSystemChecks() {
  logger.info('Running system checks...');
  logger.separator();

  checkOS();
  checkNodeVersion();
  checkDirectoryPermission(config.OUTPUT_DIR, 'Output dir');
  checkDirectoryPermission(require('path').dirname(config.LOG_FILE), 'Log dir');
  checkDiskSpace();
  await checkNetworkConnectivity(config.TARGET_URL);

  logger.separator();
  logger.info('All system checks passed ✅');
  logger.separator();
}

module.exports = { runSystemChecks };
