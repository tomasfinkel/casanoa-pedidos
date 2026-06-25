const DUX_TOKEN = 'X428RuMPK9sh9i03QtiNhHrRfLdR5OoIlM5xWOXQAfmVPwGWcBWic4NmCAVLEDlu';
const DUX_BASE = 'https://erp.duxsoftware.com.ar/WSERP/rest/services';
const ID_LISTA = 17610;
let cache = { productos: null, ts: 0 };
const CACHE_TTL = 12 * 60 * 60 * 1000;
async function getProductos() {
  if (cache.productos && (Date.now() - cache.ts) < CACHE_TTL) return cache.productos;
  const blobUrl = process.env.PRODUCTOS_BLOB_URL;
  if (!blobUrl) throw new Error('Falta PRODUCTOS_BLOB_URL');
  const res = await fetch(blobUrl, {
    headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` }
  });
  if (!res.ok) throw new Error('No se pudo leer el blob: ' + res.status);
  const data = await res.json();
  cache.productos = data.productos || [];
  cache.ts = Date.now();
  return cache.productos;
}
async function getPrecioRealtime(codItem) {
  try {
    const url = `${DUX_BASE}/items?codigoItem=${codItem}&idListaPrecio=${ID_LISTA}&limit=1`;
    const r = await fetch(url, { headers: { Authorization: DUX_TOKEN } });
    if (!r.ok) {
      console.error('[precio-realtime] DUX respondio', r.status, 'para codigo', codItem, 'url:', url);
      return null;
    }
    const data = await r.json();
    const item = (data.results || [])[0];
    if (!item) {
      console.error('[precio-realtime] DUX no devolvio resultados para codigo', codItem, '- filtro codigoItem probablemente no es el parametro correcto');
      return null;
    }
    // Verificacion de seguridad: el item que volvio realmente es el que pedimos?
    // Si DUX ignoro el filtro codigoItem y devolvio "cualquier" item, esto lo detecta.
    if (String(item.cod_item || '').trim() !== String(codItem).trim()) {
      console.error('[precio-realtime] MISMATCH: pedi codigo', codItem, 'pero DUX devolvio', item.cod_item, '- el filtro codigoItem no esta funcionando como se espera');
      return null;
    }
    const precioObj = (item.precios || []).find(p => p.id === ID_LISTA);
    if (!precioObj) {
      console.error('[precio-realtime] item', codItem, 'encontrado pero sin precio para lista', ID_LISTA, '- precios disponibles:', JSON.stringify(item.precios));
      return null;
    }
    return parseFloat(precioObj.precio);
  } catch (e) {
    console.error('[precio-realtime] excepcion para codigo', codItem, ':', e.message);
    return null;
  }
}
const norm = t => t.toLowerCase().replace(/[-–—]/g, ' ').replace(/\s+/g, ' ').trim();
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Parámetro q requerido (mínimo 2 caracteres)' });
  }
  try {
    const productos = await getProductos();
    const busqueda = q.trim().toLowerCase();
    // Barcode: precio en tiempo real
    const porBarcode = productos.filter(p =>
      (p.barcodes || []).some(b => b === busqueda)
    );
    if (porBarcode.length > 0) {
      const producto = { ...porBarcode[0] };
      const precioLive = await getPrecioRealtime(producto.codigo);
      if (precioLive !== null) producto.precio = precioLive;
      return res.json({ resultados: [producto], modo: 'barcode', precioTiempoReal: precioLive !== null });
    }
    // Nombre: búsqueda flexible
    const palabras = norm(busqueda).split(' ').filter(Boolean);
    const matches = productos
      .filter(p => {
        const n = norm(p.nombre);
        return palabras.every(pal => n.includes(pal));
      })
      .slice(0, 10);
    // Precio en tiempo real para todos los resultados en paralelo
    const conPrecios = await Promise.all(
      matches.map(async p => {
        const precioLive = await getPrecioRealtime(p.codigo);
        return { ...p, precio: precioLive !== null ? precioLive : p.precio, precioActualizado: precioLive !== null };
      })
    );
    const algunoActualizado = conPrecios.some(p => p.precioActualizado);
    return res.json({ resultados: conPrecios, modo: 'nombre', precioTiempoReal: algunoActualizado });
  } catch (err) {
    console.error('[buscar-producto] error general:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
