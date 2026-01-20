const treasuryService = require('../../services/treasuryService');

/**
 * POST /api/treasury/auctions/when-issued
 * Update auction with when-issued yield for tail calculation
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { cusip, whenIssuedYield } = req.body;

    if (!cusip || whenIssuedYield === undefined) {
      return res.status(400).json({
        success: false,
        error: 'cusip and whenIssuedYield are required',
      });
    }

    const updated = await treasuryService.updateAuctionWithWhenIssued(cusip, whenIssuedYield);

    res.json({
      success: true,
      auction: updated,
    });
  } catch (error) {
    console.error('Error updating when-issued yield:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
