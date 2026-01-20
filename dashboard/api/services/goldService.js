const axios = require('axios');
const cache = require('../utils/cache');
const fredService = require('./fredService');
const { calculateGoldTreasuryRatio, calculateRatioRateOfChange } = require('../utils/calculations');

/**
 * Gold Data Service
 * Fetches gold prices and calculates Gold/Treasury ratio
 */
class GoldService {
  constructor() {
    this.yahooFinanceUrl = 'https://query1.finance.yahoo.com/v8/finance/chart';
  }

  /**
   * Get gold price from FRED
   * @returns {Promise<Array>}
   */
  async getGoldPriceFromFred() {
    return fredService.getGoldPrice();
  }

  /**
   * Get TLT (20+ Year Treasury Bond ETF) price from Yahoo Finance
   * @returns {Promise<Array>}
   */
  async getTLTPrice() {
    const cacheKey = 'gold_tlt_price';
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await axios.get(`${this.yahooFinanceUrl}/TLT`, {
        params: {
          interval: '1d',
          range: '2y',
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (response.data?.chart?.result?.[0]) {
        const result = response.data.chart.result[0];
        const timestamps = result.timestamp || [];
        const closes = result.indicators?.quote?.[0]?.close || [];

        const data = timestamps.map((ts, i) => ({
          date: new Date(ts * 1000).toISOString().split('T')[0],
          value: closes[i],
        })).filter(d => d.value !== null);

        cache.set(cacheKey, data, 'etfPrices');
        return data;
      }

      return this.getFallbackTLTData();
    } catch (error) {
      console.error('Error fetching TLT price:', error.message);
      return this.getFallbackTLTData();
    }
  }

  /**
   * Get GLD (Gold ETF) price as alternative gold proxy
   * @returns {Promise<Array>}
   */
  async getGLDPrice() {
    const cacheKey = 'gold_gld_price';
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await axios.get(`${this.yahooFinanceUrl}/GLD`, {
        params: {
          interval: '1d',
          range: '2y',
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (response.data?.chart?.result?.[0]) {
        const result = response.data.chart.result[0];
        const timestamps = result.timestamp || [];
        const closes = result.indicators?.quote?.[0]?.close || [];

        const data = timestamps.map((ts, i) => ({
          date: new Date(ts * 1000).toISOString().split('T')[0],
          value: closes[i],
        })).filter(d => d.value !== null);

        cache.set(cacheKey, data, 'etfPrices');
        return data;
      }

      return [];
    } catch (error) {
      console.error('Error fetching GLD price:', error.message);
      return [];
    }
  }

  /**
   * Calculate Gold/Treasury ratio and its rate of change
   * @returns {Promise<object>}
   */
  async getGoldTreasuryRatio() {
    const cacheKey = 'gold_treasury_ratio';
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const [goldData, tltData] = await Promise.all([
        this.getGoldPriceFromFred(),
        this.getTLTPrice(),
      ]);

      // Align dates and calculate ratio
      const goldByDate = {};
      goldData.forEach(d => {
        goldByDate[d.date] = d.value;
      });

      const ratioData = tltData
        .filter(d => goldByDate[d.date])
        .map(d => ({
          date: d.date,
          goldPrice: goldByDate[d.date],
          tltPrice: d.value,
          ratio: calculateGoldTreasuryRatio(goldByDate[d.date], d.value),
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      if (ratioData.length === 0) {
        return this.getFallbackRatioData();
      }

      const current = ratioData[0];

      // Find 12-month-ago data point
      const oneYearAgo = new Date(current.date);
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const yearAgoData = ratioData.find(d => {
        const date = new Date(d.date);
        return date <= oneYearAgo;
      });

      // Find 6-month-ago data point
      const sixMonthsAgo = new Date(current.date);
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const sixMonthAgoData = ratioData.find(d => {
        const date = new Date(d.date);
        return date <= sixMonthsAgo;
      });

      const roc12Month = yearAgoData ?
        calculateRatioRateOfChange(current.ratio, yearAgoData.ratio) : null;

      const roc6Month = sixMonthAgoData ?
        calculateRatioRateOfChange(current.ratio, sixMonthAgoData.ratio) : null;

      const result = {
        currentRatio: current.ratio,
        currentGoldPrice: current.goldPrice,
        currentTLTPrice: current.tltPrice,
        currentDate: current.date,
        rateOfChange12Month: roc12Month,
        rateOfChange12MonthPercent: roc12Month ? roc12Month * 100 : null,
        rateOfChange6Month: roc6Month,
        rateOfChange6MonthPercent: roc6Month ? roc6Month * 100 : null,
        historicalRatios: ratioData.slice(0, 500), // Last 2 years
        lastUpdated: new Date().toISOString(),
      };

      cache.set(cacheKey, result, 'goldPrice');
      return result;
    } catch (error) {
      console.error('Error calculating Gold/Treasury ratio:', error.message);
      return this.getFallbackRatioData();
    }
  }

  /**
   * Get central bank gold purchases data
   * Note: This typically requires manual entry or World Gold Council data
   * @returns {Promise<object>}
   */
  async getCentralBankGoldPurchases() {
    const cacheKey = 'gold_central_bank_purchases';
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // World Gold Council data typically requires manual entry
    // This provides a structure for the data
    const result = {
      rolling12MonthTonnes: null,
      topPurchasers: [],
      historicalData: [],
      source: 'World Gold Council',
      dataNote: 'Quarterly data - requires manual update',
      lastUpdated: new Date().toISOString(),
    };

    cache.set(cacheKey, result, 'centralBankGold');
    return result;
  }

  /**
   * Set manual central bank gold data
   * @param {object} data - Gold purchase data
   * @returns {object}
   */
  async setManualCentralBankData(data) {
    const {
      period,
      totalTonnes,
      topPurchasers,
    } = data;

    const existing = await this.getCentralBankGoldPurchases();

    if (!existing.historicalData) {
      existing.historicalData = [];
    }

    existing.historicalData.push({
      period,
      totalTonnes,
      topPurchasers,
      addedAt: new Date().toISOString(),
    });

    // Sort by period descending
    existing.historicalData.sort((a, b) => b.period.localeCompare(a.period));

    // Update rolling 12-month calculation
    const recent = existing.historicalData.slice(0, 4); // Last 4 quarters
    existing.rolling12MonthTonnes = recent.reduce((sum, q) => sum + (q.totalTonnes || 0), 0);

    // Get top purchasers from most recent quarter
    if (existing.historicalData[0]?.topPurchasers) {
      existing.topPurchasers = existing.historicalData[0].topPurchasers;
    }

    existing.lastUpdated = new Date().toISOString();

    cache.set('gold_central_bank_purchases', existing, 'centralBankGold');

    return {
      success: true,
      data: existing,
    };
  }

  /**
   * Get gold price historical data for charts
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @returns {Promise<Array>}
   */
  async getHistoricalGoldPrice(startDate = '2000-01-01') {
    return fredService.getHistoricalData('GOLDPMGBD228NLBM', startDate);
  }

  /**
   * Get comprehensive gold metrics for dashboard
   * @returns {Promise<object>}
   */
  async getGoldMetrics() {
    const cacheKey = 'gold_all_metrics';
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const [ratio, centralBank] = await Promise.all([
        this.getGoldTreasuryRatio(),
        this.getCentralBankGoldPurchases(),
      ]);

      const result = {
        goldTreasuryRatio: ratio,
        centralBankPurchases: centralBank,
        lastUpdated: new Date().toISOString(),
      };

      cache.set(cacheKey, result, 'goldPrice');
      return result;
    } catch (error) {
      console.error('Error fetching gold metrics:', error.message);
      throw error;
    }
  }

  /**
   * Fallback TLT data
   * @returns {Array}
   */
  getFallbackTLTData() {
    return [
      {
        date: new Date().toISOString().split('T')[0],
        value: null,
        note: 'TLT data unavailable',
      },
    ];
  }

  /**
   * Fallback ratio data
   * @returns {object}
   */
  getFallbackRatioData() {
    return {
      currentRatio: null,
      currentGoldPrice: null,
      currentTLTPrice: null,
      currentDate: null,
      rateOfChange12Month: null,
      rateOfChange12MonthPercent: null,
      rateOfChange6Month: null,
      rateOfChange6MonthPercent: null,
      historicalRatios: [],
      note: 'Gold/Treasury ratio data unavailable',
      lastUpdated: new Date().toISOString(),
    };
  }
}

module.exports = new GoldService();
