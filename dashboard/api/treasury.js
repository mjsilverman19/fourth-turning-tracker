const treasuryService = require('../lib/services/treasuryService');
const fredService = require('../lib/services/fredService');

/**
 * /api/treasury
 * GET ?type=auctions - Recent Treasury auction results (default)
 * GET ?type=upcoming - Upcoming auction schedule
 * GET ?type=fiscal - Fiscal data (interest expense, receipts, debt)
 * GET ?type=yields - Treasury yield data
 * GET ?type=historical-interest - Historical interest expense ratio
 * POST ?type=when-issued - Update auction with when-issued yield
 */
module.exports = async function handler(req, res) {
  const { type = 'auctions' } = req.query;

  try {
    // POST handler for when-issued
    if (req.method === 'POST' && type === 'when-issued') {
      return await handleWhenIssued(req, res);
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    switch (type) {
      case 'auctions':
        return await handleAuctions(req, res);
      case 'upcoming':
        return await handleUpcoming(res);
      case 'fiscal':
        return await handleFiscal(res);
      case 'yields':
        return await handleYields(res);
      case 'historical-interest':
        return await handleHistoricalInterest(req, res);
      default:
        return res.status(400).json({ success: false, error: `Unknown type: ${type}` });
    }
  } catch (error) {
    console.error(`Error in treasury (type=${type}):`, error);
    res.status(500).json({ success: false, error: error.message });
  }
};

async function handleAuctions(req, res) {
  const { months = 6 } = req.query;
  const auctions = await treasuryService.getLongDatedAuctions(parseInt(months));
  const tailMetrics = await treasuryService.getAuctionTailMetrics();

  res.json({
    success: true,
    auctions,
    metrics: tailMetrics,
    lastUpdated: new Date().toISOString(),
  });
}

async function handleUpcoming(res) {
  const upcoming = await treasuryService.getUpcomingAuctions();
  res.json({ success: true, ...upcoming });
}

async function handleFiscal(res) {
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
}

async function handleYields(res) {
  const yields = await fredService.getAllYields();

  const current = {
    dgs5: yields.dgs5[0],
    dgs10: yields.dgs10[0],
    dgs30: yields.dgs30[0],
    t5yie: yields.t5yie[0],
    t10yie: yields.t10yie[0],
  };

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
}

async function handleHistoricalInterest(req, res) {
  const { startYear = 1990 } = req.query;

  res.json({
    success: true,
    data: [],
    note: 'Historical interest expense ratio data requires extended data source',
    source: 'Treasury Monthly Statement historical archives',
    startYear: parseInt(startYear),
    lastUpdated: new Date().toISOString(),
  });
}

async function handleWhenIssued(req, res) {
  const { cusip, whenIssuedYield } = req.body;

  if (!cusip || whenIssuedYield === undefined) {
    return res.status(400).json({
      success: false,
      error: 'cusip and whenIssuedYield are required',
    });
  }

  const updated = await treasuryService.updateAuctionWithWhenIssued(cusip, whenIssuedYield);
  res.json({ success: true, auction: updated });
}
