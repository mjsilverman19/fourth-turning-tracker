require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cron = require('node-cron');

const indicatorsRouter = require('./routes/indicators');
const treasuryRouter = require('./routes/treasury');
const holdingsRouter = require('./routes/holdings');
const alertsRouter = require('./routes/alerts');

const fredService = require('./services/fredService');
const treasuryService = require('./services/treasuryService');
const goldService = require('./services/goldService');
const basisSwapService = require('./services/basisSwapService');
const cache = require('./utils/cache');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });
}

// API Routes
app.use('/api/indicators', indicatorsRouter);
app.use('/api/treasury', treasuryRouter);
app.use('/api/holdings', holdingsRouter);
app.use('/api/alerts', alertsRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    cacheStats: cache.getStats(),
  });
});

// Cache management endpoints
app.get('/api/cache/stats', (req, res) => {
  res.json({
    stats: cache.getStats(),
    keys: cache.keys(),
  });
});

app.post('/api/cache/flush', (req, res) => {
  cache.flush();
  res.json({
    success: true,
    message: 'Cache flushed',
  });
});

// Data source status endpoint
app.get('/api/status', async (req, res) => {
  try {
    const status = {
      fred: { status: 'unknown', lastCheck: null },
      treasury: { status: 'unknown', lastCheck: null },
      gold: { status: 'unknown', lastCheck: null },
      tic: { status: 'unknown', lastCheck: null },
    };

    // Check FRED API
    try {
      await fredService.getLatestValue('DGS10');
      status.fred = { status: 'ok', lastCheck: new Date().toISOString() };
    } catch (e) {
      status.fred = { status: 'error', error: e.message, lastCheck: new Date().toISOString() };
    }

    res.json({
      success: true,
      status,
      apiKeyConfigured: !!process.env.FRED_API_KEY,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Scheduled data refresh jobs
function setupScheduledJobs() {
  // Daily yield data refresh at 6pm ET (23:00 UTC)
  cron.schedule('0 23 * * 1-5', async () => {
    console.log('Running scheduled yield data refresh...');
    try {
      await fredService.getAllYields();
      await fredService.getMarketStressIndicators();
      console.log('Yield data refresh complete');
    } catch (error) {
      console.error('Scheduled yield refresh failed:', error.message);
    }
  });

  // Gold price refresh every 4 hours
  cron.schedule('0 */4 * * *', async () => {
    console.log('Running scheduled gold data refresh...');
    try {
      await goldService.getGoldTreasuryRatio();
      console.log('Gold data refresh complete');
    } catch (error) {
      console.error('Scheduled gold refresh failed:', error.message);
    }
  });

  // Basis swap / hedging spread refresh daily at 6pm ET
  cron.schedule('0 23 * * 1-5', async () => {
    console.log('Running scheduled basis swap refresh...');
    try {
      await basisSwapService.getJapaneseHedgingSpread();
      console.log('Basis swap refresh complete');
    } catch (error) {
      console.error('Scheduled basis swap refresh failed:', error.message);
    }
  });

  // Auction data refresh after typical auction times (2pm ET / 19:00 UTC)
  cron.schedule('0 19 * * 1-5', async () => {
    console.log('Running scheduled auction data refresh...');
    try {
      await treasuryService.getAuctionTailMetrics();
      console.log('Auction data refresh complete');
    } catch (error) {
      console.error('Scheduled auction refresh failed:', error.message);
    }
  });

  console.log('Scheduled data refresh jobs configured');
}

// Initial data prefetch on startup
async function prefetchData() {
  console.log('Prefetching initial data...');

  try {
    // Fetch core data in parallel
    await Promise.allSettled([
      fredService.getAllYields(),
      fredService.getMarketStressIndicators(),
      goldService.getGoldTreasuryRatio(),
      basisSwapService.getJapaneseHedgingSpread(),
      treasuryService.getInterestExpenseRatio(),
    ]);

    console.log('Initial data prefetch complete');
  } catch (error) {
    console.error('Data prefetch error:', error.message);
  }
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`Hegemony Monitoring Dashboard API running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`FRED API Key: ${process.env.FRED_API_KEY ? 'configured' : 'not configured'}`);

  // Setup scheduled jobs
  setupScheduledJobs();

  // Prefetch data on startup (in background)
  prefetchData();
});

module.exports = app;
