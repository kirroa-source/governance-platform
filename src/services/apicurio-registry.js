// src/services/apicurio-registry.js
// Apicurio Registry Integration Service

const axios = require('axios');
const logger = require('../utils/logger');

class ApicurioRegistryService {
  constructor(baseUrl = process.env.APICURIO_REGISTRY_URL || 'http://apicurio:8080') {
    this.baseUrl = baseUrl;
    this.groupId = 'default';
    this.apiVersion = 'v2';
    this.client = axios.create({
      baseURL: `${baseUrl}/apis/registry/${this.apiVersion}`,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Check registry health
   * @returns {Promise<Object>} - Health status
   */
  async checkHealth() {
    try {
      const response = await this.client.get('/admin/info');
      return {
        healthy: true,
        status: response.status,
        data: response.data
      };
    } catch (error) {
      logger.error('Registry health check failed:', error.message);
      return {
        healthy: false,
        status: error.response?.status || 503,
        error: error.message
      };
    }
  }

  /**
   * Publish schema to registry
   * @param {Object} options - Publication options
   * @param {String} options.artifactId - Unique artifact identifier
   * @param {String} options.schemaType - Type: AVRO, JSON, PROTOBUF, OPENAPI, ASYNCAPI
   * @param {Object} options.schema - Schema object to publish
   * @param {String} options.description - Optional description
   * @returns {Promise<Object>} - Publication result
   */
  async publishSchema(options) {
    const { artifactId, schemaType, schema, description } = options;

    if (!artifactId || !schemaType || !schema) {
      throw new Error('Missing required options: artifactId, schemaType, schema');
    }

    try {
      // Convert schema to string if object
      const schemaContent = typeof schema === 'string' ? schema : JSON.stringify(schema);

      // Create artifact
      const response = await this.client.post(
        `/groups/${this.groupId}/artifacts`,
        schemaContent,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Registry-ArtifactType': schemaType
          },
          params: {
            artifactId,
            ifExists: 'FAIL'
          }
        }
      );

      logger.info(`Schema published: ${artifactId} (${schemaType})`);

      return {
        success: true,
        artifactId: response.data.id,
        version: response.data.version,
        groupId: this.groupId,
        schemaType,
        registryUrl: `${this.baseUrl}/apis/registry/${this.apiVersion}/groups/${this.groupId}/artifacts/${artifactId}`
      };
    } catch (error) {
      if (error.response?.status === 409) {
        logger.warn(`Artifact already exists: ${artifactId}. Retrieving version info...`);
        return await this.getArtifactInfo(artifactId);
      }

      logger.error(`Failed to publish schema ${artifactId}:`, error.message);
      throw new Error(`Registry publish failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get artifact information
   * @param {String} artifactId - Artifact identifier
   * @returns {Promise<Object>} - Artifact metadata
   */
  async getArtifactInfo(artifactId) {
    try {
      const response = await this.client.get(`/groups/${this.groupId}/artifacts/${artifactId}`);

      return {
        success: true,
        artifactId: response.data.id,
        version: response.data.version,
        groupId: this.groupId,
        schemaType: response.data.type,
        createdAt: response.data.createdOn,
        modifiedAt: response.data.modifiedOn,
        registryUrl: `${this.baseUrl}/apis/registry/${this.apiVersion}/groups/${this.groupId}/artifacts/${artifactId}`
      };
    } catch (error) {
      logger.error(`Failed to retrieve artifact ${artifactId}:`, error.message);
      throw new Error(`Registry retrieval failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get artifact content/schema
   * @param {String} artifactId - Artifact identifier
   * @returns {Promise<String>} - Schema content
   */
  async getArtifactContent(artifactId) {
    try {
      const response = await this.client.get(`/groups/${this.groupId}/artifacts/${artifactId}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to get artifact content ${artifactId}:`, error.message);
      throw new Error(`Registry content retrieval failed: ${error.message}`);
    }
  }

  /**
   * List all artifacts
   * @returns {Promise<Array>} - Array of artifacts
   */
  async listArtifacts() {
    try {
      const response = await this.client.get(`/groups/${this.groupId}/artifacts`);

      return {
        success: true,
        artifacts: response.data.artifacts?.map(artifact => ({
          artifactId: artifact.id,
          type: artifact.type,
          version: artifact.version,
          createdAt: artifact.createdOn,
          modifiedAt: artifact.modifiedOn
        })) || []
      };
    } catch (error) {
      logger.error('Failed to list artifacts:', error.message);
      throw new Error(`Registry list failed: ${error.message}`);
    }
  }

  /**
   * Delete artifact from registry
   * @param {String} artifactId - Artifact identifier
   * @returns {Promise<Object>} - Deletion result
   */
  async deleteArtifact(artifactId) {
    try {
      await this.client.delete(`/groups/${this.groupId}/artifacts/${artifactId}`);

      logger.info(`Artifact deleted: ${artifactId}`);

      return {
        success: true,
        message: `Artifact ${artifactId} deleted successfully`
      };
    } catch (error) {
      if (error.response?.status === 404) {
        logger.warn(`Artifact not found: ${artifactId}`);
        return {
          success: true,
          message: `Artifact ${artifactId} not found (already deleted)`
        };
      }

      logger.error(`Failed to delete artifact ${artifactId}:`, error.message);
      throw new Error(`Registry deletion failed: ${error.message}`);
    }
  }

  /**
   * Generate Avro schema from fields
   * @param {String} recordName - Record name
   * @param {Array} fields - Field definitions
   * @returns {Object} - Avro schema
   */
  static generateAvroSchema(recordName, fields) {
    if (!recordName || !fields || fields.length === 0) {
      throw new Error('Record name and fields are required for Avro schema generation');
    }

    const avroFields = fields.map(field => ({
      name: field.name,
      type: this.mapToAvroType(field.type),
      doc: field.description || ''
    }));

    return {
      type: 'record',
      name: recordName.replace(/[^a-zA-Z0-9_]/g, '_'),
      fields: avroFields
    };
  }

  /**
   * Generate JSON Schema from fields
   * @param {String} title - Schema title
   * @param {Array} fields - Field definitions
   * @returns {Object} - JSON schema
   */
  static generateJsonSchema(title, fields) {
    if (!title || !fields || fields.length === 0) {
      throw new Error('Title and fields are required for JSON schema generation');
    }

    const properties = {};
    const required = [];

    fields.forEach(field => {
      properties[field.name] = {
        type: this.mapToJsonSchemaType(field.type),
        description: field.description || ''
      };

      if (field.required) {
        required.push(field.name);
      }
    });

    return {
      $schema: 'http://json-schema.org/draft-07/schema#',
      title,
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
      additionalProperties: false
    };
  }

  /**
   * Map ODCS types to Avro types
   * @private
   */
  static mapToAvroType(odcsType) {
    const typeMap = {
      'string': 'string',
      'integer': 'long',
      'number': 'double',
      'boolean': 'boolean',
      'date': 'string',
      'timestamp': 'long',
      'array': 'array',
      'object': 'record'
    };

    return typeMap[odcsType?.toLowerCase()] || 'string';
  }

  /**
   * Map ODCS types to JSON Schema types
   * @private
   */
  static mapToJsonSchemaType(odcsType) {
    const typeMap = {
      'string': 'string',
      'integer': 'integer',
      'number': 'number',
      'boolean': 'boolean',
      'date': 'string',
      'timestamp': 'integer',
      'array': 'array',
      'object': 'object'
    };

    return typeMap[odcsType?.toLowerCase()] || 'string';
  }

  /**
   * Generate OpenAPI schema
   * @param {String} title - API title
   * @param {Array} fields - Field definitions
   * @returns {Object} - OpenAPI schema
   */
  static generateOpenAPISchema(title, fields) {
    if (!title || !fields || fields.length === 0) {
      throw new Error('Title and fields are required for OpenAPI schema generation');
    }

    const properties = {};

    fields.forEach(field => {
      properties[field.name] = {
        type: this.mapToJsonSchemaType(field.type),
        description: field.description || ''
      };
    });

    return {
      openapi: '3.0.0',
      info: {
        title,
        version: '1.0.0'
      },
      paths: {},
      components: {
        schemas: {
          [title]: {
            type: 'object',
            properties
          }
        }
      }
    };
  }
}

module.exports = ApicurioRegistryService;
