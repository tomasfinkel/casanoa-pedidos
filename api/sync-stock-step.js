// api/sync-stock-step.js
const { put, head } = require('@vercel/blob')

const DEPOSITOS = [
  { id: '7301', clave: 'castex', nombre: 'Castex' },
  { id: '15932', clave: 'siria', nombre: 'Siria' },
  { id: '7199', clave: 'migueletes', nombre: 'Migueletes' },
]

const TAMANIO_PAGINA = 50
const PAGINAS_MAX_POR_TANDA = 12
const TIEMPO_MAX_MS = 50000
const URL_BASE = 'https://casanoa-pedidos.vercel.app'
const CLAVE_PROGRESO = 'stock-sync-progreso.json'
const CLAVE_STOCK_FINAL = 'stock.json'
const BASE_BLOB = 'https://sjczw9fimmonkf7t.public.blob.vercel-storage.com'
const URL_PROGRESO = `${BASE_BLOB}/${CLAVE_PROGRESO}`
const URL_STOCK_FINAL = `${BASE_BLOB}/${CLAVE_STOCK_FINAL}`
const claveDepStock = (clave) => `stock-dep-${clave}.json`
const urlDepStock = (clave) => `${BASE_BLOB}/stock-dep-${clave}.json`

function autorizado(req) {
  const auth = req.headers['authorization']
  const qs = req.query && req.query.secret
  return auth === `Bearer ${process.env.CRON_SECRET}` || qs === process.env.CRON_SECRET
}

function hoyArgentina() {
  return new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

async function leerJSON(url, valorDefault) {
  try {
    await head(url)
    const res = await fetch(url)
    return await res.json()
  } catch (e) {
    return valorDefault
  }
}

async function guardarProgreso(progreso) {
  await put(CLAVE_PROGRESO, JSON.stringify(progreso), {
    access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json',
  })
}

async function guardarStockDeposito(clave, parcial) {
  await put(claveDepStock(clave), JSON.stringify(parcial), {
    access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json',
  })
}

async function combinarYGuardarStockFinal() {
  const stockFinal = {}
  for (var i = 0; i < DEPOSITOS.length; i++) {
    var dep = DEPOSITOS[i]
    var url = urlDepStock(dep.clave)
    var parcial = {}
    try {
      var resp = await fetch(url)
      if (resp.ok) parcial = await resp.json()
    } catch (e) {
      // archivo no existe todavía, seguir
    }
    var cods = Object.keys(parcial)
    for (var j = 0; j < cods.length; j++) {
      var cod = cods[j]
      if (!stockFinal[cod]) stockFinal[cod] = {}
      stockFinal[cod][dep.clave] = parcial[cod]
    }
  }
  await put(CLAVE_STOCK_FINAL, JSON.stringify({
    syncedAt: new Date().toISOString(),
    fechaArgentina: hoyArgentina(),
    stock: stockFinal,
  }), { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' })
  return Object.keys(stockFinal).length
}

function extraerStockDeposito(item, idDeposito) {
  const entrada = (item.stock || []).find((s) => String(s.id) === String(idDeposito))
  return entrada ? parseFloat(entrada.stock_real) || 0 : 0
}

module.exports = async function handler(req, res) {
  if (!autorizado(req)) return res.status(401).json({ error: 'No autorizado' })

  const token = process.env.DUX_TOKEN
  if (!token) return res.status(500).json({ error: 'Token DUX no configurado' })

  if (req.query && req.query.reset === 'true') {
    await guardarProgreso({ depIndex: 0, offset: 0 })
    await put(CLAVE_STOCK_FINAL, JSON.stringify({ syncedAt: null, fechaArgentina: null, stock: {} }), {
      access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json',
    })
    // Limpiar también los archivos intermedios de cada depósito
    for (var d = 0; d < DEPOSITOS.length; d++) {
      await put(claveDepStock(DEPOSITOS[d].clave), JSON.stringify({}), {
        access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json',
      })
    }
    return res.status(200).json({ ok: true, reseteado: true })
  }

  const stockActual = await leerJSON(URL_STOCK_FINAL, null)
  if (stockActual && stockActual.fechaArgentina === hoyArgentina()) {
    return res.status(200).json({ ok: true, yaSincronizadoHoy: true })
  }

  const inicio = Date.now()
  const progreso = await leerJSON(URL_PROGRESO, { depIndex: 0, offset: 0 })
  let depIndex = progreso.depIndex || 0
  let offset = progreso.offset || 0

  let paginasEstaTanda = 0
  const acumuladoTick = {}

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

    const items = Array.isArray(data && data.results) ? data.results : []

    items.forEach(function(item) {
      const cod = String(item.cod_item || '').trim()
      if (!cod) return
      acumuladoTick[cod] = extraerStockDeposito(item, deposito.id)
    })

    paginasEstaTanda++

    if (items.length < TAMANIO_PAGINA) {
      const parcialGuardado = await leerJSON(urlDepStock(deposito.clave), {})
      const fusionado = Object.assign({}, parcialGuardado, acumuladoTick)
      await guardarStockDeposito(deposito.clave, fusionado)
      depIndex++
      offset = 0
      Object.keys(acumuladoTick).forEach(function(k) { delete acumuladoTick[k] })
    } else {
      offset += TAMANIO_PAGINA
    }
  }

  if (Object.keys(acumuladoTick).length > 0 && depIndex < DEPOSITOS.length) {
    const deposito = DEPOSITOS[depIndex]
    const parcialGuardado = await leerJSON(urlDepStock(deposito.clave), {})
    const fusionado = Object.assign({}, parcialGuardado, acumuladoTick)
    await guardarStockDeposito(deposito.clave, fusionado)
  }

  const terminado = depIndex >= DEPOSITOS.length

  if (terminado) {
    const totalProductos = await combinarYGuardarStockFinal()
    await guardarProgreso({ depIndex: 0, offset: 0, ultimaEjecucion: new Date().toISOString() })
    return res.status(200).json({ ok: true, terminado: true, productos: totalProductos })
  }

  await guardarProgreso({ depIndex: depIndex, offset: offset, ultimaEjecucion: new Date().toISOString() })
  return res.status(200).json({
    ok: true,
    terminado: false,
    deposito: DEPOSITOS[depIndex] && DEPOSITOS[depIndex].nombre,
    offset: offset,
  })
}
