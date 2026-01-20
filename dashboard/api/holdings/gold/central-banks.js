const goldService = require('../../services/goldService');

/**
 * GET /api/holdings/gold/central-banks - Returns central bank gold purchase data
 * POST /api/holdings/gold/central-banks - Add manual central bank gold data (redirects to /manual)
 */
module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const centralBank = await goldService.getCentralBankGoldPurchases();

      res.json({
        success: true,
        ...centralBank,
      });
    } catch (error) {
      console.error('Error fetching central bank gold data:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  } else {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
};
