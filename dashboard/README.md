# Hegemony Monitoring Dashboard

A web-based dashboard that tracks leading indicators of dollar hegemony erosion and potential monetary regime transition.

## Overview

This dashboard monitors quantitative metrics that serve as **leading indicators** (predictive) rather than **lagging indicators** (confirmatory) of crisis conditions. The core insight is that most publicly discussed indicators (VIX, credit spreads, equity drawdowns) confirm crisis after it has begun, while this dashboard focuses on the preconditions that precede crisis manifestation.

## Core Five Leading Indicators

### 1. Japanese Hedging Cost Spread
**Formula:** `US_10Y - JGB_10Y - FX_HEDGE_COST`

When this spread turns negative, Japanese institutions have financial incentive to exit Treasuries regardless of policy coordination or geopolitical alignment. This is a structural, calculable input rather than a sentiment-driven output.

- **Normal:** > 0 bps
- **Warning:** -50 to 0 bps
- **Danger:** -100 to -50 bps
- **Critical:** < -100 bps

### 2. Cross-Currency Basis Swap (EUR/USD 5Y)
Narrowing or positive basis indicates reduced global demand for dollar funding.

- **Normal:** < -15 bps
- **Warning:** -15 to -5 bps
- **Danger:** -5 to +5 bps
- **Critical:** > +5 bps

### 3. Treasury Auction Tail (20Y/30Y Average)
Difference between auction high yield and when-issued yield. Consistent tails above 3 basis points indicate insufficient demand at expected prices.

- **Normal:** < 2 bps
- **Warning:** 2-3 bps
- **Danger:** 3-5 bps
- **Critical:** > 5 bps

### 4. Gold/Treasury Ratio Rate of Change
12-month rate of change in Gold/TLT ratio. Acceleration indicates substitution away from Treasuries toward alternative safe assets.

- **Normal:** < 10%
- **Warning:** 10-20%
- **Danger:** 20-35%
- **Critical:** > 35%

### 5. Federal Interest Expense Ratio
TTM interest expense as percentage of TTM federal receipts. When above 25%, arithmetic becomes unsustainable.

- **Normal:** < 18%
- **Warning:** 18-25%
- **Danger:** 25-35%
- **Critical:** > 35%

## Crisis Stage Assessment

The dashboard assesses current conditions across five stages:

| Stage | Name | Description |
|-------|------|-------------|
| 0 | Pre-Crisis | Structural vulnerabilities present but no acute stress |
| 1 | Traditional Financial Crisis | Equity selloff, credit stress, flight to safety |
| 2 | Intervention Phase | Fed balance sheet expansion, policy response |
| 3 | Credibility Crisis | Dollar loses safe haven status |
| 4 | Regime Transition | New monetary order emerging |

## Data Sources

| Source | Data | Frequency |
|--------|------|-----------|
| FRED API | Treasury yields, breakevens, VIX, HY spreads | Daily |
| Treasury Fiscal Data | Auction results, interest expense, receipts | Per event/Monthly |
| TIC Data | Foreign holdings of Treasuries | Monthly (6-8 week lag) |
| Yahoo Finance | TLT prices for Gold/Treasury ratio | Daily |
| Manual Entry | Basis swaps, central bank gold, JGB yields | As needed |

## Installation

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup

1. Clone the repository and navigate to the dashboard directory:
```bash
cd dashboard
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file from the example:
```bash
cp .env.example .env
```

4. Add your FRED API key to `.env`:
```
FRED_API_KEY=your_api_key_here
```

Get a free FRED API key at: https://fred.stlouisfed.org/docs/api/api_key.html

### Running the Dashboard

Start both the API server and frontend development server:
```bash
npm start
```

Or run them separately:
```bash
# Backend only (port 4000)
npm run server

