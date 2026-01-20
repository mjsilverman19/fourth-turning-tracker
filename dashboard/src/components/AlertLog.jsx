import React from 'react';
import { formatDate, getZoneColor } from '../utils/formatting';
import { sortAlerts } from '../hooks/useAlerts';

/**
 * Alert log component showing threshold breach alerts
 */
function AlertLog({ alerts, loading, onClear }) {
  if (loading) {
    return (
      <div className="alert-log alert-log-loading">
        <h3>Alert Log</h3>
        <div className="alert-loading">Loading alerts...</div>
      </div>
    );
  }

  const sortedAlerts = sortAlerts(alerts || []);
  const recentAlerts = sortedAlerts.slice(0, 10);

  return (
    <div className="alert-log">
      <div className="alert-log-header">
        <h3>Alert Log</h3>
        {alerts && alerts.length > 0 && (
          <button
            className="alert-clear-btn"
            onClick={onClear}
            title="Clear all alerts"
          >
            Clear
          </button>
        )}
      </div>

      {recentAlerts.length === 0 ? (
        <div className="alert-empty">
          No recent alerts
        </div>
      ) : (
        <div className="alert-list">
          {recentAlerts.map((alert) => (
            <AlertItem key={alert.id} alert={alert} />
          ))}
        </div>
      )}

      {alerts && alerts.length > 10 && (
        <div className="alert-more">
          +{alerts.length - 10} more alerts
        </div>
      )}
    </div>
  );
}

/**
 * Individual alert item
 */
function AlertItem({ alert }) {
  const {
    type,
    indicatorName,
    previousZone,
    newZone,
    currentValue,
    timestamp,
    message,
    direction,
  } = alert;

  const zone = newZone || alert.zone;
  const zoneColor = getZoneColor(zone);

  const isWorsening = direction === 'worsening';
  const isCritical = type === 'CRITICAL_LEVEL';

  return (
    <div
      className={`alert-item ${isCritical ? 'alert-critical' : ''} ${isWorsening ? 'alert-worsening' : 'alert-improving'}`}
      style={{ borderLeftColor: zoneColor }}
    >
      <div className="alert-item-header">
        <span className="alert-indicator">{indicatorName || alert.indicator}</span>
        <span className="alert-time">{formatDate(timestamp, 'relative')}</span>
      </div>

      <div className="alert-item-body">
        {previousZone && newZone ? (
          <div className="alert-zone-change">
            <span
              className="alert-zone"
              style={{ backgroundColor: getZoneColor(previousZone) }}
            >
              {previousZone}
            </span>
            <span className="alert-arrow">{isWorsening ? '→' : '→'}</span>
            <span
              className="alert-zone"
              style={{ backgroundColor: zoneColor }}
            >
              {newZone}
            </span>
          </div>
        ) : (
          <span
            className="alert-zone"
            style={{ backgroundColor: zoneColor }}
          >
            {zone}
          </span>
        )}

        {currentValue !== undefined && (
          <span className="alert-value">
            Value: {typeof currentValue === 'number' ? currentValue.toFixed(2) : currentValue}
          </span>
        )}
      </div>

      {message && (
        <div className="alert-message">
          {message}
        </div>
      )}
    </div>
  );
}

export default AlertLog;
