/**
 * Threshold configuration for indicators
 * Mirrors the backend config but with additional UI-specific properties
 */

export const indicatorConfigs = {
  japaneseHedgingSpread: {
    name: 'Japanese Hedging Cost Spread',
    shortName: 'JP Hedge Spread',
    unit: 'bps',
    description: 'US_10Y - JGB_10Y - FX_HEDGE_COST. Negative values indicate Japanese institutions have incentive to exit Treasuries.',
    formula: 'US 10Y Yield - JGB 10Y Yield - FX Hedging Cost',
    thresholds: {
      normal: { min: 0 },
      warning: { min: -50, max: 0 },
      danger: { min: -100, max: -50 },
      critical: { max: -100 },
    },
    inverted: true,
    gaugeMin: -150,
    gaugeMax: 100,
    criticalDirection: 'below',
  },

  crossCurrencyBasis: {
    name: 'Cross-Currency Basis (EUR/USD 5Y)',
    shortName: 'EUR/USD Basis',
    unit: 'bps',
    description: 'Narrowing or positive basis indicates reduced global demand for dollar funding.',
    thresholds: {
      normal: { max: -15 },
      warning: { min: -15, max: -5 },
      danger: { min: -5, max: 5 },
      critical: { min: 5 },
    },
    inverted: false,
    gaugeMin: -50,
    gaugeMax: 20,
    criticalDirection: 'above',
  },

  auctionTail: {
    name: 'Treasury Auction Tail (20Y/30Y Avg)',
    shortName: 'Auction Tail',
    unit: 'bps',
    description: 'Difference between auction high yield and when-issued yield. Consistent tails > 3bps indicate insufficient demand.',
    thresholds: {
      normal: { max: 2 },
      warning: { min: 2, max: 3 },
      danger: { min: 3, max: 5 },
      critical: { min: 5 },
    },
    inverted: false,
    gaugeMin: -1,
    gaugeMax: 8,
    criticalDirection: 'above',
  },

  goldTreasuryRoC: {
    name: 'Gold/Treasury Ratio (12mo Change)',
    shortName: 'Gold/Treasury RoC',
    unit: '%',
    description: 'Annual rate of change in Gold/TLT ratio. Acceleration indicates substitution from Treasuries to gold.',
    thresholds: {
      normal: { max: 0.10 },
      warning: { min: 0.10, max: 0.20 },
      danger: { min: 0.20, max: 0.35 },
      critical: { min: 0.35 },
    },
    inverted: false,
    gaugeMin: -0.10,
    gaugeMax: 0.50,
    displayMultiplier: 100,
    criticalDirection: 'above',
  },

  interestExpenseRatio: {
    name: 'Federal Interest Expense Ratio',
    shortName: 'Interest/Receipts',
    unit: '%',
    description: 'TTM interest expense as percentage of TTM receipts. Above 25% indicates unsustainable arithmetic.',
    thresholds: {
      normal: { max: 0.18 },
      warning: { min: 0.18, max: 0.25 },
      danger: { min: 0.25, max: 0.35 },
      critical: { min: 0.35 },
    },
    inverted: false,
    gaugeMin: 0.05,
    gaugeMax: 0.40,
    displayMultiplier: 100,
    criticalDirection: 'above',
  },
};

/**
 * Stage descriptions and configurations
 */
export const stageConfigs = {
  0: {
    name: 'Pre-Crisis',
    shortName: 'Pre-Crisis',
    description: 'Structural vulnerabilities present but no acute stress',
    color: '#10b981',
    bgColor: '#ecfdf5',
  },
  1: {
    name: 'Stage 1 - Traditional Financial Crisis',
    shortName: 'Stage 1',
    description: 'Traditional financial crisis dynamics: equity selloff, credit stress, flight to safety',
    color: '#f59e0b',
    bgColor: '#fffbeb',
  },
  2: {
    name: 'Stage 2 - Intervention Phase',
    shortName: 'Stage 2',
    description: 'Central bank intervention, balance sheet expansion, policy response',
    color: '#ef4444',
    bgColor: '#fef2f2',
  },
  3: {
    name: 'Stage 3 - Credibility Crisis',
    shortName: 'Stage 3',
    description: 'Dollar loses safe haven status, gold acceleration, foreign selling',
    color: '#7c2d12',
    bgColor: '#fef2f2',
  },
  4: {
    name: 'Stage 4 - Regime Transition',
    shortName: 'Stage 4',
    description: 'New monetary order emerging, possible hyperinflation, capital controls',
    color: '#1f2937',
    bgColor: '#f3f4f6',
  },
};

