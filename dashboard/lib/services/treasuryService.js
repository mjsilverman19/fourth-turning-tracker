const axios = require('axios');
const cache = require('../utils/cache');
const { calculateAuctionTail, calculateAverageAuctionTail } = require('../utils/calculations');

const FISCAL_DATA_BASE_URL = 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service';

/**
 * Treasury Data Service
 * Fetches auction results, fiscal data from Treasury APIs
 */
class TreasuryService {
  constructor() {
    this.baseUrl = FISCAL_DATA_BASE_URL;
  }

  /**
   * Fetch Treasury auction results
   * @param {object} options - Query options
   * @returns {Promise<Array>}
   */
  async fetchAuctionResults(options = {}) {
    const cacheKey = `treasury_auctions_${JSON.stringify(options)}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Treasury auction data endpoint
      const url = `${this.baseUrl}/v1/accounting/od/auctions_query`;

      const params = {
        'sort': '-auction_date',
        'page[size]': options.limit || 100,
        ...options.filters,
      };

      const response = await axios.get(url, { params });

      if (response.data && response.data.data) {
        const data = response.data.data.map(auction => ({
          auctionDate: auction.auction_date,
          issueDate: auction.issue_date,
          securityType: auction.security_type,
          securityTerm: auction.security_term,
          highYield: parseFloat(auction.high_investment_rate) || null,
          highDiscountRate: parseFloat(auction.high_discount_rate) || null,
          allottedAmount: parseFloat(auction.total_accepted) || null,
          bidToCover: parseFloat(auction.bid_to_cover_ratio) || null,
          cusip: auction.cusip,
        }));

        cache.set(cacheKey, data, 'auctionResults');
        return data;
      }

      return [];
    } catch (error) {
      console.error('Error fetching auction results:', error.message);
      // Return fallback data structure
      return this.getFallbackAuctionData();
    }
  }

  /**
   * Get recent long-dated Treasury auctions (20Y, 30Y)
   * @param {number} months - Number of months of data
   * @returns {Promise<Array>}
   */
  async getLongDatedAuctions(months = 6) {
    const cacheKey = `treasury_long_dated_${months}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const allAuctions = await this.fetchAuctionResults({ limit: 200 });

      // Filter for 20-year and 30-year bonds
      const longDated = allAuctions.filter(auction => {
        const term = auction.securityTerm?.toLowerCase() || '';
        return term.includes('20-year') || term.includes('30-year') ||
               term.includes('20 year') || term.includes('30 year');
      });

      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const recent = longDated.filter(auction => {
        const auctionDate = new Date(auction.auctionDate);
        return auctionDate >= startDate;
      });

      cache.set(cacheKey, recent, 'auctionResults');
      return recent;
    } catch (error) {
      console.error('Error fetching long-dated auctions:', error.message);
      return this.getFallbackAuctionData();
    }
  }

  /**
   * Calculate auction tails for recent auctions
   * Note: When-issued yields typically need to be sourced separately
   * This implementation uses a simplified approach
   * @returns {Promise<object>}
   */
  async getAuctionTailMetrics() {
    const cacheKey = 'treasury_tail_metrics';
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const auctions = await this.getLongDatedAuctions(3);

      // In production, you would fetch when-issued yields from a market data provider
      // For now, we'll provide a structure that can be populated manually or via another source
      const auctionsWithTails = auctions.map(auction => {
        return {
          ...auction,
          // Placeholder for when-issued yield - would need market data source
          whenIssuedYield: null,
          tail: null,
          note: 'When-issued yield requires market data subscription',
        };
      });

      const result = {
        auctions: auctionsWithTails,
        averageTail: null,
        last20YTail: null,
        last30YTail: null,
        dataNote: 'When-issued yields needed for tail calculation. Manual entry supported.',
        lastUpdated: new Date().toISOString(),
      };

      cache.set(cacheKey, result, 'auctionResults');
      return result;
    } catch (error) {
      console.error('Error calculating auction tail metrics:', error.message);
      throw error;
    }
  }

  /**
   * Fetch Monthly Treasury Statement data (interest expense, receipts)
   * @returns {Promise<object>}
   */
  async getMonthlyStatementData() {
    const cacheKey = 'treasury_mts_data';
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Fetch interest expense (Table 5)
      const interestUrl = `${this.baseUrl}/v2/accounting/mts/mts_table_5`;
      const receiptsUrl = `${this.baseUrl}/v2/accounting/mts/mts_table_4`;

      const [interestResponse, receiptsResponse] = await Promise.all([
        axios.get(interestUrl, {
          params: {
            'sort': '-record_date',
            'page[size]': 24, // 2 years of monthly data
          },
        }),
        axios.get(receiptsUrl, {
          params: {
            'sort': '-record_date',
            'page[size]': 24,
          },
        }),
      ]);

      const interestData = interestResponse.data?.data || [];
      const receiptsData = receiptsResponse.data?.data || [];

      const result = {
        interestExpense: interestData.map(d => ({
          date: d.record_date,
          fiscalYear: d.record_fiscal_year,
          fiscalMonth: d.record_fiscal_month,
          value: parseFloat(d.current_fytd_net) || 0,
          monthly: parseFloat(d.current_month_gross) || 0,
        })),
        receipts: receiptsData.map(d => ({
          date: d.record_date,
          fiscalYear: d.record_fiscal_year,
          fiscalMonth: d.record_fiscal_month,
          value: parseFloat(d.current_fytd_net) || 0,
          monthly: parseFloat(d.current_month_net) || 0,
        })),
        lastUpdated: new Date().toISOString(),
      };

      cache.set(cacheKey, result, 'fiscalData');
      return result;
    } catch (error) {
      console.error('Error fetching MTS data:', error.message);
      return this.getFallbackFiscalData();
    }
  }

  /**
   * Calculate interest expense ratio (TTM interest / TTM receipts)
   * @returns {Promise<object>}
   */
  async getInterestExpenseRatio() {
    const cacheKey = 'treasury_interest_ratio';
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const mtsData = await this.getMonthlyStatementData();

      // Calculate TTM values
      const recentInterest = mtsData.interestExpense.slice(0, 12);
      const recentReceipts = mtsData.receipts.slice(0, 12);

      const ttmInterestExpense = recentInterest.reduce((sum, d) => sum + (d.monthly || 0), 0);
      const ttmReceipts = recentReceipts.reduce((sum, d) => sum + (d.monthly || 0), 0);

      const ratio = ttmReceipts > 0 ? ttmInterestExpense / ttmReceipts : null;

      const result = {
        ttmInterestExpense,
        ttmReceipts,
        ratio,
        ratioPercent: ratio ? ratio * 100 : null,
        dataAsOf: recentInterest[0]?.date || null,
        lastUpdated: new Date().toISOString(),
      };

      cache.set(cacheKey, result, 'fiscalData');
      return result;
    } catch (error) {
      console.error('Error calculating interest expense ratio:', error.message);
      throw error;
    }
  }

  /**
   * Get debt outstanding data
   * @returns {Promise<Array>}
   */
  async getDebtOutstanding() {
    const cacheKey = 'treasury_debt_outstanding';
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const url = `${this.baseUrl}/v2/accounting/od/debt_outstanding`;

      const response = await axios.get(url, {
        params: {
          'sort': '-record_date',
          'page[size]': 365,
        },
      });

      const data = response.data?.data?.map(d => ({
        date: d.record_date,
        totalDebt: parseFloat(d.tot_pub_debt_out_amt) || 0,
      })) || [];

      cache.set(cacheKey, data, 'fiscalData');
      return data;
    } catch (error) {
      console.error('Error fetching debt outstanding:', error.message);
      return [];
    }
  }

  /**
   * Get upcoming auction schedule
   * @returns {Promise<Array>}
   */
  async getUpcomingAuctions() {
    // Treasury doesn't provide a direct API for upcoming auctions
    // This would typically come from treasurydirect.gov or require scraping
    const cacheKey = 'treasury_upcoming_auctions';
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Return structure for manual population
    const result = {
      auctions: [],
      source: 'https://www.treasurydirect.gov/auctions/upcoming/',
      note: 'Upcoming auction schedule requires manual update or scraping',
      lastUpdated: new Date().toISOString(),
    };

    cache.set(cacheKey, result, 86400); // 24 hour cache
    return result;
  }

  /**
   * Fallback auction data when API is unavailable
   * @returns {Array}
   */
  getFallbackAuctionData() {
    return [
      {
        auctionDate: new Date().toISOString().split('T')[0],
        securityType: 'Note',
        securityTerm: '20-Year',
        highYield: null,
        whenIssuedYield: null,
        tail: null,
        note: 'Data unavailable - API error',
      },
    ];
  }

  /**
   * Fallback fiscal data when API is unavailable
   * @returns {object}
   */
  getFallbackFiscalData() {
    return {
      interestExpense: [],
      receipts: [],
      note: 'Data unavailable - API error',
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Update auction data with when-issued yields (manual entry support)
   * @param {string} cusip - Auction CUSIP
   * @param {number} whenIssuedYield - When-issued yield to add
   * @returns {object}
   */
  async updateAuctionWithWhenIssued(cusip, whenIssuedYield) {
    // This would store to a database in production
    // For now, we'll just calculate the tail and return it
    const auctions = await this.getLongDatedAuctions(6);
    const auction = auctions.find(a => a.cusip === cusip);

    if (!auction) {
      throw new Error(`Auction with CUSIP ${cusip} not found`);
    }

    const tail = calculateAuctionTail(auction.highYield, whenIssuedYield);

    return {
      ...auction,
      whenIssuedYield,
      tail,
      updatedAt: new Date().toISOString(),
    };
  }
}

module.exports = new TreasuryService();
