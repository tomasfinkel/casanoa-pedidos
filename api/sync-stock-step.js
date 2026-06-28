// api/sync-stock-step.js
//
// Sincroniza el stock de los 3 depósitos de DUX (Castex, Siria, Migueletes)
// SIN exceder el límite de 60 segundos por función del plan Hobby.
//
// Cómo funciona AHORA (sin auto-llamada — esa parte no andaba confiable):
//   Vercel mismo dispara esta función 60 veces seguidas, una por minuto,
//   de madrugada (ver los 60 crons en vercel.json). Cada disparo hace una
//   tanda chica de llamadas a DUX y guarda el progreso. El próximo disparo,
//   un minuto después, sigue desde donde quedó. No hace falta que la
//   función se avise a sí misma — el cron de Vercel hace ese trabajo,
//   que es justamente lo que Vercel garantiza que funciona.
//
// Confirmado contra una respuesta real de DUX (28/6):
//   - La lista de productos viene en "results", no en "items".
//   - El código de producto es "cod_item", el nombre es "item".
//   - El stock es un ARRAY (un objeto por depósito), no un número suelto.
//     Se usa "stock_real", igual que ya hace api/cron.js.

import { put, head } from '@vercel/blob'

const DEPOSITOS = [
  { id: '7301', clave: 'castex', nombre: 'Castex' },
  { id: '15932', clave: 'siria', nombre: 'Siria' },
  { id: '7199', clave: 'migueletes', nombre: 'Migueletes' },
]

const TAMANIO_PAGINA = 50
const PAGINAS_MAX_POR_TANDA = 8
const TIEMPO_MAX_MS = 50000
const URL_BASE = 'https://casanoa-pedidos.vercel.app'
const CLAVE_PROGRESO = 'stock-sync-progreso.json'
const CLAVE_STOCK_FINAL = 'stock.json'

function autorizado(req) {
  const auth = req.headers['authorization']
  const qs = req.query?.secret
  return (
    auth === `Bearer ${process.env.CRON_SECRET}` || qs === process.env.CRON_SECRET
  )
}

function hoyArgentina() {
  // Fecha (sin hora) en horario argentino, para no resincronizar de nuevo
  // si ya terminó hoy.
  return new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

async function leerJSON(clave, valorDefault) {
  try {
    const info = await head(clave)
    const res = await fetch(info.url)
    return await res.json()
  } catch {
    return valorDefault
  }
}

async function guardarProgreso(progreso) {
  await put(CLAVE_PROGRESO, JSON.stringify(progreso), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  })
}

async function guardarStockFinal(acumulado) {
  const cuerpo = {
    syncedAt: new Date().toISOString(),
    fechaArgentina: hoyArgentina(),
    stock: acumulado,
  }
  await put(CLAVE_STOCK_FINAL, JSON.stringify(cuerpo), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  })
}

function extraerStockDeposito(item, idDeposito) {
  const entrada = (item.stock || []).find((s) => String(s.id) === String(idDeposito))
  return entrada ? parseFloat(entrada.stock_real) || 0 : 0
}

export default async function handler(req, res) {
  if (!autorizado(req)) {
    return res.status(401).json({ error: 'No autorizado' })
  }

  const token = process.env.DUX_TOKEN
  if (!token) return res.status(500).json({ error: 'Token DUX no configurado' })

  // Si ya se completó una sincronización hoy, no arrancar otra de cero con
  // los disparos del cron que todavía falten para llegar a las 60.
  const stockActual = await leerJSON(CLAVE_STOCK_FINAL, null)
  if (stockActual?.fechaArgentina === hoyArgentina()) {
    return res.status(200).json({ ok: true, yaSincronizadoHoy: true })
  }

  const inicio = Date.now()
  const progreso = await leerJSON(CLAVE_PROGRESO, { depIndex: 0, offset: 0, acumulado: {} })
  let { depIndex, offset, acumulado } = progreso

  let paginasEstaTanda = 0

  while (
    depIndex < DEPOSITOS.length &&
    paginasEstaTanda < PAGINAS_MAX_POR_TANDA &&
    Date.now() - inicio < TIEMPO_MAX_MS
  ) {
    const deposito = DEPOSITOS[depIndex]
    const url =
      `${URL_BASE}/api/dux?endpoint=items&idDeposito=${deposito.id}` +
      `&offset=${offset}&limit=${TAMANIO_PAGINA}`

    let data
    try {
      const resp = await fetch(url, { headers: { Authorization: token } })
      data = await resp.json()
    } catch (e) {
      break
    }

    const items = Array.isArray(data?.results) ? data.results : []

    items.forEach((item) => {
      const cod = String(item.cod_item || '').trim()
      if (!cod) return
      if (!acumulado[cod]) acumulado[cod] = {}
      acumulado[cod][deposito.clave] = extraerStockDeposito(item, deposito.id)
    })

    paginasEstaTanda++

    if (items.length < TAMANIO_PAGINA) {
      depIndex++
      offset = 0
    } else {
      offset += TAMANIO_PAGINA
    }
  }

  const terminado = depIndex >= DEPOSITOS.length

  if (terminado) {
    await guardarStockFinal(acumulado)
    await guardarProgreso({ depIndex: 0, offset: 0, acumulado: {} })
    return res.status(200).json({
      ok: true,
      terminado: true,
      productos: Object.keys(acumulado).length,
    })
  }

  await guardarProgreso({ depIndex, offset, acumulado })

  return res.status(200).json({
    ok: true,
    terminado: false,
    deposito: DEPOSITOS[depIndex]?.nombre,
    offset,
    productosHastaAhora: Object.keys(acumulado).length,
  })
}
