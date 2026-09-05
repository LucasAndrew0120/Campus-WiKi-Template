# Campus-WiKi-Template

这是一个可直接复制的通用 VitePress Wiki 模板。

```bash
npm ci
npm run dev
```

首次克隆模板，或清理过 `node_modules` 后，必须先执行 `npm ci`。如果提示 `vitepress` 不是内部或外部命令，表示依赖尚未安装。

腾讯文档同步和生产构建：

```bash
cd ../../code
npm ci
cd ../template/wiki
CACHE_DIR="$PWD/docs/.http_cache" npm run sync:xlsx
npm run build
```

所有普通文章集中放在 `docs/content/`，首页保留为 `docs/index.md`。最终静态网站始终输出到 `dist/`，手工维护的静态资源放在 `docs/public/`，在线文档缓存放在 `docs/.http_cache/`。Docker 后端、GitHub Pages 和多文档环境变量配置参见仓库根目录的 `docs/content/deployment.md`。

开始使用前修改：

- `docs/.vitepress/site.ts`：站名、描述、仓库链接和目录名称
- `docs/index.md`：首页文案
- `docs/content/`：所有普通文章；可按校园生活、入学指南等栏目继续分目录

模板当前默认引用仓库内的 `file:../../packages/vitepress-qutwiki-kit`。单独复制模板后，将依赖改为已发布的 `vitepress-qutwiki-kit` 版本，或改为插件包在新项目中的实际相对路径。
