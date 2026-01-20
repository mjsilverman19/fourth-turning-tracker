/**
 * GET /api/health
 * Health check endpoint
 */
module.exports = async function handler(req, res) {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: 'vercel-serverless',
  });
};
