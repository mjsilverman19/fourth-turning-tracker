const ticService = require('../../services/ticService');

/**
 * POST /api/holdings/foreign/manual
 * Add manual TIC data entry
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

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
};
