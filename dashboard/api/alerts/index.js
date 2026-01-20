const cache = require('../utils/cache');
const { evaluateThreshold } = require('../utils/calculations');
const thresholds = require('../../config/thresholds.json');

// Note: In serverless environment, this state won't persist between invocations
// For production use, this should be stored in a database or external cache
let alertLog = [];
let alertConfig = {
  enabled: true,
  webhookUrl: process.env.ALERT_WEBHOOK_URL || null,
  emailEnabled: false,
  thresholdOverrides: {},
};

/**
 * GET /api/alerts - Returns recent alerts
 * DELETE /api/alerts - Clear alert log
 */
module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { limit = 50, since } = req.query;

      let alerts = [...alertLog];

      if (since) {
        const sinceDate = new Date(since);
        alerts = alerts.filter(a => new Date(a.timestamp) > sinceDate);
      }

      alerts = alerts.slice(0, parseInt(limit));

      res.json({
        success: true,
        alerts,
        totalCount: alertLog.length,
        config: {
          enabled: alertConfig.enabled,
          webhookConfigured: !!alertConfig.webhookUrl,
          emailEnabled: alertConfig.emailEnabled,
        },
        note: 'Alert state does not persist between serverless invocations',
      });
    } catch (error) {
      console.error('Error fetching alerts:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { before } = req.query;

      if (before) {
        const beforeDate = new Date(before);
        alertLog = alertLog.filter(a => new Date(a.timestamp) >= beforeDate);
      } else {
        alertLog = [];
      }

      res.json({
        success: true,
        message: 'Alerts cleared',
        remainingCount: alertLog.length,
      });
    } catch (error) {
      console.error('Error clearing alerts:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  } else {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
};

// Export shared state and helpers for other alert endpoints
module.exports.getAlertLog = () => alertLog;
module.exports.setAlertLog = (log) => { alertLog = log; };
module.exports.getAlertConfig = () => alertConfig;
module.exports.setAlertConfig = (config) => { alertConfig = config; };
