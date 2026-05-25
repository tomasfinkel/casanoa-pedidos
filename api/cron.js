// api/cron.js - Corre todos los dias a las 9am Argentina (12pm UTC)
const BASE_URL = 'https://erp.duxsoftware.com.ar/WSERP/rest/services';
const ID_EMPRESA = '3709';
const ID_SUC_CASTEX = '2';
const ID_SUC_SIRIA = '4';
const DIAS_VENTAS = 5;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function duxGet(endpoint, token) {
  await sleep(5500);
  const resp = await fetch(`${BASE_URL}/${endpoint}`, {
    headers: { 'Authorization': token, 'Content-Type': 'application/json' }
  });
  const text = await resp.text();
  try { return JSON.parse(text); } catch { return null; }
}

async function getVentas(idSucursal, token) {
  const hoy = new Date();
  const hace5 = new Date(hoy);
  hace5.setDate(hoy.getDate() - DIAS_VENTAS);
  const fmt = d => d.toISOString().split('T')[0];
  
  const ventas = {};
  let offset = 0;
  const limit = 50;
  
  while (true) {
    await sleep(3500);
    const url = `facturas?fechaDesde=${fmt(hace5)}&fechaHasta=${fmt(hoy)}&idEmpresa=${ID_EMPRESA}&idSucursal=${idSucursal}&offset=${offset}&limit=${limit}&anuladas=false`;
    const data = await duxGet(url, token);
    const facturas = data?.results || [];
    if (facturas.length === 0) break;
    
    facturas.forEach(f => {
      (f.detalles || []).forEach(item => {
        const cod = String(item.cod_item || '').trim();
        const cant = parseFloat(item.ctd || 0);
        if (cod && cant > 0) ventas[cod] = (ventas[cod] || 0) + cant;
      });
    });
    
    if (facturas.length < limit || offset + limit >= (data?.paging?.total || 0)) break;
    offset += limit;
  }
  return ventas;
}

async function getStock(idDeposito, token) {
  const stock = {};
  let offset = 0;
  const limit = 50;
  
  while (true) {
    await sleep(3500);
    const data = await duxGet(`items?idDeposito=${idDeposito}&offset=${offset}&limit=${limit}`, token);
    const items = Array.isArray(data) ? data : (data?.items || []);
    if (items.length === 0) break;
    
    items.forEach(item => {
      const cod = String(item.codigoItem || item.codigo || '').trim();
      const s = parseFloat(item.stock || item.stockActual || 0);
      const prov = item.proveedor || item.nombreProveedor || '';
      const nombre = item.descripcion || item.nombre || '';
      if (cod) stock[cod] = { stock: s, proveedor: prov, nombre };
    });
    
    if (items.length < limit) break;
    offset += limit;
  }
  return stock;
}

function generarHTML(pedidos, transferencias, fecha) {
  const estilos = `
    body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 700px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
    .header { background: #B85C38; color: white; padding: 24px; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 4px 0 0; opacity: 0.8; font-size: 14px; }
    .section { padding: 20px 24px; }
    .section h2 { color: #1A1410; font-size: 16px; margin: 0 0 12px; border-bottom: 2px solid #f0f0f0; padding-bottom: 8px; }
    .prov { margin-bottom: 16px; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }
    .prov-header { background: #f8f8f8; padding: 10px 14px; font-weight: bold; color: #B85C38; font-size: 14px; }
    .producto { padding: 6px 14px; font-size: 13px; color: #333; border-top: 1px solid #f0f0f0; display: flex; justify-content: space-between; }
    .cant { font-weight: bold; color: #1A1410; }
    .transf { color: #27AE60; font-size: 12px; }
    .footer { background: #1A1410; color: #888; padding: 16px 24px; font-size: 12px; text-align: center; }
    .badge { background: #C0392B; color: white; border-radius: 4px; padding: 2px 6px; font-size: 11px; margin-left: 6px; }
  `;

  const pedidosHTML = pedidos.length === 0 ? '<p style="color:#888;font-size:13px;">No hay pedidos urgentes hoy.</p>' :
    pedidos.map(p => `
      <div class="prov">
        <div class="prov-header">${p.proveedor} <span style="font-weight:normal;font-size:12px;color:#888;">(${p.items.length} productos)</span></div>
        ${p.items.map(i => `
          <div class="producto">
            <span>${i.nombre}${i.transferDesde ? `<br><span class="transf">↔️ Transferir ${i.cantTransf}u desde ${i.transferDesde}</span>` : ''}</span>
            <span class="cant">${i.cant} u.</span>
          </div>
        `).join('')}
      </div>
    `).join('');

  const transfHTML = transferencias.length === 0 ? '<p style="color:#888;font-size:13px;">No hay transferencias sugeridas.</p>' :
    transferencias.map(t => `
      <div class="producto" style="border:1px solid #e0e0e0;border-radius:6px;margin-bottom:6px;background:#f9fff9;">
        <span>${t.nombre}<br><span style="font-size:11px;color:#888;">${t.proveedor}</span></span>
        <span class="cant" style="color:#27AE60;">${t.desde} → ${t.hacia}<br>${t.cant} u.</span>
      </div>
    `).join('');

  return `<!DOCTYPE html><html><head><style>${estilos}</style></head><body>
    <div class="container">
      <div class="header">
        <h1>🏪 Casa NOA — Resumen de Pedidos</h1>
        <p>${fecha} · Generado automáticamente a las 9:00 AM</p>
      </div>
      <div class="section">
        <h2>📋 Pedidos sugeridos (${pedidos.length} proveedores)</h2>
        ${pedidosHTML}
      </div>
      <div class="section">
        <h2>↔️ Transferencias entre sucursales</h2>
        ${transfHTML}
      </div>
      <div class="footer">Casa NOA · casanoa-pedidos.vercel.app · Este email se genera automáticamente todos los días a las 9AM</div>
    </div>
  </body></html>`;
}

