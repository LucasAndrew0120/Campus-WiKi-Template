import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'
import XLSX from 'xlsx'
import { isTencentSheetUrl } from './document-urls.mjs'

export { isTencentSheetUrl } from './document-urls.mjs'

export const CACHE_DIR = process.env.CACHE_DIR || join(tmpdir(), 'campus_wiki_xlsx_cache')
export const CACHE_TTL = numberSetting('CACHE_TTL', 60 * 60 * 1000, 1)
export const MAX_CONCURRENT_SYNCS = numberSetting('MAX_CONCURRENT_SYNCS', 2, 1)
export const MAX_SYNC_QUEUE = numberSetting('MAX_SYNC_QUEUE', 10, 0)
const MAX_SHEETS = numberSetting('MAX_SHEETS', 20, 1)
const MAX_ROWS = numberSetting('MAX_ROWS', 5000, 1)
const MAX_COLUMNS = numberSetting('MAX_COLUMNS', 100, 1)
const MAX_CELLS = numberSetting('MAX_CELLS', 100000, 1)
const MAX_CELL_LENGTH = numberSetting('MAX_CELL_LENGTH', 10000, 1)
const MAX_XLSX_BYTES = numberSetting('MAX_XLSX_BYTES', 20 * 1024 * 1024, 1)
const MAX_CACHE_FILES = numberSetting('MAX_CACHE_FILES', 100, 1)
const SYNC_TIMEOUT = numberSetting('SYNC_TIMEOUT', 5 * 60 * 1000, 1000)

const syncing = new Map()
const syncQueue = []
let activeSyncs = 0

function numberSetting(name, fallback, minimum) {
  const value = Number(process.env[name] || fallback)
  if (!Number.isInteger(value) || value < minimum) throw new Error(`${name} 必须是大于或等于 ${minimum} 的整数`)
  return value
}

mkdirSync(CACHE_DIR, { recursive: true, mode: 0o700 })
chmodSync(CACHE_DIR, 0o700)

export function log(...args) {
  console.log(`[${new Date().toLocaleString('zh-CN', { hour12: false, timeZone: 'Asia/Shanghai' })}]`, ...args)
}

export function cacheKey(url) {
  const match = url.match(/docs\.qq\.com\/sheet\/([A-Za-z0-9]+)/)
  return match ? match[1] : Buffer.from(url).toString('base64url').slice(0, 20)
}

export function cacheFile(key) {
  return join(CACHE_DIR, `${key}.xlsx`)
}

export function fromCache(key) {
  const file = cacheFile(key)
  if (!existsSync(file) || Date.now() - statSync(file).mtimeMs > CACHE_TTL) return null
  return readFileSync(file)
}

function removeExpiredCacheFiles() {
  const current = []
  for (const name of readdirSync(CACHE_DIR).filter(name => name.endsWith('.xlsx'))) {
    try {
      const file = join(CACHE_DIR, name)
      const mtimeMs = statSync(file).mtimeMs
      if (Date.now() - mtimeMs > CACHE_TTL) unlinkSync(file)
      else current.push({ file, mtimeMs })
    } catch {}
  }
  current.sort((a, b) => b.mtimeMs - a.mtimeMs)
  for (const { file } of current.slice(MAX_CACHE_FILES)) try { unlinkSync(file) } catch {}
}

removeExpiredCacheFiles()
const cleanupTimer = setInterval(removeExpiredCacheFiles, Math.max(CACHE_TTL, 60 * 60 * 1000))
cleanupTimer.unref()

export class SyncQueueFullError extends Error {
  constructor() {
    super('同步任务繁忙，请稍后重试')
    this.name = 'SyncQueueFullError'
  }
}

async function acquireSyncSlot() {
  if (activeSyncs < MAX_CONCURRENT_SYNCS) {
    activeSyncs++
    return
  }
  if (syncQueue.length >= MAX_SYNC_QUEUE) throw new SyncQueueFullError()
  await new Promise(resolve => syncQueue.push(resolve))
}

function releaseSyncSlot() {
  const next = syncQueue.shift()
  if (next) next()
  else activeSyncs--
}

async function syncWithLimit(url) {
  await acquireSyncSlot()
  const task = syncSheets(url).finally(releaseSyncSlot)
  let timeout
  try {
    return await Promise.race([
      task,
      new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error(`同步超时（${SYNC_TIMEOUT}ms）`)), SYNC_TIMEOUT) }),
    ])
  } finally {
    clearTimeout(timeout)
  }
}

