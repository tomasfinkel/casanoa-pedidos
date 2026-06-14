const DUX_TOKEN = 'X428RuMPK9sh9i03QtiNhHrRfLdR5OoIlM5xWOXQAfmVPwGWcBWic4NmCAVLEDlu';
const DUX_BASE = 'https://erp.duxsoftware.com.ar/WSERP/rest/services';

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
    // PASO 0: si no hay bin configurado, crear uno nuevo automáticamente
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
      const nuevoId = data.metadata?.id;
      return res.json({
        mensaje: 'Bin creado. Agregá esta variable en Vercel y volvé a correr el sync.',
        PRODUCTOS_BIN_ID: nuevoId
      });
    }

    const BIN_ID = process.env.PRODUCTOS_BIN_ID;

    // PASO 1: buscar "lista nueva"
    const listas = await duxGet('/listaprecioventa');

    if (req.query.debug === 'listas') {
      return res.json({ listas });
    }

    const listaNueva = listas.find(l => {
      const nombre = (l.nombre || l.descripcion || l.detalle || '').toLowerCase();
      return nombre.includes('nueva');
    });

    if (!listaNueva) {
      return res.status(404).json({
        error: 'No se encontró "lista nueva".',
        listas
      });
    }

    const idListaPrecio = listaNueva.id || listaNueva.idListaPrecio || listaNueva.idLista;

    // PASO 2: traer todos los productos
    let offset = 0;
    const limit = 50;
    let todos = [];

    while (true) {
      const data = await duxGet(
        `/items?idListaPrecio=${idListaPrecio}&habilitado=SI&offset=${offset}&limit=${limit}`
      );

      if (req.query.debug === 'items' && offset === 0) {
        return res.json({ idListaPrecio, muestra: data });
      }

      const items = Array.isArray(data) ? data : (data.items || data.data || data.result || []);
      if (items.length === 0) break;
      todos = todos.concat(items);
      if (items.length < limit) break;
      offset += limit;
    }

    // PASO 3: mapear campos
    const productos = todos.map(p => ({
      codigo: p.codigoItem || p.codigo || p.id || '',
      nombre: p.descripcion || p.nombre || p.producto || p.detalle || '',
      precio: p.precio || p.precioVenta || p.importe || p.precioUnitario || 0,
      barcode: p.codigoBarra || p.codigoBarras || p.codigoEan || p.ean || p.barcode || ''
    }));

    // PASO 4: guardar en JSONBin
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
