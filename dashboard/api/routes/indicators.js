const express = require('express');
const router = express.Router();

const fredService = require('../services/fredService');
const treasuryService = require('../services/treasuryService');
const ticService = require('../services/ticService');
const goldService = require('../services/goldService');
const basisSwapService = require('../services/basisSwapService');
const { evaluateThreshold, assessCurrentStage } = require('../utils/calculations');
const thresholds = require('../../config/thresholds.json');

/**
 * GET /api/indicators/current
 * Returns all current indicator values with threshold evaluations
 */
router.get('/current', async (req, res) => {
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
});

/**
 * GET /api/indicators/stage
 * Returns current crisis stage assessment
 */
router.get('/stage', async (req, res) => {
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
});

/**
 * GET /api/indicators/history/:indicator
 * Returns historical data for a specific indicator
 */
router.get('/history/:indicator', async (req, res) => {
  try {
    const { indicator } = req.params;
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
    console.error(`Error fetching history for ${req.params.indicator}:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/indicators/breakevens
 * Returns TIPS breakeven inflation rates
 */
router.get('/breakevens', async (req, res) => {
  try {
    const [t5yie, t10yie] = await Promise.all([
      fredService.get5YearBreakeven(),
      fredService.get10YearBreakeven(),
    ]);

    const current5Y = t5yie[0]?.value;
    const current10Y = t10yie[0]?.value;

    // Estimate 30Y (typically higher than 10Y by 20-50bps)
    const estimated30Y = current10Y ? current10Y + 0.3 : null;

    // Calculate slope (30Y - 5Y)
    const slope = (estimated30Y && current5Y) ? estimated30Y - current5Y : null;

    res.json({
      success: true,
      breakevens: {
        fiveYear: {
          value: current5Y,
          date: t5yie[0]?.date,
          history: t5yie.slice(0, 250),
        },
        tenYear: {
          value: current10Y,
          date: t10yie[0]?.date,
          history: t10yie.slice(0, 250),
        },
        thirtyYear: {
          value: estimated30Y,
          note: 'Estimated (10Y + 30bps typical premium)',
        },
        slope: {
          value: slope,
          warning: slope && slope > 0.5,
          note: 'Warning threshold: > 50bps',
        },
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching breakevens:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

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

module.exports = router;
