# 部署与 XLSX 同步

Campus-WiKi-Template 脱胎于 [QUTWiKi](https://github.com/QUT-Lib/QUT-WiKi)，本配置将原项目中的通用构建与 XLSX 同步能力整理为可迁移方案，不包含 QUTWiKi 的校园内容、品牌和生产环境配置。

项目使用同一套构建目录约定，GitHub Pages 和服务器不需要维护两份资源结构。

| 路径 | 内容 | 是否提交 |
| --- | --- | --- |
| `template/wiki/docs/public/` | 图片、本地 XLSX 等源静态文件 | 是 |
| `docs/.http_cache/` | 文档站的在线文档解析缓存 | 否 |
| `docs/.vitepress/dist/` | GitHub Pages 文档站构建产物 | 否 |
| `template/wiki/docs/.http_cache/` | 示例 Wiki 的在线文档解析缓存 | 否 |
| `template/wiki/dist/` | 示例 Wiki 的静态网站构建产物 | 否 |
| `code/` | Chromium XLSX 同步后端及 CLI | 是 |

GitHub Pages 发布根文档站的 `docs/.vitepress/dist/`；使用模板建立自己的 Wiki 时部署 `template/wiki/dist/`。两者都是完整静态目录，迁移到 Nginx、Caddy、对象存储或其他静态平台时不需要重新整理内部资源。

## 在线文档

Markdown 中可以引用腾讯文档：

````md
```xlsx https://docs.qq.com/sheet/文档ID table=工作表名&name=名称&key=分类
```
````

构建插件先读取 `docs/.http_cache/<文档ID>.xlsx`。缓存有效时不会访问同步 API；缓存缺失或过期时才请求 `QUTWIKI_XLSX_API`。CLI、Docker 后端和构建插件使用相同的文档 ID 作为缓存键。

`DOC_URLS` 可以提前指定多个文档，支持 JSON 数组、换行或空白分隔：

```env
DOC_URLS=["https://docs.qq.com/sheet/AAAA","https://docs.qq.com/sheet/BBBB?tab=000001"]
```

兼容单地址变量：

```env
DOC_URL=https://docs.qq.com/sheet/AAAA
```

只支持无需登录即可访问的腾讯文档。

## GitHub Pages

`.github/workflows/pages.yml` 使用 GitHub 官方 Pages Artifact，不需要也不会创建 `gh-pages` 静态分支：

1. 恢复根文档站 `docs/.http_cache` 的 Actions 缓存。
2. 扫描 `docs/**/*.md` 中所有 `xlsx` 代码块。
3. 合并仓库变量 `DOC_URLS` 中预设的地址并按文档 ID 去重。
4. 运行 Chromium，将结果提前写入插件缓存。
5. 构建文档站静态目录 `docs/.vitepress/dist/`。
6. 上传并部署 Pages Artifact。

在 GitHub 仓库的 Settings > Pages 中将 Source 设为 **GitHub Actions**。项目 Pages 的路径前缀会根据仓库名自动生成，例如仓库 `Campus-WiKi-Template` 会使用 `/Campus-WiKi-Template/`，无需手工设置。可设置以下 Actions Variables：

| 变量 | 示例 | 说明 |
| --- | --- | --- |
| `SITE_BASE` | `/` | 可选覆盖；使用自定义域名或用户主页仓库时填 `/` |
| `DOC_URLS` | `["https://docs.qq.com/sheet/AAAA"]` | 可选的预热文档列表 |

本地执行相同流程：

```bash
cd code
npm ci
cd ../template/wiki
npm ci
CACHE_DIR="$PWD/docs/.http_cache" npm run sync:xlsx
npm run build
```

不要在同步后设置 `QUTWIKI_XLSX_FORCE=1`，否则插件会忽略刚生成的有效缓存。

## Docker 同步后端

根目录的 `docker-compose.yml` 只运行 XLSX 同步 API，不托管静态网站：

```bash
docker compose up -d --build
docker compose logs -f xlsx-sync
```

默认仅绑定宿主机 `127.0.0.1:3456`：

```text
GET /health
GET /api/xlsx?url=https%3A%2F%2Fdocs.qq.com%2Fsheet%2FAAAA
```

可在根目录创建 `.env`：

```env
XLSX_SYNC_PORT=3456
CACHE_TTL=3600000
MAX_CONCURRENT_SYNCS=2
MAX_SYNC_QUEUE=10
DOC_URLS=["https://docs.qq.com/sheet/AAAA","https://docs.qq.com/sheet/BBBB"]
PREWARM_STRICT=0
```

容器启动时会先解析 `DOC_URLS`。之后收到相同文档 ID 的请求时，只要缓存未过期就直接返回缓存，并通过 `X-Cache: HIT` 标记。

`PREWARM_STRICT=1` 表示任一预热文档失败时不启动服务；默认值 `0` 会记录失败并继续启动，以便稍后重试。

构建 Wiki 时指定后端地址：

```bash
QUTWIKI_XLSX_API=https://xlsx.example.com npm run build
```

## 反向代理建议

同步 API 会启动 Chromium，公网部署必须放在 HTTPS 反向代理后，并配置访问控制、限流、请求超时和日志。Compose 默认绑定回环地址就是为了避免容器端口直接暴露公网。

Caddy 示例：

```caddyfile
xlsx.example.com {
  encode zstd gzip
  reverse_proxy 127.0.0.1:3456 {
    transport http {
      read_timeout 6m
    }
  }
}
```

Nginx 示例：

```nginx
limit_req_zone $binary_remote_addr zone=xlsx:10m rate=10r/m;

server {
    listen 443 ssl http2;
    server_name xlsx.example.com;

    location / {
        limit_req zone=xlsx burst=5 nodelay;
        proxy_pass http://127.0.0.1:3456;
        proxy_connect_timeout 10s;
        proxy_read_timeout 360s;
        proxy_send_timeout 30s;
    }
}
```

建议进一步通过防火墙、VPN、Cloudflare Access 或反向代理认证限制调用方。当前 API 自身不包含身份认证，不应直接映射到公网地址。
