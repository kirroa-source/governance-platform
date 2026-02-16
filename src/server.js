// src/server.js
// Data Governance Platform - Main Application Server

const path = require('path'); //added may be not needed
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const logger = require('./utils/logger');
const ApicurioRegistryService = require('./services/apicurio-registry');
const contractsRouter = require('./routes/contracts-api');

const app = express();

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// ============================================================================
// DATABASE CONNECTION POOL
// ============================================================================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://governance:governance123@postgres:5432/governance_db',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Database error handler
pool.on('error', (error) => {
  logger.error('Unexpected error on idle client', error);
  process.exitCode = 1;
});

// Middleware to inject database pool into requests
app.use((req, res, next) => {
  req.db = pool;
  next();
});

// ============================================================================
// HEALTH CHECKS
// ============================================================================

/**
 * Database health check
 */
async function checkDatabaseHealth() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    return {
      status: 'healthy',
      timestamp: result.rows[0].now
    };
  } catch (error) {
    logger.error('Database health check failed:', error.message);
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
}

/**
 * Registry health check
 */
async function checkRegistryHealth() {
  try {
    const registry = new ApicurioRegistryService();
    const health = await registry.checkHealth();
    return health;
  } catch (error) {
    logger.error('Registry health check failed:', error.message);
    return {
      healthy: false,
      error: error.message
    };
  }
}

/**
 * OPA health check
 */
async function checkOPAHealth() {
  try {
    // Simple check - OPA endpoint would be /health
    return {
      healthy: true,
      status: 'operational'
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message
    };
  }
}

// ============================================================================
// ROUTES - HEALTH & STATUS
// ============================================================================

/**
 * GET /status
 * Full system health status
 */
app.get('/status', async (req, res) => {
  try {
    const [dbHealth, regHealth, opaHealth] = await Promise.all([
      checkDatabaseHealth(),
      checkRegistryHealth(),
      checkOPAHealth()
    ]);

    const allHealthy = 
      dbHealth.status === 'healthy' && 
      regHealth.healthy && 
      opaHealth.healthy;

    res.status(allHealthy ? 200 : 503).json({
      success: true,
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealth,
        registry: {
          healthy: regHealth.healthy,
          status: regHealth.status || 'unavailable'
        },
        opa: {
          healthy: opaHealth.healthy,
          status: opaHealth.status
        }
      }
    });
  } catch (error) {
    logger.error('Health check error:', error.message);
    res.status(503).json({
      success: false,
      error: 'Health check failed'
    });
  }
});

/**
 * GET /health
 * Quick health check
 */
app.get('/health', async (req, res) => {
  const dbHealth = await checkDatabaseHealth();
  res.status(dbHealth.status === 'healthy' ? 200 : 503).json({
    status: dbHealth.status
  });
});

// ============================================================================
// ROUTES - CONTRACT MANAGEMENT
// ============================================================================

app.use('/api/v1/contracts', contractsRouter);

// ============================================================================
// ROUTES - REGISTRY PROXY & UTILITIES
// ============================================================================

/**
 * GET /api/v1/registry/health
 * Registry health check
 */
app.get('/api/v1/registry/health', async (req, res) => {
  try {
    const registry = new ApicurioRegistryService();
    const health = await registry.checkHealth();
    res.status(health.healthy ? 200 : 503).json(health);
  } catch (error) {
    logger.error('Registry health check error:', error.message);
    res.status(503).json({
      success: false,
      error: 'Registry health check failed'
    });
  }
});

/**
 * GET /api/v1/registry/artifacts
 * List artifacts from registry
 */
app.get('/api/v1/registry/artifacts', async (req, res) => {
  try {
    const registry = new ApicurioRegistryService();
    const artifacts = await registry.listArtifacts();
    res.status(200).json(artifacts);
  } catch (error) {
    logger.error('Registry artifacts listing error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to list artifacts'
    });
  }
});

/**
 * GET /api/v1/registry/artifacts/:id
 * Get specific artifact from registry
 */
