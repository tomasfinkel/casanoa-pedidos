import { put } from '@vercel/blob';

const DUX_TOKEN = 'X428RuMPK9sh9i03QtiNhHrRfLdR5OoIlM5xWOXQAfmVPwGWcBWic4NmCAVLEDlu';
const DUX_BASE = 'https://erp.duxsoftware.com.ar/WSERP/rest/services';
const ID_LISTA = 17610;

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function duxGet(path, intento = 0) {
  const res = await fetch(`${DUX_BASE}${path}`, {
    headers: { 'Authorization': DUX_TOKEN }
  });
  if (res.status === 429) {
    if (intento >= 4) throw new Error(`DUX 429 después de ${intento} reintentos: ${path}`);
    const espera = 1000 * Math.pow(2, intento); // 1s, 2s, 4s, 8s
    await sleep(espera);
    return duxGet(path, intento + 1);
  }
  if (!res.ok) throw new Error(`DUX ${res.status}: ${path}`);
  return res.json();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    let offset = 0;
    const limit = 50; // reducido para no sobrecargar DUX
    let todos = [];

    while (true) {
      const data = await duxGet(
        `/items?idListaPrecio=${ID_LISTA}&habilitado=SI&offset=${offset}&limit=${limit}`
      );
      const items = data.results || [];
      if (items.length === 0) break;
      todos = todos.concat(items);
      if (items.length < limit) break;
      offset += limit;
      await sleep(300); // pausa entre páginas
    }

    const productos = todos.map(p => {
      const precioObj = (p.precios || []).find(pr => pr.id === ID_LISTA);
      const barcodes = (p.codigos_barra || []).filter(b => b && b !== '0000' && b.length > 4);
      return {
        codigo: p.cod_item || '',
        nombre: p.item || '',
        precio: precioObj ? parseFloat(precioObj.precio) : 0,
        barcodes
      };
    });

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

    return res.json({
      ok: true,
      total: productos.length,
      syncedAt: new Date().toISOString(),
      blobUrl: blob.url,
      instruccion: 'Guardá blobUrl como PRODUCTOS_BLOB_URL en Vercel si es la primera vez'
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
