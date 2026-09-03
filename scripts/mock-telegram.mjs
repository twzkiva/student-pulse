import http from 'node:http'

const messages = []

const server = http.createServer(async (request, response) => {
  if (request.method === 'GET' && request.url === '/messages') {
    response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
    response.end(JSON.stringify(messages))
    return
  }

  if (request.method === 'DELETE' && request.url === '/messages') {
    messages.length = 0
    response.writeHead(204)
    response.end()
    return
  }

  if (request.method === 'POST' && request.url?.endsWith('/sendMessage')) {
    let body = ''
    for await (const chunk of request) body += chunk
    messages.push(JSON.parse(body))
    response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
    response.end(JSON.stringify({ ok: true, result: { message_id: messages.length } }))
    return
  }

  response.writeHead(404, { 'content-type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify({ ok: false }))
})

server.listen(8799, '127.0.0.1', () => {
  console.log('Telegram mock: http://127.0.0.1:8799')
})
