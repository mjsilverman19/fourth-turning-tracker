const thresholds = require('../../config/thresholds.json');

// Note: In serverless environment, this state won't persist between invocations
let alertConfig = {
  enabled: true,
  webhookUrl: process.env.ALERT_WEBHOOK_URL || null,
  emailEnabled: false,
  thresholdOverrides: {},
};

/**
 * GET /api/alerts/config - Returns alert configuration
 * PUT /api/alerts/config - Update alert configuration
 */
module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      res.json({
        success: true,
        config: {
          enabled: alertConfig.enabled,
          webhookConfigured: !!alertConfig.webhookUrl,
          emailEnabled: alertConfig.emailEnabled,
          thresholdOverrides: alertConfig.thresholdOverrides,
        },
        defaultThresholds: thresholds,
        note: 'Configuration does not persist between serverless invocations',
      });
    } catch (error) {
      console.error('Error fetching alert config:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  } else if (req.method === 'PUT') {
    try {
      const { enabled, webhookUrl, emailEnabled, thresholdOverrides } = req.body;

      if (enabled !== undefined) {
        alertConfig.enabled = enabled;
      }
      if (webhookUrl !== undefined) {
        alertConfig.webhookUrl = webhookUrl;
      }
      if (emailEnabled !== undefined) {
        alertConfig.emailEnabled = emailEnabled;
      }
      if (thresholdOverrides) {
        alertConfig.thresholdOverrides = {
          ...alertConfig.thresholdOverrides,
          ...thresholdOverrides,
        };
      }

      res.json({
        success: true,
        config: alertConfig,
        note: 'Configuration does not persist between serverless invocations',
      });
    } catch (error) {
      console.error('Error updating alert config:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  } else {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
};
