/**
 * GET /api/treasury/historical/interest-ratio
 * Returns historical interest expense ratio data for long-term charts
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

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
};
