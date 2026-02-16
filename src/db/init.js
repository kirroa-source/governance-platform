/**
 * Database initialization and schema creation
 */

const logger = require('../utils/logger');

const initDatabase = async (pool) => {
  try {
    // Create tables if they don't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS data_contracts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        definition JSONB NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        version VARCHAR(20) DEFAULT '1.0.0',
        created_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS policies (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        rego_code TEXT NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'active',
        created_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS audit_events (
        id SERIAL PRIMARY KEY,
        event_type VARCHAR(100) NOT NULL,
        details JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        user_id VARCHAR(255),
        ip_address VARCHAR(45)
      );

      CREATE TABLE IF NOT EXISTS schemas (
        id SERIAL PRIMARY KEY,
        schema_id VARCHAR(255) NOT NULL UNIQUE,
        schema_type VARCHAR(50),
        content JSONB,
        version VARCHAR(20) DEFAULT '1.0.0',
        registry_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS compliance_rules (
        id SERIAL PRIMARY KEY,
        regulation VARCHAR(50) NOT NULL,
        rule_name VARCHAR(255) NOT NULL,
        description TEXT,
        enforcement_level VARCHAR(50),
        regions VARCHAR(255)[],
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_audit_event_type ON audit_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_events(created_at);
      CREATE INDEX IF NOT EXISTS idx_contracts_status ON data_contracts(status);
      CREATE INDEX IF NOT EXISTS idx_policies_status ON policies(status);
    `);

    logger.info('Database schema initialized successfully');

    // Insert default compliance rules if not already present
    await pool.query(`
      INSERT INTO compliance_rules (regulation, rule_name, description, enforcement_level, regions)
      VALUES 
        ('GDPR', 'Data Minimization', 'Collect only necessary personal data', 'strict', ARRAY['EU']),
        ('GDPR', 'Right to Erasure', 'Support deletion of personal data upon request', 'strict', ARRAY['EU']),
        ('CCPA', 'Opt-Out Rights', 'Provide consumers right to opt-out of data sales', 'strict', ARRAY['US']),
        ('PIPL', 'Consent Required', 'Obtain explicit consent for data processing', 'strict', ARRAY['CN']),
        ('DPDPA', 'Sensitive Data Protection', 'Apply stricter controls on sensitive data', 'strict', ARRAY['IN'])
      ON CONFLICT DO NOTHING;
    `);

    logger.info('Default compliance rules loaded');

    return true;
  } catch (error) {
    logger.error('Database initialization failed', error);
    throw error;
  }
};

module.exports = { initDatabase };
