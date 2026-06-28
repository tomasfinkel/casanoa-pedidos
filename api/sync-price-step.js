// api/sync-price-step.js
//
// Versión automática de lo que ya hacía Sincronizar_productos.html a mano.
// Mismo patrón que sync-stock-step.js: el cron dispara varias veces (ver
// vercel.json), cada disparo hace una tanda y guarda progreso, hasta
// terminar y reemplazar productos.json.
//
// Esta API (idListaPrecio) no tiene el límite de 5.5s que sí tiene
// dux.js — por eso esto necesita muchos menos disparos que el stock.
// Se respeta un descanso corto (1.5s) entre llamadas igual, por las dudas,
// y SÍ se detecta correctamente el error 429 de DUX (el código viejo
// comparaba la variable equivocada y nunca lo detectaba bien).

import { put, head } from '@vercel/blob'

const DUX_BASE = 'https://erp.duxsoftware.com.ar/WSERP/rest/services'
const ID_LISTA = 17610
const LIMIT = 50
const PAGINAS_MAX_POR_TANDA = 25
const ESPERA_MS = 1500
const TIEMPO_MAX_MS = 50000
const BASE_BLOB = 'https://sjczw9fimmonkf7t.public.blob.vercel-storage.com'
const CLAVE_PROGRESO = 'precio-sync-progreso.json'
const CLAVE_PRODUCTOS = 'productos.json'
const URL_PROGRESO = `${BASE_BLOB}/${CLAVE_PROGRESO}`
const URL_PRODUCTOS = `${BASE_BLOB}/${CLAVE_PRODUCTOS}`

function autorizado(req) {
  const auth = req.headers['authorization']
  const qs = req.query?.secret
  return auth === `Bearer ${process.env.CRON_SECRET}` || qs === process.env.CRON_SECRET
}

function hoyArgentina() {
  return new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function leerJSON(url, valorDefault) {
  try {
    await head(url)
    const r = await fetch(url)
    return await r.json()
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

async function guardarProductosFinal(productos) {
  const payload = {
    syncedAt: new Date().toISOString(),
    fechaArgentina: hoyArgentina(),
    total: productos.length,
    productos,
  }
  await put(CLAVE_PRODUCTOS, JSON.stringify(payload), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  })
}

export default async function handler(req, res) {
  if (!autorizado(req)) {
    return res.status(401).json({ error: 'No autorizado' })
  }
  const token = process.env.DUX_TOKEN
  if (!token) return res.status(500).json({ error: 'Token DUX no configurado' })

  const actual = await leerJSON(URL_PRODUCTOS, null)
  if (actual?.fechaArgentina === hoyArgentina()) {
    return res.status(200).json({ ok: true, yaSincronizadoHoy: true })
  }

  const inicio = Date.now()
  const progreso = await leerJSON(URL_PROGRESO, { offset: 0, acumulado: [] })
  let { offset, acumulado } = progreso

  let paginas = 0
  let terminado = false

  while (paginas < PAGINAS_MAX_POR_TANDA && Date.now() - inicio < TIEMPO_MAX_MS) {
    let data = null
    let intentos = 0

    while (intentos < 5) {
      const r = await fetch(
        `${DUX_BASE}/items?idListaPrecio=${ID_LISTA}&habilitado=SI&offset=${offset}&limit=${LIMIT}`,
        { headers: { Authorization: token } },
      )
      if (r.status === 429) {
        intentos++
        await sleep(5000)
        continue
      }
      data = await r.json()
      break
    }

    if (!data) break // DUX no respondió bien tras varios intentos; seguimos en la próxima tanda

    const items = data.results || []
    const total = data.paging?.total || 0

    items.forEach((p) => {
      const precioObj = (p.precios || []).find((pr) => pr.id === ID_LISTA)
      const barcodes = (p.codigos_barra || []).filter((b) => b && b !== '0000' && b.length > 4)
      acumulado.push({
        codigo: p.cod_item || '',
        nombre: p.item || '',
        precio: precioObj ? parseFloat(precioObj.precio) : 0,
        barcodes,
      })
    })

    paginas++
    const nuevoOffset = offset + items.length

    if (items.length < LIMIT || nuevoOffset >= total) {
      offset = nuevoOffset
      terminado = true
      break
    }
    offset = nuevoOffset
    await sleep(ESPERA_MS)
  }

  if (terminado) {
    await guardarProductosFinal(acumulado)
    await guardarProgreso({ offset: 0, acumulado: [] })
    return res.status(200).json({ ok: true, terminado: true, productos: acumulado.length })
  }

  await guardarProgreso({ offset, acumulado })
  return res.status(200).json({
    ok: true,
    terminado: false,
    offset,
    productosHastaAhora: acumulado.length,
  })
}
