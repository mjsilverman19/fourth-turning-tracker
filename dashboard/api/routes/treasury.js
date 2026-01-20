const express = require('express');
const router = express.Router();

const treasuryService = require('../services/treasuryService');
const fredService = require('../services/fredService');

/**
 * GET /api/treasury/auctions
 * Returns recent Treasury auction results
 */
router.get('/auctions', async (req, res) => {
  try {
    const { months = 6 } = req.query;

    const auctions = await treasuryService.getLongDatedAuctions(parseInt(months));
    const tailMetrics = await treasuryService.getAuctionTailMetrics();

    res.json({
      success: true,
      auctions,
      metrics: tailMetrics,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching auctions:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/treasury/upcoming
 * Returns upcoming Treasury auction schedule
 */
router.get('/upcoming', async (req, res) => {
  try {
    const upcoming = await treasuryService.getUpcomingAuctions();

    res.json({
      success: true,
      ...upcoming,
    });
  } catch (error) {
    console.error('Error fetching upcoming auctions:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/treasury/fiscal
 * Returns fiscal data (interest expense, receipts, debt)
 */
router.get('/fiscal', async (req, res) => {
  try {
    const [mtsData, interestRatio, debtOutstanding] = await Promise.all([
      treasuryService.getMonthlyStatementData(),
      treasuryService.getInterestExpenseRatio(),
      treasuryService.getDebtOutstanding(),
    ]);

    res.json({
      success: true,
      monthlyStatement: mtsData,
      interestExpenseRatio: interestRatio,
      debtOutstanding: {
        current: debtOutstanding[0],
        history: debtOutstanding.slice(0, 365),
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching fiscal data:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/treasury/yields
 * Returns Treasury yield data
 */
router.get('/yields', async (req, res) => {
  try {
    const yields = await fredService.getAllYields();

    // Get current values
    const current = {
      dgs5: yields.dgs5[0],
      dgs10: yields.dgs10[0],
      dgs30: yields.dgs30[0],
      t5yie: yields.t5yie[0],
      t10yie: yields.t10yie[0],
    };

    // Calculate yield curve slope
    const slope2s10s = current.dgs10 && yields.dgs5[0] ?
      (current.dgs10.value - yields.dgs5[0].value) : null;
    const slope10s30s = current.dgs30 && current.dgs10 ?
      (current.dgs30.value - current.dgs10.value) : null;

    res.json({
      success: true,
      current,
      yieldCurve: {
        slope2s10s,
        slope10s30s,
        inverted: slope2s10s !== null && slope2s10s < 0,
      },
      historical: {
        dgs5: yields.dgs5.slice(0, 500),
        dgs10: yields.dgs10.slice(0, 500),
        dgs30: yields.dgs30.slice(0, 500),
      },
      breakevens: {
        t5yie: yields.t5yie.slice(0, 250),
        t10yie: yields.t10yie.slice(0, 250),
      },
      lastUpdated: yields.lastUpdated,
    });
  } catch (error) {
    console.error('Error fetching yields:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/treasury/auctions/when-issued
 * Update auction with when-issued yield for tail calculation
 */
router.post('/auctions/when-issued', async (req, res) => {
  try {
    const { cusip, whenIssuedYield } = req.body;

    if (!cusip || whenIssuedYield === undefined) {
      return res.status(400).json({
        success: false,
        error: 'cusip and whenIssuedYield are required',
      });
    }

    const updated = await treasuryService.updateAuctionWithWhenIssued(cusip, whenIssuedYield);

    res.json({
      success: true,
      auction: updated,
    });
  } catch (error) {
    console.error('Error updating when-issued yield:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/treasury/historical/interest-ratio
 * Returns historical interest expense ratio data for long-term charts
 */
router.get('/historical/interest-ratio', async (req, res) => {
  try {
    const { startYear = 1990 } = req.query;

    // This would need historical MTS data
    // For now, return structure for manual population
    res.json({
      success: true,
      data: [],
      note: 'Historical interest expense ratio data requires extended data source',
      source: 'Treasury Monthly Statement historical archives',
      startYear: parseInt(startYear),
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching historical interest ratio:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
