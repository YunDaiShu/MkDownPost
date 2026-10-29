# 一套主题的解剖：23 个颜色令牌

本站的主题不是一堆颜色，而是 23 个有明确分工的令牌。

## 令牌分组

| 组别 | 令牌 | 作用 |
| --- | --- | --- |
| 主色 | primary、primary-text、primary-soft、primary-bg | 按钮、链接、强调、浅底 |
| 文字 | text、text-secondary、text-muted | 正文、次要、弱化 |
| 背景 | bg、surface、surface-2 | 页面、卡片、次级面 |
| 线条 | border、divider | 边框与分隔 |
| 语义 | link、link-hover、success、warning、danger | 链接与状态 |
| 代码 | code-bg、code-bar | 代码块与标题条 |
| 其他 | quote-bar、selection-bg、focus-ring | 引用竖条、选区、焦点环 |

## 为什么要有 primary-text

主色可能太浅（比如品牌黄），直接当文字色会看不清。所以单独给一个"可读化后的主色"专用于文字。

## 改一个令牌会发生什么

```text
改 primary    → 按钮、链接、标题装饰、任务勾选全部变
改 surface    → 卡片底色变，边界更明显
改 code-bg    → 代码块底色变，整体观感偏冷或偏暖
```

## 怎么看当前令牌

主题库右上角有"复制当前主题 CSS 变量"，粘贴出来就是当前 23 个值。也可以打开开发者工具查看根元素。

## 小结

主题调色不要逐个改按钮，改令牌。令牌对了，全站自动一致。
