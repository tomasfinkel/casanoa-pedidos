const BIN_ID = '6a20e685f5f4af5e29b5b47a';
const API_KEY = '$2a$10$c4DprYYrd.CCeWO7lTNNd.xICex34hdCPq6xfxR/P1jdNlyQBlPfq';
const BIN_URL = 'https://api.jsonbin.io/v3/b/' + BIN_ID;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const resp = await fetch(BIN_URL + '/latest', {
        headers: { 'X-Master-Key': API_KEY }
      });
      const data = await resp.json();
      return res.status(200).json(data.record || { registros: [], provNums: {} });
    }

    if (req.method === 'PUT') {
      const resp = await fetch(BIN_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Master-Key': API_KEY },
        body: JSON.stringify(req.body)
      });
      const data = await resp.json();
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
