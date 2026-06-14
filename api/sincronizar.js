export default function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sincronizar productos · Casa NOA</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, sans-serif; background: #f5f0eb; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2rem; }
    .card { background: white; border-radius: 16px; padding: 2rem; max-width: 480px; width: 100%; box-shadow: 0 2px 16px rgba(0,0,0,0.1); }
    h1 { font-size: 1.3rem; color: #2c1a0e; margin-bottom: 0.5rem; }
    p { color: #7a6048; font-size: 0.9rem; margin-bottom: 1.5rem; line-height: 1.5; }
    button { width: 100%; background: #2c1a0e; color: #e8d5b0; border: none; border-radius: 10px; padding: 1rem; font-size: 1rem; font-weight: 600; cursor: pointer; margin-bottom: 1.5rem; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .barra-cont { background: #f0e8da; border-radius: 99px; height: 12px; overflow: hidden; margin-bottom: 0.75rem; display: none; }
    .barra { height: 100%; background: #2c1a0e; border-radius: 99px; width: 0%; transition: width 0.3s; }
    #estado { font-size: 0.9rem; color: #5a3e28; min-height: 1.5rem; }
    .ok { color: #2a7a2a; font-weight: 600; }
    .err { color: #c0392b; }
  </style>
</head>
<body>
<div class="card">
  <h1>Sincronizar productos</h1>
  <p>Descarga todos los productos de DUX y los guarda en el sistema. Tarda 3-5 minutos. No cerrés esta pestaña.</p>
  <button id="btn" onclick="iniciar()">Iniciar sincronización</button>
  <div class="barra-cont" id="bc"><div class="barra" id="b"></div></div>
  <div id="estado"></div>
</div>
<script>
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function iniciar() {
  const btn = document.getElementById('btn');
  const bc = document.getElementById('bc');
  const b = document.getElementById('b');
  const estado = document.getElementById('estado');
  btn.disabled = true;
  bc.style.display = 'block';
  let todos = [], offset = 0, total = null, done = false, errores = 0;
  while (!done) {
    try {
      const res = await fetch('/api/sync-page?offset=' + offset);
      if (res.status === 429) { estado.textContent = 'Límite DUX, esperando...'; await sleep(5000); continue; }
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      todos = todos.concat(data.productos);
      total = data.total; done = data.done; offset = data.nextOffset; errores = 0;
      const pct = total ? Math.round((todos.length / total) * 100) : 0;
      b.style.width = pct + '%';
      estado.textContent = 'Descargando: ' + todos.length + ' de ' + total + ' productos...';
      await sleep(200);
    } catch(e) {
      errores++;
      if (errores > 5) { estado.innerHTML = '<span class="err">Error: ' + e.message + '</span>'; btn.disabled = false; return; }
      await sleep(2000);
    }
  }
  estado.textContent = 'Guardando ' + todos.length + ' productos...';
  b.style.width = '99%';
  try {
    const r = await fetch('/api/save-productos', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({productos: todos}) });
    const d = await r.json();
    if (d.ok) {
      b.style.width = '100%';
      estado.innerHTML = '<span class="ok">✓ ' + d.total + ' productos sincronizados.</span><br><small style="color:#7a6048;word-break:break-all">Guardá esta URL como PRODUCTOS_BLOB_URL en Vercel: ' + d.blobUrl + '</small>';
    } else throw new Error(d.error);
  } catch(e) { estado.innerHTML = '<span class="err">Error al guardar: ' + e.message + '</span>'; }
  btn.disabled = false;
}
</script>
</body>
</html>`);
}
