const axios = require('axios');
const { evaluateThreshold } = require('../lib/utils/calculations');
const thresholds = require('../config/thresholds.json');

// Note: In serverless environment, this state won't persist between invocations
let alertLog = [];
let alertConfig = {
  enabled: true,
  webhookUrl: process.env.ALERT_WEBHOOK_URL || null,
  emailEnabled: false,
  thresholdOverrides: {},
};

/**
 * /api/alerts
 * GET - Returns recent alerts (default)
 * GET ?action=config - Returns alert configuration
 * POST ?action=check - Manually trigger alert check
 * POST ?action=test - Send test alert
 * PUT ?action=config - Update alert configuration
 * DELETE - Clear alert log
 */
module.exports = async function handler(req, res) {
  const { action } = req.query;

  try {
    // DELETE handler
    if (req.method === 'DELETE') {
      return await handleDelete(req, res);
    }

    // PUT handler for config
    if (req.method === 'PUT' && action === 'config') {
      return await handleConfigUpdate(req, res);
    }

    // POST handlers
    if (req.method === 'POST') {
      if (action === 'check') {
        return await handleCheck(req, res);
      }
      if (action === 'test') {
        return await handleTest(res);
      }
      return res.status(400).json({ success: false, error: `Unknown POST action: ${action}` });
    }

    // GET handlers
    if (req.method !== 'GET') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    if (action === 'config') {
      return await handleConfigGet(res);
    }

    // Default: list alerts
    return await handleList(req, res);
  } catch (error) {
    console.error(`Error in alerts:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
};

async function handleList(req, res) {
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
    note: 'Alert log is ephemeral in serverless environment',
  });
}

async function handleConfigGet(res) {
  res.json({
    success: true,
    config: {
      enabled: alertConfig.enabled,
      webhookConfigured: !!alertConfig.webhookUrl,
      emailEnabled: alertConfig.emailEnabled,
      thresholdOverrides: alertConfig.thresholdOverrides,
    },
    defaultThresholds: thresholds,
    note: 'Config is ephemeral in serverless environment',
  });
}

async function handleConfigUpdate(req, res) {
  const { enabled, webhookUrl, emailEnabled, thresholdOverrides } = req.body;

  if (enabled !== undefined) alertConfig.enabled = enabled;
  if (webhookUrl !== undefined) alertConfig.webhookUrl = webhookUrl;
  if (emailEnabled !== undefined) alertConfig.emailEnabled = emailEnabled;
  if (thresholdOverrides) {
    alertConfig.thresholdOverrides = {
      ...alertConfig.thresholdOverrides,
      ...thresholdOverrides,
    };
  }

  res.json({
    success: true,
    config: alertConfig,
    note: 'Config is ephemeral in serverless environment',
  });
}

async function handleCheck(req, res) {
  const { indicators } = req.body;

  if (!indicators) {
    return res.status(400).json({
      success: false,
      error: 'indicators object is required',
    });
  }

  const newAlerts = checkAlerts(indicators);

  if (newAlerts.length > 0) {
    alertLog = [...newAlerts, ...alertLog].slice(0, 1000);

    if (alertConfig.enabled && alertConfig.webhookUrl) {
      await sendWebhookNotification(newAlerts);
    }
  }

  res.json({
    success: true,
    newAlerts,
    totalAlertCount: alertLog.length,
  });
}

async function handleTest(res) {
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
}

async function handleDelete(req, res) {
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
}

function checkAlerts(currentIndicators) {
  const alerts = [];

  const indicatorConfigs = [
    { key: 'japaneseHedgingSpread', config: thresholds.japaneseHedgingSpread },
    { key: 'crossCurrencyBasis', config: thresholds.crossCurrencyBasis },
    { key: 'auctionTail', config: thresholds.auctionTail },
    { key: 'goldTreasuryRoC', config: thresholds.goldTreasuryRoC },
    { key: 'interestExpenseRatio', config: thresholds.interestExpenseRatio },
  ];

  for (const { key, config } of indicatorConfigs) {
    const current = currentIndicators[key];
    if (current === undefined || current === null) continue;

    const effectiveConfig = {
      ...config,
      ...(alertConfig.thresholdOverrides[key] || {}),
    };

    const currentZone = evaluateThreshold(current, effectiveConfig);

    if (currentZone.zone === 'CRITICAL') {
      alerts.push({
        id: `${key}-critical-${Date.now()}`,
        type: 'CRITICAL_LEVEL',
        indicator: key,
        indicatorName: effectiveConfig.name || key,
        zone: 'CRITICAL',
        value: current,
        timestamp: new Date().toISOString(),
        message: `${effectiveConfig.name || key} is at CRITICAL level: ${formatValue(current, effectiveConfig)}`,
      });
    }
  }

  return alerts;
}

function formatValue(value, config) {
  if (value === null || value === undefined) return 'N/A';
  const displayValue = config.displayMultiplier ? value * config.displayMultiplier : value;
  const unit = config.unit || '';
  return `${displayValue.toFixed(2)}${unit}`;
}

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
