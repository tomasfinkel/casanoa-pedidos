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

  try {
    // 1. Buscar "lista nueva" en las listas de precio
    const listas = await duxGet('/listaprecioventa');

    // debug=1 devuelve las listas para que podamos ver los nombres exactos
    if (req.query.debug === 'listas') {
      return res.json({ listas });
    }

    const listaNueva = listas.find(l => {
      const nombre = (l.nombre || l.descripcion || l.detalle || '').toLowerCase();
      return nombre.includes('nueva');
    });

    if (!listaNueva) {
      return res.status(404).json({
        error: 'No se encontró "lista nueva". Revisá los nombres exactos.',
        listas
      });
    }

    const idListaPrecio = listaNueva.id || listaNueva.idListaPrecio || listaNueva.idLista;

    // 2. Traer todos los productos paginado de a 50
    let offset = 0;
    const limit = 50;
    let todos = [];

    while (true) {
      const data = await duxGet(
        `/items?idListaPrecio=${idListaPrecio}&habilitado=SI&offset=${offset}&limit=${limit}`
      );

      // debug=1 devuelve el primer bloque crudo para ver los campos
      if (req.query.debug === 'items' && offset === 0) {
        return res.json({ idListaPrecio, muestra: data });
      }

      const items = Array.isArray(data) ? data : (data.items || data.data || data.result || []);
      if (items.length === 0) break;
      todos = todos.concat(items);
      if (items.length < limit) break;
      offset += limit;
    }

    // 3. Mapear los campos (ajustar según lo que devuelva debug=items)
    const productos = todos.map(p => ({
      codigo: p.codigoItem || p.codigo || p.id || '',
      nombre: p.descripcion || p.nombre || p.producto || p.detalle || '',
      precio: p.precio || p.precioVenta || p.importe || p.precioUnitario || 0,
      barcode: p.codigoBarra || p.codigoBarras || p.codigoEan || p.ean || p.barcode || ''
    }));

    // 4. Guardar en JSONBin
    const JSONBIN_KEY = process.env.JSONBIN_KEY;
    const BIN_ID = process.env.PRODUCTOS_BIN_ID;

    if (!JSONBIN_KEY || !BIN_ID) {
      // Sin bin configurado, devolver los productos igual (útil para debug)
      return res.json({
        ok: true,
        total: productos.length,
        advertencia: 'Sin JSONBIN_KEY o PRODUCTOS_BIN_ID configurados. Agregá esas env vars en Vercel.',
        muestra: productos.slice(0, 3)
      });
    }

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
