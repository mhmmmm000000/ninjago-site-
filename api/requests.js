// api/requests.js
const { getFileContent, updateFile, adminSecret } = require('./_helpers');

module.exports = async (req, res) => {
  try {
    if(req.method === 'GET'){
      const secret = req.headers['x-admin-secret'];
      if(secret !== adminSecret) return res.status(401).json({error:'unauthorized'});
      const content = await getFileContent('data/requests.json');
      return res.status(200).send(content || '[]');
    }

    if(req.method === 'POST'){
      const body = await new Promise(r=>{ let d=''; req.on('data',c=>d+=c); req.on('end',()=>r(JSON.parse(d))); });
      const current = JSON.parse(await getFileContent('data/requests.json') || '[]');
      current.push(body);
      await updateFile('data/requests.json', JSON.stringify(current, null, 2), `Add request ${body.id}`);
      return res.status(200).json({ok:true});
    }

    if(req.method === 'DELETE'){
      const secret = req.headers['x-admin-secret'];
      if(secret !== adminSecret) return res.status(401).json({error:'unauthorized'});
      const body = await new Promise(r=>{ let d=''; req.on('data',c=>d+=c); req.on('end',()=>r(JSON.parse(d))); });
      const current = JSON.parse(await getFileContent('data/requests.json') || '[]');
      const filtered = current.filter(r => r.id !== body.id);
      await updateFile('data/requests.json', JSON.stringify(filtered, null, 2), `Delete request ${body.id}`);
      return res.status(200).json({ok:true});
    }

    return res.status(405).json({error:'method not allowed'});
  } catch(e){
    console.error(e);
    return res.status(500).json({error:e.message});
  }
};