export async function syncSheets(docUrl) {
  if (!isTencentSheetUrl(docUrl)) throw new Error('仅支持 https://docs.qq.com/sheet/ 链接')
  log('启动 Chromium', cacheKey(docUrl))
  const browser = await puppeteer.launch({
    args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  })

  try {
    const page = await browser.newPage()
    await page.goto(docUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForFunction(() => window.SpreadsheetApp?.workbook?.worksheetManager?.getSheetList?.().length > 0, { timeout: 60000, polling: 500 })
    const sheets = await page.evaluate(() => window.SpreadsheetApp.workbook.worksheetManager.getSheetList().map(sheet => ({ id: sheet.getSheetId(), name: sheet.getSheetName() })))
    if (sheets.length > MAX_SHEETS) throw new Error(`工作表数量超过限制（${MAX_SHEETS}）`)

    const workbook = XLSX.utils.book_new()
    for (const { id, name } of sheets) {
      const sheetUrl = new URL(docUrl)
      sheetUrl.searchParams.set('tab', id)
      try {
        await page.goto(sheetUrl.href, { waitUntil: 'domcontentloaded', timeout: 30000 })
      } catch (error) {
        if (!/frame.*detached|detached.*frame/i.test(error.message)) throw error
      }
      await page.waitForFunction(sheetId => window.SpreadsheetApp?.workbook?.worksheetManager?.getSheetBySheetId?.(sheetId)?.cellDataGrid, { timeout: 60000, polling: 500 }, id)
      await new Promise(resolve => setTimeout(resolve, 2000))
      const rows = await page.evaluate((sheetId, limits) => {
        const sheet = window.SpreadsheetApp.workbook.worksheetManager.getSheetBySheetId(sheetId)
        const grid = sheet.cellDataGrid
        const rowCount = sheet.getRowCount()
        const columnCount = sheet.getColCount()
        if (rowCount > limits.rows || columnCount > limits.columns || rowCount * columnCount > limits.cells) throw new Error('工作表大小超过限制')
        const data = []
        let trailingEmptyRows = 0
        const textOf = (cell) => {
          if (!cell) return ''
          if (typeof cell.formattedValue?.value === 'string') return cell.formattedValue.value
          if (typeof cell.value === 'string' || typeof cell.value === 'number') return String(cell.value)
          if (cell.value?.r) return cell.value.r.map(run => run.t || '').join('')
          return ''
        }
        for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
          const row = []
          let hasData = false
          for (let columnIndex = 0; columnIndex < columnCount; columnIndex++) {
            const text = textOf(grid.getCellData(rowIndex, columnIndex)).slice(0, limits.cellLength)
            row.push(text)
            if (text) hasData = true
          }
          if (hasData) {
            trailingEmptyRows = 0
            data.push(row)
          } else if (data.length && ++trailingEmptyRows >= 10) break
        }
        const usedColumns = data.reduce((maximum, row) => {
          for (let index = row.length - 1; index >= 0; index--) if (row[index]) return Math.max(maximum, index + 1)
          return maximum
        }, 0)
        return data.map(row => row.slice(0, usedColumns))
      }, id, { rows: MAX_ROWS, columns: MAX_COLUMNS, cells: MAX_CELLS, cellLength: MAX_CELL_LENGTH })
      if (rows.length) XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), name)
    }
    if (!workbook.SheetNames.length) throw new Error('腾讯文档中没有可读取的工作表')
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    if (buffer.length > MAX_XLSX_BYTES) throw new Error(`XLSX 大小超过限制（${MAX_XLSX_BYTES} 字节）`)
    return buffer
  } finally {
    try { await browser.close() } catch { browser.process()?.kill('SIGKILL') }
  }
}

export function syncOnce(key, url) {
  if (syncing.has(key)) return syncing.get(key)
  const task = syncWithLimit(url).finally(() => syncing.delete(key))
  syncing.set(key, task)
  return task
}

export async function refreshCache(docUrl) {
  const key = cacheKey(docUrl)
  const buffer = await syncOnce(key, docUrl)
  const file = cacheFile(key)
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`
  try {
    writeFileSync(temporary, buffer, { mode: 0o600, flag: 'wx' })
    try { unlinkSync(file) } catch {}
    renameSync(temporary, file)
  } finally {
    try { unlinkSync(temporary) } catch {}
  }
  removeExpiredCacheFiles()
  return { buffer, file, key }
}

export async function prewarmDocuments(urls, { strict = false } = {}) {
  const results = await Promise.allSettled(urls.map(async url => {
    const key = cacheKey(url)
    if (fromCache(key)) {
      log('预热命中缓存', key)
      return key
    }
    await refreshCache(url)
    log('预热完成', key)
    return key
  }))
  const failures = results.filter(result => result.status === 'rejected')
  for (const failure of failures) log('预热失败', failure.reason?.message || failure.reason)
  if (strict && failures.length) throw new Error(`${failures.length} 个文档预热失败`)
  return results
}
