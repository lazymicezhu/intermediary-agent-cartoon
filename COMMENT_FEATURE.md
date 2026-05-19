# 评论功能部署说明

当前实现使用 Cloudflare Pages Functions + D1。

## Cloudflare 需要配置

1. 创建一个 D1 数据库，例如 `cartoon_comments`。
2. 在 Cloudflare Pages 项目的 Settings -> Functions -> D1 database bindings 中增加绑定：
   - Variable name: `DB`
   - D1 database: 选择刚创建的数据库
3. 执行 `migrations/0001_create_comments.sql` 建表。
4. 如果数据库已经创建过旧版 `comments` 表，再执行 `migrations/0002_add_comment_meta.sql` 增加昵称和颜色字段。
5. 执行 `migrations/0003_create_active_screens.sql` 创建主屏在线统计表。
6. 重新部署 Pages。

## 页面与 API

- 主页面二维码会指向 `https://cartoon.lazymicezhu.com/comment.html`。
- 手机评论页：`/comment.html`
- 评论提交：`POST /api/comments`
- 主屏拉取新评论：`GET /api/comments?after=<last_id>`
- 统计页面：`/stats.html`
- 统计接口：`GET /api/stats`

本地普通静态服务器没有 Cloudflare Functions，所以会自动降级到 `localStorage`，方便预览气泡效果。
