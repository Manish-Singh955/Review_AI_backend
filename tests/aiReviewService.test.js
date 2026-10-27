const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('OpenAI integration', () => {
  it('loads the official OpenAI SDK', () => {
    const OpenAI = require('openai');
    assert.equal(typeof OpenAI, 'function');
  });
});

describe('template fallback', () => {
  const payload = {
    businessName: 'Cafe Uno',
    locationName: 'MG Road',
    rating: 5,
    experiences: ['Food', 'Staff'],
    customerComment: 'Loved the filter coffee',
    language: 'English',
  };

  it('builds drafts only from the customer input', () => {
    const { buildTemplateDrafts } = require('../services/aiReviewService');
    const drafts = buildTemplateDrafts(payload);

    assert.equal(drafts.length, 3);
    drafts.forEach((draft) => {
      assert.match(draft, /Cafe Uno - MG Road/);
      assert.match(draft, /Loved the filter coffee\./);
    });
    assert.match(drafts[0], /food and staff/);
  });

  it('returns template drafts instead of failing when the provider is unreachable', async () => {
    const previous = { ...process.env };
    process.env.OPENAI_API_KEY = 'sk-test';
    process.env.OPENAI_BASE_URL = 'http://127.0.0.1:9/v1';
    process.env.AI_TIMEOUT_MS = '2000';

    try {
      const { generateReviewSuggestions } = require('../services/aiReviewService');
      const result = await generateReviewSuggestions(payload);

      assert.equal(result.source, 'template');
      assert.equal(result.suggestions.length, 3);
    } finally {
      process.env = previous;
    }
  });
});

describe('toQueryString', () => {
  it('casts operator objects to plain strings', () => {
    const { toQueryString } = require('../utils/sanitize');

    assert.equal(toQueryString({ $ne: null }), '[object Object]');
    assert.equal(toQueryString(undefined), '');
    assert.equal(toQueryString('review_1'), 'review_1');
  });
});
