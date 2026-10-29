# 贡献指南

## 提 issue

带上：复现步骤、浏览器与版本、期望结果、实际结果（截图更好）。

## 提 PR

1. Fork → 建分支 `feat/xxx` 或 `fix/xxx`
2. 遵守本项目的 5 条硬规则：
   - **不引入任何 AI 功能**（无对话 / 润色 / 摘要）
   - **不引入登录、用户系统、云端同步**
   - **运行时不请求任何第三方 API**；需要库就放 `vendor/` 并说明
   - 颜色一律走 `var(--c-*)`，不允许硬编码 hex / rgb（`node tools/lint-hardcoded-color.mjs` 会拦）
   - 间距 / 圆角 / 字号只用 `tokens.css` 里定义的档位
3. 自检：
   ```bash
   node tools/smoke-md.mjs
   node tools/lint-hardcoded-color.mjs
   node tools/gen-themes.mjs     # 若改了 seeds
   node tools/audit-responsive.mjs   # 响应式回归（5 档 × 5 页，必须 0 失败）
   ```
4. 在 PR 描述里写：改了什么、为什么、如何验证、有没有未完成项

## 代码风格

- ES Module，2 空格缩进，单引号
- 关键逻辑写注释解释「为什么」，不写「是什么」
- 不留下 `console.log`（调试器断点或临时文件里随便用）
