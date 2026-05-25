// api/cron.js - Resumen diario 9am Argentina
const ID_EMPRESA = '3709';
const ID_SUC_CASTEX = '2';
const ID_SUC_SIRIA = '4';
const ID_DEP_CASTEX = '7301';
const ID_DEP_SIRIA = '15932';
const DIAS_VENTAS = 5;
const DIAS_COBERTURA = 15;
const BASE = 'https://erp.duxsoftware.com.ar/WSERP/rest/services';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function duxFetch(path, token) {
  await sleep(3500);
  const r = await fetch(`${BASE}/${path}`, {
    headers: { Authorization: token, 'Content-Type': 'application/json' }
  });
  const t = await r.text();
  if (t.includes('alcanz')) { await sleep(8000); return duxFetch(path, token); }
  try { return JSON.parse(t); } catch { return null; }
}

async function getVentasSucursal(idSucursal, token) {
  const hoy = new Date();
  const desde = new Date(hoy); desde.setDate(hoy.getDate() - DIAS_VENTAS);
  const fmt = d => d.toISOString().split('T')[0];
  const ventas = {};
  let offset = 0;
  while (true) {
    const d = await duxFetch(`facturas?fechaDesde=${fmt(desde)}&fechaHasta=${fmt(hoy)}&idEmpresa=${ID_EMPRESA}&idSucursal=${idSucursal}&offset=${offset}&limit=50&anuladas=false`, token);
    const facts = d?.results || [];
    facts.forEach(f => (f.detalles || []).forEach(i => {
      const cod = String(i.cod_item || '').trim();
      const cant = parseFloat(i.ctd || 0);
      if (cod && cant > 0) ventas[cod] = (ventas[cod] || 0) + cant;
    }));
    offset += 50;
    if (offset >= (d?.paging?.total || 0) || facts.length < 50) break;
  }
  return ventas;
}

async function getItemStock(cod, token) {
  const d = await duxFetch(`items/${cod}?idEmpresa=${ID_EMPRESA}`, token);
  if (!d) return null;
  const item = d.results?.[0] || d;
  const getStock = id => parseFloat(item.stock?.find(s => String(s.id) === String(id))?.stock_real || 0);
  return {
    nombre: item.item || cod,
    proveedor: item.proveedor?.proveedor || '',
    ean: item.codigos_barra?.[0] || '',
    sRC: getStock(ID_DEP_CASTEX),
    sRA: getStock(ID_DEP_SIRIA),
  };
}

function generarHTML(pedidos, transferencias, fecha) {
  const estilos = `body{font-family:Arial,sans-serif;background:#f5f5f5;padding:20px}.container{max-width:700px;margin:0 auto;background:white;border-radius:12px;overflow:hidden}.header{background:#B85C38;color:white;padding:24px}.header h1{margin:0;font-size:22px}.header p{margin:4px 0 0;opacity:.8;font-size:13px}.section{padding:20px 24px}.section h2{color:#1A1410;font-size:15px;margin:0 0 12px;border-bottom:2px solid #f0f0f0;padding-bottom:8px}.prov{margin-bottom:14px;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden}.prov-h{background:#f8f8f8;padding:9px 14px;font-weight:bold;color:#B85C38;font-size:13px}.prod{padding:6px 14px;font-size:12px;color:#333;border-top:1px solid #f0f0f0;display:flex;justify-content:space-between}.footer{background:#1A1410;color:#888;padding:14px 24px;font-size:11px;text-align:center}`;

  const pedHTML = pedidos.length === 0 ? '<p style="color:#888;font-size:13px;padding:0 24px">No hay pedidos urgentes hoy.</p>' :
    pedidos.map(p => `<div class="prov"><div class="prov-h">${p.prov} (${p.items.length})</div>${
      p.items.map(i => `<div class="prod"><span>${i.nombre}${i.transf ? `<br><span style="color:#27AE60;font-size:11px">↔️ Transferir ${i.cantTransf}u desde ${i.transf}</span>` : ''}</span><span style="font-weight:bold">${i.cant}u</span></div>`).join('')
    }</div>`).join('');

  const trHTML = transferencias.length === 0 ? '<p style="color:#888;font-size:13px;padding:0 24px">No hay transferencias.</p>' :
    transferencias.map(t => `<div style="padding:8px 24px;font-size:12px;border-bottom:1px solid #f0f0f0"><b>${t.nombre}</b> — ${t.desde} → ${t.hacia}: <b style="color:#27AE60">${t.cant}u</b></div>`).join('');

  return `<!DOCTYPE html><html><head><style>${estilos}</style></head><body><div class="container">
    <div class="header"><h1>🏪 Casa NOA — Pedidos del día</h1><p>${fecha}</p></div>
    <div class="section"><h2>📋 Pedidos sugeridos (${pedidos.length} proveedores)</h2>${pedHTML}</div>
    <div class="section"><h2>↔️ Transferencias</h2>${trHTML}</div>
    <div class="footer">casanoa-pedidos.vercel.app · Generado automáticamente a las 9:00 AM</div>
  </div></body></html>`;
}

