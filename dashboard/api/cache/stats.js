const cache = require('../utils/cache');

/**
 * GET /api/cache/stats
 * Returns cache statistics
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  res.json({
    stats: cache.getStats(),
    keys: cache.keys(),
    note: 'In serverless environment, cache does not persist between invocations',
  });
};
