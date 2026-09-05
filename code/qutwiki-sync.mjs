#!/usr/bin/env node
import { resolve } from 'node:path'
import { documentUrlsFromEnv, scanMarkdownDocumentUrls, uniqueDocumentUrls } from './document-urls.mjs'
import { prewarmDocuments } from './xlsx-sync.mjs'

const args = process.argv.slice(2)
const docsIndex = args.indexOf('--docs')
const docsRoot = docsIndex >= 0 ? args[docsIndex + 1] : null
if (docsIndex >= 0) args.splice(docsIndex, 2)
if (args.includes('-h') || args.includes('--help')) {
  console.log('用法：node qutwiki-sync.mjs [腾讯文档链接 ...] [--docs <Markdown目录>]')
  console.log('环境变量：DOC_URLS=["链接1","链接2"]')
  process.exit(0)
}

const urls = uniqueDocumentUrls([
  ...args,
  ...documentUrlsFromEnv(),
  ...(docsRoot ? scanMarkdownDocumentUrls(resolve(docsRoot)) : []),
])
if (!urls.length) {
  console.log('没有发现需要同步的腾讯文档')
  process.exit(0)
}

console.log(`准备同步 ${urls.length} 个腾讯文档`)
try {
  await prewarmDocuments(urls, { strict: true })
} catch (error) {
  console.error(error.message)
  process.exit(1)
}
