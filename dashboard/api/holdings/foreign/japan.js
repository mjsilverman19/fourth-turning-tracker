const ticService = require('../../services/ticService');

/**
 * GET /api/holdings/foreign/japan
 * Returns Japanese Treasury holdings
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const japan = await ticService.getJapaneseHoldings();

    res.json({
      success: true,
      ...japan,
    });
  } catch (error) {
    console.error('Error fetching Japanese holdings:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
