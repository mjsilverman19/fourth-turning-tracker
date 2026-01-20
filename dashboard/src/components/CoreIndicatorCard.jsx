import React from 'react';
import IndicatorGauge from './IndicatorGauge';
import SparklineChart from './SparklineChart';
import { indicatorConfigs } from '../utils/thresholds';
import {
  formatIndicatorValue,
  formatBasisPoints,
  formatPercent,
  formatDate,
  getZoneColor,
  formatTrend,
} from '../utils/formatting';

/**
 * Card component for displaying a core indicator with gauge and sparkline
 */
function CoreIndicatorCard({ indicatorKey, data, historicalData }) {
  const config = indicatorConfigs[indicatorKey];

  if (!config) {
    return (
      <div className="indicator-card indicator-card-error">
        Unknown indicator: {indicatorKey}
      </div>
    );
  }

  const { value, threshold, date, sixMonthChange } = data || {};
  const zone = threshold?.zone || 'UNKNOWN';
  const zoneColor = threshold?.color || getZoneColor('UNKNOWN');

  // Format the display value based on indicator type
  let displayValue = 'N/A';
  if (value !== null && value !== undefined) {
    if (config.displayMultiplier) {
      displayValue = `${(value * config.displayMultiplier).toFixed(1)}${config.unit}`;
    } else if (config.unit === 'bps') {
      displayValue = formatBasisPoints(value);
    } else if (config.unit === '%') {
      displayValue = formatPercent(value / 100, 1);
    } else {
      displayValue = formatIndicatorValue(value, config);
    }
  }

  // Format trend
  const trendInfo = formatTrend(sixMonthChange, config.inverted);

  return (
    <div className="indicator-card" style={{ borderTopColor: zoneColor }}>
      <div className="indicator-card-header">
        <h3 className="indicator-name">{config.shortName}</h3>
        <span
          className="indicator-zone-badge"
          style={{ backgroundColor: zoneColor }}
        >
          {zone}
        </span>
      </div>

      <div className="indicator-value-section">
        <div className="indicator-current-value">
          {displayValue}
        </div>
        {sixMonthChange !== null && sixMonthChange !== undefined && (
          <div className={`indicator-trend trend-${trendInfo.color}`}>
            <span className="trend-arrow">{trendInfo.arrow}</span>
            <span className="trend-value">
              {config.unit === 'bps' ? `${Math.abs(sixMonthChange).toFixed(1)} bps` : trendInfo.text}
            </span>
            <span className="trend-period">(6mo)</span>
          </div>
        )}
      </div>

      <IndicatorGauge
        value={value}
        config={config}
        zone={zone}
      />

      {historicalData && historicalData.length > 0 && (
        <div className="indicator-sparkline">
          <SparklineChart
            data={historicalData}
            color={zoneColor}
            height={50}
          />
        </div>
      )}

      <div className="indicator-footer">
        <span className="indicator-date">
          {date ? formatDate(date, 'short') : 'N/A'}
        </span>
        <button
          className="indicator-info-btn"
          title={config.description}
        >
          ?
        </button>
      </div>

      {/* Tooltip/Details on hover */}
      <div className="indicator-tooltip">
        <p className="indicator-description">{config.description}</p>
        {config.formula && (
          <p className="indicator-formula">
            <strong>Formula:</strong> {config.formula}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Component breakdown card for indicators with multiple inputs
 */
export function IndicatorBreakdown({ indicatorKey, data }) {
  const config = indicatorConfigs[indicatorKey];

  if (!data?.components) return null;

  // Special handling for Japanese Hedging Spread components
  if (indicatorKey === 'japaneseHedgingSpread') {
    const { us10y, jgb10y, fxHedgeCost } = data.components;

    return (
      <div className="indicator-breakdown">
        <h4>Components</h4>
        <div className="breakdown-items">
          <div className="breakdown-item">
            <span className="breakdown-label">US 10Y</span>
            <span className="breakdown-value">{us10y?.toFixed(2) ?? 'N/A'}%</span>
          </div>
          <div className="breakdown-item breakdown-operator">-</div>
          <div className="breakdown-item">
            <span className="breakdown-label">JGB 10Y</span>
            <span className="breakdown-value">{jgb10y?.toFixed(2) ?? 'N/A'}%</span>
          </div>
          <div className="breakdown-item breakdown-operator">-</div>
          <div className="breakdown-item">
            <span className="breakdown-label">FX Hedge</span>
            <span className="breakdown-value">{fxHedgeCost?.toFixed(2) ?? 'N/A'}%</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default CoreIndicatorCard;
