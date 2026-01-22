const basisSwapService = require('../lib/services/basisSwapService');
const cipBasisService = require('../lib/services/cipBasisService');

/**
 * /api/basis
 * GET - Get basis swap metrics
 * POST ?action=update-rates - Update foreign policy rates (ECB, BOJ)
 * POST ?action=manual-entry - Set manual basis swap data
 * POST ?action=clear-override - Clear manual override
 * POST ?action=update-calibration - Update CIP calibration parameters
 */
module.exports = async function handler(req, res) {
  const { action, type } = req.query;

  try {
    if (req.method === 'GET') {
      return await handleGet(res, type);
    }

    if (req.method === 'POST') {
      switch (action) {
        case 'update-rates':
          return await handleUpdateRates(req, res);
        case 'manual-entry':
          return await handleManualEntry(req, res);
        case 'clear-override':
          return await handleClearOverride(req, res);
        case 'update-calibration':
          return await handleUpdateCalibration(req, res);
        default:
          return res.status(400).json({
            success: false,
            error: `Unknown action: ${action}. Valid actions: update-rates, manual-entry, clear-override, update-calibration`,
          });
      }
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error(`Error in basis API (action=${action}):`, error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Handle GET requests for basis swap data
 */
async function handleGet(res, type) {
  switch (type) {
    case 'eurusd':
      const eurBasis = await basisSwapService.getEURUSDBasisSwap();
      return res.json({ success: true, data: eurBasis });

    case 'jpyusd':
      const jpyBasis = await basisSwapService.getJPYUSDBasisSwap();
      return res.json({ success: true, data: jpyBasis });

    case 'hedging-spread':
      const hedgingSpread = await basisSwapService.getJapaneseHedgingSpread();
      return res.json({ success: true, data: hedgingSpread });

    case 'hedging-cost':
      const hedgingCost = await cipBasisService.getHedgingCostData();
      return res.json({ success: true, data: hedgingCost });

    case 'policy-rates':
      const rates = cipBasisService.getPolicyRates();
      return res.json({ success: true, data: rates });

    case 'calibration':
      const calibration = cipBasisService.getCalibration();
      return res.json({ success: true, data: calibration });

    case 'all':
    default:
      const allMetrics = await basisSwapService.getAllBasisMetrics();
      const policyRates = cipBasisService.getPolicyRates();
      return res.json({
        success: true,
        data: {
          ...allMetrics,
          policyRates,
        },
      });
  }
}

/**
 * Handle POST /api/basis?action=update-rates
 * Update foreign central bank policy rates
 * Body: { ecb: 3.00, boj: 0.25 }
 */
async function handleUpdateRates(req, res) {
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { ecb, boj } = body || {};

  if (ecb === undefined && boj === undefined) {
    return res.status(400).json({
      success: false,
      error: 'At least one of ecb or boj rate is required',
      example: { ecb: 3.00, boj: 0.25 },
    });
  }

  // Validate rate ranges
  if (ecb !== undefined && (typeof ecb !== 'number' || ecb < -5 || ecb > 20)) {
    return res.status(400).json({
      success: false,
      error: 'ECB rate must be a number between -5 and 20',
    });
  }

  if (boj !== undefined && (typeof boj !== 'number' || boj < -5 || boj > 20)) {
    return res.status(400).json({
      success: false,
      error: 'BOJ rate must be a number between -5 and 20',
    });
  }

  const result = cipBasisService.updatePolicyRates({ ecb, boj });

  res.json({
    success: true,
    message: 'Policy rates updated successfully',
    ...result,
  });
}

/**
 * Handle POST /api/basis?action=manual-entry
 * Set manual basis swap data (overrides CIP proxy)
 * Body: { pair: 'eurusd', value: -22, date: '2024-01-15', term: '5Y' }
 */
async function handleManualEntry(req, res) {
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { pair, value, date, term } = body || {};

  if (!pair || value === undefined || !date) {
    return res.status(400).json({
      success: false,
      error: 'pair, value, and date are required',
      example: { pair: 'eurusd', value: -22, date: '2024-01-15', term: '5Y' },
    });
  }

  const result = await basisSwapService.setManualBasisSwapData({
    pair,
    value,
    date,
    term,
  });

  res.json(result);
}

/**
 * Handle POST /api/basis?action=clear-override
 * Clear manual override to return to CIP proxy data
 * Body: { pair: 'eurusd', term: '5Y' }
 */
async function handleClearOverride(req, res) {
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { pair, term } = body || {};

  if (!pair) {
    return res.status(400).json({
      success: false,
      error: 'pair is required',
      example: { pair: 'eurusd', term: '5Y' },
    });
  }

  const result = await basisSwapService.setManualBasisSwapData({
    pair,
    term,
    clearOverride: true,
  });

  res.json(result);
}

/**
 * Handle POST /api/basis?action=update-calibration
 * Update CIP calibration parameters for backtesting/tuning
 * Body: { currency: 'eur', baseOffset: -15, rateSensitivity: 8 }
 */
async function handleUpdateCalibration(req, res) {
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { currency, baseOffset, rateSensitivity, structuralPremium } = body || {};

  if (!currency) {
    return res.status(400).json({
      success: false,
      error: 'currency is required (eur or jpy)',
      example: { currency: 'eur', baseOffset: -15, rateSensitivity: 8 },
    });
  }

  const result = cipBasisService.updateCalibration(currency, {
    baseOffset,
    rateSensitivity,
    structuralPremium,
  });

  if (!result.success) {
    return res.status(400).json(result);
  }

  res.json({
    success: true,
    message: `Calibration updated for ${currency}`,
    ...result,
  });
}
