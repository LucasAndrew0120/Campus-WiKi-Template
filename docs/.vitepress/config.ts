import { defineConfig, type DefaultTheme } from 'vitepress'
import { installWikiMarkdown } from 'vitepress-qutwiki-kit/markdown'
import { createSiteStats, tokenizeChineseSearch } from 'vitepress-qutwiki-kit/config'
import { readdirSync, readFileSync, statSync, existsSync } from 'fs'
import { resolve, extname, dirname, join } from 'path'
import { fileURLToPath } from 'url'

// ============================================================================
// 【模板能力】docs/start 内容区 → 自动生成侧边栏导航
// ----------------------------------------------------------------------------
// 想让 Wiki 像内容型站点那样“丢文件进目录、导航自动出现”，就用这套能力：
//   把 Markdown 放到 docs/start/<分组>/<页面>.md，侧边栏的 /start/ 会自动生成。
//
// 使用约定：
//  1. 目录名 → 中文名：在下方 directoryLabels 补充映射（漏了会报错提醒）。
//  2. 页面标题：优先 frontmatter `title`，否则取正文 `#` 一级标题。
//  3. 排序：可用 frontmatter `top: N` 置顶（正整数、越小越靠前），
//     否则按文件创建时间从早到晚；子目录按名称排序并递归成组。
//  4. 顶层分组顺序可用 sectionOrder 调整；子目录顺序用 subSectionOrder。
//
// 容错：docs/start 不存在或为空时自动返回空侧栏，不影响站点启动与现有页面。
// 若已有 content 体系（手写侧栏），新增 /start/ 只是“叠加”，不会互相覆盖。
// ============================================================================

const __dirname = dirname(fileURLToPath(import.meta.url))
const docsRoot = resolve(__dirname, '..')
const startRoot = resolve(docsRoot, 'start')

// 分组名称：文件夹 -> 中文名。请按你的内容目录补充/修改这里的映射。
const directoryLabels: Record<string, string> = {
  preface: '序言',
  newstudent: '新生入学',
  'campus-life': '校园生活',
  about: '关于',
}
// 顶层分组的展示顺序，未列出的目录排在最后并按名称排序。
const sectionOrder = ['preface', 'newstudent', 'campus-life', 'about']
// 子目录的展示顺序，未列出的目录排在最后并按名称排序。
const subSectionOrder: Record<string, string[]> = {
  'campus-life': ['study', 'daily-life', 'systems', 'competition'],
}

function startDirectoryLabel(relativeDir: string): string {
  const label = directoryLabels[relativeDir]
  if (!label) {
    throw new Error(`文件夹缺少中文名映射：docs/start/${relativeDir}。请在 config.ts 的 directoryLabels 中补充。`)
  }
  return label
}

