const fredService = require('../services/fredService');

/**
 * GET /api/treasury/yields
 * Returns Treasury yield data
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

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
};
