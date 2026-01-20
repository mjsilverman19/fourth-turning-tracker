const fredService = require('../lib/services/fredService');
const cache = require('../lib/utils/cache');

/**
 * /api/status
 * GET - Data source status check
 * GET ?action=cache-stats - Cache statistics
 * POST ?action=cache-flush - Flush cache
 */
module.exports = async function handler(req, res) {
  const { action } = req.query;

  // Cache stats
  if (action === 'cache-stats' && req.method === 'GET') {
    return res.json({
      stats: cache.getStats(),
      keys: cache.keys(),
      note: 'Cache is ephemeral in serverless environment',
    });
  }

  // Cache flush
  if (action === 'cache-flush' && req.method === 'POST') {
    cache.flush();
    return res.json({
      success: true,
      message: 'Cache flushed',
      note: 'In serverless environment, this only affects the current invocation',
    });
  }

  // Default: status check
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const status = {
      fred: { status: 'unknown', lastCheck: null },
      treasury: { status: 'unknown', lastCheck: null },
    };

    // Check FRED API
    try {
      await fredService.getLatestValue('DGS10');
      status.fred = { status: 'ok', lastCheck: new Date().toISOString() };
    } catch (e) {
      status.fred = { status: 'error', error: e.message, lastCheck: new Date().toISOString() };
    }

    res.json({
      success: true,
      status,
      apiKeyConfigured: !!process.env.FRED_API_KEY,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
