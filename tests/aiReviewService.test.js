const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('OpenAI integration', () => {
  it('loads the official OpenAI SDK', () => {
    const OpenAI = require('openai');
    assert.equal(typeof OpenAI, 'function');
  });
});
