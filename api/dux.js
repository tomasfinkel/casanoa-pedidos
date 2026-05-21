const https = require('https');
const url = require('url');

module.exports = async function handler(req, res) {
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

  const baseUrl = 'https://erp.duxsoftware.com.ar/WSERP/rest/services/' + endpoint;
  const urlObj = new url.URL(baseUrl);
  Object.entries(params).forEach(([k, v]) => urlObj.searchParams.append(k, v));

  return new Promise((resolve) => {
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      }
    };

    const proxyReq = https.request(options, (proxyRes) => {
      let data = '';
      proxyRes.on('data', chunk => data += chunk);
      proxyRes.on('end', () => {
        try {
          const json = JSON.parse(data);
          res.status(proxyRes.statusCode).json(json);
        } catch(e) {
          res.status(500).json({ error: 'Parse error', raw: data.substring(0, 200) });
        }
        resolve();
      });
    });

    proxyReq.on('error', (e) => {
      res.status(500).json({ error: e.message });
      resolve();
    });

    proxyReq.end();
  });
};
