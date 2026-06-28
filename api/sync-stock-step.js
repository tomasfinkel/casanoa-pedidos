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
// AJUSTAR si hace falta: el nombre exacto de los campos de stock no está
// 100% confirmado (mismo problema que tuvimos con productos.json) — se
// intentan varios nombres posibles, igual que ya hacía cargarStockDuxAuto.

import { put, head } from '@vercel/blob'
import { waitUntil } from '@vercel/functions'

const DEPOSITOS = [
  { id: '7301', clave: 'castex', nombre: 'Castex' },
  { id: '15932', clave: 'siria', nombre: 'Siria' },
  { id: '7199', clave: 'migueletes', nombre: 'Migueletes' },
]

const TAMANIO_PAGINA = 50
const PAGINAS_MAX_POR_TANDA = 8 // ~8 * 5.5s ≈ 44s, deja margen bajo el techo de 60s de Hobby
const TIEMPO_MAX_MS = 50000 // corte de seguridad adicional, por si una llamada tarda de más
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

function extraerStock(item) {
  return (
    item.stock ??
    item.stockActual ??
    item.stockDisponible ??
    item.cantidad ??
    0
  )
}

function extraerCodigo(item) {
  return String(item.codigoItem || item.codigo || item.idItem || '').trim()
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
  let muestraDebug = null

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
      muestraDebug = { error: 'fetch falló: ' + e.message }
      break
    }

    if (!muestraDebug) {
      // Guardamos cómo viene la primera respuesta real, para diagnosticar
      // sin adivinar más nombres de campo.
      muestraDebug = {
        esArray: Array.isArray(data),
        claves: Array.isArray(data) ? null : Object.keys(data ?? {}),
        primerasClavesItem: Array.isArray(data) && data[0] ? Object.keys(data[0]) : null,
        muestraCruda: JSON.stringify(data).slice(0, 1500),
      }
    }

    const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []

    items.forEach((item) => {
      const cod = extraerCodigo(item)
      if (!cod) return
      if (!acumulado[cod]) acumulado[cod] = {}
      acumulado[cod][deposito.clave] = extraerStock(item)
    })

    paginasEstaTanda++

    if (items.length < TAMANIO_PAGINA) {
      // Este depósito se terminó, pasamos al siguiente
      depIndex++
      offset = 0
    } else {
      offset += TAMANIO_PAGINA
    }
  }

  const terminado = depIndex >= DEPOSITOS.length

  if (terminado) {
    await guardarStockFinal(acumulado)
    await guardarProgreso({ depIndex: 0, offset: 0, acumulado: {} }) // reset para el próximo día
    return res.status(200).json({
      ok: true,
      terminado: true,
      productos: Object.keys(acumulado).length,
      debug: muestraDebug,
    })
  }

  await guardarProgreso({ depIndex, offset, acumulado })

  // Pedirle a la próxima tanda que arranque, sin esperar a que termine
  // (si esperáramos su respuesta completa, bloquearíamos esta función
  // hasta que TODA la cadena termine, perdiendo el sentido de cortarla
  // en tandas).
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
    debug: muestraDebug,
  })
}
