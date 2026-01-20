const ticService = require('../../services/ticService');

/**
 * GET /api/holdings/foreign/total
 * Returns total foreign Treasury holdings
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const total = await ticService.getTotalForeignHoldings();

    res.json({
      success: true,
      ...total,
    });
  } catch (error) {
    console.error('Error fetching total foreign holdings:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
