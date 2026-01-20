const express = require('express');
const router = express.Router();

const cache = require('../utils/cache');
const { evaluateThreshold } = require('../utils/calculations');
const thresholds = require('../../config/thresholds.json');

// In-memory alert storage (would use database in production)
let alertLog = [];
let alertConfig = {
  enabled: true,
  webhookUrl: process.env.ALERT_WEBHOOK_URL || null,
  emailEnabled: false,
  thresholdOverrides: {},
};

/**
 * GET /api/alerts
 * Returns recent alerts
 */
router.get('/', async (req, res) => {
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
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/alerts/check
 * Manually trigger alert check against current indicators
 */
router.post('/check', async (req, res) => {
  try {
    const { indicators } = req.body;

    if (!indicators) {
      return res.status(400).json({
        success: false,
        error: 'indicators object is required',
      });
    }

    const newAlerts = checkAlerts(indicators);

    if (newAlerts.length > 0) {
      alertLog = [...newAlerts, ...alertLog].slice(0, 1000); // Keep last 1000 alerts

      // Trigger notifications if configured
      if (alertConfig.enabled && alertConfig.webhookUrl) {
        await sendWebhookNotification(newAlerts);
      }
    }

    res.json({
      success: true,
      newAlerts,
      totalAlertCount: alertLog.length,
    });
  } catch (error) {
    console.error('Error checking alerts:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/alerts/config
 * Returns alert configuration
 */
router.get('/config', async (req, res) => {
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
    });
  } catch (error) {
    console.error('Error fetching alert config:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * PUT /api/alerts/config
 * Update alert configuration
 */
router.put('/config', async (req, res) => {
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
    });
  } catch (error) {
    console.error('Error updating alert config:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/alerts
 * Clear alert log
 */
router.delete('/', async (req, res) => {
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
});

/**
 * POST /api/alerts/test
 * Send a test alert notification
 */
router.post('/test', async (req, res) => {
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
});

/**
 * Check indicators against thresholds and generate alerts
 * @param {object} currentIndicators - Current indicator values
 * @returns {Array} New alerts
 */
function checkAlerts(currentIndicators) {
  const alerts = [];
  const previousIndicators = cache.get('previous_indicators') || {};

  const indicatorConfigs = [
    { key: 'japaneseHedgingSpread', config: thresholds.japaneseHedgingSpread },
    { key: 'crossCurrencyBasis', config: thresholds.crossCurrencyBasis },
    { key: 'auctionTail', config: thresholds.auctionTail },
    { key: 'goldTreasuryRoC', config: thresholds.goldTreasuryRoC },
    { key: 'interestExpenseRatio', config: thresholds.interestExpenseRatio },
  ];

  for (const { key, config } of indicatorConfigs) {
    const current = currentIndicators[key];
    const previous = previousIndicators[key];

    if (current === undefined || current === null) continue;

    // Apply any threshold overrides
    const effectiveConfig = {
      ...config,
      ...(alertConfig.thresholdOverrides[key] || {}),
    };

    const currentZone = evaluateThreshold(current, effectiveConfig);
    const previousZone = previous !== undefined ?
      evaluateThreshold(previous, effectiveConfig) : { zone: 'UNKNOWN' };

    // Alert on zone changes
    if (currentZone.zone !== previousZone.zone && previousZone.zone !== 'UNKNOWN') {
      const isWorsening = getZoneSeverity(currentZone.zone) > getZoneSeverity(previousZone.zone);

      alerts.push({
        id: `${key}-${Date.now()}`,
        type: isWorsening ? 'THRESHOLD_BREACH' : 'THRESHOLD_IMPROVEMENT',
        indicator: key,
        indicatorName: effectiveConfig.name || key,
        previousZone: previousZone.zone,
        newZone: currentZone.zone,
        previousValue: previous,
        currentValue: current,
        direction: isWorsening ? 'worsening' : 'improving',
        timestamp: new Date().toISOString(),
        message: `${effectiveConfig.name || key} moved from ${previousZone.zone} to ${currentZone.zone}`,
      });
    }

    // Alert on critical zone regardless of change
    if (currentZone.zone === 'CRITICAL') {
      const existingCritical = alertLog.find(
        a => a.indicator === key &&
             a.type === 'CRITICAL_LEVEL' &&
             new Date(a.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      );

      if (!existingCritical) {
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
  }

  // Store current indicators for next comparison
  cache.set('previous_indicators', currentIndicators, 86400); // 24 hour TTL

  return alerts;
}

/**
 * Get numeric severity for zone comparison
 * @param {string} zone - Zone name
 * @returns {number} Severity level
 */
function getZoneSeverity(zone) {
  const severities = {
    'NORMAL': 0,
    'WARNING': 1,
    'DANGER': 2,
    'CRITICAL': 3,
    'UNKNOWN': -1,
  };
  return severities[zone] || -1;
}

/**
 * Format value for display
 * @param {number} value - Value to format
 * @param {object} config - Indicator config
 * @returns {string} Formatted value
 */
function formatValue(value, config) {
  if (value === null || value === undefined) return 'N/A';

  const displayValue = config.displayMultiplier ? value * config.displayMultiplier : value;
  const unit = config.unit || '';

  return `${displayValue.toFixed(2)}${unit}`;
}

/**
 * Send webhook notification
 * @param {Array} alerts - Alerts to send
 */
async function sendWebhookNotification(alerts) {
  if (!alertConfig.webhookUrl) return;

  try {
    const axios = require('axios');

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

module.exports = router;
