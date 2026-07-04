// api/sync-stock-step.js v3
const { put } = require('@vercel/blob')

const DEPOSITOS = [
  { id: '7301', clave: 'castex', nombre: 'Castex' },
  { id: '15932', clave: 'siria', nombre: 'Siria' },
  { id: '7199', clave: 'migueletes', nombre: 'Migueletes' },
]

const TAMANIO_PAGINA = 50
const PAUSA_MS = 1500
const URL_BASE = 'https://casanoa-pedidos.vercel.app'
const CLAVE_STOCK_FINAL = 'stock.json'

function autorizado(req) {
  const auth = req.headers['authorization']
  const qs = req.query && req.query.secret
  return auth === `Bearer ${process.env.CRON_SECRET}` || qs === process.env.CRON_SECRET
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

module.exports = async function handler(req, res) {
  if (!autorizado(req)) return res.status(401).json({ error: 'No autorizado' })

  const token = process.env.DUX_TOKEN
  if (!token) return res.status(500).json({ error: 'Token DUX no configurado' })

  const stockFinal = {}

  for (var d = 0; d < DEPOSITOS.length; d++) {
    var deposito = DEPOSITOS[d]
    var offset = 0

    while (true) {
      var url = URL_BASE + '/api/dux?endpoint=items&idDeposito=' + deposito.id +
        '&offset=' + offset + '&limit=' + TAMANIO_PAGINA

      var data
      var intentos = 0
      while (intentos < 3) {
        try {
          var resp = await fetch(url, { headers: { Authorization: token } })
          console.log('[sync]', deposito.nombre, 'offset', offset, 'status', resp.status)
          if (!resp.ok) {
            console.log('[sync] error HTTP', resp.status, '- reintentando')
            await sleep(3000)
            intentos++
            continue
          }
          data = await resp.json()
          console.log('[sync] results:', data && data.results ? data.results.length : 'sin results', 'keys:', data ? Object.keys(data) : [])
          break
        } catch (e) {
          console.log('[sync] excepcion:', e.message)
          intentos++
          await sleep(3000)
        }
      }

      if (!data) {
        console.log('[sync] sin data tras 3 intentos, saliendo de', deposito.nombre)
        break
      }

      var items = Array.isArray(data.results) ? data.results : []

      items.forEach(function(item) {
        var cod = String(item.cod_item || '').trim()
        if (!cod) return
        if (!stockFinal[cod]) stockFinal[cod] = {}
        stockFinal[cod][deposito.clave] = extraerStock(item, deposito.id)
      })

      console.log('[sync]', deposito.nombre, 'offset', offset, 'items procesados:', items.length, 'total acumulado:', Object.keys(stockFinal).length)

      if (items.length < TAMANIO_PAGINA) {
        console.log('[sync] fin de', deposito.nombre)
        break
      }
      offset += TAMANIO_PAGINA
      await sleep(PAUSA_MS)
    }
  }

  await put(CLAVE_STOCK_FINAL, JSON.stringify({
    syncedAt: new Date().toISOString(),
    fechaArgentina: hoyArgentina(),
    stock: stockFinal,
  }), { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' })

  return res.status(200).json({ ok: true, productos: Object.keys(stockFinal).length })
}
