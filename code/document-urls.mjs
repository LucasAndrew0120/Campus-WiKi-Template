import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'

const TENCENT_SHEET = /https:\/\/docs\.qq\.com\/sheet\/[A-Za-z0-9]+(?:\?[^\s`"'<>]*)?/g

export function isTencentSheetUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname === 'docs.qq.com' && !url.port && !url.username && !url.password && /^\/sheet\/[A-Za-z0-9]+$/.test(url.pathname)
  } catch {
    return false
  }
}

export function parseDocumentUrls(value = '') {
  const input = value.trim()
  if (!input) return []

  let values
  if (input.startsWith('[')) {
    const parsed = JSON.parse(input)
    if (!Array.isArray(parsed)) throw new Error('DOC_URLS 必须是 JSON 数组')
    values = parsed
  } else {
    values = input.split(/\s+/)
  }
  return uniqueDocumentUrls(values)
}

export function documentUrlsFromEnv() {
  return uniqueDocumentUrls([
    process.env.DOC_URL,
    ...parseDocumentUrls(process.env.DOC_URLS || ''),
  ])
}

export function scanMarkdownDocumentUrls(docsRoot) {
  const root = resolve(docsRoot)
  const urls = []
  const visit = (directory) => {
    for (const name of readdirSync(directory)) {
      if (name === 'node_modules' || name === '.vitepress' || name === '.http_cache') continue
      const file = join(directory, name)
      if (statSync(file).isDirectory()) visit(file)
      else if (extname(name).toLowerCase() === '.md') {
        const markdown = readFileSync(file, 'utf8')
        for (const block of markdown.matchAll(/^```xlsx\s+([^\r\n]+)$/gm)) {
          const match = block[1].match(TENCENT_SHEET)
          if (match) urls.push(...match)
        }
      }
    }
  }
  visit(root)
  return uniqueDocumentUrls(urls)
}

export function uniqueDocumentUrls(values) {
  const byDocument = new Map()
  for (const raw of values) {
    if (typeof raw !== 'string') continue
    const value = raw.trim()
    if (!value || !isTencentSheetUrl(value)) continue
    const id = new URL(value).pathname.split('/').at(-1)
    if (!byDocument.has(id)) byDocument.set(id, value)
  }
  return [...byDocument.values()]
}
