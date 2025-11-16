// api/fetch-image.js (Node 18+ on Vercel)
module.exports = async (req, res) => {
  try {
    const { url } = req.method === 'GET' ? req.query : (await req.json());
    if(!url) return res.status(400).json({ error: 'url required' });
    const fetchRes = await fetch(url, { headers: { 'User-Agent':'Mozilla/5.0' }});
    if(!fetchRes.ok) return res.status(502).json({ error:'fetch failed' });
    const text = await fetchRes.text();
    const m = text.match(/<meta\\s+property=["']og:image["']\\s+content=["']([^"']+)["']/i) || text.match(/<meta\\s+name=["']twitter:image["']\\s+content=["']([^"']+)["']/i);
    if(m && m[1]) return res.status(200).json({ image: m[1] });
    return res.status(404).json({ error:'image meta not found' });
  } catch(e){
    return res.status(500).json({ error: String(e) });
  }
};
