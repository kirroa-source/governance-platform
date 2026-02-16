#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const APICURIO_URL = process.env.APICURIO_URL || 'http://localhost:8080';
const CONTRACT_DIR = './data-contracts';

async function publishContract(schemaFile) {
  try {
    console.log(`📋 Publishing contract: ${schemaFile}`);

    // Read the schema file
    const filePath = path.join(CONTRACT_DIR, schemaFile);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const schema = yaml.load(fileContent);

    // Extract metadata
    const artifactId = schema.info.title.toLowerCase().replace(/\s+/g, '-');
    const version = schema.info.version || '1.0.0';

    console.log(`   Artifact ID: ${artifactId}`);
    console.log(`   Version: ${version}`);

    // Register in Apicurio
    const registryUrl = `${APICURIO_URL}/apis/registry/v2/groups/default/artifacts`;

    // Try to create new artifact
    const response = await axios.post(registryUrl, fileContent, {
      headers: {
        'Content-Type': 'application/json',
        'X-Registry-ArtifactId': artifactId,
        'X-Registry-ArtifactType': 'ASYNCAPI',
      },
    }).catch(async (error) => {
      // If conflict (artifact exists), update it
      if (error.response?.status === 409) {
        console.log(`   Artifact exists, updating...`);
        const updateUrl = `${registryUrl}/${artifactId}/versions`;
        return axios.post(updateUrl, fileContent, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }
      throw error;
    });

    console.log(`✅ Successfully published: ${artifactId}`);
    console.log(`   Registry URL: ${APICURIO_URL}/ui/artifacts/asyncapi/${artifactId}`);
    return { artifactId, version, status: 'published' };
  } catch (error) {
    console.error(`❌ Failed to publish ${schemaFile}:`, error.message);
    if (error.response?.data) {
      console.error('   Response:', error.response.data);
    }
    throw error;
  }
}

async function publishAllContracts() {
  console.log('\n🚀 Publishing Data Contracts to Apicurio Registry\n');

  const files = fs.readdirSync(CONTRACT_DIR).filter(f => f.endsWith('.schema.yaml'));

  if (files.length === 0) {
    console.log('⚠️  No schema files found in', CONTRACT_DIR);
    return;
  }

  const results = [];
  for (const file of files) {
    try {
      const result = await publishContract(file);
      results.push(result);
    } catch (error) {
      console.error(`Skipping ${file} due to error`);
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   Total published: ${results.length}`);
  results.forEach(r => {
    console.log(`   - ${r.artifactId} (v${r.version})`);
  });
}

publishAllContracts().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