// 读取 Markdown 标题：优先 frontmatter title，其次 # 一级标题，最后 <h1>
function startExtractTitle(file: string): string {
  const raw = readFileSync(file, 'utf-8')
  const fmMatch = raw.match(/^---\s*\n([\s\S]*?)\n---/)
  if (fmMatch) {
    const titleMatch = fmMatch[1].match(/^title:\s*(.+)$/m)
    if (titleMatch) return titleMatch[1].trim().replace(/^["'](.+)["']$/, '$1')
  }
  const lines = raw.split(/\r?\n/)
  let fence: string | null = null
  for (const line of lines) {
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/)
    if (fenceMatch) {
      const marker = fenceMatch[1][0]
      if (fence === null) fence = marker
      else if (fence === marker) fence = null
      continue
    }
    if (fence === null) {
      const heading = line.match(/^#(?!#)\s+(.+?)\s*$/)
      if (heading) return heading[1].replace(/\s+#+\s*$/, '').trim()
      const h1 = line.match(/<h1[^>]*>(.+?)<\/h1>/i)
      if (h1) return h1[1].trim()
    }
  }
  throw new Error(`Markdown 文件缺少一级标题：${file}`)
}

// frontmatter 的 top: N 置顶（正整数、从 1 开始），未配置返回 null
function startExtractTop(file: string): number | null {
  const raw = readFileSync(file, 'utf-8')
  const fmMatch = raw.match(/^---\s*\n([\s\S]*?)\n---/)
  if (!fmMatch) return null
  const topMatch = fmMatch[1].match(/^top:\s*(.+)$/m)
  if (!topMatch) return null
  const value = Number(topMatch[1].trim().replace(/^["'](.+)["']$/, '$1'))
  return Number.isInteger(value) && value >= 1 ? value : null
}

function startSortEntries<T extends { name: string; full: string; stat: ReturnType<typeof statSync> }>(a: T, b: T): number {
  const topA = startExtractTop(a.full)
  const topB = startExtractTop(b.full)
  if (topA !== null || topB !== null) {
    if (topA === null) return 1
    if (topB === null) return -1
    return topA - topB || a.name.localeCompare(b.name)
  }
  return a.stat.birthtimeMs - b.stat.birthtimeMs || a.name.localeCompare(b.name)
}

function startHasMarkdown(dir: string): boolean {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      if (startHasMarkdown(full)) return true
    } else if (extname(name) === '.md') {
      return true
    }
  }
  return false
}

// 递归构建一个目录下的条目（文件用 top/时间排序，子目录递归成组）
function buildStartItems(dir: string, relativeDir: string): DefaultTheme.SidebarItem[] {
  const entries = readdirSync(dir).map((name) => {
    const full = join(dir, name)
    return { name, full, stat: statSync(full) }
  })
  const items: DefaultTheme.SidebarItem[] = []
  for (const file of entries.filter((e) => e.stat.isFile() && extname(e.name) === '.md').sort(startSortEntries)) {
    const base = file.name.replace(/\.md$/, '')
    items.push({ text: startExtractTitle(file.full), link: `/start/${relativeDir ? `${relativeDir}/` : ''}${base}` })
  }
  const order = subSectionOrder[relativeDir] || []
  const dirs = entries
    .filter((e) => e.stat.isDirectory() && startHasMarkdown(e.full))
    .sort((a, b) => {
      const rankA = order.indexOf(a.name)
      const rankB = order.indexOf(b.name)
      const orderA = rankA === -1 ? order.length : rankA
      const orderB = rankB === -1 ? order.length : rankB
      return orderA - orderB || a.name.localeCompare(b.name)
    })
  for (const child of dirs) {
    const childRelative = relativeDir ? `${relativeDir}/${child.name}` : child.name
    items.push({ text: startDirectoryLabel(childRelative), collapsed: false, items: buildStartItems(child.full, childRelative) })
  }
  return items
}

// 顶层：根目录 .md 作为独立条目，各文件夹按 sectionOrder 成组
function buildStartSidebar(): DefaultTheme.SidebarItem[] {
  if (!existsSync(startRoot)) return []
  const entries = readdirSync(startRoot).map((name) => {
    const full = join(startRoot, name)
    return { name, full, stat: statSync(full) }
  })
  const groups: DefaultTheme.SidebarItem[] = []
  for (const file of entries.filter((e) => e.stat.isFile() && extname(e.name) === '.md').sort(startSortEntries)) {
    groups.push({ text: startExtractTitle(file.full), link: `/start/${file.name.replace(/\.md$/, '')}` })
  }
  const dirs = entries
    .filter((e) => e.stat.isDirectory() && startHasMarkdown(e.full))
    .sort((a, b) => {
      const rankA = sectionOrder.indexOf(a.name)
      const rankB = sectionOrder.indexOf(b.name)
      const orderA = rankA === -1 ? sectionOrder.length : rankA
      const orderB = rankB === -1 ? sectionOrder.length : rankB
      return orderA - orderB || a.name.localeCompare(b.name)
    })
  for (const dir of dirs) {
    groups.push({ text: startDirectoryLabel(dir.name), collapsed: false, items: buildStartItems(dir.full, dir.name) })
  }
  return groups
}

// 站点侧边栏中使用：sidebar 里的 '/start/' 项绑定到它
const startSidebar = buildStartSidebar()

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/').at(-1)
const defaultBase = process.env.GITHUB_ACTIONS === 'true' && repositoryName && !repositoryName.endsWith('.github.io')
  ? `/${repositoryName}/`
  : '/'
const base = process.env.SITE_BASE || defaultBase
const siteStats = createSiteStats(docsRoot)

export default defineConfig({
  lang: 'zh-CN',
  title: 'Campus-WiKi-Template',
  description: '面向内容型 VitePress 站点的组件、Markdown 扩展与配置工具集',
  cleanUrls: true,
  lastUpdated: true,
  base,
  head: [['link', { rel: 'icon', href: `${base}favicon.svg`, type: 'image/svg+xml' }]],
  markdown: {
    config: (md) => installWikiMarkdown(md),
  },
  themeConfig: {
    nav: [
      { text: '介绍', link: '/' },
      { text: '功能说明', link: '/content/plugin/' },
      { text: '内容编写', link: '/content/start-guide' },
      { text: '使用案例', link: '/content/examples/' },
      { text: '学校地图', link: '/map' },
      { text: '部署', link: '/content/deployment' },
    ],
    sidebar: {
      // 模板能力：docs/start 内容区自动生成（暂无内容时为空，不干扰其他侧栏）
      '/start/': startSidebar,
      '/content/': [
        {
          text: '插件功能',
          items: [
            { text: '功能说明', link: '/content/plugin/' },
            { text: '安装与配置', link: '/content/plugin/usage' },
            { text: 'API 与边界', link: '/content/plugin/migration' },
          ],
        },
        {
          text: '真实用法示例',
          items: [
            { text: '组件与 Markdown', link: '/content/examples/' },
            { text: '友链卡片', link: '/content/examples/flinks' },
          ],
        },
        {
          text: '模板与部署',
          items: [
            { text: '模板使用', link: '/content/template' },
            { text: '部署与 XLSX 同步', link: '/content/deployment' },
          ],
        },
      ],
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/LucasAndrew0120/Campus-WiKi-Template' }],
    footer: {
      message: `基于 VitePress 构建  ·  全站共计 <span style="color:var(--vp-c-brand-1)">${(siteStats.wordCount / 1000).toFixed(1)}K</span> 字`,
      copyright: 'Copyright © 2026 <a href="https://github.com/LucasAndrew0120/Campus-WiKi-Template" style="color:inherit;">Campus WiKi Template</a><br>本站源代码与插件文档采用 <a href="https://github.com/LucasAndrew0120/Campus-WiKi-Template/blob/main/LICENSE" style="color:inherit;">MIT License</a>',
    },
    outline: { level: [2, 3], label: '本页目录' },
    sidebarMenuLabel: '文档目录',
    returnToTopLabel: '返回顶部',
    docFooter: { prev: '上一页', next: '下一页' },
    lastUpdatedText: '最后更新于',
    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: '搜索', buttonAriaLabel: '搜索文档' },
          modal: {
            displayDetails: '显示详细列表', resetButtonTitle: '清空搜索', backButtonTitle: '关闭搜索', noResultsText: '没有找到相关结果',
            footer: { selectText: '选择', selectKeyAriaLabel: '回车键', navigateText: '切换', navigateUpKeyAriaLabel: '上方向键', navigateDownKeyAriaLabel: '下方向键', closeText: '关闭', closeKeyAriaLabel: 'Esc 键' },
          },
        },
        miniSearch: { options: { tokenize: tokenizeChineseSearch, processTerm: (term) => term.toLowerCase() } },
        async _render(source, env, md) {
          if ((env as any).frontmatter?.search === false) return ''
          return md.render(source, env).replace(/<span class="wk-word-count">.*?<\/span>/g, '')
        },
      },
    },
  },
})
