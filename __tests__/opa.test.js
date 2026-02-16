const axios = require('axios');

describe('OPA Policy Engine', () => {
  const opaUrl = 'http://localhost:8181';

  it('should deny access by default', async () => {
    try {
      const response = await axios.post(`${opaUrl}/v1/data/governance/allow`, {
        input: {}
      });
      expect(response.status).toBe(200);
      expect(response.data.result).toBe(false);
    } catch (error) {
      console.error('Request failed:', error.message);
      throw error;
    }
  });

  it('should allow admin read access', async () => {
    const response = await axios.post(`${opaUrl}/v1/data/governance/allow`, {
      input: {
        action: 'read',
        role: 'admin'
      }
    });
    expect(response.status).toBe(200);
    expect(response.data.result).toBe(true);
  });

  it('should allow read with consent', async () => {
    const response = await axios.post(`${opaUrl}/v1/data/governance/allow`, {
      input: {
        action: 'read',
        consent_given: true
      }
    });
    expect(response.status).toBe(200);
    expect(response.data.result).toBe(true);
  });
});
