// api/panel-clientes.js
// Corre en el servidor de Vercel — nunca en el navegador.
// Variables de entorno necesarias en este proyecto (casanoa-pedidos):
//   SUPABASE_URL              -> el mismo "Project URL" de Supabase
//   SUPABASE_SERVICE_ROLE_KEY -> Settings > API > "secret" key (sb_secret_...), NUNCA la publishable
//   JSONBIN_MASTER_KEY        -> la master key de jsonbin (para poder mostrar nombre, no solo teléfono)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' })

  const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '')
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  const JSONBIN_BIN_ID = '6a41818ef5f4af5e293e7862'
  const JSONBIN_MASTER_KEY = process.env.JSONBIN_MASTER_KEY

  try {
    // 1. Traer todos los pedidos desde Supabase (vía REST, con la service role key)
    const pedidosRes = await fetch(`${SUPABASE_URL}/rest/v1/pedidos?select=*`, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    })
    if (!pedidosRes.ok) {
      const detalle = await pedidosRes.text()
      throw new Error(`No se pudo leer pedidos de Supabase (status ${pedidosRes.status}): ${detalle}`)
    }
    const pedidos = await pedidosRes.json()

    // 2. Traer todos los clientes registrados desde jsonbin (nombre, fecha de alta)
    let clientes = {}
    try {
      const clientesRes = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, {
        headers: { 'X-Master-Key': JSONBIN_MASTER_KEY },
      })
      if (clientesRes.ok) {
        const data = await clientesRes.json()
        clientes = data.record?.clientes ?? {}
      }
    } catch {
      // si falla jsonbin, seguimos solo con teléfonos de los pedidos
    }

    // 3. Agrupar pedidos por teléfono
    const resumen = {}
    for (const p of pedidos) {
      const tel = p.telefono_cliente || 'Sin identificar'
      if (!resumen[tel]) {
        resumen[tel] = {
          telefono: tel,
          nombre: clientes[tel]?.nombre || null,
          cantidadPedidos: 0,
          totalGastado: 0,
          primerPedido: p.creado_en,
          ultimoPedido: p.creado_en,
        }
      }
      const r = resumen[tel]
      r.cantidadPedidos += 1
      r.totalGastado += Number(p.total) || 0
      if (p.creado_en < r.primerPedido) r.primerPedido = p.creado_en
      if (p.creado_en > r.ultimoPedido) r.ultimoPedido = p.creado_en
    }

    // 3b. Sumar los clientes registrados que todavía no tienen ningún pedido,
    // para que aparezcan en el panel desde el momento en que se dan de alta
    // (aunque no hayan comprado nada todavía).
    for (const [tel, c] of Object.entries(clientes)) {
      if (!resumen[tel]) {
        resumen[tel] = {
          telefono: tel,
          nombre: c.nombre || null,
          cantidadPedidos: 0,
          totalGastado: 0,
          primerPedido: c.fechaRegistro || null,
          ultimoPedido: null,
        }
      }
    }

    // 4. Calcular frecuencia promedio (días entre compras) donde hay más de un pedido
    const lista = Object.values(resumen).map((r) => {
      let diasPromedio = null
      if (r.cantidadPedidos > 1) {
        const dias = (new Date(r.ultimoPedido) - new Date(r.primerPedido)) / 86400000
        diasPromedio = Math.round(dias / (r.cantidadPedidos - 1))
      }
      return { ...r, diasPromedio }
    }).sort((a, b) => b.totalGastado - a.totalGastado)

    res.status(200).json({ clientes: lista, totalPedidos: pedidos.length })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
