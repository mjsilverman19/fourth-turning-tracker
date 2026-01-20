#!/usr/bin/env node

/**
 * Backtest Script
 *
 * Tests threshold calibration against historical crisis periods:
 * - 2008 Financial Crisis
 * - March 2020 COVID Crisis
 * - April 2025 Tariff Announcement
 *
 * Usage: npm run backtest
 */

const fredService = require('../api/services/fredService');
const { evaluateThreshold, assessCurrentStage } = require('../api/utils/calculations');
const thresholds = require('../config/thresholds.json');

// Historical crisis periods to test
const crisisPeriods = [
  {
    name: '2008 Financial Crisis',
    startDate: '2008-09-01',
    peakDate: '2008-10-15',
    endDate: '2009-03-31',
    expectedMinStage: 1,
    description: 'Lehman collapse, credit freeze, global equity selloff',
  },
  {
    name: 'March 2020 COVID Crisis',
    startDate: '2020-03-01',
    peakDate: '2020-03-23',
    endDate: '2020-04-30',
    expectedMinStage: 1,
    description: 'COVID market crash, Fed intervention, Treasury volatility',
  },
  {
    name: 'April 2025 Tariff Announcement',
    startDate: '2025-04-01',
    peakDate: '2025-04-09',
    endDate: '2025-04-30',
    expectedMinStage: 0,
    description: 'Tariff announcement market disruption',
  },
];

async function fetchHistoricalData(startDate) {
  console.log(`Fetching historical data from ${startDate}...`);

  try {
    const [vix, hySpread, dollarIndex, goldPrice] = await Promise.all([
      fredService.getHistoricalData('VIXCLS', startDate),
      fredService.getHistoricalData('BAMLH0A0HYM2', startDate),
      fredService.getHistoricalData('DTWEXBGS', startDate),
      fredService.getHistoricalData('GOLDPMGBD228NLBM', startDate),
    ]);

    return { vix, hySpread, dollarIndex, goldPrice };
  } catch (error) {
    console.error('Error fetching historical data:', error.message);
    return null;
  }
}

function findValueAtDate(data, targetDate) {
  if (!data || data.length === 0) return null;

  const target = new Date(targetDate);
  const sorted = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));

  // Find closest date at or before target
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (new Date(sorted[i].date) <= target) {
      return sorted[i].value;
    }
  }

  return null;
}

async function runBacktest() {
  console.log('='.repeat(60));
  console.log('HEGEMONY DASHBOARD THRESHOLD BACKTEST');
  console.log('='.repeat(60));
  console.log();

  // Fetch all historical data
  const historicalData = await fetchHistoricalData('2007-01-01');

  if (!historicalData) {
    console.log('Failed to fetch historical data. Exiting.');
    process.exit(1);
  }

  console.log('Historical data loaded.\n');

  // Run backtests for each crisis period
  for (const period of crisisPeriods) {
    console.log('-'.repeat(60));
    console.log(`CRISIS: ${period.name}`);
    console.log(`Period: ${period.startDate} to ${period.endDate}`);
    console.log(`Peak: ${period.peakDate}`);
    console.log(`Description: ${period.description}`);
    console.log('-'.repeat(60));

    // Get values at peak date
    const peakVix = findValueAtDate(historicalData.vix, period.peakDate);
    const peakHySpread = findValueAtDate(historicalData.hySpread, period.peakDate);
    const peakDollar = findValueAtDate(historicalData.dollarIndex, period.peakDate);
    const peakGold = findValueAtDate(historicalData.goldPrice, period.peakDate);

    console.log('\nValues at peak:');
    console.log(`  VIX: ${peakVix?.toFixed(2) ?? 'N/A'}`);
    console.log(`  HY Spread: ${peakHySpread ? (peakHySpread * 100).toFixed(0) + ' bps' : 'N/A'}`);
    console.log(`  Dollar Index: ${peakDollar?.toFixed(2) ?? 'N/A'}`);
    console.log(`  Gold Price: $${peakGold?.toFixed(2) ?? 'N/A'}`);

    // Evaluate secondary thresholds
    console.log('\nThreshold evaluations:');
    if (peakVix) {
      const vixZone = peakVix >= 60 ? 'CRITICAL' :
                      peakVix >= 40 ? 'DANGER' :
                      peakVix >= 25 ? 'WARNING' : 'NORMAL';
      console.log(`  VIX: ${vixZone} (threshold check: ${peakVix >= 40 ? 'TRIGGERED' : 'not triggered'})`);
    }
    if (peakHySpread) {
      const hyBps = peakHySpread * 100;
      const hyZone = hyBps >= 800 ? 'CRITICAL' :
                     hyBps >= 600 ? 'DANGER' :
                     hyBps >= 400 ? 'WARNING' : 'NORMAL';
      console.log(`  HY Spread: ${hyZone} (threshold check: ${hyBps >= 700 ? 'TRIGGERED' : 'not triggered'})`);
    }

    // Simulate stage assessment with available data
    const indicatorValues = {
      vix: peakVix,
      hySpread: peakHySpread ? peakHySpread * 100 : null, // Convert to bps
      hedgingSpread: null, // Would need JGB data
      auctionTail: null, // Would need auction data
      goldTreasuryRoC: null, // Would need ratio calculation
      interestRatio: null, // Would need fiscal data
    };

    // Check stage 1 triggers
    let stage1Triggers = 0;
    if (peakVix > 40) stage1Triggers++;
    if (peakHySpread && peakHySpread * 100 > 700) stage1Triggers++;

    console.log(`\nStage 1 triggers active: ${stage1Triggers}/5 (need 3 for Stage 1)`);
    console.log(`Expected minimum stage: ${period.expectedMinStage}`);

    const assessment = stage1Triggers >= 3 ? 'Stage 1 - Crisis' :
                       stage1Triggers >= 1 ? 'Pre-Crisis (Elevated)' : 'Pre-Crisis (Normal)';
    console.log(`Assessment: ${assessment}`);

    const passed = stage1Triggers >= period.expectedMinStage || period.expectedMinStage === 0;
    console.log(`Backtest result: ${passed ? 'PASS' : 'FAIL'}`);

    console.log();
  }

  console.log('='.repeat(60));
  console.log('BACKTEST COMPLETE');
  console.log('='.repeat(60));
  console.log();
  console.log('Notes:');
  console.log('- This backtest uses limited data (VIX, HY spread)');
  console.log('- Full backtest would require JGB yields, auction data, fiscal data');
  console.log('- Thresholds may need calibration based on historical analysis');
  console.log();
}

// Run if called directly
if (require.main === module) {
  require('dotenv').config({ path: '../.env' });
  runBacktest().catch(console.error);
}

module.exports = { runBacktest, crisisPeriods };
