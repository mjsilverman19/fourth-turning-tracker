const ticService = require('../../services/ticService');

/**
 * GET /api/holdings/foreign/china
 * Returns Chinese Treasury holdings (including Belgium proxy)
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const china = await ticService.getChineseHoldings();

    res.json({
      success: true,
      ...china,
    });
  } catch (error) {
    console.error('Error fetching Chinese holdings:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
