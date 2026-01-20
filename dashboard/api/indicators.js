const fredService = require('../lib/services/fredService');
const treasuryService = require('../lib/services/treasuryService');
const goldService = require('../lib/services/goldService');
const basisSwapService = require('../lib/services/basisSwapService');
const { evaluateThreshold, assessCurrentStage } = require('../lib/utils/calculations');
const thresholds = require('../config/thresholds.json');

/**
 * /api/indicators
 * GET ?type=current - All current indicator values (default)
 * GET ?type=stage - Current crisis stage assessment
 * GET ?type=breakevens - TIPS breakeven inflation rates
 * GET ?type=history&indicator=xxx - Historical data for specific indicator
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { type = 'current', indicator } = req.query;

  try {
    switch (type) {
      case 'current':
        return await handleCurrent(res);
      case 'stage':
        return await handleStage(res);
      case 'breakevens':
        return await handleBreakevens(res);
      case 'history':
        return await handleHistory(res, indicator);
      default:
        return res.status(400).json({ success: false, error: `Unknown type: ${type}` });
    }
  } catch (error) {
    console.error(`Error in indicators (type=${type}):`, error);
    res.status(500).json({ success: false, error: error.message });
  }
};

async function handleCurrent(res) {
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

  const vixValue = marketStress.vix?.[0]?.value;
  const hySpreadValue = marketStress.hySpread?.[0]?.value ? marketStress.hySpread[0].value * 100 : null;

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
      value: marketStress.sofr?.[0]?.value,
      date: marketStress.sofr?.[0]?.date,
    },
    dollarIndex: {
      value: marketStress.dollarIndex?.[0]?.value,
      date: marketStress.dollarIndex?.[0]?.date,
    },
  };

  res.json({ success: true, indicators, secondary, lastUpdated: new Date().toISOString() });
}

async function handleStage(res) {
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
    dollarChange: null,
    fedBalanceSheetChange: null,
    inflationBreakeven: null,
    goldChange: goldRatio.rateOfChange12MonthPercent,
    foreignHoldingsChange: null,
    cpiAnnualized: null,
  };

  const assessment = assessCurrentStage(indicatorValues);
  res.json({ success: true, assessment, indicatorValues, lastUpdated: new Date().toISOString() });
}

async function handleBreakevens(res) {
  const [t5yie, t10yie] = await Promise.all([
    fredService.get5YearBreakeven(),
    fredService.get10YearBreakeven(),
  ]);

  const current5Y = t5yie[0]?.value;
  const current10Y = t10yie[0]?.value;
  const estimated30Y = current10Y ? current10Y + 0.3 : null;
  const slope = (estimated30Y && current5Y) ? estimated30Y - current5Y : null;

  res.json({
    success: true,
    breakevens: {
      fiveYear: { value: current5Y, date: t5yie[0]?.date, history: t5yie.slice(0, 250) },
      tenYear: { value: current10Y, date: t10yie[0]?.date, history: t10yie.slice(0, 250) },
      thirtyYear: { value: estimated30Y, note: 'Estimated (10Y + 30bps typical premium)' },
      slope: { value: slope, warning: slope && slope > 0.5, note: 'Warning threshold: > 50bps' },
    },
    lastUpdated: new Date().toISOString(),
  });
}

async function handleHistory(res, indicator) {
  if (!indicator) {
    return res.status(400).json({ success: false, error: 'indicator parameter required' });
  }

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
      historicalData = await treasuryService.getMonthlyStatementData();
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
      return res.status(400).json({ success: false, error: `Unknown indicator: ${indicator}` });
  }

  res.json({ success: true, indicator, data: historicalData, lastUpdated: new Date().toISOString() });
}

function evaluateSecondaryThreshold(value, config) {
  if (value === null || value === undefined) {
    return { zone: 'UNKNOWN', color: '#6b7280' };
  }
  if (value >= config.critical) return { zone: 'CRITICAL', color: '#7c2d12' };
  if (value >= config.danger) return { zone: 'DANGER', color: '#ef4444' };
  if (value >= config.warning) return { zone: 'WARNING', color: '#f59e0b' };
  return { zone: 'NORMAL', color: '#10b981' };
}
