module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { endpoint, ...params } = req.query;
  const token = req.headers['authorization'];
  if (!token || !endpoint) return res.status(400).json({ error: 'Faltan parametros' });

  const qs = new URLSearchParams(params).toString();
  const url = `https://erp.duxsoftware.com.ar/WSERP/rest/services/${endpoint}${qs ? '?' + qs : ''}`;

  try {
    const r = await fetch(url, { headers: { Authorization: token } });
    const text = await r.text();
    res.setHeader('Content-Type', 'application/json');
    res.status(r.status).send(text);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
