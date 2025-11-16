// api/_helpers.js
const GITHUB_API = 'https://api.github.com';
const owner = process.env.GITHUB_OWNER;
const repo = process.env.GITHUB_REPO;
const token = process.env.GITHUB_TOKEN;
const adminSecret = process.env.ADMIN_SECRET || 'admin-secret';

async function getFileContent(path){
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
  const res = await fetch(url, {
    headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3.raw' }
  });
  if(res.status === 404) return null;
  if(!res.ok) throw new Error('GitHub get file failed: ' + res.status);
  return await res.text();
}

async function updateFile(path, content, message){
  const metaRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, {
    headers:{ Authorization:`token ${token}`, Accept:'application/vnd.github.v3+json' }
  });
  let sha = null;
  if(metaRes.ok){
    const j = await metaRes.json();
    sha = j.sha;
  }
  const body = { message: message || `Update ${path}`, content: Buffer.from(content).toString('base64') };
  if(sha) body.sha = sha;
  const putRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, {
    method:'PUT',
    headers:{ Authorization:`token ${token}`, 'Content-Type':'application/json' },
    body: JSON.stringify(body)
  });
  if(!putRes.ok){
    const txt = await putRes.text();
    throw new Error('GitHub update failed: ' + putRes.status + ' ' + txt);
  }
  return await putRes.json();
}

module.exports = { getFileContent, updateFile, adminSecret };