export default async function handler(req, res) {
  // Verificar que viene del cron de Vercel
  const authHeader = req.headers['authorization'];
  const querySecret = req.query?.secret;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && querySecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const token = process.env.DUX_TOKEN;
  if (!token) return res.status(500).json({ error: 'Token DUX no configurado' });

  try {
    console.log('Iniciando resumen diario...');

    // Cargar ventas de ambas sucursales
    const [ventasC, ventasA] = await Promise.all([
      getVentas(ID_SUC_CASTEX, token),
      getVentas(ID_SUC_SIRIA, token),
    ]);

    // Cargar stock (depósitos: Castex=7301, Siria=15932)
    await sleep(5500);
    const [stockC, stockA] = await Promise.all([
      getStock('7301', token),
      getStock('15932', token),
    ]);

    const DIAS_COBERTURA = 15;
    const pedidosPorProv = {};
    const transferencias = [];

    // Calcular pedidos
    const codigos = new Set([...Object.keys(stockC), ...Object.keys(stockA)]);
    
    codigos.forEach(cod => {
      const sc = stockC[cod];
      const sa = stockA[cod];
      const s = sc || sa;
      if (!s || !s.nombre) return;

      const vdC = (ventasC[cod] || 0) / DIAS_VENTAS;
      const vdA = (ventasA[cod] || 0) / DIAS_VENTAS;
      const vdTotal = vdC + vdA;
      if (vdTotal === 0) return;

      const sRC = sc?.stock || 0;
      const sRA = sa?.stock || 0;
      const sTotal = sRC + sRA;
      
      const diasCobertura = sTotal / vdTotal;
      if (diasCobertura >= DIAS_COBERTURA) return;

      const necesita = Math.round(vdTotal * DIAS_COBERTURA) - sTotal;
      if (necesita <= 0) return;

      // Transferencia posible
      const sobranteC = Math.max(0, sRC - Math.round(vdC * DIAS_COBERTURA));
      const sobranteA = Math.max(0, sRA - Math.round(vdA * DIAS_COBERTURA));
      let cantTransf = 0, transferDesde = null;
      
      if (sobranteA >= 3 && vdC > 0) {
        cantTransf = Math.min(sobranteA, necesita);
        if (cantTransf >= 3) transferDesde = 'Siria';
      } else if (sobranteC >= 3 && vdA > 0) {
        cantTransf = Math.min(sobranteC, necesita);
        if (cantTransf >= 3) transferDesde = 'Castex';
      }

      const cantPedir = Math.max(0, necesita - cantTransf);
      if (cantPedir <= 0 && cantTransf === 0) return;

      const prov = s.proveedor || 'SIN PROVEEDOR';
      if (!pedidosPorProv[prov]) pedidosPorProv[prov] = [];
      pedidosPorProv[prov].push({
        nombre: s.nombre,
        cant: Math.round(cantPedir),
        cantTransf: Math.round(cantTransf),
        transferDesde,
        diasCobertura: Math.round(diasCobertura),
      });

      if (cantTransf >= 3 && transferDesde) {
        transferencias.push({
          nombre: s.nombre,
          proveedor: prov,
          desde: transferDesde,
          hacia: transferDesde === 'Siria' ? 'Castex' : 'Siria',
          cant: Math.round(cantTransf),
        });
      }
    });

    const pedidos = Object.entries(pedidosPorProv)
      .map(([proveedor, items]) => ({ proveedor, items }))
      .sort((a, b) => b.items.length - a.items.length);

    const fecha = new Date().toLocaleDateString('es-AR', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });

    const html = generarHTML(pedidos, transferencias, fecha);

    // Mandar email
    const emailResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Casa NOA Pedidos <onboarding@resend.dev>',
        to: ['info@casanoa.com.ar'],
        subject: `📦 Pedidos del día — ${fecha}`,
        html,
      }),
    });

    const emailData = await emailResp.json();
    console.log('Email enviado:', emailData);

    return res.status(200).json({ 
      ok: true, 
      pedidos: pedidos.length,
      transferencias: transferencias.length,
      email: emailData 
    });

  } catch (e) {
    console.error('Error en cron:', e);
    return res.status(500).json({ error: e.message });
  }
}
