const thresholds = require('../../config/thresholds.json');

/**
 * Calculate Japanese hedging cost spread
 * Formula: US_10Y - JGB_10Y - FX_HEDGE_COST
 * When negative, Japanese institutions have financial incentive to exit Treasuries
 *
 * @param {number} us10y - US 10-year Treasury yield (percentage)
 * @param {number} jgb10y - Japan 10-year Government Bond yield (percentage)
 * @param {number} fxHedgeCost - FX hedging cost (percentage, derived from forward points or basis swap)
 * @returns {number} Spread in basis points
 */
function calculateJapaneseHedgingSpread(us10y, jgb10y, fxHedgeCost) {
  // Convert from percentage to basis points
  const spreadPercent = us10y - jgb10y - fxHedgeCost;
  return spreadPercent * 100; // Return in basis points
}

/**
 * Estimate FX hedging cost from interest rate differential
 * Approximation when actual forward/basis data unavailable
 * Uses covered interest parity as baseline
 *
 * @param {number} usShortRate - US short-term rate (Fed Funds or similar)
 * @param {number} jpShortRate - Japan short-term rate (BOJ policy rate)
 * @param {number} basisAdjustment - Cross-currency basis adjustment (optional, in percentage)
 * @returns {number} Estimated FX hedging cost in percentage
 */
function estimateFxHedgeCost(usShortRate, jpShortRate, basisAdjustment = 0) {
  // Basic covered interest parity: hedge cost ≈ rate differential
  // Plus any basis swap adjustment
  return (usShortRate - jpShortRate) + basisAdjustment;
}

/**
 * Calculate Treasury auction tail
 * Positive tail = weak demand (Treasury paid more than expected)
 *
 * @param {number} auctionHighYield - Auction stop-out yield (percentage)
 * @param {number} whenIssuedYield - When-issued trading yield before auction (percentage)
 * @returns {number} Tail in basis points
 */
function calculateAuctionTail(auctionHighYield, whenIssuedYield) {
  return (auctionHighYield - whenIssuedYield) * 100; // Convert to basis points
}

/**
 * Calculate average auction tail from multiple auctions
 * @param {Array<{highYield: number, whenIssuedYield: number}>} auctions
 * @returns {number} Average tail in basis points
 */
function calculateAverageAuctionTail(auctions) {
  if (!auctions || auctions.length === 0) return null;

  const tails = auctions.map(a => calculateAuctionTail(a.highYield, a.whenIssuedYield));
  return tails.reduce((sum, tail) => sum + tail, 0) / tails.length;
}

/**
 * Calculate Gold/Treasury ratio
 * Higher ratio indicates preference for gold over Treasuries
 *
 * @param {number} goldPrice - Gold spot price (USD per troy ounce)
 * @param {number} tltPrice - TLT ETF price (proxy for long Treasury prices)
 * @returns {number} Ratio
 */
function calculateGoldTreasuryRatio(goldPrice, tltPrice) {
  if (!tltPrice || tltPrice === 0) return null;
  return goldPrice / tltPrice;
}

/**
 * Calculate rate of change for Gold/Treasury ratio
 * @param {number} currentRatio - Current Gold/TLT ratio
 * @param {number} previousRatio - Ratio from comparison period
 * @returns {number} Rate of change (e.g., 0.15 = 15% increase)
 */
function calculateRatioRateOfChange(currentRatio, previousRatio) {
  if (!previousRatio || previousRatio === 0) return null;
  return (currentRatio - previousRatio) / previousRatio;
}

/**
 * Calculate Federal interest expense ratio
 * When above 25%, arithmetic becomes unsustainable
 *
 * @param {number} ttmInterestExpense - Trailing 12-month interest expense (USD)
 * @param {number} ttmReceipts - Trailing 12-month federal receipts (USD)
 * @returns {number} Ratio (e.g., 0.20 = 20%)
 */
function calculateInterestExpenseRatio(ttmInterestExpense, ttmReceipts) {
  if (!ttmReceipts || ttmReceipts === 0) return null;
  return ttmInterestExpense / ttmReceipts;
}

/**
 * Evaluate threshold zone for an indicator
 * @param {number} value - Current indicator value
 * @param {object} thresholdConfig - Threshold configuration for this indicator
 * @returns {object} Zone assessment with zone name and color
 */
