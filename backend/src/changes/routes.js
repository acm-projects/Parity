const express = require('express');
const { randomUUID, createHash } = require('node:crypto');
const { cssFor, patchStylesheet } = require('./fixes');
const { github, repoPath, readFile } = require('./github');
const router = express.Router();
const plans = new Map(); // Restarting the backend discards uncommitted plans.
const fingerprint = token => createHash('sha256').update(token).digest('hex');
const tokenFor = req => req.headers['x-github-token'];
const wrap = handler => async (req, res) => {
  try { await handler(req, res, tokenFor(req)); }
  catch (error) { res.status(422).json({ error: error.message }); }
};
router.get('/repositories', wrap(async (req, res, token) => {
  // Frontend follows pages until it receives fewer than 100 results.
  const page = Math.max(1, Number(req.query.page) || 1);
  const repos = await github(token, `/user/repos?per_page=100&page=${page}&sort=updated`);
  res.json(repos.map(r => ({ owner: r.owner.login, name: r.name, defaultBranch: r.default_branch, canPush: r.permissions?.push })));
}));
router.post('/files', wrap(async (req, res, token) => {
  const { owner, repo, branch } = req.body;
  const base = repoPath(owner, repo);
  const tree = await github(token, `${base}/git/trees/${encodeURIComponent(branch)}?recursive=1`);
  res.json({ truncated: tree.truncated, files: tree.tree.filter(f => f.type === 'blob' && /\.(css|jsx?|tsx?)$/.test(f.path)).map(f => f.path) });
}));
router.post('/plan', wrap(async (req, res, token) => {
  const { owner, repo, branch, entryFile, fixes, websiteUrl } = req.body;
  const base = repoPath(owner, repo);
  if (typeof branch !== 'string' || !branch) throw new Error('Select a branch');
  if (typeof websiteUrl !== 'string' || !/^https?:\/\//.test(websiteUrl)) throw new Error('Provide the inspected page URL');
  if (typeof entryFile !== 'string' || !/\.(jsx?|tsx?|css)$/.test(entryFile) || entryFile.split('/').some(p => !p || p === '.' || p === '..')) throw new Error('Select the app entry JS/TS file or the stylesheet to fix');
  const head = await github(token, `${base}/git/ref/heads/${encodeURIComponent(branch)}`);
  const original = await readFile(token, base, entryFile, head.object.sha);
  const id = randomUUID();
  let css;
  let files;
  if (entryFile.endsWith('.css')) {
    // Fix the stylesheet itself: delete each wrong line, or append an override.
    const patched = patchStylesheet(original.content, Array.isArray(fixes) ? fixes : []);
    if (!Array.isArray(fixes) || !fixes.length || fixes.length > 100) throw new Error('Select 1–100 fixes');
    css = [...patched.removed.map(l => `- ${l}`), ...patched.added.map(l => `+ ${l}`)].join('\n');
    const parts = [];
    if (patched.removed.length) parts.push(`removes ${patched.removed.length} wrong line${patched.removed.length === 1 ? '' : 's'}`);
    if (patched.added.length) parts.push(`adds ${patched.added.length} override${patched.added.length === 1 ? '' : 's'}`);
    files = [{ path: entryFile, before: original.content, after: patched.content, note: parts.join(' and ') }];
  } else {
    css = cssFor(fixes);
    const cssName = `parity-${id}.css`;
    const directory = entryFile.includes('/') ? entryFile.slice(0, entryFile.lastIndexOf('/') + 1) : '';
    // New file avoids overwriting the app's existing stylesheet.
    files = [{ path: entryFile, before: original.content,
      after: `import './${cssName}';\n` + original.content, note: 'adds one import line' },
      { path: directory + cssName, before: null, after: css, note: 'new file' }];
  }
  const plan = { id, owner, repo, branch, baseSha: head.object.sha, css, websiteUrl, files, fixCount: fixes.length,
    expiresAt: Date.now() + 30 * 60 * 1000, identity: fingerprint(token), state: 'ready' };
  for (const [key, old] of plans) if (old.expiresAt < Date.now() && old.state !== 'committing') plans.delete(key);
  if (plans.size >= 100) throw new Error('Too many pending plans; retry later');
  plans.set(id, plan);
  res.json({ ...plan, identity: undefined, state: undefined,
    warning: entryFile.endsWith('.css') ? 'Parity edits this stylesheet on a new branch. Review the lines it removes before committing.' : 'Preview is temporary. Select the correct app entry file and review both files. Positional selectors may break if the DOM differs from the inspected page. Accessibility must be checked separately.' });
}));
router.post('/commit', wrap(async (req, res, token) => {
  const plan = plans.get(req.body.planId);
  if (!plan || plan.expiresAt < Date.now()) throw new Error('Plan expired; prepare and review it again');
  if (plan.identity !== fingerprint(token || '')) throw new Error('Use the same GitHub authorization that prepared this plan');
  if (req.body.confirm !== true) throw new Error('Explicit confirmation is required');
  if (plan.state !== 'ready') throw new Error('Plan already submitted; check GitHub before retrying');
  const base = repoPath(plan.owner, plan.repo);
  const head = await github(token, `${base}/git/ref/heads/${encodeURIComponent(plan.branch)}`);
  if (head.object.sha !== plan.baseSha) throw new Error('Branch changed; prepare and review a new plan');
  plan.state = 'committing';
  try {
    const parent = await github(token, `${base}/git/commits/${plan.baseSha}`);
    const tree = [];
    for (const file of plan.files) {
      const blob = await github(token, `${base}/git/blobs`, 'POST', { content: file.after, encoding: 'utf-8' });
      tree.push({ path: file.path, mode: '100644', type: 'blob', sha: blob.sha });
    }
    const nextTree = await github(token, `${base}/git/trees`, 'POST', { base_tree: parent.tree.sha, tree });
    const commit = await github(token, `${base}/git/commits`, 'POST', {
      message: `Parity: ${plan.fixCount} design fix${plan.fixCount === 1 ? '' : 'es'} from the Figma comparison`, tree: nextTree.sha, parents: [plan.baseSha]
    });
    const newBranch = `parity/${plan.id}`;
    await github(token, `${base}/git/refs`, 'POST', { ref: `refs/heads/${newBranch}`, sha: commit.sha });
    plan.state = 'committed';
    res.json({ branch: newBranch, commitSha: commit.sha,
      url: `https://github.com/${plan.owner}/${plan.repo}/commit/${commit.sha}` });
  } catch (error) {
    // Network failures can occur after GitHub accepts a write; never blindly retry.
    plan.state = 'uncertain';
    throw new Error(`${error.message}. Check branch parity/${plan.id} on GitHub before preparing another commit.`);
  }
}));
module.exports = router;
