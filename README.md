# 失信漫画平台原型

这是一个面向留学中介失信案例的互动漫画网页。主页面展示多章漫画故事，观众可以通过拖动选项补全最后一格，并在结尾看到每章对应的文字结果。页面还带有实时评论气泡系统：观众用手机扫码进入评论页，提交评论后，主屏会生成带碰撞和漂浮效果的评论气泡。

线上域名当前按 `cartoon.lazymicezhu.com` 设计，部署目标是 Cloudflare Pages，评论数据使用 Cloudflare Pages Functions + D1。

## 功能概览

- 封面页：每次刷新先进入封面，点击后进入互动漫画区。
- 漫画交互：每章前三格自动依次出现，前三格可点击放大阅读。
- 选项拖拽：前三格完全出现后才显示选项，拖动一个选项到空白格后进入下一章。
- 结尾总览：全部章节完成后展示每章选择结果，宽屏最多两章一行。
- 评论入口：左下角二维码面板可拖动，提示用户点击或扫码参加评论。
- 评论气泡：评论实时出现在主屏，支持颜色、昵称、回复、展开查看、拖动和物理碰撞。
- 评论开关：二维码面板左下角齿轮进入设置，可控制是否显示评论气泡、调整气泡大小。
- 手机评论页：支持提交评论、选择气泡颜色、查看当前评论气泡并回复。
- 统计页：查看当前主屏在线数量、评论总数、评论内容、昵称和回复。

## 文件结构

```text
.
├── index.html              # 主漫画页
├── script.js               # 主页面漫画、二维码、评论气泡逻辑
├── styles.css              # 全站样式
├── comment.html            # 手机评论页
├── comment.js              # 手机评论提交、预览气泡、回复逻辑
├── stats.html              # 统计页面
├── stats.js                # 统计页面逻辑
├── functions/
│   └── api/
│       ├── comments.js     # GET/POST 评论与回复 API
│       └── stats.js        # 评论统计与主屏在线统计 API
├── migrations/
│   ├── 0001_create_comments.sql
│   ├── 0002_add_comment_meta.sql
│   ├── 0003_create_active_screens.sql
│   └── 0004_create_comment_replies.sql
└── assets/
    ├── 1/                  # 第 1 章原始资源
    ├── 2/                  # 第 2 章原始资源
    ├── 3/                  # 第 3 章原始资源
    └── optimized/          # 页面实际读取的压缩资源
```

## 本地预览

这个项目是静态页面加 Cloudflare Pages Functions。普通本地静态服务器可以预览主流程和气泡效果；评论 API 在普通静态服务器下会自动降级到 `localStorage`，方便调试视觉效果。

在项目根目录运行：

```bash
python3 -m http.server 4177
```

然后打开：

```text
http://127.0.0.1:4177/
```

常用页面：

```text
http://127.0.0.1:4177/              # 主页面
http://127.0.0.1:4177/comment.html  # 手机评论页
http://127.0.0.1:4177/stats.html    # 统计页
```

如果要在本地完整测试 Cloudflare Functions + D1，需要使用 Wrangler/Cloudflare Pages 的本地开发能力，并配置 D1 绑定。普通 `python3 -m http.server` 不会运行 `functions/api/*.js`。

## Cloudflare Pages 部署

推荐使用 Cloudflare Pages 部署整个仓库。

构建设置可以保持很简单：

- Framework preset: None
- Build command: 留空
- Build output directory: `/`
- Functions directory: `functions`

评论功能需要绑定 D1 数据库：

1. 在 Cloudflare 控制台创建 D1 数据库，例如 `cartoon`。
2. 进入 Pages 项目设置。
3. 找到 `Settings -> Functions -> D1 database bindings`。
4. 添加绑定：
   - Variable name: `DB`
   - D1 database: 选择刚创建的数据库
5. 执行下面的建表 SQL。
6. 重新部署 Pages。

## D1 建表命令

如果是在 Cloudflare D1 控制台的 SQL 查询框里执行，可以按顺序粘贴执行以下命令。

```sql
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
```

```sql
ALTER TABLE comments ADD COLUMN nickname TEXT NOT NULL DEFAULT '';
```

