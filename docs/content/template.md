# 模板使用

`template/wiki/` 是完整可运行的 VitePress 项目，适合直接复制后开始编写内容。它已经组合了自动导航、中文搜索、Markdown 扩展、组件注册和图片查看器。

```bash
cd template/wiki
npm ci
npm run dev
```

首次克隆模板，或删除过 `node_modules` 后，需要先执行 `npm ci` 恢复锁文件中记录的依赖。若直接运行开发命令时出现 `vitepress` 不是内部或外部命令，也应先执行 `npm ci`。

复制到独立仓库后，修改以下位置：

- `docs/.vitepress/site.ts`：站名、描述、仓库地址和目录名称
- `docs/index.md`：首页文案
- `docs/content/`：所有示例文章和真实内容，可继续按栏目分目录
- `docs/.vitepress/theme/style.css`：品牌色及少量展示样式

模板示例同样参考 [wiki.quters.top](https://wiki.quters.top/) 中已经实际运行的组件组合，但不包含其校园正文、地图、组织数据、品牌资源或服务端代码。
