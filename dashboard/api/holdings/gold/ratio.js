const goldService = require('../../services/goldService');

/**
 * GET /api/holdings/gold/ratio
 * Returns Gold/Treasury ratio data
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const ratio = await goldService.getGoldTreasuryRatio();

    res.json({
      success: true,
      ...ratio,
    });
  } catch (error) {
    console.error('Error fetching gold ratio:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
