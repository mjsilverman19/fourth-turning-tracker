const axios = require('axios');
const cache = require('../utils/cache');
const { evaluateThreshold } = require('../utils/calculations');
const thresholds = require('../../config/thresholds.json');

// Note: In serverless environment, this state won't persist between invocations
let alertLog = [];
let alertConfig = {
  enabled: true,
  webhookUrl: process.env.ALERT_WEBHOOK_URL || null,
  emailEnabled: false,
  thresholdOverrides: {},
};

/**
 * POST /api/alerts/check
 * Manually trigger alert check against current indicators
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

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
      note: 'Alert state does not persist between serverless invocations',
    });
  } catch (error) {
    console.error('Error checking alerts:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Check indicators against thresholds and generate alerts
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

    const effectiveConfig = {
      ...config,
      ...(alertConfig.thresholdOverrides[key] || {}),
    };

    const currentZone = evaluateThreshold(current, effectiveConfig);
    const previousZone = previous !== undefined ?
      evaluateThreshold(previous, effectiveConfig) : { zone: 'UNKNOWN' };

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

    if (currentZone.zone === 'CRITICAL') {
      const existingCritical = alertLog.find(
        a => a.indicator === key &&
             a.type === 'CRITICAL_LEVEL' &&
             new Date(a.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
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

  cache.set('previous_indicators', currentIndicators, 86400);

  return alerts;
}

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
