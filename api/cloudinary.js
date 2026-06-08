const CLOUD_NAME = 'dxk7cvync';
const API_KEY = '454258782632147';
const API_SECRET = 'VlsmKY4HRUYfCqCHylbRFJ5M9Nk';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Parsear body manualmente
    let rawBody = '';
    for await (const chunk of req) {
      rawBody += chunk.toString();
    }
    let parsed;
    try {
      parsed = JSON.parse(rawBody);
    } catch(e) {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }

    const file = parsed.file;
    if (!file) return res.status(400).json({ error: 'No file' });

    const crypto = await import('crypto');
    const timestamp = Math.round(Date.now() / 1000);
    const folder = 'casanoa';
    const sigStr = `folder=${folder}&timestamp=${timestamp}${API_SECRET}`;
    const signature = crypto.default.createHash('sha1').update(sigStr).digest('hex');

    const body = new URLSearchParams({
      file,
      api_key: API_KEY,
      timestamp: String(timestamp),
      signature,
      folder
    });

    const resp = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const data = await resp.json();
    if (data.secure_url) return res.status(200).json({ secure_url: data.secure_url });
    return res.status(500).json({ error: data.error?.message || 'Upload failed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
