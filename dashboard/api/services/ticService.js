const axios = require('axios');
const cache = require('../utils/cache');

/**
 * Treasury International Capital (TIC) Service
 * Tracks foreign holdings of U.S. Treasury securities
 */
class TicService {
  constructor() {
    this.baseUrl = 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service';
    this.ticUrl = 'https://ticdata.treasury.gov/resource-center/data-chart-center/tic/Documents';
  }

  /**
   * Fetch major foreign holders of Treasury securities
   * @returns {Promise<object>}
   */
  async getMajorForeignHolders() {
    const cacheKey = 'tic_major_holders';
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // The TIC data may need to be fetched from a different endpoint or parsed from files
      // Treasury's Fiscal Data API may have limited TIC coverage
      // This implementation provides a structure for the data

      // Attempt to fetch from fiscal data API first
      const url = `${this.baseUrl}/v1/accounting/od/title_iii`;

      const response = await axios.get(url, {
        params: {
          'sort': '-record_date',
          'page[size]': 100,
        },
      });

      if (response.data && response.data.data) {
        const result = this.processTicData(response.data.data);
        cache.set(cacheKey, result, 'ticData');
        return result;
      }

      // Return fallback structure if API doesn't have the data
      return this.getFallbackTicData();
    } catch (error) {
      console.error('Error fetching TIC data:', error.message);
      return this.getFallbackTicData();
    }
  }

  /**
   * Process raw TIC data into usable format
   * @param {Array} rawData - Raw API response data
   * @returns {object}
   */
  processTicData(rawData) {
    // Group by country and date
    const byCountry = {};
    const byDate = {};

    rawData.forEach(record => {
      const country = record.country_name || record.country;
      const date = record.record_date;
      const holdings = parseFloat(record.holdings) || parseFloat(record.us_treasury_securities) || 0;

      if (!byCountry[country]) {
        byCountry[country] = [];
      }
      byCountry[country].push({ date, holdings });

      if (!byDate[date]) {
        byDate[date] = {};
      }
      byDate[date][country] = holdings;
    });

    return {
      byCountry,
      byDate,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Get Japanese Treasury holdings (critical for hedging spread analysis)
   * @returns {Promise<object>}
   */
  async getJapaneseHoldings() {
    const cacheKey = 'tic_japan_holdings';
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const allHolders = await this.getMajorForeignHolders();

      // Look for Japan in the data
      const japanData = allHolders.byCountry['Japan'] ||
                        allHolders.byCountry['JAPAN'] ||
                        [];

      if (japanData.length > 0) {
        const sorted = [...japanData].sort((a, b) => new Date(b.date) - new Date(a.date));
        const current = sorted[0];
        const sixMonthsAgo = sorted.find(d => {
          const date = new Date(d.date);
          const target = new Date();
          target.setMonth(target.getMonth() - 6);
          return date <= target;
        });

        const result = {
          currentHoldings: current?.holdings || null,
          currentDate: current?.date || null,
          sixMonthChange: sixMonthsAgo ?
            ((current.holdings - sixMonthsAgo.holdings) / sixMonthsAgo.holdings) * 100 : null,
          historicalData: sorted,
          lastUpdated: new Date().toISOString(),
        };

        cache.set(cacheKey, result, 'ticData');
        return result;
      }

      return this.getFallbackJapanData();
    } catch (error) {
      console.error('Error fetching Japanese holdings:', error.message);
      return this.getFallbackJapanData();
    }
  }

  /**
   * Get Chinese Treasury holdings (including Belgium as proxy for custodial holdings)
   * @returns {Promise<object>}
   */
  async getChineseHoldings() {
    const cacheKey = 'tic_china_holdings';
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const allHolders = await this.getMajorForeignHolders();

      // Look for China and Belgium
      const chinaData = allHolders.byCountry['China, Mainland'] ||
                        allHolders.byCountry['China'] ||
                        allHolders.byCountry['CHINA'] ||
                        [];

      const belgiumData = allHolders.byCountry['Belgium'] ||
                          allHolders.byCountry['BELGIUM'] ||
                          [];

      // Combine China + Belgium (Belgium often used as custodial location)
      const combined = this.combinedHoldings(chinaData, belgiumData);

      if (combined.length > 0) {
        const sorted = [...combined].sort((a, b) => new Date(b.date) - new Date(a.date));
        const current = sorted[0];
        const sixMonthsAgo = sorted.find(d => {
          const date = new Date(d.date);
          const target = new Date();
          target.setMonth(target.getMonth() - 6);
          return date <= target;
        });

        const result = {
          chinaOnly: chinaData.length > 0 ? chinaData[0]?.holdings : null,
          belgiumProxy: belgiumData.length > 0 ? belgiumData[0]?.holdings : null,
          combinedHoldings: current?.holdings || null,
          currentDate: current?.date || null,
          sixMonthChange: sixMonthsAgo ?
            ((current.holdings - sixMonthsAgo.holdings) / sixMonthsAgo.holdings) * 100 : null,
          historicalData: sorted,
          note: 'Belgium holdings included as potential custodial proxy for Chinese holdings',
          lastUpdated: new Date().toISOString(),
        };

        cache.set(cacheKey, result, 'ticData');
        return result;
      }

      return this.getFallbackChinaData();
    } catch (error) {
      console.error('Error fetching Chinese holdings:', error.message);
      return this.getFallbackChinaData();
    }
  }

  /**
   * Combine holdings from two countries by date
   * @param {Array} data1 - First country's data
   * @param {Array} data2 - Second country's data
   * @returns {Array}
   */
  combinedHoldings(data1, data2) {
    const byDate = {};

    data1.forEach(d => {
      byDate[d.date] = (byDate[d.date] || 0) + d.holdings;
    });

    data2.forEach(d => {
      byDate[d.date] = (byDate[d.date] || 0) + d.holdings;
    });

    return Object.entries(byDate).map(([date, holdings]) => ({ date, holdings }));
  }

  /**
   * Get total foreign holdings and percentage of outstanding debt
   * @returns {Promise<object>}
   */
  async getTotalForeignHoldings() {
    const cacheKey = 'tic_total_foreign';
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const allHolders = await this.getMajorForeignHolders();

      // Calculate total across all countries
      const totals = {};
      Object.values(allHolders.byCountry).forEach(countryData => {
        countryData.forEach(d => {
          if (!totals[d.date]) {
            totals[d.date] = 0;
          }
          totals[d.date] += d.holdings;
        });
      });

      const historicalData = Object.entries(totals)
        .map(([date, holdings]) => ({ date, holdings }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      const current = historicalData[0];
      const sixMonthsAgo = historicalData.find(d => {
        const date = new Date(d.date);
        const target = new Date();
        target.setMonth(target.getMonth() - 6);
        return date <= target;
      });

      const result = {
        totalForeignHoldings: current?.holdings || null,
        currentDate: current?.date || null,
        sixMonthChange: sixMonthsAgo ?
          ((current.holdings - sixMonthsAgo.holdings) / sixMonthsAgo.holdings) * 100 : null,
        historicalData,
        percentOfOutstanding: null, // Would need debt outstanding data
        lastUpdated: new Date().toISOString(),
      };

      cache.set(cacheKey, result, 'ticData');
      return result;
    } catch (error) {
      console.error('Error calculating total foreign holdings:', error.message);
      throw error;
    }
  }

  /**
   * Get summary of foreign holdings for dashboard
   * @returns {Promise<object>}
   */
  async getForeignHoldingsSummary() {
    const cacheKey = 'tic_summary';
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const [total, japan, china] = await Promise.all([
        this.getTotalForeignHoldings(),
        this.getJapaneseHoldings(),
        this.getChineseHoldings(),
      ]);

      const result = {
        totalForeign: total,
        japan,
        china,
        dataLagNote: 'TIC data is released with approximately 6-8 week lag',
        lastUpdated: new Date().toISOString(),
      };

      cache.set(cacheKey, result, 'ticData');
      return result;
    } catch (error) {
      console.error('Error fetching TIC summary:', error.message);
      throw error;
    }
  }

  /**
   * Fallback TIC data structure
   * @returns {object}
   */
  getFallbackTicData() {
    return {
      byCountry: {},
      byDate: {},
      note: 'TIC data requires manual update or alternative data source',
      source: 'https://ticdata.treasury.gov/resource-center/data-chart-center/tic/Documents/mfh.txt',
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Fallback Japan data
   * @returns {object}
   */
  getFallbackJapanData() {
    return {
      currentHoldings: null,
      currentDate: null,
      sixMonthChange: null,
      historicalData: [],
      note: 'Japan holdings data unavailable - check TIC source',
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Fallback China data
   * @returns {object}
   */
  getFallbackChinaData() {
    return {
      chinaOnly: null,
      belgiumProxy: null,
      combinedHoldings: null,
      currentDate: null,
      sixMonthChange: null,
      historicalData: [],
      note: 'China holdings data unavailable - check TIC source',
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Manual data entry for TIC data (when API unavailable)
   * @param {object} data - Manual TIC data
   * @returns {object}
   */
  async setManualTicData(data) {
    const { country, date, holdings } = data;

    if (!country || !date || holdings === undefined) {
      throw new Error('country, date, and holdings are required');
    }

    // In production, this would store to database
    // For now, update cache
    const existingData = await this.getMajorForeignHolders();

    if (!existingData.byCountry[country]) {
      existingData.byCountry[country] = [];
    }

    existingData.byCountry[country].push({ date, holdings });
    existingData.byCountry[country].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Update cache
    cache.set('tic_major_holders', existingData, 'ticData');

    return {
      success: true,
      country,
      date,
      holdings,
      updatedAt: new Date().toISOString(),
    };
  }
}

module.exports = new TicService();
