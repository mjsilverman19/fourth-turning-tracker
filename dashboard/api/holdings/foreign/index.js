const ticService = require('../../services/ticService');

/**
 * GET /api/holdings/foreign - Returns summary of foreign Treasury holdings
 * POST /api/holdings/foreign - Add manual TIC data entry (for /manual endpoint compatibility)
 */
module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const summary = await ticService.getForeignHoldingsSummary();

      res.json({
        success: true,
        ...summary,
      });
    } catch (error) {
      console.error('Error fetching foreign holdings:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  } else {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
};
