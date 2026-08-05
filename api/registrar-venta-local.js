// api/registrar-venta-local.js
//
// Lo llama personal.html cada vez que un empleado carga una venta manual
// en el local (no viene del checkout online de la Tienda). Inserta un
// registro en la misma tabla "pedidos" de Supabase que ya lee
// panel-clientes.js, para que las ventas del local también cuenten en
// el Panel de clientes (recurrencia, total gastado, etc.).
//
// Variables de entorno necesarias en este proyecto (casanoa-pedidos),
// ya deberían existir porque panel-clientes.js las usa:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' })

  const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '')
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Supabase no configurado en este proyecto' })
  }

  const { telefono, sucursal, total } = req.body || {}
  if (!telefono || !sucursal || !total) {
    return res.status(400).json({ error: 'Faltan datos: telefono, sucursal y total son obligatorios' })
  }

  const payload = {
    telefono_cliente: telefono,
    sucursal,
    items: [{ descripcion: 'Venta cargada por el personal en el local', monto: Number(total) }],
    total: Number(total),
    tipo_envio: 'retiro',
    creado_en: new Date().toISOString(),
  }

  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/pedidos`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(payload),
    })
    if (!r.ok) {
      const detalle = await r.text()
      throw new Error(`Supabase respondió ${r.status}: ${detalle}`)
    }
    res.status(200).json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
