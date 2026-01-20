const fredService = require('../services/fredService');
const treasuryService = require('../services/treasuryService');
const goldService = require('../services/goldService');
const basisSwapService = require('../services/basisSwapService');
const { assessCurrentStage } = require('../utils/calculations');

/**
 * GET /api/indicators/stage
 * Returns current crisis stage assessment
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const [
      hedgingSpread,
      eurBasis,
      auctionMetrics,
      goldRatio,
      interestRatio,
      marketStress,
    ] = await Promise.all([
      basisSwapService.getJapaneseHedgingSpread(),
      basisSwapService.getEURUSDBasisSwap(),
      treasuryService.getAuctionTailMetrics(),
      goldService.getGoldTreasuryRatio(),
      treasuryService.getInterestExpenseRatio(),
      fredService.getMarketStressIndicators(),
    ]);

    const indicatorValues = {
      hedgingSpread: hedgingSpread.currentSpread,
      basisSwap: eurBasis.current,
      auctionTail: auctionMetrics.averageTail,
      goldTreasuryRoC: goldRatio.rateOfChange12Month,
      interestRatio: interestRatio.ratio,
      vix: marketStress.vix?.[0]?.value,
      hySpread: marketStress.hySpread?.[0]?.value ? marketStress.hySpread[0].value * 100 : null,
      dollarChange: null, // Would need baseline comparison
      fedBalanceSheetChange: null, // Would need baseline comparison
      inflationBreakeven: null, // Could add from FRED
      goldChange: goldRatio.rateOfChange12MonthPercent,
      foreignHoldingsChange: null, // Would come from TIC
      cpiAnnualized: null, // Would need CPI data
    };

    const assessment = assessCurrentStage(indicatorValues);

    res.json({
      success: true,
      assessment,
      indicatorValues,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error assessing stage:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
