const { test } = require('node:test');
const assert = require('node:assert/strict');
const { cssFor, makeFixes, commitFixesFromCss } = require('../src/changes/fixes');
test('only supported concrete fixes become CSS', () => {
  const fixes = makeFixes({ matching: [{ designId: 'd', webpageId: 'w' }], designIssues: [
    { element: 'd', property: 'fontSize', expected: 18, actual: 12 },
    { element: 'd', property: 'x', expected: 5, actual: 3 }
  ] }, { elements: [{ id: 'w', selector: '#submit' }] });
  assert.equal(fixes.length, 1);
  assert.match(cssFor(fixes), /#submit \{ font-size: 18px !important; \}/);
  assert.throws(() => cssFor([{ selector: '#a', property: 'color', value: 'red; display:none' }]));
});
test('reviewed plan is immutable, rejects stale branch, commits atomically to a new branch', async () => {
  const originalFetch = global.fetch;
  let head = 'base', calls = [];
  global.fetch = async (url, options) => {
    const path = new URL(url).pathname;
    const body = options.body ? JSON.parse(options.body) : null;
    calls.push({ path, body });
    let data;
    if (path.includes('/git/ref/heads/')) data = { object: { sha: head } };
    else if (path.includes('/contents/')) data = { type: 'file', encoding: 'base64', content: Buffer.from("import App from './App';\n").toString('base64'), sha: 'file' };
    else if (path.endsWith('/git/commits/base')) data = { tree: { sha: 'tree0' } };
    else if (path.endsWith('/git/blobs')) data = { sha: 'blob' };
    else if (path.endsWith('/git/trees')) data = { sha: 'tree1' };
    else if (path.endsWith('/git/commits')) data = { sha: 'commit1' };
    else if (path.endsWith('/git/refs')) data = {};
    else throw new Error('Unexpected request ' + path);
    return { ok: true, status: 200, json: async () => data };
  };
  const express = require('express');
  const app = express(); app.use(express.json()); app.use(require('../src/changes/routes'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.on('listening', resolve));
  const address = `http://127.0.0.1:${server.address().port}`;
  const request = async (path, body, token = 'test-token') => {
    const r = await originalFetch(address + path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-GitHub-Token': token }, body: JSON.stringify(body) });
    return { status: r.status, data: await r.json() };
  };
  try {
    const planned = await request('/plan', { owner: 'demo', repo: 'app', branch: 'main', entryFile: 'src/main.jsx', websiteUrl: 'http://localhost:5173/', fixes: [{ selector: '#submit', property: 'font-size', value: '18px' }] });
    assert.equal(planned.status, 200);
    const plan = planned.data;
    assert.equal(plan.files[1].after, plan.css);
    assert.equal((await request('/commit', { planId: plan.id, confirm: true }, 'other')).status, 422);
    assert.equal((await request('/commit', { planId: plan.id })).status, 422);
    head = 'changed';
    assert.equal((await request('/commit', { planId: plan.id, confirm: true })).status, 422);
    head = 'base';
    const committed = await request('/commit', { planId: plan.id, confirm: true, files: [{ after: 'tampered' }] });
    assert.equal(committed.status, 200);
    assert.equal(committed.data.branch, 'parity/' + plan.id);
    assert.equal(calls.find(c => c.path.endsWith('/git/trees')).body.tree.length, 2);
    assert.ok(calls.some(c => c.path.endsWith('/git/blobs') && c.body.content === plan.css));
    assert.equal((await request('/commit', { planId: plan.id, confirm: true })).status, 422);
  } finally { global.fetch = originalFetch; await new Promise(resolve => server.close(resolve)); }
});
test('contrast uses unrounded ratio and rejects unsupported colors', () => {
  const { contrast } = require('../src/changes/contrast');
  assert.equal(contrast('#000000', '#ffffff').ratio, 21);
  assert.equal(contrast('#ffffff', '#ffffff').passesNormalText, false);
  assert.throws(() => contrast('transparent', '#ffffff'));
});


test('comparison CSS fixes convert directly into GitHub-ready fixes', () => {
  const fixes = commitFixesFromCss('#hero', {
    'font-family': 'Inter',
    'font-size': '18px',
    'font-weight': '600',
    color: '#112233',
    'background-color': '#ffffff',
    padding: '12px',
    gap: '8px',
    width: '320px',
    height: '48px',
    'border-radius': '10px'
  });

  assert.equal(fixes.length, 10);

  const css = cssFor(fixes);

  assert.match(css, /#hero \{ font-family: Inter !important; \}/);
  assert.match(css, /#hero \{ padding: 12px !important; \}/);
  assert.match(css, /#hero \{ gap: 8px !important; \}/);
  assert.match(css, /#hero \{ width: 320px !important; \}/);
  assert.match(css, /#hero \{ height: 48px !important; \}/);
});