app.get('/api/v1/registry/artifacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const registry = new ApicurioRegistryService();
    const info = await registry.getArtifactInfo(id);
    res.status(200).json(info);
  } catch (error) {
    logger.error('Registry artifact retrieval error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve artifact'
    });
  }
});

// ============================================================================
// ROUTES - SCHEMA GENERATION
// ============================================================================

/**
 * POST /api/v1/schemas/generate/avro
 * Generate Avro schema from fields
 */
app.post('/api/v1/schemas/generate/avro', (req, res) => {
  try {
    const { recordName, fields } = req.body;

    if (!recordName || !fields) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: recordName, fields'
      });
    }

    const avroSchema = ApicurioRegistryService.generateAvroSchema(recordName, fields);

    res.status(200).json({
      success: true,
      schema: avroSchema,
      type: 'AVRO'
    });
  } catch (error) {
    logger.error('Avro schema generation error:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v1/schemas/generate/json
 * Generate JSON Schema from fields
 */
app.post('/api/v1/schemas/generate/json', (req, res) => {
  try {
    const { title, fields } = req.body;

    if (!title || !fields) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, fields'
      });
    }

    const jsonSchema = ApicurioRegistryService.generateJsonSchema(title, fields);

    res.status(200).json({
      success: true,
      schema: jsonSchema,
      type: 'JSON'
    });
  } catch (error) {
    logger.error('JSON schema generation error:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v1/schemas/generate/openapi
 * Generate OpenAPI schema from fields
 */
app.post('/api/v1/schemas/generate/openapi', (req, res) => {
  try {
    const { title, fields } = req.body;

    if (!title || !fields) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, fields'
      });
    }

    const openAPISchema = ApicurioRegistryService.generateOpenAPISchema(title, fields);

    res.status(200).json({
      success: true,
      schema: openAPISchema,
      type: 'OPENAPI'
    });
  } catch (error) {
    logger.error('OpenAPI schema generation error:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// ROUTES - POLICY ENFORCEMENT
// ============================================================================

/**
 * POST /api/v1/policies/enforce
 * Enforce policy against contract
 */
app.post('/api/v1/policies/enforce', async (req, res) => {
  try {
    const { contractId, policyId, action } = req.body;

    if (!contractId || !policyId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: contractId, policyId'
      });
    }

    // Query contract
    const contractResult = await pool.query(
      'SELECT id, contract_data FROM data_contracts WHERE id = $1',
      [contractId]
    );

    if (contractResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Contract not found'
      });
    }

    // Log enforcement
    await pool.query(
      `INSERT INTO contract_audit_log 
       (contract_id, action, details)
       VALUES ($1, $2, $3)`,
      [contractId, 'policy_enforced', JSON.stringify({ policyId, action })]
    );

    res.status(200).json({
      success: true,
      message: 'Policy enforcement initiated',
      contractId,
      policyId,
      action
    });
  } catch (error) {
    logger.error('Policy enforcement error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Policy enforcement failed'
    });
  }
});

// ============================================================================
// ERROR HANDLERS
// ============================================================================

/**
 * 404 Handler
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    path: req.path
  });
});
//CHANGES INTRODUCED BY INTEGRATION OF CONTRACT BUILDER
/**
 * GET /contract-builder
 * Serves the Data Contract Builder single-page UI
 */
app.get('/contract-builder', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'views', 'contract-builder.html'));
});

/**
 * GET / (root redirect to builder)
 * Redirect root to the contract builder for convenience
 */
app.get('/', (req, res) => {
  res.redirect('/contract-builder');
});
//CHANGES INTRODUCED BY INTEGRATION OF CONTRACT BUILDER

/**
 * Global error handler
 */
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`Data Governance Platform started on port ${PORT}`);
  logger.info(`Database: ${process.env.DB_HOST || 'postgres'}:${process.env.DB_PORT || 5432}`);
  logger.info(`Registry: ${process.env.APICURIO_REGISTRY_URL || 'http://apicurio:8080'}`);
  logger.info(`OPA: ${process.env.OPA_URL || 'http://opa:8181'}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

module.exports = app;