function evaluateThreshold(value, thresholdConfig) {
  if (value === null || value === undefined) {
    return { zone: 'UNKNOWN', color: '#6b7280', description: 'Data unavailable' };
  }

  const zones = ['critical', 'danger', 'warning', 'normal'];

  for (const zone of zones) {
    const config = thresholdConfig[zone];
    if (!config) continue;

    const hasMin = config.min !== undefined;
    const hasMax = config.max !== undefined;

    let inZone = false;
    if (hasMin && hasMax) {
      inZone = value >= config.min && value < config.max;
    } else if (hasMin) {
      inZone = value >= config.min;
    } else if (hasMax) {
      inZone = value < config.max;
    }

    if (inZone) {
      return {
        zone: zone.toUpperCase(),
        color: getZoneColor(zone),
        description: getZoneDescription(zone),
      };
    }
  }

  return { zone: 'NORMAL', color: '#10b981', description: 'Within normal range' };
}

/**
 * Get color for zone
 * @param {string} zone - Zone name
 * @returns {string} Hex color code
 */
function getZoneColor(zone) {
  const colors = {
    normal: '#10b981',   // Green
    warning: '#f59e0b',  // Amber
    danger: '#ef4444',   // Red
    critical: '#7c2d12', // Dark red
    unknown: '#6b7280',  // Gray
  };
  return colors[zone.toLowerCase()] || colors.unknown;
}

/**
 * Get description for zone
 * @param {string} zone - Zone name
 * @returns {string} Description
 */
function getZoneDescription(zone) {
  const descriptions = {
    normal: 'Within normal range',
    warning: 'Elevated risk - monitor closely',
    danger: 'High risk - significant concern',
    critical: 'Critical - immediate attention required',
    unknown: 'Data unavailable',
  };
  return descriptions[zone.toLowerCase()] || descriptions.unknown;
}

/**
 * Assess current crisis stage based on multiple indicators
 * @param {object} indicators - Current indicator values
 * @returns {object} Stage assessment with stage, confidence, and triggers
 */
function assessCurrentStage(indicators) {
  const {
    hedgingSpread,
    basisSwap,
    auctionTail,
    goldTreasuryRoC,
    interestRatio,
    vix,
    hySpread,
    dollarChange,
    fedBalanceSheetChange,
    inflationBreakeven,
    goldChange,
    foreignHoldingsChange,
    cpiAnnualized,
  } = indicators;

  const stageConfig = thresholds.stageAssessment;
  const triggeredStages = [];

  // Check Stage 1 triggers
  const stage1Triggers = [];
  if (vix > 40) stage1Triggers.push('VIX > 40');
  if (hySpread > 700) stage1Triggers.push('HY Spread > 700bps');
  if (auctionTail > 4) stage1Triggers.push('Auction tail > 4bps');
  if (hedgingSpread < -50) stage1Triggers.push('Japanese hedging spread < -50bps');
  if (dollarChange < 0 && vix > 25) stage1Triggers.push('Dollar weakening during equity stress');

  if (stage1Triggers.length >= 3) {
    triggeredStages.push({
      stage: 1,
      triggers: stage1Triggers,
      confidence: Math.min(100, 50 + stage1Triggers.length * 10),
    });
  }

  // Check Stage 2 triggers
  const stage2Triggers = [];
  if (fedBalanceSheetChange > 2000) stage2Triggers.push('Fed balance sheet expansion > $2T');
  if (inflationBreakeven > 4) stage2Triggers.push('Inflation breakevens > 4%');
  if (dollarChange < -15) stage2Triggers.push('Dollar down > 15%');
  if (goldChange > 30) stage2Triggers.push('Gold up > 30%');

  if (stage2Triggers.length >= 2) {
    triggeredStages.push({
      stage: 2,
      triggers: stage2Triggers,
      confidence: Math.min(100, 50 + stage2Triggers.length * 15),
    });
  }

  // Check Stage 3 triggers
  const stage3Triggers = [];
  if (dollarChange < -20) stage3Triggers.push('Sustained dollar weakness > 20%');
  if (goldChange > 50) stage3Triggers.push('Gold acceleration > 50%');
  if (foreignHoldingsChange < -10) stage3Triggers.push('Foreign selling acceleration');

  if (stage3Triggers.length >= 2) {
    triggeredStages.push({
      stage: 3,
      triggers: stage3Triggers,
      confidence: Math.min(100, 50 + stage3Triggers.length * 15),
    });
  }

  // Check Stage 4 triggers
  const stage4Triggers = [];
  if (cpiAnnualized > 10) stage4Triggers.push('CPI > 10% annualized');

  if (stage4Triggers.length >= 1) {
    triggeredStages.push({
      stage: 4,
      triggers: stage4Triggers,
      confidence: Math.min(100, 40 + stage4Triggers.length * 30),
    });
  }

  // Determine highest triggered stage
  if (triggeredStages.length > 0) {
    const highestStage = triggeredStages.reduce((max, s) => s.stage > max.stage ? s : max);
    return {
      stage: highestStage.stage,
      stageName: getStageDescription(highestStage.stage),
      confidence: highestStage.confidence,
      triggers: highestStage.triggers,
      allTriggeredStages: triggeredStages,
    };
  }

  // Pre-crisis assessment
  const preCrisisConcerns = [];
  if (hedgingSpread < 0) preCrisisConcerns.push('Japanese hedging spread negative');
  if (auctionTail > 2) preCrisisConcerns.push('Auction tails trending higher');
  if (interestRatio > 0.18) preCrisisConcerns.push(`Interest expense ratio at ${(interestRatio * 100).toFixed(1)}%`);
  if (basisSwap > -15) preCrisisConcerns.push('Cross-currency basis narrowing');
  if (goldTreasuryRoC > 0.10) preCrisisConcerns.push('Gold/Treasury ratio accelerating');

  const riskLevel = preCrisisConcerns.length >= 3 ? 'Elevated Risk' :
                    preCrisisConcerns.length >= 1 ? 'Moderate Risk' : 'Low Risk';

  return {
    stage: 0,
    stageName: `Pre-Crisis (${riskLevel})`,
    confidence: 50 + preCrisisConcerns.length * 8,
    triggers: preCrisisConcerns,
    allTriggeredStages: [],
  };
}

