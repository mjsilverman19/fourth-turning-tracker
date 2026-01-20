const express = require('express');
const router = express.Router();

const ticService = require('../services/ticService');
const goldService = require('../services/goldService');

/**
 * GET /api/holdings/foreign
 * Returns summary of foreign Treasury holdings
 */
router.get('/foreign', async (req, res) => {
  try {
    const summary = await ticService.getForeignHoldingsSummary();

    res.json({
      success: true,
      ...summary,
    });
  } catch (error) {
    console.error('Error fetching foreign holdings:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/holdings/foreign/japan
 * Returns Japanese Treasury holdings
 */
router.get('/foreign/japan', async (req, res) => {
  try {
    const japan = await ticService.getJapaneseHoldings();

    res.json({
      success: true,
      ...japan,
    });
  } catch (error) {
    console.error('Error fetching Japanese holdings:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/holdings/foreign/china
 * Returns Chinese Treasury holdings (including Belgium proxy)
 */
router.get('/foreign/china', async (req, res) => {
  try {
    const china = await ticService.getChineseHoldings();

    res.json({
      success: true,
      ...china,
    });
  } catch (error) {
    console.error('Error fetching Chinese holdings:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/holdings/foreign/total
 * Returns total foreign Treasury holdings
 */
router.get('/foreign/total', async (req, res) => {
  try {
    const total = await ticService.getTotalForeignHoldings();

    res.json({
      success: true,
      ...total,
    });
  } catch (error) {
    console.error('Error fetching total foreign holdings:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/holdings/gold
 * Returns gold-related data (ratio, central bank purchases)
 */
router.get('/gold', async (req, res) => {
  try {
    const goldMetrics = await goldService.getGoldMetrics();

    res.json({
      success: true,
      ...goldMetrics,
    });
  } catch (error) {
    console.error('Error fetching gold holdings:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/holdings/gold/ratio
 * Returns Gold/Treasury ratio data
 */
router.get('/gold/ratio', async (req, res) => {
  try {
    const ratio = await goldService.getGoldTreasuryRatio();

    res.json({
      success: true,
      ...ratio,
    });
  } catch (error) {
    console.error('Error fetching gold ratio:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/holdings/gold/central-banks
 * Returns central bank gold purchase data
 */
router.get('/gold/central-banks', async (req, res) => {
  try {
    const centralBank = await goldService.getCentralBankGoldPurchases();

    res.json({
      success: true,
      ...centralBank,
    });
  } catch (error) {
    console.error('Error fetching central bank gold data:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/holdings/foreign/manual
 * Add manual TIC data entry
 */
router.post('/foreign/manual', async (req, res) => {
  try {
    const { country, date, holdings } = req.body;

    if (!country || !date || holdings === undefined) {
      return res.status(400).json({
        success: false,
        error: 'country, date, and holdings are required',
      });
    }

    const result = await ticService.setManualTicData({ country, date, holdings });

    res.json(result);
  } catch (error) {
    console.error('Error adding manual TIC data:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/holdings/gold/central-banks/manual
 * Add manual central bank gold data
 */
router.post('/gold/central-banks/manual', async (req, res) => {
  try {
    const { period, totalTonnes, topPurchasers } = req.body;

    if (!period || totalTonnes === undefined) {
      return res.status(400).json({
        success: false,
        error: 'period and totalTonnes are required',
      });
    }

    const result = await goldService.setManualCentralBankData({
      period,
      totalTonnes,
      topPurchasers: topPurchasers || [],
    });

    res.json(result);
  } catch (error) {
    console.error('Error adding manual central bank gold data:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/holdings/historical/foreign
 * Returns historical foreign holdings data for long-term charts
 */
router.get('/historical/foreign', async (req, res) => {
  try {
    const { startYear = 2000 } = req.query;

    const allHolders = await ticService.getMajorForeignHolders();

    res.json({
      success: true,
      data: allHolders,
      startYear: parseInt(startYear),
      note: 'Historical TIC data coverage depends on available data',
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching historical foreign holdings:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
