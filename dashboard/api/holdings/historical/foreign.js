const ticService = require('../../services/ticService');

/**
 * GET /api/holdings/historical/foreign
 * Returns historical foreign holdings data for long-term charts
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { startYear = 2000 } = req.query;

    const allHolders = await ticService.getMajorForeignHolders();

    res.json({
      success: true,
      data: allHolders,
      startYear: parseInt(startYear),
      note: 'Historical TIC data coverage depends on available data',
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching historical foreign holdings:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
