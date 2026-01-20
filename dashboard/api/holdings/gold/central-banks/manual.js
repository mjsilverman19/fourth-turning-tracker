const goldService = require('../../../services/goldService');

/**
 * POST /api/holdings/gold/central-banks/manual
 * Add manual central bank gold data
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { period, totalTonnes, topPurchasers } = req.body;

    if (!period || totalTonnes === undefined) {
      return res.status(400).json({
        success: false,
        error: 'period and totalTonnes are required',
      });
    }

    const result = await goldService.setManualCentralBankData({
      period,
      totalTonnes,
      topPurchasers: topPurchasers || [],
    });

    res.json(result);
  } catch (error) {
    console.error('Error adding manual central bank gold data:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