```sql
ALTER TABLE comments ADD COLUMN color TEXT NOT NULL DEFAULT 'blue';
```

```sql
CREATE TABLE IF NOT EXISTS active_screens (
  screen_id TEXT PRIMARY KEY,
  last_seen INTEGER NOT NULL
);
```

```sql
CREATE TABLE IF NOT EXISTS comment_replies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id INTEGER NOT NULL,
  text TEXT NOT NULL,
  nickname TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
```

```sql
CREATE INDEX IF NOT EXISTS idx_comment_replies_parent_id ON comment_replies(parent_id);
```

也可以按文件顺序执行：

```text
migrations/0001_create_comments.sql
migrations/0002_add_comment_meta.sql
migrations/0003_create_active_screens.sql
migrations/0004_create_comment_replies.sql
```

注意：`ALTER TABLE ... ADD COLUMN ...` 如果重复执行，D1 会提示列已存在。已经执行过的数据库不需要重复执行 `0002`。

## API 说明

### `GET /api/comments`

主屏轮询新评论使用。

查询参数：

- `after`: 只读取 `id > after` 的评论，默认 `0`。
- `limit`: 每次最多读取多少条，默认 `40`，最大 `80`。
- `screenId`: 主屏唯一 ID，用于统计在线主屏数量。

返回示例：

```json
{
  "comments": [
    {
      "id": 1,
      "text": "中介合同小字真的要看清楚",
      "nickname": "观众A",
      "color": "blue",
      "created_at": 1716100000000,
      "replies": [],
      "reply_count": 0
    }
  ]
}
```

### `POST /api/comments`

提交新评论或回复。

提交评论：

```json
{
  "text": "这段经历太真实了",
  "nickname": "小李",
  "color": "pink"
}
```

提交回复：

```json
{
  "parent_id": 1,
  "text": "我也遇到过类似情况",
  "nickname": "路人"
}
```

限制：

- 评论文本最长会截到 `180` 字符。
- 昵称最长会截到 `16` 字符。
- 颜色只接受 `blue`、`yellow`、`green`、`pink`、`violet`，非法值会回退到 `blue`。

### `GET /api/stats`

统计页面使用。

返回内容：

- `activeScreens`: 最近 30 秒内活跃主屏数量。
- `commentCount`: 评论总数。
- `comments`: 最近最多 500 条评论，包含回复。
- `activeWindowSeconds`: 在线统计窗口，目前是 `30` 秒。
- `generatedAt`: 生成统计的时间戳。

## 评论系统工作方式

主屏页面启动后会：

1. 生成一个本地 `screenId`。
2. 定时请求 `/api/comments?after=<lastId>&screenId=<screenId>`。
3. 如果有新评论，就生成一个气泡加入物理场。
4. 如果关闭“显示评论”，主屏停止轮询，并隐藏已有气泡。
5. 如果重新打开“显示评论”，恢复轮询并重新显示评论。

手机评论页会：

1. 允许用户输入昵称、评论内容、选择气泡颜色。
2. 提交后在手机端生成同色预览气泡。
3. 支持查看当前评论气泡。
4. 点击气泡后展开，并可直接回复该评论。

统计页会：

1. 调用 `/api/stats`。
2. 显示当前在线主屏数量。
3. 显示评论总数、评论文本、昵称、时间和回复内容。

## 漫画资源规范

页面实际读取的是：

```text
assets/optimized/
```

原始图可以放在：

```text
assets/1/
assets/2/
assets/3/
```

当前命名规则：

- 第 1 章：`1A.jpg`、`1B.jpg`、`1C.jpg`、`1D-1.jpg` 到 `1D-4.jpg`
- 第 2 章：`2A.jpg`、`2B.jpg`、`2C.jpg`、`2D-1.jpg` 到 `2D-4.jpg`
- 第 3 章：`3A.jpg`、`3B.jpg`、`3C.jpg`、`3D-1.jpg` 到 `3D-4.jpg`

其中：

- `A/B/C` 是每章固定前三格。
- `D-1` 到 `D-4` 是四个可拖动选项。
- 结局使用文字显示，不读取结局漫画图。

