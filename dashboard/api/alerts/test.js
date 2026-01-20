const axios = require('axios');

// Note: In serverless environment, this state won't persist between invocations
let alertConfig = {
  enabled: true,
  webhookUrl: process.env.ALERT_WEBHOOK_URL || null,
  emailEnabled: false,
  thresholdOverrides: {},
};

/**
 * POST /api/alerts/test
 * Send a test alert notification
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const testAlert = {
      id: `test-${Date.now()}`,
      type: 'TEST',
      indicator: 'test',
      message: 'This is a test alert notification',
      timestamp: new Date().toISOString(),
      zone: 'WARNING',
    };

    let notificationSent = false;

    if (alertConfig.webhookUrl) {
      await sendWebhookNotification([testAlert]);
      notificationSent = true;
    }

    res.json({
      success: true,
      testAlert,
      notificationSent,
      webhookConfigured: !!alertConfig.webhookUrl,
    });
  } catch (error) {
    console.error('Error sending test alert:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

async function sendWebhookNotification(alerts) {
  if (!alertConfig.webhookUrl) return;

  try {
    await axios.post(alertConfig.webhookUrl, {
      type: 'hegemony_dashboard_alert',
      alerts,
      timestamp: new Date().toISOString(),
      source: 'Hegemony Monitoring Dashboard',
    }, {
      timeout: 5000,
    });

    console.log(`Sent ${alerts.length} alert(s) to webhook`);
  } catch (error) {
    console.error('Failed to send webhook notification:', error.message);
  }
}
