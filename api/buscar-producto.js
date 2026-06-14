let cache = { productos: null, ts: 0 };
const CACHE_TTL = 60 * 60 * 1000; // 1 hora

async function getProductos() {
  if (cache.productos && (Date.now() - cache.ts) < CACHE_TTL) {
    return cache.productos;
  }
  const blobUrl = process.env.PRODUCTOS_BLOB_URL;
  if (!blobUrl) throw new Error('Falta PRODUCTOS_BLOB_URL en variables de entorno');
  const res = await fetch(blobUrl);
  if (!res.ok) throw new Error('No se pudo leer el blob de productos');
  const data = await res.json();
  cache.productos = data.productos || [];
  cache.ts = Date.now();
  return cache.productos;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Parámetro q requerido (mínimo 2 caracteres)' });
  }

  try {
    const productos = await getProductos();
    const busqueda = q.trim().toLowerCase();

    // Primero: match exacto por código de barras
    const porBarcode = productos.filter(p =>
      (p.barcodes || []).some(b => b === busqueda)
    );
    if (porBarcode.length > 0) {
      return res.json({ resultados: porBarcode, modo: 'barcode' });
    }

    // Segundo: búsqueda por nombre
    const porNombre = productos
      .filter(p => p.nombre.toLowerCase().includes(busqueda))
      .slice(0, 10);

    return res.json({ resultados: porNombre, modo: 'nombre' });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