/**
 * Get stage description
 * @param {number} stage - Stage number
 * @returns {string} Description
 */
function getStageDescription(stage) {
  const descriptions = {
    0: 'Pre-Crisis',
    1: 'Stage 1 - Traditional Financial Crisis',
    2: 'Stage 2 - Intervention Phase',
    3: 'Stage 3 - Credibility Crisis',
    4: 'Stage 4 - Regime Transition',
  };
  return descriptions[stage] || 'Unknown';
}

/**
 * Calculate trailing 12-month sum from monthly data
 * @param {Array<{date: string, value: number}>} monthlyData - Monthly data points
 * @param {Date} asOfDate - Calculate TTM as of this date
 * @returns {number} TTM sum
 */
function calculateTTM(monthlyData, asOfDate = new Date()) {
  const asOf = new Date(asOfDate);
  const twelveMonthsAgo = new Date(asOf);
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const relevantData = monthlyData.filter(d => {
    const date = new Date(d.date);
    return date > twelveMonthsAgo && date <= asOf;
  });

  return relevantData.reduce((sum, d) => sum + d.value, 0);
}

/**
 * Calculate percentage change between two values
 * @param {number} current - Current value
 * @param {number} previous - Previous value
 * @returns {number} Percentage change (e.g., 0.15 = 15%)
 */
function calculatePercentChange(current, previous) {
  if (!previous || previous === 0) return null;
  return (current - previous) / previous;
}

/**
 * Calculate 6-month change for trend analysis
 * @param {Array<{date: string, value: number}>} data - Time series data
 * @returns {number} Change in the underlying unit
 */
function calculate6MonthChange(data) {
  if (!data || data.length < 2) return null;

  const sorted = [...data].sort((a, b) => new Date(b.date) - new Date(a.date));
  const current = sorted[0];

  const sixMonthsAgo = new Date(current.date);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const previousData = sorted.find(d => new Date(d.date) <= sixMonthsAgo);
  if (!previousData) return null;

  return current.value - previousData.value;
}

/**
 * Calculate 12-month change for trend analysis
 * @param {Array<{date: string, value: number}>} data - Time series data
 * @returns {number} Change in the underlying unit
 */
function calculate12MonthChange(data) {
  if (!data || data.length < 2) return null;

  const sorted = [...data].sort((a, b) => new Date(b.date) - new Date(a.date));
  const current = sorted[0];

  const twelveMonthsAgo = new Date(current.date);
  twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

  const previousData = sorted.find(d => new Date(d.date) <= twelveMonthsAgo);
  if (!previousData) return null;

  return current.value - previousData.value;
}

/**
 * Generate gauge position for visualization
 * @param {number} value - Current value
 * @param {number} min - Gauge minimum
 * @param {number} max - Gauge maximum
 * @returns {number} Position as percentage (0-100)
 */
function calculateGaugePosition(value, min, max) {
  if (value === null || value === undefined) return 50;
  const clamped = Math.max(min, Math.min(max, value));
  return ((clamped - min) / (max - min)) * 100;
}

module.exports = {
  calculateJapaneseHedgingSpread,
  estimateFxHedgeCost,
  calculateAuctionTail,
  calculateAverageAuctionTail,
  calculateGoldTreasuryRatio,
  calculateRatioRateOfChange,
  calculateInterestExpenseRatio,
  evaluateThreshold,
  getZoneColor,
  getZoneDescription,
  assessCurrentStage,
  getStageDescription,
  calculateTTM,
  calculatePercentChange,
  calculate6MonthChange,
  calculate12MonthChange,
  calculateGaugePosition,
};
