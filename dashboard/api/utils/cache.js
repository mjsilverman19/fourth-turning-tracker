const NodeCache = require('node-cache');

// Cache configuration with default TTL of 4 hours
const cache = new NodeCache({
  stdTTL: 4 * 60 * 60,
  checkperiod: 60,
  useClones: false,
});

// Cache TTL configurations (in seconds)
const cacheTTLConfig = {
  yields: 4 * 60 * 60,           // 4 hours
  auctionResults: 24 * 60 * 60,  // 24 hours
  ticData: 7 * 24 * 60 * 60,     // 7 days
  goldPrice: 1 * 60 * 60,        // 1 hour
  fedBalanceSheet: 24 * 60 * 60, // 24 hours
  basisSwap: 4 * 60 * 60,        // 4 hours
  fiscalData: 7 * 24 * 60 * 60,  // 7 days
  marketStress: 2 * 60 * 60,     // 2 hours
  centralBankGold: 30 * 24 * 60 * 60, // 30 days
  etfPrices: 1 * 60 * 60,        // 1 hour
};

/**
 * Get data from cache
 * @param {string} key - Cache key
 * @returns {any} Cached data or undefined
 */
function get(key) {
  return cache.get(key);
}

/**
 * Set data in cache with optional TTL
 * @param {string} key - Cache key
 * @param {any} value - Data to cache
 * @param {string|number} ttlOrType - TTL in seconds or cache type from cacheTTLConfig
 */
function set(key, value, ttlOrType) {
  let ttl;
  if (typeof ttlOrType === 'string') {
    ttl = cacheTTLConfig[ttlOrType] || cacheTTLConfig.yields;
  } else if (typeof ttlOrType === 'number') {
    ttl = ttlOrType;
  } else {
    ttl = cacheTTLConfig.yields;
  }

  cache.set(key, value, ttl);
}

/**
 * Delete a specific key from cache
 * @param {string} key - Cache key
 */
function del(key) {
  cache.del(key);
}

/**
 * Clear all cache
 */
function flush() {
  cache.flushAll();
}

/**
 * Get cache statistics
 * @returns {object} Cache stats
 */
function getStats() {
  return cache.getStats();
}

/**
 * Get all keys in cache
 * @returns {string[]} Array of cache keys
 */
function keys() {
  return cache.keys();
}

/**
 * Check if key exists in cache
 * @param {string} key - Cache key
 * @returns {boolean}
 */
function has(key) {
  return cache.has(key);
}

/**
 * Get TTL for a key
 * @param {string} key - Cache key
 * @returns {number|undefined} TTL in milliseconds or undefined if key doesn't exist
 */
function getTTL(key) {
  return cache.getTtl(key);
}

/**
 * Get data with metadata (staleness info)
 * @param {string} key - Cache key
 * @returns {object|null} Object with data and metadata, or null if not found
 */
function getWithMetadata(key) {
  const data = cache.get(key);
  if (data === undefined) {
    return null;
  }

  const ttl = cache.getTtl(key);
  const now = Date.now();
  const age = ttl ? Math.max(0, ttl - now) : null;

  return {
    data,
    cachedAt: ttl ? new Date(now - (cacheTTLConfig.yields * 1000 - age)) : null,
    expiresAt: ttl ? new Date(ttl) : null,
    ageSeconds: age ? Math.floor((cacheTTLConfig.yields * 1000 - age) / 1000) : null,
  };
}

/**
 * Wrapper for async functions with caching
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Async function to fetch data if not cached
 * @param {string|number} ttlOrType - TTL in seconds or cache type
 * @returns {Promise<any>} Cached or freshly fetched data
 */
async function getOrFetch(key, fetchFn, ttlOrType) {
  const cached = get(key);
  if (cached !== undefined) {
    return cached;
  }

  const data = await fetchFn();
  set(key, data, ttlOrType);
  return data;
}

module.exports = {
  get,
  set,
  del,
  flush,
  getStats,
  keys,
  has,
  getTTL,
  getWithMetadata,
  getOrFetch,
  cacheTTLConfig,
};
