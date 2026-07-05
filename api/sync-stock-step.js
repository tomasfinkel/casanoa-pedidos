// api/sync-stock-step.js v4
const { put } = require('@vercel/blob')

const DEPOSITOS = [
  { id: '7301', clave: 'castex', nombre: 'Castex' },
  { id: '15932', clave: 'siria', nombre: 'Siria' },
  { id: '7199', clave: 'migueletes', nombre: 'Migueletes' },
]

const TAMANIO_PAGINA = 50
const PAUSA_MS = 1500
const URL_BASE = 'https://casanoa-pedidos.vercel.app'

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

async function sincronizarDeposito(deposito, token) {
  var stockDep = {}
  var offset = 0

  while (true) {
    var url = URL_BASE + '/api/dux?endpoint=items&idDeposito=' + deposito.id +
      '&offset=' + offset + '&limit=' + TAMANIO_PAGINA

    var data = null
    var intentos = 0
    while (intentos < 3) {
      try {
        var resp = await fetch(url, { headers: { Authorization: token } })
        if (!resp.ok) { intentos++; await sleep(3000); continue }
        data = await resp.json()
        break
      } catch (e) {
        intentos++
        await sleep(3000)
      }
    }

    if (!data) break

    var items = Array.isArray(data.results) ? data.results : []
    items.forEach(function(item) {
      var cod = String(item.cod_item || '').trim()
      if (!cod) return
      stockDep[cod] = extraerStock(item, deposito.id)
    })

    if (items.length < TAMANIO_PAGINA) break
    offset += TAMANIO_PAGINA
    await sleep(PAUSA_MS)
  }

  await put('stock-dep-' + deposito.clave + '.json', JSON.stringify(stockDep), {
    access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json',
  })

  return stockDep
}

module.exports = async function handler(req, res) {
  if (!autorizado(req)) return res.status(401).json({ error: 'No autorizado' })

  var token = process.env.DUX_TOKEN
  if (!token) return res.status(500).json({ error: 'Token DUX no configurado' })

  var stockFinal = {}
  for (var d = 0; d < DEPOSITOS.length; d++) {
    var deposito = DEPOSITOS[d]
    var stockDep = await sincronizarDeposito(deposito, token)
    var cods = Object.keys(stockDep)
    for (var i = 0; i < cods.length; i++) {
      var cod = cods[i]
      if (!stockFinal[cod]) stockFinal[cod] = {}
      stockFinal[cod][deposito.clave] = stockDep[cod]
    }
  }

  await put('stock.json', JSON.stringify({
    syncedAt: new Date().toISOString(),
    fechaArgentina: hoyArgentina(),
    stock: stockFinal,
  }), { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' })

  return res.status(200).json({ ok: true, productos: Object.keys(stockFinal).length })
}
