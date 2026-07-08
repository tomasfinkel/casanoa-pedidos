// api/sync-stock-step.js v7
const { put, head } = require('@vercel/blob')

const DEPOSITOS = [
  { id: '7301', clave: 'castex', nombre: 'Castex' },
  { id: '15932', clave: 'siria', nombre: 'Siria' },
  { id: '7199', clave: 'migueletes', nombre: 'Migueletes' },
]

const TAMANIO_PAGINA = 50
const PAUSA_ENTRE_PAGINAS_MS = 300
const PAGINAS_POR_TICK = 100
const DUX_BASE = 'https://erp.duxsoftware.com.ar/WSERP/rest/services'
const BASE_BLOB = 'https://sjczw9fimmonkf7t.public.blob.vercel-storage.com'
const URL_PROGRESO = BASE_BLOB + '/stock-sync-progreso.json'

function autorizado(req) {
  var auth = req.headers['authorization']
  var qs = req.query && req.query.secret
  return auth === ('Bearer ' + process.env.CRON_SECRET) || qs === process.env.CRON_SECRET
}

function hoyArgentina() {
  return new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function sleep(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms) })
}

function extraerStock(item, idDeposito) {
  var entrada = (item.stock || []).find(function(s) { return String(s.id) === String(idDeposito) })
  return entrada ? parseFloat(entrada.stock_real) || 0 : 0
}

async function leerJSON(url, valorDefault) {
  try {
    await head(url)
    var r = await fetch(url)
    return await r.json()
  } catch(e) {
    return valorDefault
  }
}

async function guardarProgreso(p) {
  await put('stock-sync-progreso.json', JSON.stringify(p), {
    access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json'
  })
}

async function guardarDepStock(clave, data) {
  await put('stock-dep-' + clave + '.json', JSON.stringify(data), {
    access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json'
  })
}

async function combinarYGuardar() {
  var stockFinal = {}
  for (var d = 0; d < DEPOSITOS.length; d++) {
    var dep = DEPOSITOS[d]
    var parcial = await leerJSON(BASE_BLOB + '/stock-dep-' + dep.clave + '.json', {})
    var cods = Object.keys(parcial)
    for (var i = 0; i < cods.length; i++) {
      var cod = cods[i]
      if (!stockFinal[cod]) stockFinal[cod] = {}
      stockFinal[cod][dep.clave] = parcial[cod]
    }
  }
  await put('stock.json', JSON.stringify({
    syncedAt: new Date().toISOString(),
    fechaArgentina: hoyArgentina(),
    stock: stockFinal
  }), { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' })
  return Object.keys(stockFinal).length
}

module.exports = async function handler(req, res) {
  if (!autorizado(req)) return res.status(401).json({ error: 'No autorizado' })

  var token = process.env.DUX_TOKEN
  if (!token) return res.status(500).json({ error: 'Token DUX no configurado' })

  // Reset
  if (req.query && req.query.reset === 'true') {
    await guardarProgreso({ depIndex: 0, offset: 0 })
    for (var d = 0; d < DEPOSITOS.length; d++) {
      await guardarDepStock(DEPOSITOS[d].clave, {})
    }
    return res.status(200).json({ ok: true, reseteado: true })
  }

  var progreso = await leerJSON(URL_PROGRESO, { depIndex: 0, offset: 0 })
  var depIndex = progreso.depIndex || 0
  var offset = progreso.offset || 0

  if (depIndex >= DEPOSITOS.length) {
    return res.status(200).json({ ok: true, yaSincronizadoHoy: true })
  }

  var deposito = DEPOSITOS[depIndex]
  var parcial = await leerJSON(BASE_BLOB + '/stock-dep-' + deposito.clave + '.json', {})
  var paginas = 0

  while (paginas < PAGINAS_POR_TICK) {
    var url = DUX_BASE + '/items?idDeposito=' + deposito.id +
      '&offset=' + offset + '&limit=' + TAMANIO_PAGINA

    var data = null
    var intentos = 0
    while (intentos < 3) {
      try {
        var resp = await fetch(url, {
          headers: { 'Authorization': token, 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }
        })
        if (!resp.ok) { intentos++; await sleep(3000); continue }
        data = await resp.json()
        break
      } catch(e) {
        intentos++
        await sleep(3000)
      }
    }

    if (!data) break

    var items = Array.isArray(data.results) ? data.results : []
    items.forEach(function(item) {
      var cod = String(item.cod_item || '').trim()
      if (!cod) return
      parcial[cod] = extraerStock(item, deposito.id)
    })

    paginas++

    if (items.length < TAMANIO_PAGINA) {
      // Fin de este depósito — guardar y escribir stock.json parcial ya
      await guardarDepStock(deposito.clave, parcial)
      await combinarYGuardar() // escribe stock.json con lo que hay hasta ahora
      depIndex++
      offset = 0

      if (depIndex >= DEPOSITOS.length) {
        // Todos los depósitos completos
        var total = await combinarYGuardar()
        await guardarProgreso({ depIndex: DEPOSITOS.length, offset: 0 })
        return res.status(200).json({ ok: true, terminado: true, productos: total })
      }

      // Siguiente depósito
      deposito = DEPOSITOS[depIndex]
      parcial = await leerJSON(BASE_BLOB + '/stock-dep-' + deposito.clave + '.json', {})
      break
    }

    offset += TAMANIO_PAGINA
    await sleep(PAUSA_ENTRE_PAGINAS_MS)
  }

  await guardarDepStock(deposito.clave, parcial)
  await guardarProgreso({ depIndex: depIndex, offset: offset })

  return res.status(200).json({
    ok: true,
    terminado: false,
    deposito: deposito.nombre,
    offset: offset,
    productosEnDeposito: Object.keys(parcial).length
  })
}
