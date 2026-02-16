// src/services/contract-validator.js
// ODCS v3.0.1 Validation Engine

const logger = require('../utils/logger');

class ContractValidator {
  /**
   * Validates a contract against ODCS v3.0.1 specification
   * @param {Object} contract - The contract object to validate
   * @returns {Object} - { valid: boolean, errors: [], warnings: [], contract: normalized }
   */
  static validate(contract) {
    const errors = [];
    const warnings = [];
    let normalizedContract = contract;

    // 1. Check root-level required fields
    if (!contract) {
      errors.push('Contract cannot be null or undefined');
      return { valid: false, errors, warnings, contract: null };
    }

    if (!contract.dataProductSpecification) {
      errors.push('Missing required field: dataProductSpecification (must be "1.0.0")');
    } else if (contract.dataProductSpecification !== '1.0.0') {
      errors.push(`Invalid dataProductSpecification version: ${contract.dataProductSpecification}. Must be "1.0.0"`);
    }

    // 2. Validate info object
    if (!contract.info) {
      errors.push('Missing required field: info');
    } else {
      const infoErrors = this.validateInfo(contract.info);
      errors.push(...infoErrors);
    }

    // 3. Validate models (schemas)
    if (!contract.models || !Array.isArray(contract.models)) {
      errors.push('Missing or invalid field: models (must be an array)');
    } else if (contract.models.length === 0) {
      warnings.push('Contract contains no models (empty models array)');
    } else {
      contract.models.forEach((model, index) => {
        const modelErrors = this.validateModel(model, index);
        errors.push(...modelErrors);
      });
    }

    // 4. Validate outputs if present
    if (contract.outputs) {
      if (!Array.isArray(contract.outputs)) {
        errors.push('Invalid field: outputs (must be an array if provided)');
      } else {
        contract.outputs.forEach((output, index) => {
          const outputErrors = this.validateOutput(output, index);
          errors.push(...outputErrors);
        });
      }
    }

    // 5. Sanitize and normalize
    normalizedContract = this.sanitizeContract(contract);

    const valid = errors.length === 0;
    return {
      valid,
      errors,
      warnings,
      contract: normalizedContract
    };
  }

  /**
   * Validates the info object
   * @private
   */
  static validateInfo(info) {
    const errors = [];

    if (!info.id || typeof info.id !== 'string') {
      errors.push('Missing or invalid field: info.id (must be a non-empty string)');
    }

    if (!info.title || typeof info.title !== 'string') {
      errors.push('Missing or invalid field: info.title (must be a non-empty string)');
    }

    if (!info.version || typeof info.version !== 'string') {
      errors.push('Missing or invalid field: info.version (must be a non-empty string)');
    }

    if (info.description && typeof info.description !== 'string') {
      errors.push('Invalid field: info.description (must be a string if provided)');
    }

    return errors;
  }

  /**
   * Validates a model (schema) object
   * @private
   */
  static validateModel(model, index) {
    const errors = [];
    const prefix = `models[${index}]`;

    if (!model.id || typeof model.id !== 'string') {
      errors.push(`${prefix}: Missing or invalid field: id (must be a non-empty string)`);
    }

    if (!model.name || typeof model.name !== 'string') {
      errors.push(`${prefix}: Missing or invalid field: name (must be a non-empty string)`);
    }

    if (!model.fields || !Array.isArray(model.fields)) {
      errors.push(`${prefix}: Missing or invalid field: fields (must be an array)`);
    } else if (model.fields.length === 0) {
      errors.push(`${prefix}: Model contains no fields (empty fields array)`);
    } else {
      model.fields.forEach((field, fieldIndex) => {
        const fieldErrors = this.validateField(field, fieldIndex, prefix);
        errors.push(...fieldErrors);
      });
    }

    return errors;
  }