export default async function handler(req, res) {
  const auth = req.headers['authorization'];
  const qs = req.query?.secret;
  if (auth !== `Bearer ${process.env.CRON_SECRET}` && qs !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const token = process.env.DUX_TOKEN;
  if (!token) return res.status(500).json({ error: 'Token DUX no configurado' });

  // Vercel tiene 60 seg en plan Pro, 10 en free
  // Usamos maxDuration en vercel.json
  try {
    // 1. Cargar ventas de ambas sucursales en paralelo
    const [ventasC, ventasA] = await Promise.all([
      getVentasSucursal(ID_SUC_CASTEX, token),
      getVentasSucursal(ID_SUC_SIRIA, token),
    ]);

    // 2. Solo procesar productos que se vendieron
    const codigos = new Set([...Object.keys(ventasC), ...Object.keys(ventasA)]);
    const pedidosPorProv = {};
    const transferencias = [];

    // 3. Para cada producto vendido, obtener stock
    for (const cod of codigos) {
      const vdC = (ventasC[cod] || 0) / DIAS_VENTAS;
      const vdA = (ventasA[cod] || 0) / DIAS_VENTAS;
      const vdTotal = vdC + vdA;
      if (vdTotal === 0) continue;

      const item = await getItemStock(cod, token);
      if (!item) continue;

      const { sRC, sRA, nombre, proveedor } = item;
      const sTotal = sRC + sRA;
      const diasCob = sTotal / vdTotal;
      if (diasCob >= DIAS_COBERTURA) continue;

      const necesita = Math.round(vdTotal * DIAS_COBERTURA) - sTotal;
      if (necesita <= 0) continue;

      // Transferencia
      const proyC15 = Math.round(vdC * DIAS_COBERTURA);
      const proyA15 = Math.round(vdA * DIAS_COBERTURA);
      const sobC = Math.max(0, sRC - proyC15);
      const sobA = Math.max(0, sRA - proyA15);
      let cantTransf = 0, transf = null;

      if (sobA >= 3 && vdC > 0) { cantTransf = Math.min(sobA, necesita); if (cantTransf >= 3) transf = 'Siria'; else cantTransf = 0; }
      else if (sobC >= 3 && vdA > 0) { cantTransf = Math.min(sobC, necesita); if (cantTransf >= 3) transf = 'Castex'; else cantTransf = 0; }

      const cantPedir = Math.max(0, necesita - cantTransf);
      if (cantPedir <= 0 && cantTransf === 0) continue;

      const prov = proveedor || 'SIN PROVEEDOR';
      if (!pedidosPorProv[prov]) pedidosPorProv[prov] = [];
      pedidosPorProv[prov].push({ nombre, cant: Math.round(cantPedir), cantTransf: Math.round(cantTransf), transf });

      if (cantTransf >= 3 && transf) {
        transferencias.push({ nombre, prov, desde: transf, hacia: transf === 'Siria' ? 'Castex' : 'Siria', cant: Math.round(cantTransf) });
      }
    }

    const pedidos = Object.entries(pedidosPorProv)
      .map(([prov, items]) => ({ prov, items }))
      .sort((a, b) => b.items.length - a.items.length);

    const fecha = new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const html = generarHTML(pedidos, transferencias, fecha);

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Casa NOA Pedidos <onboarding@resend.dev>',
        to: ['info@casanoa.com.ar'],
        subject: `📦 Pedidos del día — ${fecha}`,
        html,
      }),
    });

    return res.status(200).json({ ok: true, pedidos: pedidos.length, transferencias: transferencias.length, productos: codigos.size });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
