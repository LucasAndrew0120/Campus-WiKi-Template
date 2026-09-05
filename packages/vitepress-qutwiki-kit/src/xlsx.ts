import { existsSync, mkdirSync, readFileSync, realpathSync, statSync, unlinkSync, utimesSync, writeFileSync } from 'node:fs'
import { isAbsolute, join, relative, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import type MarkdownIt from 'markdown-it'
import * as XLSX from 'xlsx'

const DANGER = 'style="color:#d32f2f;font-weight:bold"'
const DEFAULT_API = 'https://syncwiki.quters.top'
const CACHE_TTL = Number(process.env.QUTWIKI_XLSX_CACHE_TTL || 60 * 60 * 1000)
const FORCE_SYNC = process.env.QUTWIKI_XLSX_FORCE === '1'
const MAX_XLSX_BYTES = 20 * 1024 * 1024
const MAX_SHEETS = 20
const MAX_ROWS = 5000
const MAX_COLUMNS = 100

export interface XlsxTableOptions {
  docsRoot: string
  apiUrl?: string
}

function escapeHtml(value: unknown): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }
  return String(value ?? '').replace(/[&<>\"]/g, character => map[character] || character)
}

export function xlsxCacheKey(value: string): string | null {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.hostname !== 'docs.qq.com' || url.port || url.username || url.password) return null
    const match = url.pathname.match(/^\/sheet\/([A-Za-z0-9]+)$/)
    return match?.[1] ?? null
  } catch {
    return null
  }
}

function syncTencentDoc(docUrl: string, cacheDir: string, apiUrl: string): Buffer | null {
  const docId = xlsxCacheKey(docUrl)
  if (!docId) return null

  const cacheFile = join(cacheDir, `${docId}.xlsx`)
  const staleCache = existsSync(cacheFile) ? readFileSync(cacheFile) : null
  if (!FORCE_SYNC && staleCache && Date.now() - statSync(cacheFile).mtimeMs < CACHE_TTL) return staleCache

  const script = [
    'const fs = require("node:fs")',
    'const url = process.argv[1]',
    'const output = process.argv[2]',
    'const limit = Number(process.argv[3])',
    'fetch(url).then(async response => {',
    '  if (!response.ok) throw new Error(`HTTP ${response.status}`)',
    '  const body = Buffer.from(await response.arrayBuffer())',
    '  if (!body.length || body.length > limit) throw new Error("invalid response size")',
    '  fs.writeFileSync(output, body)',
    '}).catch(error => { console.error(error.message); process.exit(1) })',
  ].join('\n')
  const requestUrl = `${apiUrl.replace(/\/$/, '')}/api/xlsx?url=${encodeURIComponent(docUrl)}`
  const tempFile = `${cacheFile}.${process.pid}.${Date.now()}.tmp`

  try {
    mkdirSync(cacheDir, { recursive: true })
    execFileSync(process.execPath, ['-e', script, requestUrl, tempFile, String(MAX_XLSX_BYTES)], {
      timeout: 150000,
      stdio: 'pipe',
      windowsHide: true,
    })
    const buffer = readFileSync(tempFile)
    writeFileSync(cacheFile, buffer)
    return buffer
  } catch {
    if (staleCache) {
      try {
        const now = new Date()
        utimesSync(cacheFile, now, now)
      } catch {}
      return staleCache
    }
    return null
  } finally {
    try { unlinkSync(tempFile) } catch {}
  }
}

function validateWorkbook(workbook: XLSX.WorkBook): void {
  if (workbook.SheetNames.length > MAX_SHEETS) throw new Error(`工作表数量超过限制（${MAX_SHEETS}）`)
  for (const name of workbook.SheetNames) {
    const ref = workbook.Sheets[name]?.['!ref']
    if (!ref) continue
    const range = XLSX.utils.decode_range(ref)
    if (range.e.r - range.s.r + 1 > MAX_ROWS) throw new Error(`工作表「${name}」行数超过限制（${MAX_ROWS}）`)
    if (range.e.c - range.s.c + 1 > MAX_COLUMNS) throw new Error(`工作表「${name}」列数超过限制（${MAX_COLUMNS}）`)
  }
}

