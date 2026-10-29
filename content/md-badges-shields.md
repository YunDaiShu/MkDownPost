# 徽章（badges）：README 的门面

徽章是 README 顶部那排小图标，用来一眼说明项目状态。

## 基本写法

```markdown
![构建状态](https://img.shields.io/badge/build-passing-brightgreen)
![许可证](https://img.shields.io/badge/license-MIT-blue)
```

本质就是一个图片链接，指向动态生成的 SVG。

## 常用徽章

| 徽章 | 说明 |
| --- | --- |
| build | 构建或 CI 状态 |
| license | 开源协议 |
| version | 版本号 |
| size | 包体积 |
| stars | 收藏数 |

## 注意事项

1. **需要联网**：徽章是外部图片，离线会裂
2. **本站不使用外部服务**：所以站内文章不放第三方徽章
3. **公众号里不显示**：外链图片常被拦截

## 本站的替代做法

用纯文本表达状态，稳定且可搜索：

```markdown
状态：稳定
许可证：MIT
构建：GitHub Actions 每次 push 自动检查
```

## 什么时候该用

- GitHub 仓库首页（读者期待看到）
- 开源项目文档
- 需要展示"活着"的项目

## 什么时候别用

- 个人博客正文
- 需要离线可读的文档
- 目标平台是公众号

## 小结

徽章适合仓库门面，不适合正文内容。要用就集中在 README 顶部，别撒在文章里。
