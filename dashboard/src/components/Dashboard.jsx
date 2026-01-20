import React from 'react';
import StageIndicator from './StageIndicator';
import CoreIndicatorCard from './CoreIndicatorCard';
import SecondaryIndicators from './SecondaryIndicators';
import AlertLog from './AlertLog';
import EventCalendar from './EventCalendar';
import HistoricalChart from './HistoricalChart';
import {
  useIndicatorData,
  useStageAssessment,
  useHistoricalData,
  useBreakevens,
} from '../hooks/useIndicatorData';
import { useAlerts } from '../hooks/useAlerts';
import { useForeignHoldings } from '../hooks/useIndicatorData';
import { formatDate } from '../utils/formatting';

/**
 * Main Dashboard component
 */
function Dashboard() {
  // Fetch all data
  const {
    indicators,
    secondary,
    loading: indicatorsLoading,
    error: indicatorsError,
    lastUpdated,
    refresh: refreshIndicators,
  } = useIndicatorData();

  const {
    assessment,
    loading: stageLoading,
  } = useStageAssessment();

  const {
    alerts,
    loading: alertsLoading,
    clearAlerts,
  } = useAlerts();

  const { data: foreignHoldings } = useForeignHoldings();
  const { data: breakevens } = useBreakevens();

  // Fetch historical data for sparklines
  const { data: hedgingHistory } = useHistoricalData('japaneseHedgingSpread');
  const { data: goldHistory } = useHistoricalData('goldTreasuryRatio');
  const { data: vixHistory } = useHistoricalData('vix');

  const coreIndicatorKeys = [
    'japaneseHedgingSpread',
    'crossCurrencyBasis',
    'auctionTail',
    'goldTreasuryRoC',
    'interestExpenseRatio',
  ];

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-title">
          <h1>Hegemony Monitoring Dashboard</h1>
          <p className="header-subtitle">
            Leading Indicators of Dollar Reserve Status
          </p>
        </div>
        <div className="header-status">
          <span className="last-updated">
            Last updated: {lastUpdated ? formatDate(lastUpdated, 'relative') : 'Never'}
          </span>
          <button
            className="refresh-btn"
            onClick={refreshIndicators}
            disabled={indicatorsLoading}
          >
            {indicatorsLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </header>

      {/* Error Banner */}
      {indicatorsError && (
        <div className="error-banner">
          <span className="error-icon">!</span>
          <span className="error-message">
            Error loading data: {indicatorsError}
          </span>
          <button onClick={refreshIndicators}>Retry</button>
        </div>
      )}

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Section 1: Stage Assessment */}
        <section className="dashboard-section section-stage">
          <StageIndicator
            assessment={assessment}
            loading={stageLoading}
          />
        </section>

        {/* Section 2: Core Five Indicators */}
        <section className="dashboard-section section-core-indicators">
          <h2>Core Leading Indicators</h2>
          <div className="indicators-grid">
            {coreIndicatorKeys.map((key) => (
              <CoreIndicatorCard
                key={key}
                indicatorKey={key}
                data={indicators?.[key]}
                historicalData={
                  key === 'japaneseHedgingSpread' ? hedgingHistory :
                  key === 'goldTreasuryRoC' ? goldHistory : null
                }
              />
            ))}
          </div>
        </section>

        {/* Section 3: Secondary Indicators */}
        <section className="dashboard-section section-secondary">
          <SecondaryIndicators
            data={secondary}
            foreignHoldings={foreignHoldings}
            loading={indicatorsLoading}
          />
        </section>

        {/* Section 4: TIPS Breakevens */}
        <section className="dashboard-section section-breakevens">
          <h2>TIPS Breakeven Analysis</h2>
          <BreakevenDisplay data={breakevens} />
        </section>

        {/* Section 5: Alerts and Calendar */}
        <section className="dashboard-section section-alerts-calendar">
          <div className="alerts-calendar-grid">
            <AlertLog
              alerts={alerts}
              loading={alertsLoading}
              onClear={() => clearAlerts()}
            />
            <EventCalendar events={[]} loading={false} />
          </div>
        </section>

        {/* Section 6: Historical Charts */}
        <section className="dashboard-section section-historical">
          <h2>Historical Context</h2>
          <div className="historical-charts-grid">
            {vixHistory && vixHistory.length > 0 && (
              <HistoricalChart
                data={vixHistory}
                title="VIX History"
                color="#f59e0b"
                yAxisLabel="VIX"
                thresholdLines={[
                  { value: 25, label: 'Warning', color: '#f59e0b' },
                  { value: 40, label: 'Danger', color: '#ef4444' },
                ]}
                height={250}
              />
            )}
            {goldHistory && goldHistory.length > 0 && (
              <HistoricalChart
                data={goldHistory}
                title="Gold/Treasury Ratio"
                color="#eab308"
                yAxisLabel="Ratio"
                height={250}
              />
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="dashboard-footer">
        <p>
          This dashboard monitors leading indicators of potential monetary regime transition.
          Data is sourced from FRED, Treasury, and other public sources.
        </p>
        <p className="footer-disclaimer">
          Not financial advice. For educational and research purposes only.
        </p>
      </footer>
    </div>
  );
}

/**
 * Breakeven inflation display component
 */
function BreakevenDisplay({ data }) {
  if (!data) {
    return (
      <div className="breakeven-display breakeven-loading">
        Loading breakeven data...
      </div>
    );
  }

  const { fiveYear, tenYear, thirtyYear, slope } = data;

  return (
    <div className="breakeven-display">
      <div className="breakeven-grid">
        <BreakevenItem
          term="5-Year"
          value={fiveYear?.value}
          date={fiveYear?.date}
        />
        <BreakevenItem
          term="10-Year"
          value={tenYear?.value}
          date={tenYear?.date}
        />
        <BreakevenItem
          term="30-Year"
          value={thirtyYear?.value}
          date={thirtyYear?.note ? null : 'Estimated'}
          note={thirtyYear?.note}
        />
      </div>

      {slope && (
        <div className={`breakeven-slope ${slope.warning ? 'slope-warning' : ''}`}>
          <span className="slope-label">Curve Slope (30Y - 5Y):</span>
          <span className="slope-value">{slope.value?.toFixed(2) ?? 'N/A'}%</span>
          {slope.warning && (
            <span className="slope-warning-badge">WARNING: &gt;50bps</span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Individual breakeven item
 */
function BreakevenItem({ term, value, date, note }) {
  return (
    <div className="breakeven-item">
      <div className="breakeven-term">{term}</div>
      <div className="breakeven-value">
        {value !== null && value !== undefined ? `${value.toFixed(2)}%` : 'N/A'}
      </div>
      {date && <div className="breakeven-date">{date}</div>}
      {note && <div className="breakeven-note">{note}</div>}
    </div>
  );
}

export default Dashboard;
