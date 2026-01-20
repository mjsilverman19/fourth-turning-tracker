const axios = require('axios');
const cache = require('../utils/cache');

const FRED_BASE_URL = 'https://api.stlouisfed.org/fred/series/observations';

/**
 * FRED API Service
 * Fetches economic data from Federal Reserve Economic Data (FRED)
 */
class FredService {
  constructor() {
    this.apiKey = process.env.FRED_API_KEY || '';
    this.baseUrl = FRED_BASE_URL;
  }

  /**
   * Fetch series data from FRED
   * @param {string} seriesId - FRED series ID (e.g., 'DGS10')
   * @param {object} options - Query options
   * @returns {Promise<Array>} Array of observations
   */
  async fetchSeries(seriesId, options = {}) {
    const cacheKey = `fred_${seriesId}_${JSON.stringify(options)}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const params = {
        series_id: seriesId,
        api_key: this.apiKey,
        file_type: 'json',
        sort_order: 'desc',
        ...options,
      };

      const response = await axios.get(this.baseUrl, { params });

      if (response.data && response.data.observations) {
        const data = response.data.observations.map(obs => ({
          date: obs.date,
          value: obs.value === '.' ? null : parseFloat(obs.value),
        })).filter(obs => obs.value !== null);

        cache.set(cacheKey, data, 'yields');
        return data;
      }

      return [];
    } catch (error) {
      console.error(`Error fetching FRED series ${seriesId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get 10-Year Treasury Yield
   * @param {number} limit - Number of observations to fetch
   * @returns {Promise<Array>}
   */
  async get10YearTreasuryYield(limit = 730) {
    return this.fetchSeries('DGS10', {
      limit,
      observation_start: this.getDateYearsAgo(2),
    });
  }

  /**
   * Get 30-Year Treasury Yield
   * @param {number} limit - Number of observations to fetch
   * @returns {Promise<Array>}
   */
  async get30YearTreasuryYield(limit = 730) {
    return this.fetchSeries('DGS30', {
      limit,
      observation_start: this.getDateYearsAgo(2),
    });
  }

  /**
   * Get 5-Year Treasury Yield
   * @param {number} limit - Number of observations to fetch
   * @returns {Promise<Array>}
   */
  async get5YearTreasuryYield(limit = 730) {
    return this.fetchSeries('DGS5', {
      limit,
      observation_start: this.getDateYearsAgo(2),
    });
  }

  /**
   * Get 5-Year Breakeven Inflation Rate
   * @param {number} limit - Number of observations to fetch
   * @returns {Promise<Array>}
   */
  async get5YearBreakeven(limit = 730) {
    return this.fetchSeries('T5YIE', {
      limit,
      observation_start: this.getDateYearsAgo(2),
    });
  }

  /**
   * Get 10-Year Breakeven Inflation Rate
   * @param {number} limit - Number of observations to fetch
   * @returns {Promise<Array>}
   */
  async get10YearBreakeven(limit = 730) {
    return this.fetchSeries('T10YIE', {
      limit,
      observation_start: this.getDateYearsAgo(2),
    });
  }

  /**
   * Get Federal Reserve Total Assets (Balance Sheet)
   * @param {number} limit - Number of observations to fetch
   * @returns {Promise<Array>}
   */
  async getFedBalanceSheet(limit = 260) {
    return this.fetchSeries('WALCL', {
      limit,
      observation_start: this.getDateYearsAgo(5),
    });
  }

  /**
   * Get Overnight Reverse Repo Rate
   * @param {number} limit - Number of observations to fetch
   * @returns {Promise<Array>}
   */
  async getOvernightRepoRate(limit = 730) {
    return this.fetchSeries('RRPONTSYD', {
      limit,
      observation_start: this.getDateYearsAgo(2),
    });
  }

  /**
   * Get Gold Price (London PM Fix)
   * @param {number} limit - Number of observations to fetch
   * @returns {Promise<Array>}
   */
  async getGoldPrice(limit = 730) {
    return this.fetchSeries('GOLDPMGBD228NLBM', {
      limit,
      observation_start: this.getDateYearsAgo(2),
    });
  }

  /**
   * Get Trade Weighted Dollar Index
   * @param {number} limit - Number of observations to fetch
   * @returns {Promise<Array>}
   */
  async getDollarIndex(limit = 730) {
    return this.fetchSeries('DTWEXBGS', {
      limit,
      observation_start: this.getDateYearsAgo(2),
    });
  }

  /**
   * Get High Yield Spread (ICE BofA)
   * @param {number} limit - Number of observations to fetch
   * @returns {Promise<Array>}
   */
  async getHighYieldSpread(limit = 730) {
    return this.fetchSeries('BAMLH0A0HYM2', {
      limit,
      observation_start: this.getDateYearsAgo(2),
    });
  }

  /**
   * Get VIX
   * @param {number} limit - Number of observations to fetch
   * @returns {Promise<Array>}
   */
  async getVIX(limit = 730) {
    return this.fetchSeries('VIXCLS', {
      limit,
      observation_start: this.getDateYearsAgo(2),
    });
  }

  /**
   * Get SOFR Rate
   * @param {number} limit - Number of observations to fetch
   * @returns {Promise<Array>}
   */
  async getSOFR(limit = 730) {
    return this.fetchSeries('SOFR', {
      limit,
      observation_start: this.getDateYearsAgo(2),
    });
  }

  /**
   * Get Federal Funds Effective Rate
   * @param {number} limit - Number of observations to fetch
   * @returns {Promise<Array>}
   */
  async getFedFundsRate(limit = 730) {
    return this.fetchSeries('DFF', {
      limit,
      observation_start: this.getDateYearsAgo(2),
    });
  }

  /**
   * Get all core yield data in parallel
   * @returns {Promise<object>}
   */
  async getAllYields() {
    const cacheKey = 'fred_all_yields';
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const [dgs10, dgs30, dgs5, t5yie, t10yie] = await Promise.all([
        this.get10YearTreasuryYield(),
        this.get30YearTreasuryYield(),
        this.get5YearTreasuryYield(),
        this.get5YearBreakeven(),
        this.get10YearBreakeven(),
      ]);

      const result = {
        dgs10,
        dgs30,
        dgs5,
        t5yie,
        t10yie,
        lastUpdated: new Date().toISOString(),
      };

      cache.set(cacheKey, result, 'yields');
      return result;
    } catch (error) {
      console.error('Error fetching all yields:', error.message);
      throw error;
    }
  }

  /**
   * Get market stress indicators
   * @returns {Promise<object>}
   */
  async getMarketStressIndicators() {
    const cacheKey = 'fred_market_stress';
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const [vix, hySpread, sofr, dollarIndex] = await Promise.all([
        this.getVIX(),
        this.getHighYieldSpread(),
        this.getSOFR(),
        this.getDollarIndex(),
      ]);

      const result = {
        vix,
        hySpread,
        sofr,
        dollarIndex,
        lastUpdated: new Date().toISOString(),
      };

      cache.set(cacheKey, result, 'marketStress');
      return result;
    } catch (error) {
      console.error('Error fetching market stress indicators:', error.message);
      throw error;
    }
  }

  /**
   * Get historical data for long-term charts
   * @param {string} seriesId - FRED series ID
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @returns {Promise<Array>}
   */
  async getHistoricalData(seriesId, startDate = '1990-01-01') {
    const cacheKey = `fred_historical_${seriesId}_${startDate}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const data = await this.fetchSeries(seriesId, {
        observation_start: startDate,
        limit: 10000,
      });

      cache.set(cacheKey, data, 86400); // 24 hour cache for historical data
      return data;
    } catch (error) {
      console.error(`Error fetching historical data for ${seriesId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get date string for N years ago
   * @param {number} years - Number of years
   * @returns {string} Date in YYYY-MM-DD format
   */
  getDateYearsAgo(years) {
    const date = new Date();
    date.setFullYear(date.getFullYear() - years);
    return date.toISOString().split('T')[0];
  }

  /**
   * Get latest value from a series
   * @param {string} seriesId - FRED series ID
   * @returns {Promise<{date: string, value: number}>}
   */
  async getLatestValue(seriesId) {
    const data = await this.fetchSeries(seriesId, { limit: 1 });
    return data.length > 0 ? data[0] : null;
  }
}

module.exports = new FredService();
