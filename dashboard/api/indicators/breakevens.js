const fredService = require('../services/fredService');

/**
 * GET /api/indicators/breakevens
 * Returns TIPS breakeven inflation rates
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const [t5yie, t10yie] = await Promise.all([
      fredService.get5YearBreakeven(),
      fredService.get10YearBreakeven(),
    ]);

    const current5Y = t5yie[0]?.value;
    const current10Y = t10yie[0]?.value;

    // Estimate 30Y (typically higher than 10Y by 20-50bps)
    const estimated30Y = current10Y ? current10Y + 0.3 : null;

    // Calculate slope (30Y - 5Y)
    const slope = (estimated30Y && current5Y) ? estimated30Y - current5Y : null;

    res.json({
      success: true,
      breakevens: {
        fiveYear: {
          value: current5Y,
          date: t5yie[0]?.date,
          history: t5yie.slice(0, 250),
        },
        tenYear: {
          value: current10Y,
          date: t10yie[0]?.date,
          history: t10yie.slice(0, 250),
        },
        thirtyYear: {
          value: estimated30Y,
          note: 'Estimated (10Y + 30bps typical premium)',
        },
        slope: {
          value: slope,
          warning: slope && slope > 0.5,
          note: 'Warning threshold: > 50bps',
        },
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching breakevens:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