function renderContact(header: string, value: string): string {
  const parts = value.split(/(\d+)/).filter(Boolean)
  return `<span class="xlsx-card-contact">${parts.map((part) => {
    if (!/^\d+$/.test(part)) return `<span>${escapeHtml(part)}</span>`
    return `<button class="xlsx-card-link" type="button" data-copy="${escapeHtml(part)}" title="点击复制${escapeHtml(header)}" onclick="navigator.clipboard.writeText(this.dataset.copy || '')">${escapeHtml(part)}</button>`
  }).join('')}</span>`
}

function sheetToHtml(sheet: XLSX.WorkSheet, fields: Record<string, string[]>): string {
  const rows = (XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][])
    .filter(row => row.some(cell => String(cell ?? '').trim()))
  if (!rows.length) return '<p>（空表格）</p>'

  const header = rows[0].map(cell => String(cell).trim())
  const body = rows.slice(1)
  const indexOf = (name: string | undefined) => name ? header.indexOf(name) : -1
  const keyIndices = (fields.key || []).map(indexOf)
  const missingKey = keyIndices.findIndex(index => index < 0)
  if (missingKey >= 0) return `<p ${DANGER}>[xlsx] 主键列 "${escapeHtml(fields.key[missingKey])}" 不存在</p>`

  for (const keyIndex of keyIndices) {
    let previous = ''
    for (const row of body) {
      const value = String(row[keyIndex] ?? '').trim()
      if (value) previous = value
      else row[keyIndex] = previous
    }
  }

  const nameIndex = indexOf(fields.name?.[0]) >= 0 ? indexOf(fields.name?.[0]) : keyIndices.at(-1) ?? -1
  const descIndex = indexOf(fields.desc?.[0])
  const avatarIndex = indexOf(fields.avatar?.[0])
  const hidden = new Set(fields.hide || [])
  const contacts = new Set(fields.contact || [])
  const tags = new Set(fields.tag || [])
  const groups = new Map<string, unknown[][]>()
  for (const row of body) {
    const group = keyIndices.length ? String(row[keyIndices[0]] ?? '').trim() : ''
    if (!groups.has(group)) groups.set(group, [])
    groups.get(group)!.push(row)
  }

  let html = '<div class="xlsx-cards">\n'
  for (const [group, groupRows] of groups) {
    if (group) html += `<section class="xlsx-card-group"><h3 class="xlsx-card-group-title">${escapeHtml(group)}</h3>`
    html += '<div class="xlsx-card-grid">'
    for (const row of groupRows) {
      const name = String(row[nameIndex] ?? '').trim()
      const description = String(row[descIndex] ?? '').trim()
      const avatar = String(row[avatarIndex] ?? '').trim()
      const avatarUrl = avatar && !/^https?:\/\//.test(avatar) ? `https://p.qlogo.cn/gh/${avatar}/${avatar}/0/` : avatar
      let tagHtml = ''
      let infoHtml = ''
      for (let index = 0; index < header.length; index++) {
        const value = String(row[index] ?? '').trim()
        if (!value || index === nameIndex || index === descIndex || index === avatarIndex || hidden.has(header[index])) continue
        if (contacts.has(header[index])) infoHtml += renderContact(header[index], value)
        else if (!tags.size || tags.has(header[index])) {
          tagHtml += value.split(/[\n,，]/).map(item => `<span class="xlsx-badge">${escapeHtml(item.trim())}</span>`).join('')
        }
      }
      html += `<article class="xlsx-card"><div class="xlsx-card-face">${avatarUrl ? `<img class="xlsx-card-avatar-el" src="${escapeHtml(avatarUrl)}" alt="">` : ''}<div class="xlsx-card-name">${escapeHtml(name)}</div>${description ? `<div class="xlsx-card-desc">${escapeHtml(description)}</div>` : ''}${tagHtml ? `<div class="xlsx-card-tags">${tagHtml}</div>` : ''}${infoHtml ? `<div class="xlsx-card-info">${infoHtml}</div>` : ''}</div></article>`
    }
    html += '</div>'
    if (group) html += '</section>'
  }
  return `${html}</div>`
}

