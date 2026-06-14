const DUX_TOKEN = 'X428RuMPK9sh9i03QtiNhHrRfLdR5OoIlM5xWOXQAfmVPwGWcBWic4NmCAVLEDlu';
const DUX_BASE = 'https://erp.duxsoftware.com.ar/WSERP/rest/services';
const ID_LISTA = 17610; // LISTA NUEVA activa

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

  try {
    // Sin bin: crear uno automáticamente
    if (!process.env.PRODUCTOS_BIN_ID) {
      const crear = await fetch('https://api.jsonbin.io/v3/b', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': JSONBIN_KEY,
          'X-Bin-Name': 'casanoa-productos'
        },
        body: JSON.stringify({ productos: [], syncedAt: null })
      });
      const data = await crear.json();
      return res.json({
        mensaje: 'Bin creado. Agregá PRODUCTOS_BIN_ID en Vercel y volvé a correr el sync.',
        PRODUCTOS_BIN_ID: data.metadata?.id
      });
    }

    const BIN_ID = process.env.PRODUCTOS_BIN_ID;

    // debug=items: muestra los primeros 2 productos crudos para ver los campos
    if (req.query.debug === 'items') {
      const muestra = await duxGet(`/items?idListaPrecio=${ID_LISTA}&habilitado=SI&offset=0&limit=2`);
      return res.json({ muestra });
    }

    // Traer todos los productos paginado
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

    // Mapear — ajustar una vez que veamos los campos reales con debug=items
    const productos = todos.map(p => ({
      codigo: p.codigoItem || p.codigo_item || p.codigo || p.id || '',
      nombre: p.descripcion || p.nombre || p.producto || p.detalle || '',
      precio: p.precio || p.precio_venta || p.precioVenta || p.importe || 0,
      barcode: p.codigoBarra || p.codigo_barra || p.codigoBarras || p.ean || p.barcode || ''
    }));

    // Guardar en JSONBin
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
