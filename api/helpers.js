// api/_helpers.js
// Node CommonJS for Vercel serverless
const GITHUB_API = 'https://api.github.com';
const owner = process.env.GITHUB_OWNER;
const repo = process.env.GITHUB_REPO;
const token = process.env.GITHUB_TOKEN;
const adminSecret = process.env.ADMIN_SECRET || 'admin-secret';

if (!owner || !repo || !token) {
  console.warn('GITHUB_OWNER, GITHUB_REPO or GITHUB_TOKEN not set in env');
}

async function rawGet(path){
  // returns raw file content string or null
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
  const res = await fetch(url, {
    headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3.raw' }
  });
  if(res.status === 404) return null;
  if(!res.ok) throw new Error(`GitHub GET failed ${res.status}`);
  return await res.text();
}

async function metaGet(path){
  // returns parsed JSON metadata (including sha) or null
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
  const res = await fetch(url, {
    headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' }
  });
  if(res.status === 404) return null;
  if(!res.ok) throw new Error(`GitHub meta GET failed ${res.status}`);
  return await res.json();
}

async function updateFile(path, contentString, message){
  // Creates or updates the file at path with contentString (plain text). Returns GitHub response JSON.
  const meta = await metaGet(path);
  const body = {
    message: message || `Update ${path}`,
    content: Buffer.from(contentString).toString('base64'),
  };
  if(meta && meta.sha) body.sha = meta.sha;
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const txt = await res.text();
  if(!res.ok) throw new Error('GitHub update failed: ' + res.status + ' ' + txt);
  return JSON.parse(txt);
}

async function readJson(path, defaultValue = null){
  const raw = await rawGet(path);
  if(raw === null) return defaultValue;
  try { return JSON.parse(raw); } catch(e){ throw new Error('Invalid JSON at ' + path); }
}

async function writeJson(path, obj, message){
  const s = JSON.stringify(obj, null, 2);
  return await updateFile(path, s, message || `Update ${path}`);
}

module.exports = { rawGet, metaGet, updateFile, readJson, writeJson, adminSecret };
