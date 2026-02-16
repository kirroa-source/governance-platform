// src/routes/contracts-api.js
// Contract Management API Endpoints

const express = require('express');
const router = express.Router();
const ContractValidator = require('../services/contract-validator');
const ApicurioRegistryService = require('../services/apicurio-registry');
const logger = require('../utils/logger');

// Database pool (injected via middleware)
let db;

/**
 * Middleware to set database pool
 */
router.use((req, res, next) => {
  db = req.db;
  next();
});

/**
 * POST /api/v1/contracts/validate
 * Validate a contract without publishing
 */
router.post('/validate', async (req, res) => {
  try {
    const contract = req.body;

    if (!contract) {
      return res.status(400).json({
        success: false,
        error: 'Request body cannot be empty'
      });
    }

    // Validate contract
    const validation = ContractValidator.validate(contract);

    if (!validation.valid) {
      logger.warn(`Validation failed for contract`, { errors: validation.errors });
      return res.status(400).json({
        success: false,
        errors: validation.errors,
        warnings: validation.warnings
      });
    }

    res.status(200).json({
      success: true,
      message: 'Contract is valid',
      contract: validation.contract,
      warnings: validation.warnings
    });
  } catch (error) {
    logger.error('Contract validation error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error during validation'
    });
  }
});

/**
 * POST /api/v1/contracts
 * Create, validate, and publish contract to registry
 */
