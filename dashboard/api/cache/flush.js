const cache = require('../utils/cache');

/**
 * POST /api/cache/flush
 * Flush the cache
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  cache.flush();
  res.json({
    success: true,
    message: 'Cache flushed',
    note: 'In serverless environment, this only affects the current invocation',
  });
};
