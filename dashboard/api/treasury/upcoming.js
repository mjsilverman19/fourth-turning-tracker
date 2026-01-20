const treasuryService = require('../services/treasuryService');

/**
 * GET /api/treasury/upcoming
 * Returns upcoming Treasury auction schedule
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const upcoming = await treasuryService.getUpcomingAuctions();

    res.json({
      success: true,
      ...upcoming,
    });
  } catch (error) {
    console.error('Error fetching upcoming auctions:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
