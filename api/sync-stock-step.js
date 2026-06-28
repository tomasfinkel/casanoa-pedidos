// api/sync-stock-step.js
//
// Sincroniza el stock de los 3 depósitos de DUX (Castex, Siria, Migueletes)
// SIN exceder el límite de 60 segundos por función del plan Hobby.
//
// Cómo funciona (posta de relevos):
//   1. El cron lo dispara una vez por día (ver vercel.json).
//   2. Esta función hace una tanda chica de llamadas a DUX (respetando
//      el límite de 5.5s entre llamadas, que ya maneja /api/dux),
//      guarda el progreso parcial en Blob, y antes de responder le
//      pide a SÍ MISMA que siga (vía waitUntil + fetch).
//   3. Eso se repite solo, tanda tras tanda, hasta cubrir los 3 depósitos.
//   4. Recién en la última tanda se escribe el stock.json final que lee
//      casanoa-tienda — nunca un archivo a medio escribir.
//
// Confirmado contra una respuesta real de DUX (28/6):
//   - La lista de productos viene en "results", no en "items".
//   - El código de producto es "cod_item", el nombre es "item".
//   - El stock es un ARRAY (un objeto por depósito), no un número suelto.
//     Se usa "stock_real", igual que ya hace api/cron.js.

import { put, head } from '@vercel/blob'
import { waitUntil } from '@vercel/functions'

const DEPOSITOS = [
  { id: '7301', clave: 'castex', nombre: 'Castex' },
  { id: '15932', clave: 'siria', nombre: 'Siria' },
  { id: '7199', clave: 'migueletes', nombre: 'Migueletes' },
]

const TAMANIO_PAGINA = 50
const PAGINAS_MAX_POR_TANDA = 8 // ~8 * 5.5s ≈ 44s, deja margen bajo el techo de 60s de Hobby
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

async function leerProgreso() {
  try {
    const info = await head(CLAVE_PROGRESO)
    const res = await fetch(info.url)
    return await res.json()
  } catch {
    return { depIndex: 0, offset: 0, acumulado: {} }
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

  const inicio = Date.now()
  const progreso = await leerProgreso()
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

  const siguienteUrl = `${URL_BASE}/api/sync-stock-step?secret=${process.env.CRON_SECRET}`
  waitUntil(
    Promise.race([
      fetch(siguienteUrl).catch(() => {}),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]),
  )

  return res.status(200).json({
    ok: true,
    terminado: false,
    deposito: DEPOSITOS[depIndex]?.nombre,
    offset,
    productosHastaAhora: Object.keys(acumulado).length,
  })
}
