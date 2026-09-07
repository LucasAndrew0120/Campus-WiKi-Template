---
title: 内容区（start）使用指南
---

# 内容区（start）使用指南

本模板在 `docs/.vitepress/config.ts` 前部内置了一套**内容自动目录生成**能力：你只需要把 Wiki 页面以 Markdown 形式放进 `docs/start/`，侧边栏的 `/start/` 就会**自动**按分组生成导航，无需手写侧边栏。

> 这套能力与本站已有的 `docs/content/`（kit 插件文档演示）相互独立、互不干扰。你完全可以只新增 `docs/start/` 来承载自己的 Wiki 正文。

## 快速上手

按下面的目录结构放文件即可：

```text
docs/start/
├── preface/
│   └── introduction.md      # 顶层分组：序言
├── newstudent/
│   ├── campus-card.md       # top: 1 会排最前
│   └── transportation.md
└── campus-life/
    ├── study/
    │   └── academic-system.md
    └── daily-life/
        └── dormitory.md
```

每篇页面正文只要有一个 `#` 一级标题（或在 frontmatter 里写 `title`），就会被自动纳入导航。

## 目录名 → 中文名（必读）

侧栏里展示的是**中文分组名**，需要通过 `directoryLabels` 把文件夹名映射成中文。映射在 `config.ts` 前部的这段里：

```ts
const directoryLabels: Record<string, string> = {
  preface: '序言',
  newstudent: '新生入学',
  'campus-life': '校园生活',
  about: '关于',
}
```

新增一个文件夹却**忘记补映射**时，启动会**直接报错提醒你**（而不是默默不显示），这是刻意为之。

- 顶层分组顺序用 `sectionOrder` 调整：
  ```ts
  const sectionOrder = ['preface', 'newstudent', 'campus-life', 'about']
  ```
- 某个分组下的子目录顺序用 `subSectionOrder` 调整，例如 `campus-life` 下的 `study / daily-life / systems / competition`。

## 排序规则

| 方式 | 写法 | 效果 |
|---|---|---|
| frontmatter `top` | `top: 1`（正整数，越小越靠前） | 置顶排序 |
| 默认 | 什么都不写 | 按文件**创建时间**从早到晚 |
| 子目录 | 目录名 | 按 `subSectionOrder` / 名称排序，递归成组 |

`top` 示例：

```md
---
title: 校园卡办理指南
top: 1
---
```

## 标题怎么取

导航标题优先级：

1. frontmatter `title`（推荐，见上）
2. 正文第一个 `#` 一级标题
3. `<h1>` 标签

注意：**没有一级标题的文件会启动报错**，提醒你补上，避免导航出现无名条目。

## 中文搜索（已内置）

搜索已经启用中文分词（`tokenizeChineseSearch`），支持按中文词组检索。

- 某页不想进搜索：frontmatter 写 `search: false`。

## 阅读字数统计（已内置）

Markdown 渲染时会在页面注入**阅读字数**提示（由 `vitepress-qutwiki-kit` 的 Markdown 扩展完成，样式类为 `wk-word-count`），搜索索引里会自动剔除该提示文本。

- 某页不想显示字数：frontmatter 写 `wordCount: false`。

## 常见问题

**Q：为什么我的侧边栏 /start/ 一直是空的？**
A：`docs/start/` 目前为空或不存在，这是正常现象。放入 Markdown 后导航会自动出现；`npm run dev` 也会监听该目录，结构变化自动刷新/重启。

**Q：报错“文件夹缺少中文名映射：docs/start/xxx”？**
A：你新建了分组文件夹但没在 `directoryLabels` 里加对应中文名，补上即可。

**Q：报错“Markdown 文件缺少一级标题”？**
A：该文件没有 frontmatter `title`，正文也没有 `#` 一级标题，补一个即可。
