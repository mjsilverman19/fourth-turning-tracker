const fredService = require('./services/fredService');

/**
 * GET /api/status
 * Data source status endpoint
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const status = {
      fred: { status: 'unknown', lastCheck: null },
      treasury: { status: 'unknown', lastCheck: null },
      gold: { status: 'unknown', lastCheck: null },
      tic: { status: 'unknown', lastCheck: null },
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
      environment: 'vercel-serverless',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