# Frontend only (port 3000)
npm run client
```

Access the dashboard at: http://localhost:3000

## API Endpoints

### Indicators
- `GET /api/indicators/current` - All current indicator values with threshold evaluations
- `GET /api/indicators/stage` - Current crisis stage assessment
- `GET /api/indicators/history/:indicator` - Historical data for charting
- `GET /api/indicators/breakevens` - TIPS breakeven inflation rates

### Treasury
- `GET /api/treasury/yields` - Current Treasury yields
- `GET /api/treasury/auctions` - Recent auction results
- `GET /api/treasury/fiscal` - Interest expense and receipts data
- `POST /api/treasury/auctions/when-issued` - Update auction with when-issued yield

### Holdings
- `GET /api/holdings/foreign` - Foreign Treasury holdings summary
- `GET /api/holdings/foreign/japan` - Japanese holdings
- `GET /api/holdings/foreign/china` - Chinese holdings (including Belgium proxy)
- `GET /api/holdings/gold` - Gold ratio and central bank data
- `POST /api/holdings/foreign/manual` - Manual TIC data entry
- `POST /api/holdings/gold/central-banks/manual` - Manual gold data entry

### Alerts
- `GET /api/alerts` - Recent threshold alerts
- `POST /api/alerts/check` - Trigger alert check
- `GET /api/alerts/config` - Alert configuration
- `PUT /api/alerts/config` - Update alert settings

### System
- `GET /api/health` - Health check
- `GET /api/status` - Data source status
- `GET /api/cache/stats` - Cache statistics
- `POST /api/cache/flush` - Clear cache

## Configuration

### Thresholds
Edit `config/thresholds.json` to adjust indicator thresholds. Changes take effect on next API request.

### Data Refresh Schedule
The API server automatically refreshes data on schedules defined in `config/refreshSchedule.json`:
- Yields: Daily at 6pm ET
- Auctions: Daily at 2pm ET
- Gold prices: Every 4 hours
- TIC data: Monthly

### Manual Data Entry

Some data sources require manual entry:

**Basis Swap Data:**
```bash
curl -X POST http://localhost:4000/api/holdings/foreign/manual \
  -H "Content-Type: application/json" \
  -d '{"pair": "EURUSD", "term": "5Y", "value": -18, "date": "2025-01-15"}'
```

**Central Bank Gold:**
```bash
curl -X POST http://localhost:4000/api/holdings/gold/central-banks/manual \
  -H "Content-Type: application/json" \
  -d '{"period": "2024-Q4", "totalTonnes": 290, "topPurchasers": [{"country": "China", "tonnes": 62}]}'
```

## Project Structure

```
dashboard/
├── api/
│   ├── routes/          # API route handlers
│   ├── services/        # Data fetching services
│   ├── utils/           # Backend utilities
│   └── server.js        # Express server entry
├── config/
│   ├── thresholds.json  # Indicator thresholds
│   ├── dataSources.json # Data source configuration
│   └── refreshSchedule.json
├── src/
│   ├── components/      # React components
│   ├── hooks/           # Custom React hooks
│   ├── utils/           # Frontend utilities
│   ├── styles/          # CSS styles
│   ├── App.jsx
│   └── index.jsx
├── scripts/             # Utility scripts
├── package.json
└── vite.config.js
```

## Known Limitations

1. **Basis Swap Data:** Cross-currency basis swap data typically requires Bloomberg or other premium data sources. The dashboard uses proxy calculations and supports manual entry.

2. **JGB Yields:** Japanese Government Bond yield data may be unavailable from free APIs. Manual entry or alternative sources may be required.

3. **TIC Data Lag:** Treasury International Capital data is released with a 6-8 week lag. The dashboard clearly displays data freshness.

4. **When-Issued Yields:** Auction tail calculations require when-issued yields, which need to be sourced from market data providers or entered manually.

## Development

### Building for Production
```bash
npm run build
```

### Running Backtest
```bash
npm run backtest
```

## Disclaimer

This dashboard is for educational and research purposes only. It does not constitute financial advice. The indicators and thresholds are based on theoretical frameworks and historical analysis, and should not be used as the sole basis for investment decisions.

## License

See LICENSE file in the repository root.