router.post('/', async (req, res) => {
  let client;
  try {
    const contract = req.body;

    if (!contract) {
      return res.status(400).json({
        success: false,
        error: 'Request body cannot be empty'
      });
    }

    // Validate contract
    const validation = ContractValidator.validate(contract);
    if (!validation.valid) {
      logger.warn(`Contract validation failed`, { errors: validation.errors });
      return res.status(400).json({
        success: false,
        errors: validation.errors
      });
    }

    const normalizedContract = validation.contract;

    // Get database client
    client = await db.connect();
    await client.query('BEGIN');

    try {
      // Generate artifact ID
      const artifactId = ContractValidator.generateArtifactId(normalizedContract);

      // Publish to registry
      const registry = new ApicurioRegistryService();
      const schemas = ContractValidator.extractSchemas(normalizedContract);
      const jsonSchema = ApicurioRegistryService.generateJsonSchema(
        normalizedContract.info.title,
        schemas[0]?.fields || []
      );

      let registryInfo = null;
      try {
        registryInfo = await registry.publishSchema({
          artifactId,
          schemaType: 'JSON',
          schema: jsonSchema
        });
      } catch (regError) {
        logger.warn(`Registry publication failed (non-fatal):`, regError.message);
        registryInfo = {
          success: false,
          error: regError.message
        };
      }

      // Store in database
      const contractId = `${normalizedContract.info.id}-${normalizedContract.info.version}`;
      const contractJson = JSON.stringify(normalizedContract);
      const schemasJson = JSON.stringify(schemas);

      const dbResult = await client.query(
        `INSERT INTO data_contracts 
         (contract_id, product_id, version, title, description, contract_data, status, artifact_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          contractId,
          normalizedContract.info.id,
          normalizedContract.info.version,
          normalizedContract.info.title,
          normalizedContract.info.description,
          contractJson,
          registryInfo.success ? 'published' : 'pending',
          artifactId
        ]
      );

      const contractDbId = dbResult.rows[0].id;

      // Store schemas
      for (const schema of schemas) {
        await client.query(
          `INSERT INTO contract_schemas 
           (contract_id, model_id, model_name, schema_data, field_count)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            contractDbId,
            schema.modelId,
            schema.modelName,
            JSON.stringify(schema),
            schema.fieldCount
          ]
        );
      }

      // Store version
      await client.query(
        `INSERT INTO contract_versions 
         (contract_id, version_number, contract_data)
         VALUES ($1, $2, $3)`,
        [contractDbId, normalizedContract.info.version, contractJson]
      );

      // Store artifact metadata if registry succeeded
      if (registryInfo.success) {
        await client.query(
          `INSERT INTO contract_artifacts 
           (contract_id, artifact_id, artifact_type, registry_url, version)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            contractDbId,
            registryInfo.artifactId,
            'JSON',
            registryInfo.registryUrl,
            registryInfo.version
          ]
        );
      }

      // Store validation
      await client.query(
        `INSERT INTO contract_validation_history 
         (contract_id, validation_status, validation_result)
         VALUES ($1, $2, $3)`,
        [contractDbId, 'passed', JSON.stringify(validation)]
      );

      // Audit log
      await client.query(
        `INSERT INTO contract_audit_log 
         (contract_id, action, details)
         VALUES ($1, $2, $3)`,
        [contractDbId, 'created', JSON.stringify({
          artifactId,
          registryInfo: registryInfo.success ? 'published' : 'publication_failed'
        })]
      );

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        message: 'Contract created successfully',
        contract: {
          id: contractDbId,
          contractId,
          version: normalizedContract.info.version,
          title: normalizedContract.info.title,
          status: registryInfo.success ? 'published' : 'pending',
          artifactId,
          registry: registryInfo.success ? registryInfo : { error: registryInfo.error }
        }
      });
    } catch (txError) {
      await client.query('ROLLBACK');
      throw txError;
    }
  } catch (error) {
    logger.error('Contract creation error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error during contract creation'
    });
  } finally {
    if (client) client.release();
  }
});

/**
 * GET /api/v1/contracts
 * List all contracts with pagination
 */
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await db.query('SELECT COUNT(*) as total FROM data_contracts');
    const total = parseInt(countResult.rows[0].total);

    // Get contracts
    const result = await db.query(
      `SELECT id, contract_id, product_id, version, title, description, status, 
              artifact_id, created_at, updated_at
       FROM data_contracts
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.status(200).json({
      success: true,
      contracts: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Contract listing error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error during contract listing'
    });
  }
});

/**
 * GET /api/v1/contracts/:id
 * Get specific contract
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT id, contract_id, product_id, version, title, description, status, 
              artifact_id, contract_data, created_at, updated_at
       FROM data_contracts
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Contract not found'
      });
    }

    const contract = result.rows[0];

    // Get schemas
    const schemasResult = await db.query(
      `SELECT model_id, model_name, schema_data, field_count
       FROM contract_schemas
       WHERE contract_id = $1`,
      [id]
    );

    // Get versions
    const versionsResult = await db.query(
      `SELECT version_number, created_at
       FROM contract_versions
       WHERE contract_id = $1
       ORDER BY created_at DESC`,
      [id]
    );

    res.status(200).json({
      success: true,
      contract: {
        ...contract,
        contract_data: JSON.parse(contract.contract_data || '{}'),
        schemas: schemasResult.rows,
        versions: versionsResult.rows
      }
    });
  } catch (error) {
    logger.error('Contract retrieval error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error during contract retrieval'
    });
  }
});

/**
 * DELETE /api/v1/contracts/:id
 * Delete contract (cascading)
 */
router.delete('/:id', async (req, res) => {
  let client;
  try {
    const { id } = req.params;

    // Check if contract exists
    const checkResult = await db.query(
      'SELECT id FROM data_contracts WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Contract not found'
      });
    }

    client = await db.connect();
    await client.query('BEGIN');

    try {
      // Delete from registry if artifact exists
      const artifactResult = await client.query(
        'SELECT artifact_id FROM data_contracts WHERE id = $1',
        [id]
      );

      if (artifactResult.rows[0]?.artifact_id) {
        try {
          const registry = new ApicurioRegistryService();
          await registry.deleteArtifact(artifactResult.rows[0].artifact_id);
        } catch (regError) {
          logger.warn(`Registry deletion failed (non-fatal):`, regError.message);
        }
      }

      // Cascading deletes (handled by database constraints)
      await client.query('DELETE FROM data_contracts WHERE id = $1', [id]);

      // Audit log (insert before deletion)
      await client.query(
        `INSERT INTO contract_audit_log 
         (contract_id, action, details)
         VALUES ($1, $2, $3)`,
        [id, 'deleted', JSON.stringify({ deletedAt: new Date() })]
      );

      await client.query('COMMIT');

      res.status(200).json({
        success: true,
        message: 'Contract deleted successfully'
      });
    } catch (txError) {
      await client.query('ROLLBACK');
      throw txError;
    }
  } catch (error) {
    logger.error('Contract deletion error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error during contract deletion'
    });
  } finally {
    if (client) client.release();
  }
});

module.exports = router;
