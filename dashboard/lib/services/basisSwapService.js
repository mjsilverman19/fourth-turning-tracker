const axios = require('axios');
const cache = require('../utils/cache');
const fredService = require('./fredService');
const cipBasisService = require('./cipBasisService');
const { calculateJapaneseHedgingSpread, estimateFxHedgeCost } = require('../utils/calculations');

/**
 * Basis Swap and FX Hedging Service
 * Calculates cross-currency basis and Japanese hedging costs
 *
 * Note: Actual basis swap data typically requires Bloomberg or other premium data sources.
 * This service provides proxy calculations and manual entry support.
 */
class BasisSwapService {
  constructor() {
    // Some alternative data sources for basis swap proxies
    this.sources = {
      boj: 'https://www.stat-search.boj.or.jp/ssi/cgi-bin/famecgi2',
      ecb: 'https://sdw-wsrest.ecb.europa.eu/service/data',
    };
  }

  /**
   * Get JGB (Japanese Government Bond) 10-year yield
   * @returns {Promise<Array>}
   */
  async getJGB10YearYield() {
    const cacheKey = 'basis_jgb_10y';
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Try to fetch from Yahoo Finance first
      const response = await axios.get('https://query1.finance.yahoo.com/v8/finance/chart/^TNX', {
        params: {
          interval: '1d',
          range: '2y',
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      // Note: ^TNX is US 10Y, we need Japan data
      // This is a placeholder - actual JGB data may require different source

      // Try fetching Japan 10Y bond via symbol (may vary by data provider)
      const japanResponse = await axios.get('https://query1.finance.yahoo.com/v8/finance/chart/%5EJNTR', {
        params: {
          interval: '1d',
          range: '2y',
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }).catch(() => null);

      if (japanResponse?.data?.chart?.result?.[0]) {
        const result = japanResponse.data.chart.result[0];
        const timestamps = result.timestamp || [];
        const closes = result.indicators?.quote?.[0]?.close || [];

        const data = timestamps.map((ts, i) => ({
          date: new Date(ts * 1000).toISOString().split('T')[0],
          value: closes[i],
        })).filter(d => d.value !== null);

        cache.set(cacheKey, data, 'basisSwap');
        return data;
      }

      // Return proxy data structure
      return this.getFallbackJGBData();
    } catch (error) {
      console.error('Error fetching JGB yield:', error.message);
      return this.getFallbackJGBData();
    }
  }

  /**
   * Get BOJ policy rate
   * @returns {Promise<number>}
   */
  async getBOJPolicyRate() {
    // BOJ policy rate is currently around -0.1% to 0.1%
    // This would need to be fetched from BOJ or manual entry
    const cacheKey = 'basis_boj_rate';
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const data = {
      rate: 0.25, // Update this based on actual BOJ policy
      asOf: new Date().toISOString().split('T')[0],
      note: 'BOJ policy rate - update manually or fetch from source',
    };

    cache.set(cacheKey, data, 'basisSwap');
    return data;
  }

  /**
   * Calculate Japanese hedging spread
   * Formula: US_10Y - JGB_10Y - FX_HEDGE_COST
   * Now uses CIP basis proxy service for accurate hedge cost calculation
   * @returns {Promise<object>}
   */
  async getJapaneseHedgingSpread() {
    const cacheKey = 'basis_japan_hedging_spread';
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Fetch required data including CIP-based hedging cost
      const [us10yData, jgb10yData, hedgingCostData] = await Promise.all([
        fredService.get10YearTreasuryYield(),
        this.getJGB10YearYield(),
        cipBasisService.getHedgingCostData(),
      ]);

      // Get most recent values
      const us10y = us10yData[0]?.value;
      const jgb10y = jgb10yData[0]?.value;

      if (us10y === undefined || jgb10y === undefined) {
        return this.getFallbackSpreadData();
      }

      // Use CIP-based hedge cost (includes basis swap adjustment)
      const fxHedgeCost = hedgingCostData.totalHedgeCost;

      // Calculate spread
      const spread = calculateJapaneseHedgingSpread(us10y, jgb10y, fxHedgeCost);

      // Calculate historical spreads using CIP-based hedge costs
      const historicalSpreads = this.calculateHistoricalSpreadsWithCIP(
        us10yData,
        jgb10yData,
        hedgingCostData.historicalCosts
      );

      // Calculate 6-month change
      const sixMonthsAgoIndex = Math.min(125, historicalSpreads.length - 1); // ~6 months of trading days
      const sixMonthChange = historicalSpreads.length > sixMonthsAgoIndex ?
        spread - historicalSpreads[sixMonthsAgoIndex].spread : null;

      const result = {
        currentSpread: spread,
        currentDate: us10yData[0]?.date,
        us10y,
        jgb10y,
        fxHedgeCost,
        fxHedgeCostComponents: hedgingCostData.components,
        methodology: hedgingCostData.methodology,
        methodologyNote: hedgingCostData.methodologyNote,
        sixMonthChange,
        historicalSpreads: historicalSpreads.slice(0, 500),
        lastUpdated: new Date().toISOString(),
      };

      cache.set(cacheKey, result, 'basisSwap');
      return result;
    } catch (error) {
      console.error('Error calculating Japanese hedging spread:', error.message);
      return this.getFallbackSpreadData();
    }
  }

  /**
   * Calculate historical spreads (legacy method, kept for backwards compatibility)
   * @param {Array} us10yData - US 10Y yield data
   * @param {Array} jgb10yData - JGB 10Y yield data
   * @param {number} fedFunds - Current Fed Funds rate
   * @param {number} bojRate - BOJ policy rate
   * @returns {Array}
   */
  calculateHistoricalSpreads(us10yData, jgb10yData, fedFunds, bojRate) {
    const jgbByDate = {};
    jgb10yData.forEach(d => {
      jgbByDate[d.date] = d.value;
    });

    // Use simplified FX hedge cost (would need historical rates for accuracy)
    const fxHedgeCost = estimateFxHedgeCost(fedFunds, bojRate, 0);

    return us10yData
      .filter(d => jgbByDate[d.date])
      .map(d => ({
        date: d.date,
        us10y: d.value,
        jgb10y: jgbByDate[d.date],
        spread: calculateJapaneseHedgingSpread(d.value, jgbByDate[d.date], fxHedgeCost),
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  /**
   * Calculate historical spreads using CIP-based hedge costs
   * @param {Array} us10yData - US 10Y yield data
   * @param {Array} jgb10yData - JGB 10Y yield data
   * @param {Array} historicalCosts - Historical hedge costs from CIP service
   * @returns {Array}
   */
  calculateHistoricalSpreadsWithCIP(us10yData, jgb10yData, historicalCosts) {
    const jgbByDate = {};
    jgb10yData.forEach(d => {
      jgbByDate[d.date] = d.value;
    });

    const hedgeCostByDate = {};
    historicalCosts.forEach(d => {
      hedgeCostByDate[d.date] = d.hedgeCost;
    });

    return us10yData
      .filter(d => jgbByDate[d.date])
      .map(d => {
        // Use date-specific hedge cost if available, otherwise use first available
        const hedgeCost = hedgeCostByDate[d.date] || historicalCosts[0]?.hedgeCost || 5.0;
        return {
          date: d.date,
          us10y: d.value,
          jgb10y: jgbByDate[d.date],
          fxHedgeCost: hedgeCost,
          spread: calculateJapaneseHedgingSpread(d.value, jgbByDate[d.date], hedgeCost),
        };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  /**
   * Get EUR/USD cross-currency basis swap
   * Uses CIP basis proxy as primary source, with manual entry as override
   * @returns {Promise<object>}
   */
  async getEURUSDBasisSwap() {
    const cacheKey = 'basis_eurusd_5y';
    const cached = cache.get(cacheKey);

    // Check for manual override first
    if (cached && cached.manualOverride) {
      return cached;
    }

    try {
      // Use CIP basis proxy service as primary data source
      const proxyData = await cipBasisService.getEURUSD5YBasisProxy();

      const result = {
        current: proxyData.current,
        currentDate: proxyData.currentDate,
        term: proxyData.term,
        historicalData: proxyData.historicalData,
        methodology: proxyData.methodology,
        methodologyNote: proxyData.methodologyNote,
        inputs: proxyData.inputs,
        accuracy: proxyData.accuracy,
        dataNote: 'Calculated via CIP deviation proxy. For actual data, use Bloomberg EUBSC5 Curncy and enter manually.',
        lastUpdated: proxyData.lastUpdated,
      };

      cache.set(cacheKey, result, 'basisSwap');
      return result;
    } catch (error) {
      console.error('Error fetching EUR/USD basis proxy:', error.message);
      // Return fallback structure
      return {
        current: null,
        term: '5Y',
        historicalData: [],
        dataNote: 'EUR/USD 5Y basis swap - proxy calculation failed',
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  /**
   * Get JPY/USD cross-currency basis swap
   * Uses CIP basis proxy as primary source, with manual entry as override
   * @returns {Promise<object>}
   */
  async getJPYUSDBasisSwap() {
    const cacheKey = 'basis_jpyusd_5y';
    const cached = cache.get(cacheKey);

    // Check for manual override first
    if (cached && cached.manualOverride) {
      return cached;
    }

    try {
      // Use CIP basis proxy service as primary data source
      const proxyData = await cipBasisService.getJPYUSD5YBasisProxy();

      const result = {
        current: proxyData.current,
        currentDate: proxyData.currentDate,
        term: proxyData.term,
        historicalData: proxyData.historicalData,
        methodology: proxyData.methodology,
        methodologyNote: proxyData.methodologyNote,
        inputs: proxyData.inputs,
        accuracy: proxyData.accuracy,
        dataNote: 'Calculated via CIP deviation proxy with JPY structural premium. For actual data, use Bloomberg JYBSC5 Curncy and enter manually.',
        lastUpdated: proxyData.lastUpdated,
      };

      cache.set(cacheKey, result, 'basisSwap');
      return result;
    } catch (error) {
      console.error('Error fetching JPY/USD basis proxy:', error.message);
      return {
        current: null,
        term: '5Y',
        historicalData: [],
        dataNote: 'JPY/USD 5Y basis swap - proxy calculation failed',
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  /**
   * Set manual basis swap data
   * Manual entries override CIP proxy calculations
   * @param {object} data - Basis swap data
   * @returns {object}
   */
  async setManualBasisSwapData(data) {
    const { pair, term, value, date, clearOverride } = data;

    if (!pair) {
      throw new Error('pair is required');
    }

    const cacheKey = `basis_${pair.toLowerCase()}_${term || '5y'}`;

    // Allow clearing manual override to return to proxy data
    if (clearOverride) {
      cache.del(cacheKey);
      return {
        success: true,
        message: `Manual override cleared for ${pair}. Will use CIP proxy data.`,
        pair,
        term: term || '5Y',
      };
    }

    if (value === undefined || !date) {
      throw new Error('value and date are required (or set clearOverride: true)');
    }

    const existing = cache.get(cacheKey) || {
      current: null,
      term: term || '5Y',
      historicalData: [],
    };

    existing.current = value;
    existing.currentDate = date;
    existing.manualOverride = true;  // Flag to indicate manual entry takes precedence
    existing.methodology = 'manual';
    existing.methodologyNote = 'Manually entered value (e.g., from Bloomberg)';
    existing.historicalData.push({ date, value });
    existing.historicalData.sort((a, b) => new Date(b.date) - new Date(a.date));
    existing.lastUpdated = new Date().toISOString();

    cache.set(cacheKey, existing, 'basisSwap');

    return {
      success: true,
      pair,
      term: term || '5Y',
      value,
      date,
      note: 'Manual override set. CIP proxy will be bypassed until cache expires or override is cleared.',
    };
  }

  /**
   * Set manual JGB yield data
   * @param {Array} data - Array of {date, value} objects
   * @returns {object}
   */
  async setManualJGBData(data) {
    if (!Array.isArray(data)) {
      throw new Error('data must be an array of {date, value} objects');
    }

    const cacheKey = 'basis_jgb_10y';
    const sortedData = [...data].sort((a, b) => new Date(b.date) - new Date(a.date));

    cache.set(cacheKey, sortedData, 'basisSwap');

    return {
      success: true,
      entriesAdded: data.length,
      mostRecent: sortedData[0],
    };
  }

  /**
   * Get all basis swap metrics for dashboard
   * @returns {Promise<object>}
   */
  async getAllBasisMetrics() {
    const cacheKey = 'basis_all_metrics';
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const [japanSpread, eurBasis, jpyBasis] = await Promise.all([
        this.getJapaneseHedgingSpread(),
        this.getEURUSDBasisSwap(),
        this.getJPYUSDBasisSwap(),
      ]);

      const result = {
        japaneseHedgingSpread: japanSpread,
        eurUsdBasis: eurBasis,
        jpyUsdBasis: jpyBasis,
        lastUpdated: new Date().toISOString(),
      };

      cache.set(cacheKey, result, 'basisSwap');
      return result;
    } catch (error) {
      console.error('Error fetching basis metrics:', error.message);
      throw error;
    }
  }

  /**
   * Fallback JGB data
   * @returns {Array}
   */
  getFallbackJGBData() {
    return [
      {
        date: new Date().toISOString().split('T')[0],
        value: 0.9, // Approximate current JGB 10Y yield
        note: 'Proxy value - actual data requires BOJ source or manual entry',
      },
    ];
  }

  /**
   * Fallback spread data
   * @returns {object}
   */
  getFallbackSpreadData() {
    return {
      currentSpread: null,
      currentDate: null,
      us10y: null,
      jgb10y: null,
      fxHedgeCost: null,
      fxHedgeCostComponents: null,
      methodology: 'fallback',
      methodologyNote: 'Spread calculation requires US 10Y and JGB 10Y data',
      sixMonthChange: null,
      historicalSpreads: [],
      note: 'Spread calculation requires US 10Y and JGB 10Y data',
      lastUpdated: new Date().toISOString(),
    };
  }
}

module.exports = new BasisSwapService();
