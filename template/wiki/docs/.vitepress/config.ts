import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitepress'
import { createContentTree, createContentTreeWatcher, createSiteStats, sidebarItemToNav, tokenizeChineseSearch } from 'vitepress-qutwiki-kit/config'
import { installWikiMarkdown } from 'vitepress-qutwiki-kit/markdown'
import { site } from './site'

const currentDirectory = dirname(fileURLToPath(import.meta.url))
const docsRoot = resolve(currentDirectory, '..')
const contentRoot = resolve(docsRoot, 'content')
const repositoryName = process.env.GITHUB_REPOSITORY?.split('/').at(-1)
const defaultBase = process.env.GITHUB_ACTIONS === 'true' && repositoryName && !repositoryName.endsWith('.github.io')
  ? `/${repositoryName}/`
  : '/'
const base = process.env.SITE_BASE || defaultBase
const siteStats = createSiteStats(docsRoot)
const buildContent = () => createContentTree({
  root: contentRoot,
  routeBase: '/content/',
  directoryLabels: site.directoryLabels,
  sectionOrder: site.sectionOrder,
})

export default defineConfig({
  lang: 'zh-CN',
  title: site.title,
  description: site.description,
  cleanUrls: true,
  lastUpdated: true,
  outDir: resolve(currentDirectory, '../../dist'),
  base,
  head: [['link', { rel: 'icon', href: `${base}favicon.svg`, type: 'image/svg+xml' }]],
  vite: { plugins: [createContentTreeWatcher(contentRoot, buildContent)] },
  markdown: { config: (md) => installWikiMarkdown(md, { xlsx: { docsRoot } }) },
  themeConfig: {
    nav: [{ text: '首页', link: '/' }, ...buildContent().map(sidebarItemToNav)],
    sidebar: { '/content/': buildContent() },
    socialLinks: [{ icon: 'github', link: site.repository }],
    footer: {
      message: `基于 VitePress 构建  ·  全站共计 <span style="color:var(--vp-c-brand-1)">${(siteStats.wordCount / 1000).toFixed(1)}K</span> 字`,
      copyright: `Copyright © 2026 <a href="${site.repository}" style="color:inherit;">${site.title}</a><br>本站源代码与插件文档采用 <a href="${site.repository}/blob/main/LICENSE" style="color:inherit;">MIT License</a>`,
    },
    search: {
      provider: 'local',
      options: {
        miniSearch: { options: { tokenize: tokenizeChineseSearch, processTerm: (term) => term.toLowerCase() } },
        async _render(source, env, md) {
          if ((env as any).frontmatter?.search === false) return ''
          return md.render(source, env).replace(/<span class="wk-word-count">.*?<\/span>/g, '')
        },
      },
    },
  },
})
