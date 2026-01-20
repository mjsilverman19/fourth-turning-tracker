#!/usr/bin/env node

/**
 * Manual Data Entry Script
 *
 * Interactive CLI for entering data that cannot be fetched automatically:
 * - JGB yields
 * - Basis swap data
 * - Central bank gold purchases
 * - Auction when-issued yields
 *
 * Usage: npm run manual-entry
 */

const readline = require('readline');
const axios = require('axios');

const API_BASE = process.env.API_URL || 'http://localhost:4000/api';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function postData(endpoint, data) {
  try {
    const response = await axios.post(`${API_BASE}${endpoint}`, data);
    return response.data;
  } catch (error) {
    console.error('Error:', error.response?.data?.error || error.message);
    return null;
  }
}

async function enterJGBYield() {
  console.log('\n--- Enter JGB 10-Year Yield ---\n');

  const date = await question('Date (YYYY-MM-DD): ');
  const value = await question('Yield (%): ');

  const data = [{ date, value: parseFloat(value) }];

  // Note: This would need a dedicated endpoint for JGB data
  console.log('\nTo add JGB yield data, you would call:');
  console.log('POST /api/basis/jgb/manual');
  console.log('Body:', JSON.stringify(data, null, 2));
  console.log('\n(Endpoint not yet implemented - data logged for manual processing)');

  return data;
}

async function enterBasisSwap() {
  console.log('\n--- Enter Cross-Currency Basis Swap ---\n');

  const pair = await question('Currency pair (EURUSD/JPYUSD): ');
  const term = await question('Term (default: 5Y): ') || '5Y';
  const date = await question('Date (YYYY-MM-DD): ');
  const value = await question('Basis (bps, e.g., -18): ');

  const data = {
    pair: pair.toUpperCase(),
    term,
    date,
    value: parseFloat(value),
  };

  console.log('\nSubmitting basis swap data...');

  // This would need a dedicated endpoint
  console.log('Data:', JSON.stringify(data, null, 2));
  console.log('(Manual entry - store in local database or config)');

  return data;
}

async function enterCentralBankGold() {
  console.log('\n--- Enter Central Bank Gold Purchases ---\n');

  const period = await question('Period (e.g., 2024-Q4): ');
  const totalTonnes = await question('Total tonnes purchased: ');

  const topPurchasers = [];
  let addMore = true;

  while (addMore) {
    const country = await question('Top purchaser country (or "done"): ');
    if (country.toLowerCase() === 'done') {
      addMore = false;
    } else {
      const tonnes = await question(`Tonnes for ${country}: `);
      topPurchasers.push({ country, tonnes: parseFloat(tonnes) });
    }
  }

  const data = {
    period,
    totalTonnes: parseFloat(totalTonnes),
    topPurchasers,
  };

  console.log('\nSubmitting central bank gold data...');
  const result = await postData('/holdings/gold/central-banks/manual', data);

  if (result?.success) {
    console.log('Success! Data added.');
    console.log('Rolling 12-month total:', result.data?.rolling12MonthTonnes, 'tonnes');
  }

  return data;
}

async function enterTICData() {
  console.log('\n--- Enter TIC Holdings Data ---\n');

  const country = await question('Country name: ');
  const date = await question('Date (YYYY-MM-DD): ');
  const holdings = await question('Holdings (millions USD): ');

  const data = {
    country,
    date,
    holdings: parseFloat(holdings),
  };

  console.log('\nSubmitting TIC data...');
  const result = await postData('/holdings/foreign/manual', data);

  if (result?.success) {
    console.log('Success! Data added for', country);
  }

  return data;
}

async function enterAuctionWhenIssued() {
  console.log('\n--- Enter Auction When-Issued Yield ---\n');

  const cusip = await question('Auction CUSIP: ');
  const whenIssuedYield = await question('When-Issued Yield (%): ');

  const data = {
    cusip,
    whenIssuedYield: parseFloat(whenIssuedYield),
  };

  console.log('\nSubmitting when-issued yield...');
  const result = await postData('/treasury/auctions/when-issued', data);

  if (result?.success) {
    console.log('Success! Auction updated.');
    console.log('Calculated tail:', result.auction?.tail?.toFixed(2), 'bps');
  }

  return data;
}

async function viewCurrentData() {
  console.log('\n--- Current Indicator Values ---\n');

  try {
    const response = await axios.get(`${API_BASE}/indicators/current`);
    const { indicators, secondary } = response.data;

    console.log('Core Indicators:');
    Object.entries(indicators).forEach(([key, data]) => {
      const value = data.value;
      const zone = data.threshold?.zone || 'UNKNOWN';
      console.log(`  ${key}: ${value?.toFixed(2) ?? 'N/A'} (${zone})`);
    });

    console.log('\nSecondary Indicators:');
    Object.entries(secondary).forEach(([key, data]) => {
      const value = data.value;
      console.log(`  ${key}: ${value?.toFixed(2) ?? 'N/A'}`);
    });
  } catch (error) {
    console.error('Error fetching data:', error.message);
    console.log('Make sure the API server is running (npm run server)');
  }
}

async function mainMenu() {
  console.log('\n========================================');
  console.log('  HEGEMONY DASHBOARD - MANUAL DATA ENTRY');
  console.log('========================================\n');

  console.log('Select an option:\n');
  console.log('  1. Enter JGB 10-Year Yield');
  console.log('  2. Enter Cross-Currency Basis Swap');
  console.log('  3. Enter Central Bank Gold Purchases');
  console.log('  4. Enter TIC Holdings Data');
  console.log('  5. Enter Auction When-Issued Yield');
  console.log('  6. View Current Data');
  console.log('  7. Exit\n');

  const choice = await question('Enter choice (1-7): ');

  switch (choice) {
    case '1':
      await enterJGBYield();
      break;
    case '2':
      await enterBasisSwap();
      break;
    case '3':
      await enterCentralBankGold();
      break;
    case '4':
      await enterTICData();
      break;
    case '5':
      await enterAuctionWhenIssued();
      break;
    case '6':
      await viewCurrentData();
      break;
    case '7':
      console.log('\nGoodbye!\n');
      rl.close();
      process.exit(0);
    default:
      console.log('\nInvalid choice. Please try again.');
  }

  // Return to main menu
  await mainMenu();
}

// Run if called directly
if (require.main === module) {
  require('dotenv').config({ path: '../.env' });
  console.log('API endpoint:', API_BASE);
  mainMenu().catch(console.error);
}

module.exports = { mainMenu };
