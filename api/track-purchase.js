// Vercel Serverless Function — envia o evento Purchase para a Meta Conversions API (CAPI)
// Verifica o pedido no PayPal antes de disparar (só conta venda real, com o valor certo).
// O token da CAPI vem da variável de ambiente META_CAPI_TOKEN (nunca no código público).

const crypto = require('crypto');

const BASE = (process.env.PAYPAL_ENV === 'live')
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

const PIXEL_ID = '28430107519910255';
const GRAPH = 'https://graph.facebook.com/v21.0';

async function paypalToken() {
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

function sha256(v) {
  return crypto.createHash('sha256').update(String(v).trim().toLowerCase()).digest('hex');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  try {
    const token = process.env.META_CAPI_TOKEN;
    if (!token) { res.status(200).json({ skipped: 'META_CAPI_TOKEN não configurado' }); return; }

    const b = req.body || {};
    const orderID = b.orderID;
    if (!orderID) { res.status(400).json({ error: 'orderID ausente' }); return; }

    // 1) Verifica o pedido no PayPal (segurança: só dispara venda real e usa o valor verdadeiro)
    const at = await paypalToken();
    const r = await fetch(BASE + '/v2/checkout/orders/' + orderID, { headers: { 'Authorization': 'Bearer ' + at } });
    const order = await r.json();
    const pu = order.purchase_units && order.purchase_units[0];
    const cap = pu && pu.payments && pu.payments.captures && pu.payments.captures[0];
    const completed = order.status === 'COMPLETED' || (cap && cap.status === 'COMPLETED');
    if (!completed) { res.status(200).json({ skipped: 'pedido não concluído', status: order.status }); return; }

    const amount = (cap && cap.amount) || (pu && pu.amount) || {};
    const value = amount.value || b.value || '0';
    const currency = amount.currency_code || 'USD';

    // 2) Monta os dados do usuário (o e-mail vai com hash, como a Meta exige)
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    const ua = req.headers['user-agent'] || '';
    const user_data = {};
    if (ip) user_data.client_ip_address = ip;
    if (ua) user_data.client_user_agent = ua;
    if (b.email) user_data.em = [sha256(b.email)];
    if (b.fbp) user_data.fbp = b.fbp;
    if (b.fbc) user_data.fbc = b.fbc;

    const payload = {
      data: [{
        event_name: 'Purchase',
        event_time: Math.floor(Date.now() / 1000),
        event_id: b.eventId || orderID,   // mesmo id do pixel do navegador → deduplica
        action_source: 'website',
        event_source_url: b.eventSourceUrl || '',
        user_data: user_data,
        custom_data: { currency: currency, value: String(value) }
      }]
    };

    // 3) Envia para a Meta
    const fbRes = await fetch(GRAPH + '/' + PIXEL_ID + '/events?access_token=' + encodeURIComponent(token), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    const fbData = await fbRes.json();
    res.status(200).json({ ok: true, meta: fbData });
  } catch (e) {
    // nunca quebra a página de obrigado por causa do tracking
    res.status(200).json({ error: e.message });
  }
};
