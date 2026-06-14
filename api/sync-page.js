const DUX_TOKEN = 'X428RuMPK9sh9i03QtiNhHrRfLdR5OoIlM5xWOXQAfmVPwGWcBWic4NmCAVLEDlu';
const DUX_BASE = 'https://erp.duxsoftware.com.ar/WSERP/rest/services';
const ID_LISTA = 17610;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const offset = parseInt(req.query.offset || '0');
  const limit = 50;

  try {
    const r = await fetch(
      `${DUX_BASE}/items?idListaPrecio=${ID_LISTA}&habilitado=SI&offset=${offset}&limit=${limit}`,
      { headers: { 'Authorization': DUX_TOKEN } }
    );
    if (!res.ok && r.status === 429) {
      return res.status(429).json({ error: 'rate_limit' });
    }
    const data = await r.json();
    const items = data.results || [];
    const total = data.paging?.total || 0;

    const productos = items.map(p => {
      const precioObj = (p.precios || []).find(pr => pr.id === ID_LISTA);
      const barcodes = (p.codigos_barra || []).filter(b => b && b !== '0000' && b.length > 4);
      return {
        codigo: p.cod_item || '',
        nombre: p.item || '',
        precio: precioObj ? parseFloat(precioObj.precio) : 0,
        barcodes
      };
    });

    return res.json({
      productos,
      offset,
      limit,
      total,
      done: offset + items.length >= total || items.length < limit,
      nextOffset: offset + items.length
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
