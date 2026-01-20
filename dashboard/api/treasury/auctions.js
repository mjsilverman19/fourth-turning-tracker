const treasuryService = require('../services/treasuryService');

/**
 * GET /api/treasury/auctions
 * Returns recent Treasury auction results
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { months = 6 } = req.query;

    const auctions = await treasuryService.getLongDatedAuctions(parseInt(months));
    const tailMetrics = await treasuryService.getAuctionTailMetrics();

    res.json({
      success: true,
      auctions,
      metrics: tailMetrics,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching auctions:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
