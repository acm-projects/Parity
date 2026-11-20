async function github(token, path, method = 'GET', body) {
  if (!token) throw new Error('GitHub authorization is required');
  const response = await fetch('https://api.github.com' + path, {
    method, headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) throw new Error(`GitHub request failed (${response.status})`);
  return response.status === 204 ? null : response.json();
}
function repoPath(owner, repo) {
  if (![owner,repo].every(v => typeof v === 'string' && /^[\w.-]+$/.test(v))) throw new Error('Invalid repository');
  return `/repos/${owner}/${repo}`;
}
async function readFile(token, base, path, ref) {
  const result = await github(token, `${base}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(ref)}`);
  if (result.type !== 'file' || result.encoding !== 'base64') throw new Error('Select a text file');
  return { content: Buffer.from(result.content, 'base64').toString('utf8'), sha: result.sha };
}
module.exports = { github, repoPath, readFile };
