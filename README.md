# MkDownPost · 码稿

> 面向公众号 / 小黑盒 / TapTap 等平台创作者的 **Markdown 写作与排版工作台**：写一份 Markdown，导出各平台可用的排版结果。

- 线上站点：https://yundaishu.github.io/MkDownPost/
- 技术栈：纯 HTML / CSS / JavaScript（ES Module），**零构建、无框架、无后端**
- 数据：`content/*.md` + `content-index.json`；存储只用 `localStorage`（草稿 / 主题偏好 / 设置）

## 我们明确不做

| 不做 | 说明 |
|---|---|
| 任何 AI 功能 | 无对话、无润色、无摘要生成 |
| 登录注册 / 用户系统 / 云端同步 | 没有服务器，没有账号 |
| 调用第三方 API | 运行时不发任何外部请求；第三方库需本地 `vendor/` |
| "一键发布" | 只做排版导出（公众号个人主体无公开发布接口） |

## 功能

- **编辑器**：多标签页（可重命名）/ 语法高亮（含围栏代码块）/ 公式实时预览 / 编辑历史时间线 / 可自定义快捷键（`?` 打开）/ 撤销重做置灰 / 自动保存 / 字号·行宽分段控件（持久化）/ 同步滚动
- **渲染**：GFM 表格 / 任务列表 / 删除线 / 自动链接；代码块（**highlight.js 语法高亮** + 语言标签 + 复制 + >40 行滚动）；标题锚点；图片懒加载 + 骨架 + 兜底 + **灯箱**；**Mermaid 图表**与 **KaTeX 公式**（懒加载 + 失败降级为源码）；XSS 白名单净化
- **主题**：**50 套**（8 套手调 + 42 套生成），每套含明暗两套完整变量；切换面板 + `T`/`Shift+T` 循环 + **复制当前主题 CSS 变量**
- **导出（8 种）**：`.md` / 内联样式 HTML / **Word（.doc）** / **PDF（A4，html2canvas + jsPDF，无打印框）** / **PNG 长图** / 打印（主题色、极简双模板）/ 9 个平台适配导出
- **平台适配器（9 个）**：公众号 / 小黑盒 / TapTap / 知乎 / 掘金 / CSDN / B 站专栏 / 简书 / GitHub README，统一接口 `transform(md) → {html, notes[]}`；编辑器「导出 → 平台适配导出…」可选平台、看处理说明、一键复制 HTML

## 本地运行

ES Module 必须走 http（不能双击 `index.html`）：

```bash
cd MkDownPost
node tools/serve.mjs        # 零依赖静态服务器
# 打开 http://localhost:5173
```

第三方库已随仓库提供（`vendor/`，共 27 个文件：marked / highlight.js / mermaid / KaTeX 含字体），**离线可用、运行时不联网**。

如需重新拉取或升级：

```bash
node tools/vendor.mjs
```

## 响应式回归检查（自带，一条命令）

```bash
node tools/audit-responsive.mjs                     # 跑 5 档 × 5 页 = 25 项
node tools/audit-responsive.mjs http://localhost:5173/
node tools/audit-responsive.mjs https://… --shots=shots   # 同时存图
```

检查项：渲染是否成功 / 控制台报错 / 横向溢出 / 移动端点击区 ≥44px / 页头与内容左边缘对齐 / 栅格列数。
**有失败时退出码为 1**，可直接接入 CI。

单页截图工具：

```bash
node tools/shot.mjs "https://…/#/" 1920 1080 out.png '--waitFor=.card' '--eval=probe.js' [--full]
```

## 主题（100 套）

| 批次 | 数量 | 来源 |
|---|---|---|
| 手调 | 8 | deepseek / wechat / taptap / heybox / bilibili / zhihu / xiaohongshu / github |
| 生成 | 92 | vscode / notion / figma / linear / vercel / nextjs / tailwind / vite / rust / go / python / typescript / apple / material / bootstrap / discord / slack / telegram / youtube / netflix / spotify / steam / playstation / xbox / nintendo / miui / harmonyos / windows / chrome / firefox / safari / dribbble / behance / medium / substack / wordpress / ghost / juejin / csdn / oschina / gitee / cloudflare |

