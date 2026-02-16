-- Initialize governance database with core schemas and compliance rules

-- Create governance schema
CREATE SCHEMA IF NOT EXISTS governance;

-- Core compliance rules table
CREATE TABLE IF NOT EXISTS governance.compliance_regulations (
    id SERIAL PRIMARY KEY,
    regulation_code VARCHAR(50) UNIQUE NOT NULL,
    regulation_name VARCHAR(255) NOT NULL,
    regions VARCHAR(50)[],
    enforced_from DATE,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert core regulations
INSERT INTO governance.compliance_regulations (regulation_code, regulation_name, regions, description)
VALUES 
    ('GDPR', 'General Data Protection Regulation', ARRAY['EU'], 'EU data protection regulation'),
    ('CCPA', 'California Consumer Privacy Act', ARRAY['US'], 'California privacy law'),
    ('PIPL', 'Personal Information Protection Law', ARRAY['CN'], 'China privacy law'),
    ('DPDPA', 'Digital Personal Data Protection Act', ARRAY['IN'], 'India privacy act')
ON CONFLICT DO NOTHING;

-- Sample data asset definition
CREATE TABLE IF NOT EXISTS governance.data_assets (
    id SERIAL PRIMARY KEY,
    asset_name VARCHAR(255) UNIQUE NOT NULL,
    asset_type VARCHAR(100),
    owner VARCHAR(255),
    storage_location VARCHAR(255),
    classification VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Policy rules evaluation log
CREATE TABLE IF NOT EXISTS governance.policy_decisions (
    id SERIAL PRIMARY KEY,
    request_id VARCHAR(255),
    data_asset VARCHAR(255),
    user_id VARCHAR(255),
    decision VARCHAR(50),
    reason TEXT,
    evaluated_at TIMESTAMP DEFAULT NOW()
);
