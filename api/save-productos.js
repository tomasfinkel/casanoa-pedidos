import { put } from '@vercel/blob';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { productos } = req.body;
    if (!productos || !Array.isArray(productos)) {
      return res.status(400).json({ error: 'Body debe tener {productos: [...]}' });
    }

    const payload = JSON.stringify({
      syncedAt: new Date().toISOString(),
      total: productos.length,
      productos
    });

    const blob = await put('productos.json', payload, {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      token: process.env.BLOB_READ_WRITE_TOKEN
    });

    return res.json({ ok: true, total: productos.length, blobUrl: blob.url });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
