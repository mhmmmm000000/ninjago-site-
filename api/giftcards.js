// api/giftcards.js
const { readJson, writeJson, adminSecret } = require('./_helpers');

const GIFT_FILE = 'data/giftcards.json';
const CREDITS_FILE = 'data/store_credits.json';

function parseBody(req){
  return new Promise((resolve,reject)=>{
    let d=''; req.on('data',c=>d+=c); req.on('end',()=> {
      try { resolve(d ? JSON.parse(d) : {}); } catch(e){ reject(e); }
    });
  });
}

module.exports = async (req, res) => {
  try {
    // Admin: list or create
    if(req.method === 'GET'){
      const secret = req.headers['x-admin-secret'];
      if(secret !== adminSecret) return res.status(401).json({error:'unauthorized'});
      const list = await readJson(GIFT_FILE, []);
      return res.status(200).json(list);
    }

    if(req.method === 'POST'){
      const body = await parseBody(req);

      // Admin create: include x-admin-secret header
      const secret = req.headers['x-admin-secret'];
      if(secret === adminSecret && !body.action){
        // required fields: code (string), balance (number)
        if(!body.code || typeof body.balance !== 'number') return res.status(400).json({error:'code and numeric balance required'});
        const list = await readJson(GIFT_FILE, []);
        if(list.find(c=>c.code === body.code)) return res.status(409).json({error:'code exists'});
        const now = Date.now();
        list.push({ code: body.code, balance: Number(body.balance), created: now, note: body.note || '' });
        await writeJson(GIFT_FILE, list, `Create giftcard ${body.code}`);
        return res.status(201).json({ok:true, code: body.code});
      }

      // Public redemption: body.action === 'redeem'
      if(body.action === 'redeem'){
        if(!body.code) return res.status(400).json({error:'code required'});
        // amountRequested = amount user provided (optional). total = purchase total (optional)
        const amountRequested = Number(body.amount || 0);
        const total = Number(body.total || 0);
        const email = body.email ? String(body.email).toLowerCase() : null;

        const list = await readJson(GIFT_FILE, []);
        const idx = list.findIndex(c=> c.code === body.code);
        if(idx === -1) return res.status(404).json({error:'code not found'});

        const card = list[idx];
        if(card.balance <= 0) return res.status(400).json({error:'card has zero balance'});

        // compute how much to deduct:
        // if user gave amountRequested > 0 => attempt to deduct min(amountRequested, card.balance)
        // otherwise, try to cover 'total' up to card.balance
        let toDeduct = 0;
        if(amountRequested > 0){
          toDeduct = Math.min(amountRequested, card.balance);
        } else if(total > 0){
          toDeduct = Math.min(total, card.balance);
        } else {
          // no amount and no total -> redeem whole card balance (not recommended) -> cap to card.balance
          toDeduct = Math.min(card.balance, 0); // safer: prevent accidental full-deduct. require amount or total
          return res.status(400).json({error:'amount or total required'});
        }

        // Apply deduction
        card.balance = +(card.balance - toDeduct).toFixed(2);
        list[idx] = card;
        await writeJson(GIFT_FILE, list, `Redeem ${toDeduct} from ${card.code}`);

        // if user over-specified amount (e.g., requested > total), give back credit to email store_credits
        // compute if user requested more than total (i.e., toDeduct > total)
        let creditGiven = 0;
        if(total > 0 && toDeduct > total){
          creditGiven = +(toDeduct - total).toFixed(2);
          // if email provided, persist to store_credits.json
          if(email){
            const sc = await readJson(CREDITS_FILE, {});
            sc[email] = +( (sc[email]||0) + creditGiven ).toFixed(2);
            await writeJson(CREDITS_FILE, sc, `Add store credit ${creditGiven} to ${email}`);
            // if credited to email, reduce the card balance was already deducted above
          } else {
            // no email — return leftover back to card balance to avoid losing money
            card.balance = +(card.balance + creditGiven).toFixed(2);
            list[idx] = card;
            await writeJson(GIFT_FILE, list, `Return leftover to ${card.code}`);
            creditGiven = 0;
          }
        }

        return res.status(200).json({
          ok:true,
          code: card.code,
          deducted: toDeduct,
          remainingBalance: card.balance,
          creditGiven
        });
      }

      return res.status(400).json({error:'unknown action or missing admin header'});
    }

    return res.status(405).json({error:'method not allowed'});
  } catch(e){
    console.error(e);
    return res.status(500).json({error: e.message || String(e)});
  }
};
