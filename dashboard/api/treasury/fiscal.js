const treasuryService = require('../services/treasuryService');

/**
 * GET /api/treasury/fiscal
 * Returns fiscal data (interest expense, receipts, debt)
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const [mtsData, interestRatio, debtOutstanding] = await Promise.all([
      treasuryService.getMonthlyStatementData(),
      treasuryService.getInterestExpenseRatio(),
      treasuryService.getDebtOutstanding(),
    ]);

    res.json({
      success: true,
      monthlyStatement: mtsData,
      interestExpenseRatio: interestRatio,
      debtOutstanding: {
        current: debtOutstanding[0],
        history: debtOutstanding.slice(0, 365),
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching fiscal data:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
