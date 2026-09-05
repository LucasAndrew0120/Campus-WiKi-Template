import { createServer } from 'node:http'
import { documentUrlsFromEnv } from './document-urls.mjs'
import { CACHE_DIR, CACHE_TTL, SyncQueueFullError, cacheKey, fromCache, isTencentSheetUrl, log, prewarmDocuments, refreshCache } from './xlsx-sync.mjs'

const PORT = Number(process.env.PORT || 3456)
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60000)
const RATE_LIMIT_MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 60)
const requestTimes = []

function json(response, data, status = 200) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(data))
}

function limited() {
  const now = Date.now()
  while (requestTimes.length && requestTimes[0] <= now - RATE_LIMIT_WINDOW_MS) requestTimes.shift()
  if (requestTimes.length >= RATE_LIMIT_MAX_REQUESTS) return true
  requestTimes.push(now)
  return false
}

const server = createServer(async (request, response) => {
  if (request.method !== 'GET') return json(response, { error: '仅支持 GET 请求' }, 405)
  const requestUrl = new URL(request.url, 'http://localhost')
  if (requestUrl.pathname === '/health') return json(response, { ok: true })
  const docUrl = requestUrl.searchParams.get('url')
  if (requestUrl.pathname !== '/api/xlsx' || !docUrl) return json(response, { error: '用法：/api/xlsx?url=<腾讯文档链接>' }, 400)
  if (limited()) return json(response, { error: '请求过于频繁，请稍后重试' }, 429)
  if (!isTencentSheetUrl(docUrl)) return json(response, { error: '仅支持 https://docs.qq.com/sheet/ 链接' }, 400)

  try {
    const key = cacheKey(docUrl)
    const cached = fromCache(key)
    const buffer = cached || (await refreshCache(docUrl)).buffer
    response.writeHead(200, {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Length': buffer.length,
      'X-Cache': cached ? 'HIT' : 'MISS',
    })
    response.end(buffer)
  } catch (error) {
    log('同步失败', error.message)
    json(response, { error: error instanceof SyncQueueFullError ? error.message : '同步失败，请稍后重试' }, error instanceof SyncQueueFullError ? 429 : 502)
  }
})

const prewarmUrls = documentUrlsFromEnv()
if (prewarmUrls.length) {
  log(`启动前预热 ${prewarmUrls.length} 个腾讯文档`)
  await prewarmDocuments(prewarmUrls, { strict: process.env.PREWARM_STRICT === '1' })
}

server.listen(PORT, () => {
  log(`服务已启动 http://0.0.0.0:${PORT}`)
  log(`缓存目录 ${CACHE_DIR}，有效期 ${CACHE_TTL}ms`)
})
