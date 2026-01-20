const fredService = require('../../services/fredService');
const goldService = require('../../services/goldService');
const basisSwapService = require('../../services/basisSwapService');
const treasuryService = require('../../services/treasuryService');

/**
 * GET /api/indicators/history/[indicator]
 * Returns historical data for a specific indicator
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { indicator } = req.query;
    const { period = '2y' } = req.query;

    let historicalData;

    switch (indicator) {
      case 'japaneseHedgingSpread':
        const spreadData = await basisSwapService.getJapaneseHedgingSpread();
        historicalData = spreadData.historicalSpreads;
        break;

      case 'goldTreasuryRatio':
        const goldData = await goldService.getGoldTreasuryRatio();
        historicalData = goldData.historicalRatios;
        break;

      case 'interestExpenseRatio':
        // Would need to build historical ratio data
        const mtsData = await treasuryService.getMonthlyStatementData();
        historicalData = mtsData;
        break;

      case 'vix':
        historicalData = await fredService.getVIX();
        break;

      case 'hySpread':
        historicalData = await fredService.getHighYieldSpread();
        break;

      case 'dollarIndex':
        historicalData = await fredService.getDollarIndex();
        break;

      case 'goldPrice':
        historicalData = await fredService.getGoldPrice();
        break;

      case 'us10y':
        historicalData = await fredService.get10YearTreasuryYield();
        break;

      case 'fedBalanceSheet':
        historicalData = await fredService.getFedBalanceSheet();
        break;

      default:
        return res.status(400).json({
          success: false,
          error: `Unknown indicator: ${indicator}`,
        });
    }

    res.json({
      success: true,
      indicator,
      data: historicalData,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`Error fetching history for ${req.query.indicator}:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
