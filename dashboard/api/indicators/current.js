const fredService = require('../services/fredService');
const treasuryService = require('../services/treasuryService');
const goldService = require('../services/goldService');
const basisSwapService = require('../services/basisSwapService');
const { evaluateThreshold } = require('../utils/calculations');
const thresholds = require('../../config/thresholds.json');

/**
 * Helper function to evaluate secondary indicator thresholds
 */
function evaluateSecondaryThreshold(value, config) {
  if (value === null || value === undefined) {
    return { zone: 'UNKNOWN', color: '#6b7280' };
  }

  if (value >= config.critical) {
    return { zone: 'CRITICAL', color: '#7c2d12' };
  }
  if (value >= config.danger) {
    return { zone: 'DANGER', color: '#ef4444' };
  }
  if (value >= config.warning) {
    return { zone: 'WARNING', color: '#f59e0b' };
  }
  return { zone: 'NORMAL', color: '#10b981' };
}

/**
 * GET /api/indicators/current
 * Returns all current indicator values with threshold evaluations
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Fetch all data in parallel
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

    // Build indicator objects with threshold evaluations
    const indicators = {
      japaneseHedgingSpread: {
        value: hedgingSpread.currentSpread,
        date: hedgingSpread.currentDate,
        sixMonthChange: hedgingSpread.sixMonthChange,
        components: {
          us10y: hedgingSpread.us10y,
          jgb10y: hedgingSpread.jgb10y,
          fxHedgeCost: hedgingSpread.fxHedgeCost,
        },
        threshold: evaluateThreshold(hedgingSpread.currentSpread, thresholds.japaneseHedgingSpread),
        config: thresholds.japaneseHedgingSpread,
      },
      crossCurrencyBasis: {
        value: eurBasis.current,
        date: eurBasis.currentDate,
        threshold: evaluateThreshold(eurBasis.current, thresholds.crossCurrencyBasis),
        config: thresholds.crossCurrencyBasis,
        note: eurBasis.dataNote,
      },
      auctionTail: {
        value: auctionMetrics.averageTail,
        last20YTail: auctionMetrics.last20YTail,
        last30YTail: auctionMetrics.last30YTail,
        recentAuctions: auctionMetrics.auctions?.slice(0, 5),
        threshold: evaluateThreshold(auctionMetrics.averageTail, thresholds.auctionTail),
        config: thresholds.auctionTail,
        note: auctionMetrics.dataNote,
      },
      goldTreasuryRoC: {
        value: goldRatio.rateOfChange12Month,
        valuePercent: goldRatio.rateOfChange12MonthPercent,
        currentRatio: goldRatio.currentRatio,
        goldPrice: goldRatio.currentGoldPrice,
        tltPrice: goldRatio.currentTLTPrice,
        date: goldRatio.currentDate,
        sixMonthRoC: goldRatio.rateOfChange6Month,
        threshold: evaluateThreshold(goldRatio.rateOfChange12Month, thresholds.goldTreasuryRoC),
        config: thresholds.goldTreasuryRoC,
      },
      interestExpenseRatio: {
        value: interestRatio.ratio,
        valuePercent: interestRatio.ratioPercent,
        ttmInterestExpense: interestRatio.ttmInterestExpense,
        ttmReceipts: interestRatio.ttmReceipts,
        date: interestRatio.dataAsOf,
        threshold: evaluateThreshold(interestRatio.ratio, thresholds.interestExpenseRatio),
        config: thresholds.interestExpenseRatio,
      },
    };

    // Secondary market indicators
    const vixValue = marketStress.vix?.[0]?.value;
    const hySpreadValue = marketStress.hySpread?.[0]?.value ? marketStress.hySpread[0].value * 100 : null; // Convert to bps
    const sofrValue = marketStress.sofr?.[0]?.value;
    const dollarValue = marketStress.dollarIndex?.[0]?.value;

    const secondary = {
      vix: {
        value: vixValue,
        date: marketStress.vix?.[0]?.date,
        threshold: evaluateSecondaryThreshold(vixValue, thresholds.secondaryIndicators.vix),
      },
      hySpread: {
        value: hySpreadValue,
        date: marketStress.hySpread?.[0]?.date,
        threshold: evaluateSecondaryThreshold(hySpreadValue, thresholds.secondaryIndicators.hySpread),
      },
      sofr: {
        value: sofrValue,
        date: marketStress.sofr?.[0]?.date,
      },
      dollarIndex: {
        value: dollarValue,
        date: marketStress.dollarIndex?.[0]?.date,
      },
    };

    res.json({
      success: true,
      indicators,
      secondary,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching current indicators:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
