export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { endpoint, ...params } = req.query;
  const token = req.headers.authorization;
  
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  if (!endpoint) return res.status(400).json({ error: 'Endpoint requerido' });

  const url = new URL('https://erp.duxsoftware.com.ar/WSERP/rest/services/' + endpoint);
  Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));

  try {
    const resp = await fetch(url.toString(), {
      headers: { 'Authorization': token, 'Content-Type': 'application/json' }
    });
    const data = await resp.json();
    return res.status(resp.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
