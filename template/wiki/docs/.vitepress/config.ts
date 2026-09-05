import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitepress'
import { createContentTree, createContentTreeWatcher, sidebarItemToNav, tokenizeChineseSearch } from 'vitepress-qutwiki-kit/config'
import { installWikiMarkdown } from 'vitepress-qutwiki-kit/markdown'
import { site } from './site'

const currentDirectory = dirname(fileURLToPath(import.meta.url))
const docsRoot = resolve(currentDirectory, '..')
const contentRoot = resolve(docsRoot, 'content')
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
  base: process.env.SITE_BASE || '/',
  head: [['link', { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }]],
  vite: { plugins: [createContentTreeWatcher(contentRoot, buildContent)] },
  markdown: { config: (md) => installWikiMarkdown(md, { xlsx: { docsRoot } }) },
  themeConfig: {
    nav: [{ text: '首页', link: '/' }, ...buildContent().map(sidebarItemToNav)],
    sidebar: { '/content/': buildContent() },
    socialLinks: [{ icon: 'github', link: site.repository }],
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
