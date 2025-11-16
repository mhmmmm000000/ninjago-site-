// api/orders.js
const { getFileContent, updateFile, adminSecret } = require('./_helpers');

module.exports = async (req, res) => {
  try {
    if(req.method === 'GET'){
      const secret = req.headers['x-admin-secret'];
      if(secret !== adminSecret) return res.status(401).json({error:'unauthorized'});
      const content = await getFileContent('data/orders.json');
      return res.status(200).send(content || '[]');
    }

    if(req.method === 'POST'){
      const body = await new Promise(r=>{ let d=''; req.on('data',c=>d+=c); req.on('end',()=>r(JSON.parse(d))); });
      const existing = JSON.parse(await getFileContent('data/orders.json') || '[]');
      existing.push(body);
      await updateFile('data/orders.json', JSON.stringify(existing, null, 2), `Add order ${body.id}`);
      return res.status(200).json({ok:true});
    }

    if(req.method === 'PUT'){
      const secret = req.headers['x-admin-secret'];
      if(secret !== adminSecret) return res.status(401).json({error:'unauthorized'});
      const body = await new Promise(r=>{ let d=''; req.on('data',c=>d+=c); req.on('end',()=>r(JSON.parse(d))); });
      const current = JSON.parse(await getFileContent('data/orders.json') || '[]');
      const updated = current.map(o => o.id === body.id ? body : o);
      await updateFile('data/orders.json', JSON.stringify(updated, null, 2), `Update order ${body.id}`);
      return res.status(200).json({ok:true});
    }

    if(req.method === 'DELETE'){
      const secret = req.headers['x-admin-secret'];
      if(secret !== adminSecret) return res.status(401).json({error:'unauthorized'});
      const body = await new Promise(r=>{ let d=''; req.on('data',c=>d+=c); req.on('end',()=>r(JSON.parse(d))); });
      const current = JSON.parse(await getFileContent('data/orders.json') || '[]');
      const filtered = current.filter(o => o.id !== body.id);
      await updateFile('data/orders.json', JSON.stringify(filtered, null, 2), `Delete order ${body.id}`);
      return res.status(200).json({ok:true});
    }

    return res.status(405).json({error:'method not allowed'});
  } catch(e){
    console.error(e);
    return res.status(500).json({error:e.message});
  }
};