export function xlsxTablePlugin(md: MarkdownIt, options: XlsxTableOptions) {
  const docsRoot = resolve(options.docsRoot)
  const apiUrl = options.apiUrl || process.env.QUTWIKI_XLSX_API || DEFAULT_API
  const originalFence = md.renderer.rules.fence || ((tokens, index, renderOptions, _env, self) => self.renderToken(tokens, index, renderOptions))

  md.renderer.rules.fence = (tokens, index, renderOptions, env, self) => {
    const info = (tokens[index].info || '').trim()
    if (!info.startsWith('xlsx')) return originalFence(tokens, index, renderOptions, env, self)

    const input = info.slice(4).trim()
    const separator = input.indexOf(' ')
    let spec = separator >= 0 ? input.slice(0, separator) : input
    const parameters = new URLSearchParams(separator >= 0 ? input.slice(separator + 1) : '')
    let targetSheet = parameters.get('table') || parameters.get('sheet')
    if (!targetSheet && spec.includes('#')) [spec, targetSheet] = spec.split('#', 2)
    if (!spec) return `<p ${DANGER}>[xlsx] 未指定文件路径</p>`

    const fields: Record<string, string[]> = {}
    for (const key of ['key', 'hide', 'contact', 'avatar', 'desc', 'tag', 'name']) {
      fields[key] = (parameters.get(key) || '').split(',').map(value => value.trim()).filter(Boolean)
    }

    try {
      let workbook: XLSX.WorkBook
      if (/^https?:\/\//.test(spec)) {
        const buffer = syncTencentDoc(spec, resolve(docsRoot, '.http_cache'), apiUrl)
        if (!buffer) return `<p ${DANGER}>[xlsx] 腾讯文档同步失败，且没有可用的本地缓存</p>`
        workbook = XLSX.read(buffer, { type: 'buffer', sheetRows: MAX_ROWS + 1 })
      } else {
        const resourcesRoot = realpathSync(resolve(docsRoot, 'public/resources'))
        const requested = resolve(docsRoot, 'public', spec.replace(/^\//, ''))
        if (!existsSync(requested)) return `<p ${DANGER}>[xlsx] 文件不存在：${escapeHtml(spec)}</p>`
        const file = realpathSync(requested)
        const resourcePath = relative(resourcesRoot, file)
        if (resourcePath.startsWith('..') || isAbsolute(resourcePath)) return `<p ${DANGER}>[xlsx] 本地文件必须位于 docs/public/resources</p>`
        if (statSync(file).size > MAX_XLSX_BYTES) return `<p ${DANGER}>[xlsx] 文件超过 ${MAX_XLSX_BYTES} 字节限制</p>`
        workbook = XLSX.read(readFileSync(file), { type: 'buffer', sheetRows: MAX_ROWS + 1 })
      }
      validateWorkbook(workbook)
      if (targetSheet) {
        const sheet = workbook.Sheets[targetSheet]
        return sheet ? sheetToHtml(sheet, fields) : `<p ${DANGER}>[xlsx] 工作表 "${escapeHtml(targetSheet)}" 不存在</p>`
      }
      return workbook.SheetNames.map(name => `${workbook.SheetNames.length > 1 ? `<h3 class="xlsx-sheet-title">${escapeHtml(name)}</h3>` : ''}${sheetToHtml(workbook.Sheets[name], fields)}`).join('')
    } catch (error) {
      return `<p ${DANGER}>[xlsx] 读取失败：${escapeHtml(error instanceof Error ? error.message : error)}</p>`
    }
  }
}
