import React from 'react';
import { secondaryIndicatorConfigs } from '../utils/thresholds';
import {
  formatNumber,
  formatCurrency,
  formatPercent,
  formatDate,
  getZoneColor,
} from '../utils/formatting';

/**
 * Secondary indicators panel
 */
function SecondaryIndicators({ data, foreignHoldings, loading }) {
  if (loading) {
    return (
      <div className="secondary-indicators secondary-loading">
        Loading secondary indicators...
      </div>
    );
  }

  return (
    <div className="secondary-indicators">
      <h3>Secondary Indicators</h3>

      {/* Market Stress Section */}
      <div className="secondary-section">
        <h4>Market Stress</h4>
        <div className="secondary-grid">
          <SecondaryIndicatorItem
            name="VIX"
            value={data?.vix?.value}
            date={data?.vix?.date}
            threshold={data?.vix?.threshold}
            config={secondaryIndicatorConfigs.vix}
          />
          <SecondaryIndicatorItem
            name="HY Spread"
            value={data?.hySpread?.value}
            date={data?.hySpread?.date}
            threshold={data?.hySpread?.threshold}
            config={secondaryIndicatorConfigs.hySpread}
            unit="bps"
          />
          <SecondaryIndicatorItem
            name="SOFR"
            value={data?.sofr?.value}
            date={data?.sofr?.date}
            suffix="%"
          />
          <SecondaryIndicatorItem
            name="Dollar Index"
            value={data?.dollarIndex?.value}
            date={data?.dollarIndex?.date}
          />
        </div>
      </div>

      {/* Foreign Holdings Section */}
      {foreignHoldings && (
        <div className="secondary-section">
          <h4>Foreign Holdings Monitor</h4>
          <div className="secondary-grid">
            <ForeignHoldingsItem
              name="Total Foreign"
              current={foreignHoldings.totalForeign?.totalForeignHoldings}
              change={foreignHoldings.totalForeign?.sixMonthChange}
              date={foreignHoldings.totalForeign?.currentDate}
            />
            <ForeignHoldingsItem
              name="Japan"
              current={foreignHoldings.japan?.currentHoldings}
              change={foreignHoldings.japan?.sixMonthChange}
              date={foreignHoldings.japan?.currentDate}
            />
            <ForeignHoldingsItem
              name="China (+Belgium)"
              current={foreignHoldings.china?.combinedHoldings}
              change={foreignHoldings.china?.sixMonthChange}
              date={foreignHoldings.china?.currentDate}
            />
          </div>
          <p className="secondary-note">
            {foreignHoldings.dataLagNote}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Individual secondary indicator item
 */
function SecondaryIndicatorItem({ name, value, date, threshold, config, unit, suffix }) {
  const zone = threshold?.zone || 'NORMAL';
  const zoneColor = threshold?.color || getZoneColor('NORMAL');

  let displayValue = 'N/A';
  if (value !== null && value !== undefined) {
    displayValue = formatNumber(value, 1);
    if (unit) displayValue += ` ${unit}`;
    if (suffix) displayValue += suffix;
  }

  return (
    <div className="secondary-item">
      <div className="secondary-item-header">
        <span className="secondary-item-name">{name}</span>
        {threshold && (
          <span
            className="secondary-item-zone"
            style={{ backgroundColor: zoneColor }}
          >
            {zone}
          </span>
        )}
      </div>
      <div className="secondary-item-value">
        {displayValue}
      </div>
      {date && (
        <div className="secondary-item-date">
          {formatDate(date, 'short')}
        </div>
      )}
    </div>
  );
}

/**
 * Foreign holdings item with change indicator
 */
function ForeignHoldingsItem({ name, current, change, date }) {
  const displayValue = current ? formatCurrency(current * 1000000) : 'N/A'; // TIC data often in millions
  const changeDisplay = change !== null && change !== undefined
    ? `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`
    : null;
  const changeColor = change < 0 ? 'red' : change > 0 ? 'green' : 'gray';

  return (
    <div className="secondary-item holdings-item">
      <div className="secondary-item-header">
        <span className="secondary-item-name">{name}</span>
      </div>
      <div className="secondary-item-value">
        {displayValue}
      </div>
      {changeDisplay && (
        <div className={`holdings-change change-${changeColor}`}>
          {changeDisplay} (6mo)
        </div>
      )}
      {date && (
        <div className="secondary-item-date">
          {formatDate(date, 'short')}
        </div>
      )}
    </div>
  );
}

export default SecondaryIndicators;
