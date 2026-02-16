// ============================================================================
// ROUTE - DATA CONTRACT BUILDER UI
// Add this to src/server.js after the existing routes, before the error handler
// ============================================================================

const path = require('path');

/**
 * GET /contract-builder
 * Serves the Data Contract Builder single-page UI
 */
app.get('/contract-builder', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'views', 'contract-builder.html'));
});

/**
 * GET / (root redirect to builder)
 * Optional: redirect root to the contract builder
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'views', 'contract-builder.html'));
});
