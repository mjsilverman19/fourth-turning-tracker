const ticService = require('../lib/services/ticService');
const goldService = require('../lib/services/goldService');

/**
 * /api/holdings
 * GET ?type=foreign - Summary of foreign Treasury holdings (default)
 * GET ?type=foreign-japan - Japanese Treasury holdings
 * GET ?type=foreign-china - Chinese Treasury holdings (including Belgium proxy)
 * GET ?type=foreign-total - Total foreign Treasury holdings
 * GET ?type=gold - Gold-related data
 * GET ?type=gold-ratio - Gold/Treasury ratio
 * GET ?type=gold-central-banks - Central bank gold purchases
 * GET ?type=historical-foreign - Historical foreign holdings
 * POST ?type=foreign-manual - Add manual TIC data
 * POST ?type=gold-central-banks-manual - Add manual central bank gold data
 */
module.exports = async function handler(req, res) {
  const { type = 'foreign' } = req.query;

  try {
    // POST handlers
    if (req.method === 'POST') {
      if (type === 'foreign-manual') {
        return await handleForeignManual(req, res);
      }
      if (type === 'gold-central-banks-manual') {
        return await handleGoldCentralBanksManual(req, res);
      }
      return res.status(400).json({ success: false, error: `Unknown POST type: ${type}` });
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    switch (type) {
      case 'foreign':
        return await handleForeign(res);
      case 'foreign-japan':
        return await handleForeignJapan(res);
      case 'foreign-china':
        return await handleForeignChina(res);
      case 'foreign-total':
        return await handleForeignTotal(res);
      case 'gold':
        return await handleGold(res);
      case 'gold-ratio':
        return await handleGoldRatio(res);
      case 'gold-central-banks':
        return await handleGoldCentralBanks(res);
      case 'historical-foreign':
        return await handleHistoricalForeign(req, res);
      default:
        return res.status(400).json({ success: false, error: `Unknown type: ${type}` });
    }
  } catch (error) {
    console.error(`Error in holdings (type=${type}):`, error);
    res.status(500).json({ success: false, error: error.message });
  }
};

async function handleForeign(res) {
  const summary = await ticService.getForeignHoldingsSummary();
  res.json({ success: true, ...summary });
}

async function handleForeignJapan(res) {
  const japan = await ticService.getJapaneseHoldings();
  res.json({ success: true, ...japan });
}

async function handleForeignChina(res) {
  const china = await ticService.getChineseHoldings();
  res.json({ success: true, ...china });
}

async function handleForeignTotal(res) {
  const total = await ticService.getTotalForeignHoldings();
  res.json({ success: true, ...total });
}

async function handleGold(res) {
  const goldMetrics = await goldService.getGoldMetrics();
  res.json({ success: true, ...goldMetrics });
}

async function handleGoldRatio(res) {
  const ratio = await goldService.getGoldTreasuryRatio();
  res.json({ success: true, ...ratio });
}

async function handleGoldCentralBanks(res) {
  const centralBank = await goldService.getCentralBankGoldPurchases();
  res.json({ success: true, ...centralBank });
}

async function handleHistoricalForeign(req, res) {
  const { startYear = 2000 } = req.query;
  const allHolders = await ticService.getMajorForeignHolders();

  res.json({
    success: true,
    data: allHolders,
    startYear: parseInt(startYear),
    note: 'Historical TIC data coverage depends on available data',
    lastUpdated: new Date().toISOString(),
  });
}

async function handleForeignManual(req, res) {
  const { country, date, holdings } = req.body;

  if (!country || !date || holdings === undefined) {
    return res.status(400).json({
      success: false,
      error: 'country, date, and holdings are required',
    });
  }

  const result = await ticService.setManualTicData({ country, date, holdings });
  res.json(result);
}

async function handleGoldCentralBanksManual(req, res) {
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
}
