const DUX_TOKEN = 'X428RuMPK9sh9i03QtiNhHrRfLdR5OoIlM5xWOXQAfmVPwGWcBWic4NmCAVLEDlu';
const DUX_BASE = 'https://erp.duxsoftware.com.ar/WSERP/rest/services';
const ID_LISTA = 17610;

async function duxGet(path) {
  const res = await fetch(`${DUX_BASE}${path}`, {
    headers: { 'Authorization': DUX_TOKEN }
  });
  if (!res.ok) throw new Error(`DUX ${res.status}: ${path}`);
  return res.json();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const JSONBIN_KEY = process.env.JSONBIN_KEY;
  const BIN_ID = process.env.PRODUCTOS_BIN_ID;

  // Crear bin nuevo
  if (req.query.action === 'crear-bin') {
    const crear = await fetch('https://api.jsonbin.io/v3/b', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': JSONBIN_KEY,
        'X-Bin-Name': 'casanoa-productos'
      },
      body: JSON.stringify({ productos: [] })
    });
    const status = crear.status;
    const data = await crear.json();
    return res.json({ status, data });
  }

  if (!BIN_ID) {
    return res.json({ error: 'Falta PRODUCTOS_BIN_ID. Primero llamá a ?action=crear-bin' });
  }

  // Ver campos de productos crudos
  if (req.query.debug === 'items') {
    const muestra = await duxGet(`/items?idListaPrecio=${ID_LISTA}&habilitado=SI&offset=0&limit=2`);
    return res.json({ muestra });
  }

  // Sync completo
  try {
    let offset = 0;
    const limit = 50;
    let todos = [];

    while (true) {
      const data = await duxGet(
        `/items?idListaPrecio=${ID_LISTA}&habilitado=SI&offset=${offset}&limit=${limit}`
      );
      const items = Array.isArray(data) ? data : (data.items || data.data || data.result || []);
      if (items.length === 0) break;
      todos = todos.concat(items);
      if (items.length < limit) break;
      offset += limit;
    }

    const productos = todos.map(p => ({
      codigo: p.codigoItem || p.codigo_item || p.codigo || p.id || '',
      nombre: p.descripcion || p.nombre || p.producto || p.detalle || '',
      precio: p.precio || p.precio_venta || p.precioVenta || p.importe || 0,
      barcode: p.codigoBarra || p.codigo_barra || p.codigoBarras || p.ean || p.barcode || ''
    }));

    const binRes = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': JSONBIN_KEY
      },
      body: JSON.stringify({
        syncedAt: new Date().toISOString(),
        total: productos.length,
        productos
      })
    });

    if (!binRes.ok) {
      const txt = await binRes.text();
      return res.status(500).json({ error: 'JSONBin error', detalle: txt });
    }

    return res.json({ ok: true, total: productos.length, syncedAt: new Date().toISOString() });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
