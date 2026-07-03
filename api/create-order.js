// Vercel Serverless Function — cria um pedido no PayPal
// Preço é definido AQUI no servidor (nunca confie no valor vindo do navegador).

const BASE = (process.env.PAYPAL_ENV === 'live')
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

// Pacotes e preços oficiais (mesmos da página)
const PACOTES = {
  '2': { nome: 'NeuroMind Pro - 2 Bottles', total: '167.99' },
  '3': { nome: 'NeuroMind Pro - 3 Bottles', total: '207.00' },
  '6': { nome: 'NeuroMind Pro - 6 Bottles', total: '294.00' }
};

async function getToken() {
  const auth = Buffer.from(process.env.PAYPAL_CLIENT_ID + ':' + process.env.PAYPAL_SECRET).toString('base64');
  const r = await fetch(BASE + '/v1/oauth2/token', {
    method: 'POST',
    headers: { 'Authorization': 'Basic ' + auth, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials'
  });
  const d = await r.json();
  if (!d.access_token) throw new Error('Falha ao autenticar no PayPal');
  return d.access_token;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  try {
    const pkg = (req.body && req.body.pkg) || '3';
    const item = PACOTES[pkg] || PACOTES['3'];
    const token = await getToken();

    const r = await fetch(BASE + '/v2/checkout/orders', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          description: item.nome,
          amount: { currency_code: 'USD', value: item.total }
        }]
      })
    });
    const order = await r.json();
    if (!order.id) { res.status(500).json({ error: 'Falha ao criar pedido', detail: order }); return; }
    res.status(200).json({ id: order.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