  /**
   * Validates a field object
   * @private
   */
  static validateField(field, index, modelPrefix) {
    const errors = [];
    const prefix = `${modelPrefix}.fields[${index}]`;

    if (!field.name || typeof field.name !== 'string') {
      errors.push(`${prefix}: Missing or invalid field: name (must be a non-empty string)`);
    }

    if (!field.type || typeof field.type !== 'string') {
      errors.push(`${prefix}: Missing or invalid field: type (must be a non-empty string)`);
    } else {
      const validTypes = ['string', 'integer', 'number', 'boolean', 'array', 'object', 'null', 'date', 'timestamp'];
      if (!validTypes.includes(field.type.toLowerCase())) {
        errors.push(`${prefix}: Invalid type: ${field.type}. Supported types: ${validTypes.join(', ')}`);
      }
    }

    if (field.required && typeof field.required !== 'boolean') {
      errors.push(`${prefix}: Invalid field: required (must be boolean if provided)`);
    }

    if (field.description && typeof field.description !== 'string') {
      errors.push(`${prefix}: Invalid field: description (must be a string if provided)`);
    }

    return errors;
  }

  /**
   * Validates an output object
   * @private
   */
  static validateOutput(output, index) {
    const errors = [];
    const prefix = `outputs[${index}]`;

    if (!output.id || typeof output.id !== 'string') {
      errors.push(`${prefix}: Missing or invalid field: id (must be a non-empty string)`);
    }

    if (!output.name || typeof output.name !== 'string') {
      errors.push(`${prefix}: Missing or invalid field: name (must be a non-empty string)`);
    }

    if (!output.modelId || typeof output.modelId !== 'string') {
      errors.push(`${prefix}: Missing or invalid field: modelId (must be a non-empty string)`);
    }

    return errors;
  }

  /**
   * Sanitizes and normalizes the contract
   * @private
   */
  static sanitizeContract(contract) {
    const sanitized = {
      dataProductSpecification: contract.dataProductSpecification || '1.0.0',
      info: {
        id: (contract.info?.id || '').trim(),
        title: (contract.info?.title || '').trim(),
        version: (contract.info?.version || '').trim(),
        description: (contract.info?.description || '').trim() || null
      },
      models: contract.models?.map(model => ({
        id: (model.id || '').trim(),
        name: (model.name || '').trim(),
        description: (model.description || '').trim() || null,
        fields: model.fields?.map(field => ({
          name: (field.name || '').trim(),
          type: (field.type || 'string').toLowerCase(),
          required: field.required ?? false,
          description: (field.description || '').trim() || null,
          constraints: field.constraints || null
        })) || []
      })) || [],
      outputs: contract.outputs?.map(output => ({
        id: (output.id || '').trim(),
        name: (output.name || '').trim(),
        modelId: (output.modelId || '').trim(),
        description: (output.description || '').trim() || null
      })) || []
    };

    return sanitized;
  }

  /**
   * Extracts schema information from contract
   * @param {Object} contract - Validated contract
   * @returns {Array} - Array of schema objects
   */
  static extractSchemas(contract) {
    if (!contract || !contract.models) {
      return [];
    }

    return contract.models.map(model => ({
      modelId: model.id,
      modelName: model.name,
      description: model.description,
      fields: model.fields,
      fieldCount: model.fields?.length || 0,
      requiredFields: model.fields?.filter(f => f.required)?.map(f => f.name) || []
    }));
  }

  /**
   * Generates artifact ID for registry
   * @param {Object} contract - Contract object
   * @returns {String} - Generated artifact ID
   */
  static generateArtifactId(contract) {
    if (!contract?.info?.id) {
      throw new Error('Cannot generate artifact ID: missing contract.info.id');
    }

    // Convert URN or ID to artifact-safe format
    const id = contract.info.id
      .replace(/[^a-z0-9-]/gi, '-')
      .toLowerCase()
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    return `${id}-v${contract.info.version?.replace(/\./g, '-') || '1-0-0'}`;
  }

  /**
   * Logs validation result
   * @private
   */
  static logValidation(contractId, valid, errors, warnings) {
    if (valid) {
      logger.info(`Contract ${contractId} validation successful`);
    } else {
      logger.error(`Contract ${contractId} validation failed:`, errors);
    }

    if (warnings.length > 0) {
      logger.warn(`Validation warnings for ${contractId}:`, warnings);
    }
  }
}

module.exports = ContractValidator;
