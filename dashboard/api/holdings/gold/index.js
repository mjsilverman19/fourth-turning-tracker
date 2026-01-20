const goldService = require('../../services/goldService');

/**
 * GET /api/holdings/gold
 * Returns gold-related data (ratio, central bank purchases)
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const goldMetrics = await goldService.getGoldMetrics();

    res.json({
      success: true,
      ...goldMetrics,
    });
  } catch (error) {
    console.error('Error fetching gold holdings:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