> **色值为近似取色，非官方规范**，仅用于识别气质；替换只需改 `data/themes.js`（手调 8 套）或 `tools/gen-themes.mjs` 的 seeds（生成 42 套）后重跑。

### 对比度自检

- 生成脚本内置校验：42 套生成主题 **最低 4.61:1**（≥ AA 4.5）
- 8 套手调主题实测（正文 / 标题 / 链接）：

| 主题 | 亮色（正文/标题） | 暗色（正文/标题） |
|---|---|---|
| deepseek | 16.82 / 4.92 | 15.57 / 7.49 |
| wechat | 16.82 / 4.91 | 15.57 / 10.45 |
| taptap | 16.82 / 5.05 | 15.57 / 10.74 |
| heybox | 16.82 / 5.05 | 15.57 / 7.95 |
| bilibili | 16.82 / 4.68 | 15.57 / 8.71 |
| zhihu | 16.82 / 4.79 | 15.57 / 7.44 |
| xiaohongshu | 16.82 / 4.91 | 15.57 / 6.21 |
| github | 16.82 / 5.05 | 15.57 / 9.58 |

- 打开 `tools/check-contrast.html` 可现场重算全部 50 套 × 明暗。

## 如何新增主题

1. **改手调主题**：编辑 `data/themes.js` 的 `brand`，再按同算法补 `assets/styles/themes.css` 对应块（或迁到生成器）
2. **加生成主题**：在 `tools/gen-themes.mjs` 的 `SEEDS` 里加一行 `['key','显示名','分组','#亮色主色','#暗色主色']`，运行 `node tools/gen-themes.mjs`
3. 校验：`node tools/lint-hardcoded-color.mjs` 必须 PASS；对比度看 `tools/check-contrast.html`

## 如何新增文章

1. 在 `content/` 放一个 `.md`
2. 在 `content-index.json` 加一条：`{ "slug": "与文件名一致", "title": "...", "tags": ["..."], "featured": true, "date": "2026-10-27", "readingTime": 4, "excerpt": "..." }`
3. 刷新即出现在首页「精选内容」与 `#/article/<slug>`

## 目录结构

```
MkDownPost/
├── index.html
├── assets/styles/    tokens / base / layout / components / themes / themes.generated / markdown / editor / pages
├── content/          6 篇示例 Markdown
├── content-index.json
├── data/             themes.js（50 套元数据）/ themes.generated.js
├── src/
│   ├── main.js  router.js  theme-manager.js
│   ├── markdown/     renderer / builtin-md / sanitize / heading-anchors / code-blocks / toc / images / mermaid / katex
│   ├── editor/       editor-page / split-pane / shortcuts / autosave / export
│   ├── components/   theme-switcher / lightbox
│   ├── adapters/     index / wechat / xiaoheihe / taptap
│   └── pages/        home / article / themes / about / notfound / editor
├── tools/            serve.mjs / vendor.mjs / gen-themes.mjs / check-contrast.html / lint-hardcoded-color.mjs / smoke-md.mjs
└── vendor/           可选：marked / highlight.js / mermaid / katex
```

## 已知限制

| 限制 | 原因 | 替代方案 |
|---|---|---|
| Mermaid 体积较大（3.3MB） | 需要完整图表能力 | 已懒加载：只在图表进入视口时才加载，不影响首屏 |
| 无云端同步 | 硬性排除用户系统/后端 | 编辑器「导出 → 下载 .md」自行备份 |
| 公众号导出后仍可能被编辑器转存图片 | 公众号编辑器行为，非本地可控 | 粘贴后人工确认图片 |
| **PDF 为图片型**（文字不可选中/搜索） | 客户端生成"中文可搜索 PDF"需嵌入 CJK 字体并逐字排版：jsPDF 不写 ToUnicode（复制是乱码），pdf-lib + fontkit 在浏览器里解析 1~2MB 中文字体会卡死（实测 3883 字仍超时）。当前用离屏全宽克隆 + 分页截图，视觉 100% 正确 | 需要可搜索 PDF 时：先用「导出内联样式 HTML」再在浏览器打印为 PDF，或把内容贴到 Word 另存 PDF |
| TapTap 适配为实验状态 | 平台表格/任务列表支持不稳定 | 已自动降级为文本，粘贴后人工检查 |
| 主题色为近似取色 | 官方无公开色值规范 | 改 `data/themes.js` 一处即可替换 |

