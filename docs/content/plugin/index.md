# 插件功能说明

`vitepress-qutwiki-kit` 是从 [QUTWiKi](https://github.com/QUT-Lib/QUT-WiKi) 实际使用的 VitePress 功能中抽离出的通用工具包。本页沿用 QUTWiKi 功能说明的组织方式，介绍各项能力及其写法；示例已替换为通用数据，路径和部署方式也已适配 Campus-WiKi-Template。

插件面向 VitePress 1.x，可按需使用 Vue 组件、Markdown 扩展、内容树和中文搜索配置。它不包含 QUTWiKi 的校园正文、组织数据、地图点位、品牌资源、域名或生产环境配置。

## 一、XLSX 表格卡片渲染

在 Markdown 中引用本地 Excel 文件或公开的腾讯文档，构建时自动转换为卡片网格。

> **QUTWiKi 示例网页：** [学生社团](https://wiki.quters.top/start/campus-life/qut-organization/club)、[兴趣群](https://wiki.quters.top/start/campus-life/qut-organization/interest-group)和[实验室](https://wiki.quters.top/start/campus-life/qut-organization/lab)均由腾讯文档同步后渲染为卡片，可观察分组、头像、描述、标签和联系方式效果。

![XLSX 表格卡片插件](https://pic1.imgdb.cn/i/034JGbU5fEF72AZb0sOEGN.webp)

### 基本语法

````md
```xlsx /resources/文件.xlsx name=卡片名称列&key=分组列&hide=隐藏列1,隐藏列2&contact=联系方式列&avatar=头像列&desc=描述列&tag=标签列&table=工作表名
```
````

文件路径和参数之间使用空格分隔。腾讯文档 URL 自身可以保留 `?tab=...` 查询参数，插件参数仍写在第一个空格之后：

````md
```xlsx https://docs.qq.com/sheet/文档ID?tab=000001 table=工作表名&name=名称&key=分类
```
````

### 参数说明

| 参数 | 说明 | 示例 |
| --- | --- | --- |
| `name=A` | 卡片名称列 | `name=社团名称` |
| `key=B,C` | 分组和名称候选列；第一列用于生成分组标题 | `key=类别,名称` |
| `hide=D,E` | 不渲染的列 | `hide=序号,内部备注` |
| `contact=F,G` | 底部联系方式；其中的数字可点击复制 | `contact=联系方式` |
| `avatar=H` | 头像列；URL 直接使用，其他值按 QQ 群号生成头像地址 | `avatar=群号` |
| `desc=I` | 名称下方的描述列 | `desc=简介` |
| `tag=J,K` | 标签列；不指定时，其他非隐藏列会作为标签 | `tag=方向,校区` |
| `table=Sheet名` | 指定工作表 | `table=社团` |
| `sheet=Sheet名` | `table` 的别名 | `sheet=社团` |
| `#Sheet名` | 路径后的工作表简写 | `/resources/文件.xlsx#社团` |

### 卡片内容

典型的卡片顺序为：

```text
圆形头像 → 名称 → 描述 → 标签 → 联系方式
```

- 卡片根据内容区宽度自动分栏，移动端会收缩为较少列。
- 长名称和描述自动换行。
- `tag` 列按中英文逗号或换行拆分为多个标签。
- `contact` 中连续的数字会显示为可点击按钮，点击后写入剪贴板。
- `avatar` 为 HTTP(S) URL 时直接加载，为群号等其他值时生成 `p.qlogo.cn` 地址。

### 文件来源与限制

- 本地 XLSX 必须放在 `docs/public/resources/`，Markdown 中使用 `/resources/文件.xlsx`。
- 在线来源仅接受规范的 `https://docs.qq.com/sheet/` 公开分享链接。
- 不接受任意远程 XLSX 下载地址、绝对文件路径或目录穿越路径。
- 单个 XLSX 最大 20 MiB，最多 20 张工作表。
- 单张工作表最多读取 5000 行、100 列。

### 腾讯文档同步

腾讯文档需要通过同步程序转换：

```text
Markdown 在线链接 → 本地缓存 → 同步后端 → Chromium → XLSX → 构建为 HTML
```

插件缓存位于：

```text
docs/.http_cache/<腾讯文档ID>.xlsx
```

缓存有效时，构建直接读取本地文件，不访问同步服务。缓存缺失或过期时，插件请求 `QUTWIKI_XLSX_API`。项目提供两种部署方式：

| 场景 | 同步方式 |
| --- | --- |
| GitHub Pages | Actions 扫描所有 Markdown，构建前运行 Chromium 并预热缓存 |
| 自有服务器 | `docker-compose.yml` 运行独立同步 API，由反向代理提供 HTTPS |

Docker、GitHub Actions、多文档环境变量和缓存规则参见[部署与 XLSX 同步](/content/deployment)。

## 二、Gallery 图片画廊

`Gallery` 将多张图片按原始宽高比排列成自适应的杂志式网格。

> **QUTWiKi 示例网页：** [校园网](https://wiki.quters.top/start/newstudent/campus-network)在缴费和登录步骤中使用多组 Gallery，可观察不同图片数量下的自适应排版。

![Gallery 图片画廊插件](https://pic1.imgdb.cn/i/034JGbWUu2RaMQXrgCFEIc.webp)

### 用法

```md
<Gallery :row-height="220" :gap="8">

![第一张图片](https://example.com/pic1.jpg)

![第二张图片](https://example.com/pic2.jpg)

</Gallery>
```

图片前后需要保留空行，以便 Markdown 正确生成图片节点。

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `row-height` | number | `220` | 每行的目标高度，组件会结合容器宽度和图片比例重新计算 |
| `gap` | number | `8` | 图片间距，单位为像素 |

组件会监听容器尺寸和图片加载状态。内容区宽度变化后，画廊会自动重新排版，无需手工指定每张图片的宽高。

## 三、AppCards 应用卡片

`AppCards` 适合展示应用、系统入口、常用资源和工具链接，支持响应式分栏和深色模式。

> **QUTWiKi 示例网页：** [常用软件](https://wiki.quters.top/start/campus-life/systems/software)使用多组 AppCards 展示生活、学习、校务和工具类应用，适合检查大量卡片的响应式布局。

![AppCards 应用卡片插件](https://pic1.imgdb.cn/i/034JGbYWYeuVkfZfdyKFb9.webp)

### 用法

组件经 `installWikiComponents` 注册后，可直接写在 Markdown 中：

```md
<AppCards width="12em" :desc-lines="2" :links="[
  {
    text: 'VitePress',
    icon: 'https://vitepress.dev/vitepress-logo-mini.svg',
    desc: '由 Vite 与 Vue 驱动的静态站点生成器',
    link: 'https://vitepress.dev/'
  },
  {
    text: '内容规范',
    desc: '站内的 Wiki 编写说明',
    link: '/guide/getting-started'
  }
]" />
```

### 组件属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `links` | array | 无 | 卡片数组，必填 |
| `width` | string | `12em` | 网格的最小列宽，空间不足时自动折行 |
| `text-lines` | number | `2` | 名称最多显示的行数 |
| `desc-lines` | number / `false` | `false` | 描述最多显示的行数；`false` 表示不限制 |

### 卡片字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `text` | string | 卡片名称 |
| `icon` | string | HTTP(S) 图片地址，显示在卡片左侧 |
| `desc` | string | 名称下方的说明文字 |
| `link` | string | HTTP(S) 地址或站内相对路径；外链自动在新窗口打开 |

链接为空或协议不安全时，组件会渲染普通卡片而不是可点击链接。

### 来源说明

该组件基于 [xupt-wiki/xupt-wiki](https://github.com/xupt-wiki/xupt-wiki) 的 `LinkList` 思路改编，原项目使用 MIT License。本仓库版本已调整数据结构、样式和链接校验。

## 四、Flink 友链卡片

`Flink` 和 `Flinks` 用于展示站点截图、头像、名称和描述，并自动适配桌面与移动端。

> **QUTWiKi 示例网页：** [友情链接](https://wiki.quters.top/flink)展示了多张含截图、头像和描述的友链卡片，以及桌面端和移动端的分栏效果。

![Flink 友链卡片插件](https://pic1.imgdb.cn/i/034JGbbCGsAWIcUNkCEUss.webp)

### 批量写法

推荐使用 `<flink>` Markdown 容器，一个 `-` 表示一条友链：

```md
<flink>
  - name: VitePress
    link: https://vitepress.dev/
    avatar: https://vitepress.dev/vitepress-logo-mini.svg
    descr: 由 Vite 与 Vue 驱动的静态站点生成器
    siteshot: https://vitepress.dev/vitepress-logo-large.webp
  - name: Vue
    link: https://vuejs.org/
    avatar: https://vuejs.org/images/logo.png
    desc: 渐进式 JavaScript 框架
</flink>
```

`flinkBlockPlugin` 会在构建期将这段内容转换为 `<Flinks>` 组件。

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `name` | 是 | 站点名称 |
| `link` | 是 | HTTP(S) 地址或安全的站内相对路径 |
| `avatar` | 否 | 圆形头像地址 |
| `desc` / `descr` | 否 | 最多显示两行的站点描述 |
| `siteshot` | 否 | 卡片上方的站点截图 |

### 单张卡片

也可以直接使用全局组件：

```md
<Flink
  name="站点名称"
  link="https://example.com/"
  avatar="https://example.com/avatar.png"
  siteshot="https://example.com/screenshot.png"
  desc="站点描述"
/>
```

- 桌面端最多四列，平板三列，手机两列。
- 截图按固定比例裁剪，悬停时轻微放大。
- 头像或截图加载失败时自动隐藏，不破坏布局。
- 不安全的链接不会生成可点击的 `<a>` 元素。

## 五、图片题注与查看器

> **QUTWiKi 示例网页：** [校园网](https://wiki.quters.top/start/newstudent/campus-network)包含大量带 alt 说明的步骤截图。图片下方会显示题注，点击图片可以打开缩放查看器。

![ImageViewer 图片查看器插件](https://pic1.imgdb.cn/i/034JGbe9vLLZTcuajcnqEC.webp)

### 图片题注

启用 `imageCaptionPlugin` 后，Markdown 图片的 alt 文本会显示为图片题注：

```md
![教学楼入口](./images/building.jpg)
```

题注文本经过 HTML 转义。没有 alt 文本的图片不会生成空题注。

### ImageViewer

将 `ImageViewer` 放在自定义布局中，即可接管正文图片的点击预览：

```vue
<script setup>
import DefaultTheme from 'vitepress/theme'
import { ImageViewer } from 'vitepress-qutwiki-kit'
</script>

<template>
  <DefaultTheme.Layout />
  <ImageViewer selector=".vp-doc img" />
</template>
```

查看器支持：

- 点击正文图片打开。
- 滚轮缩放，缩放范围为 0.3 到 6 倍。
- 指针拖动图片。
- 双击在原始大小和 2.5 倍之间切换。
- `Esc`、关闭按钮或点击遮罩退出。

为图片添加 `data-no-viewer` 属性可以跳过查看器。

## 六、字数与阅读时间

`wordCountPlugin` 统计文章中的中文字符，并在一级标题旁显示字数和预计阅读时间。

> **QUTWiKi 示例网页：** [教务系统](https://wiki.quters.top/start/campus-life/study/academic-system)的一级标题旁显示“字数 / 预计阅读时间”，可直接观察插件输出。

![WordCount 字数与阅读时间插件](https://pic1.imgdb.cn/i/034JGbfzaXIGE7Iu4jB6o2.webp)

默认阅读速度为每分钟 350 个中文字符。可以在插件配置中修改：

```ts
installWikiMarkdown(md, {
  wordCount: {
    wordsPerMinute: 300,
    format: (count, minutes) => `${count} 字 / 约 ${Math.ceil(minutes)} 分钟`,
  },
})
```

单篇文章可通过 frontmatter 关闭：

```yaml
---
wordCount: false
---
```

## 七、Twikoo 评论

Twikoo 位于独立入口，不使用时不会进入核心模块：

> **QUTWiKi 示例网页：** [教务系统](https://wiki.quters.top/start/campus-life/study/academic-system)等普通文档页底部加载 Twikoo 评论区；首页等特殊布局不显示评论。

![Twikoo 评论插件](https://pic1.imgdb.cn/i/034JGfwx1xaHN5DNDdUDj0.webp)

```bash
npm install twikoo
```

```vue
<script setup>
import { TwikooComments } from 'vitepress-qutwiki-kit/twikoo'
</script>

<template>
  <TwikooComments
    env-id="https://comments.example.com"
    lang="zh-CN"
    title="讨论"
    error-text="评论暂时无法加载。"
  />
</template>
```

| 属性 | 默认值 | 说明 |
| --- | --- | --- |
| `env-id` | 无 | Twikoo 服务地址，必填 |
| `lang` | `zh-CN` | Twikoo 界面语言 |
| `title` | `评论` | 评论区标题 |
| `error-text` | `评论加载失败，请稍后重试。` | 初始化失败时显示的文字 |

组件仅在浏览器挂载后动态加载 Twikoo，不参与服务端渲染。

## 八、自动导航

`createContentTree` 扫描 Markdown 目录并生成 VitePress sidebar 数据。标题优先读取 frontmatter `title`，其次读取一级标题，最后使用文件名。

> **QUTWiKi 示例网页：** [QUTWiKi 首页](https://wiki.quters.top/)顶部导航及“开始阅读”后的文档侧边栏由内容目录生成，可观察多级栏目和页面顺序。

![ContentTree 自动导航插件](https://pic1.imgdb.cn/i/034JGbk2t848iEPQv5mNz7.webp)

```ts
import { resolve } from 'node:path'
import {
  createContentTree,
  createContentTreeWatcher,
  sidebarItemToNav,
} from 'vitepress-qutwiki-kit/config'

const guideRoot = resolve('docs/guide')
const buildGuide = () => createContentTree({
  root: guideRoot,
  routeBase: '/guide/',
  directoryLabels: { basics: '基础' },
  sectionOrder: ['basics'],
})

export default defineConfig({
  vite: {
    plugins: [createContentTreeWatcher(guideRoot, buildGuide)],
  },
  themeConfig: {
    nav: buildGuide().map(sidebarItemToNav),
    sidebar: { '/guide/': buildGuide() },
  },
})
```

排序依次比较 frontmatter 的 `top`、`order` 和文件名。开发模式下，目录结构发生变化时 watcher 会重启 VitePress，使导航及时更新。

## 九、中文搜索

`tokenizeChineseSearch` 将连续中文切分为双字 token，同时保留英文和数字词。它可以直接接入 VitePress 本地搜索：

> **QUTWiKi 示例网页：** 打开 [QUTWiKi 首页](https://wiki.quters.top/)右上角搜索框，输入“校园网”“教务系统”等中文词语，可观察本地搜索结果和中文匹配效果。

![中文搜索分词插件](https://pic1.imgdb.cn/i/034JGbn2IPtaFiMjsWil1c.webp)

```ts
import { tokenizeChineseSearch } from 'vitepress-qutwiki-kit/config'

export default defineConfig({
  themeConfig: {
    search: {
      provider: 'local',
      options: {
        miniSearch: {
          options: {
            tokenize: tokenizeChineseSearch,
            processTerm: term => term.toLowerCase(),
          },
        },
      },
    },
  },
})
```

该功能不替换 VitePress 的搜索引擎，只改善中文词语的匹配和召回。

## 十、统一安装

### 注册组件

```ts
import DefaultTheme from 'vitepress/theme'
import { installWikiComponents } from 'vitepress-qutwiki-kit'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    installWikiComponents(app)
  },
}
```

传入 `{ componentPrefix: 'Wiki' }` 后，组件名会变为 `WikiGallery`、`WikiAppCards` 等，可避免与现有全局组件冲突。

### 注册 Markdown 扩展

```ts
import { installWikiMarkdown } from 'vitepress-qutwiki-kit/markdown'

installWikiMarkdown(md, {
  imageCaptions: true,
  flinks: true,
  wordCount: true,
  xlsx: { docsRoot },
})
```

XLSX 是可选扩展，只有传入 `xlsx` 配置时才启用。完整安装步骤参见[安装与配置](/content/plugin/usage)，API 和能力边界参见[API 与边界](/content/plugin/migration)。

## 设计原则

- **按需接入**：组件、Markdown、Twikoo 和配置工具使用独立入口。
- **不接管主题**：样式基于 VitePress CSS variables，可嵌入现有主题。
- **稳定构建**：静态资源、在线缓存和最终构建目录职责分离。
- **安全默认**：链接、文件路径和腾讯文档 URL 都进行约束，用户内容进行 HTML 转义。
- **业务无关**：不绑定学校名称、组织名单、域名、统计 ID 或部署平台。
