const { test } = require('node:test');
const assert = require('node:assert/strict');
const { explainResults } = require('../src/ai/explainResults');
test('Gemini sends structured request and preserves frontend response fields', async () => {
  const originalKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'mock-key';
  try {
    const result = await explainResults({ designScore: 80 }, {}, async (url, options) => {
      assert.match(url, /generativelanguage.googleapis.com/);
      assert.equal(options.headers['x-goog-api-key'], 'mock-key');
      const body = JSON.parse(options.body);
      assert.equal(body.generationConfig.responseMimeType, 'application/json');
      return { ok: true, json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ thought: true, text: 'private' }, { text: JSON.stringify({ summary: 'Button differs.', recommendations: ['Increase font size.'] }) }] } }] }) };
    });
    assert.equal(result.aiStatus, 'completed');
    assert.equal(result.aiSummary, 'Button differs.');
    assert.equal((await explainResults({}, {}, async () => ({ ok: false, status: 429 }))).aiStatus, 'unavailable');
    const invalid = await explainResults({}, {}, async () => ({ ok: true, json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"summary":4}' }] } }] }) }));
    assert.equal(invalid.aiStatus, 'unavailable');
    const truncated = await explainResults({}, {}, async () => ({ ok: true, json: async () => ({ candidates: [{ finishReason: 'MAX_TOKENS' }] }) }));
    assert.equal(truncated.aiStatus, 'unavailable');
    delete process.env.GEMINI_API_KEY;
    const missing = await explainResults({}, {}, () => { throw new Error('Must not call API'); });
    assert.match(missing.aiError, /GEMINI_API_KEY/);
  } finally {
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
  }
});
