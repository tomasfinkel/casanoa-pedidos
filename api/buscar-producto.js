export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Parámetro q requerido (mínimo 2 caracteres)' });
  }

  const JSONBIN_KEY = process.env.JSONBIN_KEY;
  const BIN_ID = process.env.PRODUCTOS_BIN_ID;

  if (!JSONBIN_KEY || !BIN_ID) {
    return res.status(500).json({ error: 'JSONBIN_KEY o PRODUCTOS_BIN_ID no configurados' });
  }

  try {
    const binRes = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
      headers: { 'X-Master-Key': JSONBIN_KEY }
    });

    if (!binRes.ok) throw new Error(`JSONBin error: ${binRes.status}`);

    const { record } = await binRes.json();
    const productos = record.productos || [];
    const busqueda = q.trim().toLowerCase();

    // Primero: match exacto por código de barras
    const porBarcode = productos.filter(p => p.barcode === busqueda);
    if (porBarcode.length > 0) {
      return res.json({ resultados: porBarcode, modo: 'barcode', syncedAt: record.syncedAt });
    }

    // Segundo: búsqueda por nombre (contiene la búsqueda)
    const porNombre = productos
      .filter(p => p.nombre.toLowerCase().includes(busqueda))
      .slice(0, 10);

    return res.json({ resultados: porNombre, modo: 'nombre', syncedAt: record.syncedAt });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