## 许可证

MIT，见 `LICENSE`。

## 贡献

见 `CONTRIBUTING.md`。

## 免责声明

- 本项目是**个人非官方工具**，与腾讯、微信、小黑盒、TapTap、知乎、掘金、CSDN、哔哩哔哩、简书、GitHub 等平台**无任何隶属或合作关系**。
- 所有平台名称、标识、商标归各自权利人所有；本项目仅在说明「导出适配对象」时提及。
- **主题配色为近似取色**，不代表任何官方品牌规范（例如小黑盒采用其官网近黑 + 冷灰观感，微信采用 #07C160，均为方便识别而取近似值）。
- 导出结果是排版转换，**不保证**在目标平台的最终呈现完全一致；发布前请自行核对。
- 本项目**不提供**发布、上传、代发服务；导出内容及由此产生的后果由使用者自负。
- 内容仅存于使用者本机浏览器（localStorage），本项目不做云端备份。
- 如权利人认为某项内容侵犯权益，请在仓库提 issue，核实后会调整或移除。

## 与官方配色的说明

| 主题 | 参考 | 说明 |
|---|---|---|
| wechat | #07C160 | 微信常见品牌绿 |
| taptap | #15C5CE | TapTap 常见品牌青 |
| heybox | 近黑 #22262B + 冷灰 | 依其官网（白底、近黑按钮、等级蓝）取近似，**非橙色** |
| bilibili | #FB7299 | B 站粉 |
| zhihu | #0084FF | 知乎蓝 |
| xiaohongshu | #FF2442 | 小红书珊瑚红 |
| github | #0969DA | GitHub 蓝 |

## 仓库自检与自动化

无需安装任何依赖（零构建），但仓库自带 7 个检查脚本：

| 命令 | 作用 |
|---|---|
| `npm run check` | 校验 42 个模块的相对导入全部有效（防白屏） |
| `npm run lint:color` | 扫组件样式里是否残留硬编码颜色 |
| `npm run check:md` | Markdown 解析器冒烟测试（14 项断言） |
| `npm run audit` | 5 档分辨率 × 5 个页面的响应式回归（25 项） |
| `npm run shot -- <url> 1920 1080 out.png` | 任意视口截图 + 页内取数 |
| `npm run themes:gen` | 重新生成 92 套派生主题（含 AA 对比度校验） |
| `npm run serve` | 本地静态服务器（`http://localhost:5173`） |

**GitHub Actions**（`.github/workflows/site-health.yml`）：
- 每次 push 到 main 跑离线三项检查（导入完整性 / 颜色 lint / 解析冒烟）
- 每天定时检查线上 5 个路由是否 200 且未出现「页面加载失败」

## 仓库结构速览

```
index.html            单页外壳（所有 CSS 链接带 ?v= 版本戳，避免缓存）
src/                  42 个 ES 模块（router / 页面 / 编辑器 / 渲染管线 / 适配器）
assets/styles/        10 个 CSS（令牌 → 主题 → 布局 → 组件 → 页面）
assets/img/demo.svg   唯一图片（其余全部文字/渐变绘制）
content/              6 篇示例 Markdown
data/                 100 套主题元数据（8 手调 + 92 生成）
tools/                8 个零依赖脚本（serve / shot / audit / vendor / gen-themes / lint / smoke / check-imports）
vendor/               本地第三方库（运行时不联网）
.github/workflows/    自动化检查
```
