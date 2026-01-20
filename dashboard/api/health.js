const cache = require('./utils/cache');

/**
 * GET /api/health
 * Health check endpoint
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: 'vercel-serverless',
    cacheStats: cache.getStats(),
    note: 'Cache stats represent this specific invocation only',
  });
};
