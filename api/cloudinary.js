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
    const timestamp = Math.round(Date.now() / 1000);
    const folder = 'casanoa';

    // Generate signature
    const crypto = await import('crypto');
    const sigStr = `folder=${folder}&timestamp=${timestamp}${API_SECRET}`;
    const signature = crypto.createHash('sha1').update(sigStr).digest('hex');

    // Get file from request body
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    // Parse multipart form - find the file part
    const boundary = req.headers['content-type'].split('boundary=')[1];
    if (!boundary) return res.status(400).json({ error: 'No boundary' });

    // Re-send to Cloudinary with signed params
    const FormData = (await import('form-data')).default;
    const form = new FormData();

    // Extract file from buffer
    const boundaryBuf = Buffer.from('--' + boundary);
    const parts = [];
    let start = 0;
    for (let i = 0; i < buffer.length; i++) {
      if (buffer.slice(i, i + boundaryBuf.length).equals(boundaryBuf)) {
        if (start > 0) parts.push(buffer.slice(start, i - 2));
        start = i + boundaryBuf.length + 2;
      }
    }

    let fileBuffer = null, fileName = 'foto.jpg', mimeType = 'image/jpeg';
    for (const part of parts) {
      const headerEnd = part.indexOf('\r\n\r\n');
      if (headerEnd === -1) continue;
      const headers = part.slice(0, headerEnd).toString();
      const body = part.slice(headerEnd + 4);
      if (headers.includes('name="file"')) {
        const nameMatch = headers.match(/filename="([^"]+)"/);
        if (nameMatch) fileName = nameMatch[1];
        const mimeMatch = headers.match(/Content-Type: ([^\r\n]+)/);
        if (mimeMatch) mimeType = mimeMatch[1].trim();
        fileBuffer = body;
      }
    }

    if (!fileBuffer) return res.status(400).json({ error: 'No file found' });

    form.append('file', fileBuffer, { filename: fileName, contentType: mimeType });
    form.append('api_key', API_KEY);
    form.append('timestamp', String(timestamp));
    form.append('signature', signature);
    form.append('folder', folder);

    const uploadResp = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: 'POST', body: form, headers: form.getHeaders() }
    );
    const data = await uploadResp.json();

    if (data.secure_url) {
      return res.status(200).json({ secure_url: data.secure_url });
    } else {
      return res.status(500).json({ error: data.error?.message || 'Upload failed' });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
