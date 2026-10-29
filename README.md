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

- **编辑器**：左写右预览、可拖拽分隔条、行号、快捷键（`⌘/Ctrl+B/I/K/S`、`⌘/Ctrl+/`、Tab 缩进）、自动保存（`已保存于 HH:MM`）、拖入 `.md` 打开、字号三档、行宽两档、同步滚动开关
- **渲染**：GFM 表格 / 任务列表 / 删除线 / 自动链接；代码块（语言标签 + 复制 + >40 行滚动）；标题锚点；图片懒加载 + 骨架 + 兜底 + 灯箱；Mermaid 与 KaTeX 懒加载 + 失败降级；XSS 白名单净化
- **主题**：**50 套**（8 套手调 + 42 套生成），每套含明暗两套完整变量；切换面板 + `T`/`Shift+T` 循环 + **复制当前主题 CSS 变量**
- **导出**：`.md` / 内联样式 HTML（公众号适配）/ 打印
- **平台适配器**：公众号（稳定）/ 小黑盒（稳定）/ TapTap（实验），统一接口 `transform(md) → {html, notes[]}`

## 本地运行

ES Module 必须走 http（不能双击 `index.html`）：

```bash
cd MkDownPost
node tools/serve.mjs        # 零依赖静态服务器
# 打开 http://localhost:5173
```

可选：把第三方库下载到本地（下载后自动启用 marked / highlight.js；**不下载也能跑**，用内置解析器）：

```bash
node tools/vendor.mjs
```

## 主题（50 套）

| 批次 | 数量 | 来源 |
|---|---|---|
| 手调 | 8 | deepseek / wechat / taptap / heybox / bilibili / zhihu / xiaohongshu / github |
| 生成 | 42 | vscode / notion / figma / linear / vercel / nextjs / tailwind / vite / rust / go / python / typescript / apple / material / bootstrap / discord / slack / telegram / youtube / netflix / spotify / steam / playstation / xbox / nintendo / miui / harmonyos / windows / chrome / firefox / safari / dribbble / behance / medium / substack / wordpress / ghost / juejin / csdn / oschina / gitee / cloudflare |

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
| Mermaid / KaTeX / 代码高亮需先下载库 | 运行时零外部请求（隐私与离线优先） | `node tools/vendor.mjs`；未下载时图表显示源码、公式保留原文，正文不阻断 |
| 无云端同步 | 硬性排除用户系统/后端 | 编辑器「导出 → 下载 .md」自行备份 |
| 公众号导出后仍可能被编辑器转存图片 | 公众号编辑器行为，非本地可控 | 粘贴后人工确认图片 |
| TapTap 适配为实验状态 | 平台表格/任务列表支持不稳定 | 已自动降级为文本，粘贴后人工检查 |
| 主题色为近似取色 | 官方无公开色值规范 | 改 `data/themes.js` 一处即可替换 |

## 许可证

MIT，见 `LICENSE`。

## 贡献

见 `CONTRIBUTING.md`。