/**
 * Secondary indicator configurations
 */
export const secondaryIndicatorConfigs = {
  vix: {
    name: 'VIX',
    description: 'CBOE Volatility Index',
    warning: 25,
    danger: 40,
    critical: 60,
  },
  hySpread: {
    name: 'High Yield Spread',
    unit: 'bps',
    description: 'ICE BofA US High Yield Index OAS',
    warning: 400,
    danger: 600,
    critical: 800,
  },
  sofrTreasurySpread: {
    name: 'SOFR-Treasury Spread',
    unit: 'bps',
    description: 'Spread between SOFR and Treasury rates',
    warning: 20,
    danger: 40,
    critical: 75,
  },
  dollarIndex: {
    name: 'Dollar Index',
    description: 'Trade Weighted U.S. Dollar Index',
    note: 'Context dependent - watch for unusual moves during stress',
  },
};

/**
 * Evaluate which zone a value falls into
 * @param {number} value - The value to evaluate
 * @param {object} config - The indicator configuration
 * @returns {object} Zone information
 */
export function evaluateZone(value, config) {
  if (value === null || value === undefined) {
    return { zone: 'UNKNOWN', color: '#6b7280', description: 'Data unavailable' };
  }

  const { thresholds } = config;
  const zones = ['critical', 'danger', 'warning', 'normal'];

  for (const zone of zones) {
    const t = thresholds[zone];
    if (!t) continue;

    const hasMin = t.min !== undefined;
    const hasMax = t.max !== undefined;

    let inZone = false;
    if (hasMin && hasMax) {
      inZone = value >= t.min && value < t.max;
    } else if (hasMin) {
      inZone = value >= t.min;
    } else if (hasMax) {
      inZone = value < t.max;
    }

    if (inZone) {
      return {
        zone: zone.toUpperCase(),
        color: getZoneColorValue(zone),
        description: getZoneDescription(zone),
      };
    }
  }

  return { zone: 'NORMAL', color: '#10b981', description: 'Within normal range' };
}

/**
 * Get zone color value
 * @param {string} zone - Zone name
 * @returns {string} Hex color
 */
function getZoneColorValue(zone) {
  const colors = {
    normal: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    critical: '#7c2d12',
    unknown: '#6b7280',
  };
  return colors[zone.toLowerCase()] || colors.unknown;
}

/**
 * Get zone description
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
 * Get gauge tick marks for an indicator
 * @param {object} config - Indicator configuration
 * @returns {Array} Array of tick mark objects
 */
export function getGaugeTicks(config) {
  const { gaugeMin, gaugeMax, thresholds } = config;
  const ticks = [];
  const range = gaugeMax - gaugeMin;

  // Add min/max ticks
  ticks.push({ value: gaugeMin, position: 0 });
  ticks.push({ value: gaugeMax, position: 100 });

  // Add threshold boundary ticks
  Object.values(thresholds).forEach(t => {
    if (t.min !== undefined && t.min > gaugeMin && t.min < gaugeMax) {
      ticks.push({
        value: t.min,
        position: ((t.min - gaugeMin) / range) * 100,
      });
    }
    if (t.max !== undefined && t.max > gaugeMin && t.max < gaugeMax) {
      ticks.push({
        value: t.max,
        position: ((t.max - gaugeMin) / range) * 100,
      });
    }
  });

  // Sort by position and remove duplicates
  return ticks
    .sort((a, b) => a.position - b.position)
    .filter((tick, index, arr) =>
      index === 0 || Math.abs(tick.position - arr[index - 1].position) > 5
    );
}