新增或替换漫画时，需要同时更新 `script.js` 里的 `chapterData`：

- `caption`: 章节说明。
- `panels`: 固定前三格。
- `options`: 四个选项图和对应 `ending` 文案。
- `aspect`: 图片比例，建议与压缩后实际尺寸一致。

为了保证页面加载速度，新增资源后应先压缩再放入 `assets/optimized/`。目前主图约 900px 宽，选项图约 600px 宽，适合网页展示。

## 当前交互细节

### 漫画主流程

1. 封面页显示。
2. 点击进入互动漫画区。
3. 每章前三格漫画依次出现。
4. 前三格出现过程中，选项区不可见且不能交互。
5. 前三格出现后，空白格和四个选项出现。
6. 拖动选项到空白格。
7. 播放选项消散效果和结局文字。
8. 自动进入下一章。
9. 所有章节结束后展示总览。

### 放大阅读

每章前三格固定漫画可以点击放大。放大后可以通过以下方式关闭：

- 点击右上角关闭按钮。
- 点击背景遮罩。
- 按 `Esc`。

### 评论气泡

主屏气泡：

- 小气泡只显示评论文本和半透明时间。
- 展开后显示完整文本、昵称和回复框。
- 有回复时，小气泡显示半透明评论数量提示。
- 可以点击放大，也可以拖动移动。
- 气泡会尽量保持在页面内，并避开主要内容区。

手机端气泡：

- 评论提交后显示同色预览气泡。
- “显示评论气泡”区域复用气泡样式。
- 点击气泡会展开并显示回复输入框。
- 点击空白处会收起。

## 常见维护任务

### 增加新章节

1. 把原始图片放进 `assets/<章节号>/`。
2. 生成压缩图放入 `assets/optimized/`。
3. 在 `script.js` 的 `chapterData` 增加一个章节对象。
4. 在 `index.html` 的 `<head>` 中增加对应图片的 preload。
5. 本地打开主页面，走完整流程确认拖拽、结尾总览和图片比例。

### 修改评论字段

1. 修改 D1 表结构，新建一个 `migrations/xxxx_*.sql`。
2. 修改 `functions/api/comments.js` 的读写逻辑。
3. 修改 `functions/api/stats.js` 的统计读取逻辑。
4. 修改前端渲染逻辑。
5. 在 Cloudflare D1 控制台执行迁移。

### 调整轮询频率

评论轮询逻辑在 `script.js`，搜索：

```text
commentPolling
```

当前设计是为了实时刷新新评论，同时在关闭“显示评论”时停止轮询，减少 D1 读取额度消耗。

### 调整气泡样式

气泡样式主要在 `styles.css` 中，搜索：

```text
comment-bubble
```

气泡运动和碰撞逻辑主要在 `script.js` 中，搜索：

```text
commentBubbles
```

## 部署前检查清单

- `index.html` 能正常进入漫画。
- 每章前三格出现前，选项不会显示或触发 hover/拖动。
- 前三格可以点击放大。
- 四个选项能拖进空白格。
- 结尾页宽屏最多两章一行。
- `comment.html` 可以提交评论。
- 主屏打开“显示评论”后可以实时收到评论。
- 关闭“显示评论”后气泡消失并停止轮询。
- `stats.html` 可以显示主屏数量、评论总数和回复。
- Cloudflare Pages 已绑定 D1，变量名为 `DB`。
- D1 已执行全部需要的建表 SQL。

## 注意事项

- 本地普通静态服务器不会运行 Cloudflare Functions，评论会降级到 `localStorage`。
- Cloudflare D1 的读取次数会受主屏轮询影响，主屏越多、打开时间越长，读取次数越多。
- 如果没有打开主屏或关闭了“显示评论”，主屏不会持续轮询评论接口。
- 资源更新后如果浏览器缓存旧样式或脚本，可以更新 `index.html` 中 CSS/JS 的查询参数版本号。
- 不建议直接在页面里读取 `assets/1/2/3` 的原始大图，线上展示应使用 `assets/optimized/`。
