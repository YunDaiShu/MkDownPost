# 在 Markdown 里混写 HTML：能做什么、别做什么

Markdown 覆盖不了所有排版需求，HTML 是它的逃生舱。

## 可以混写

~~~markdown
<details>
  <summary>点开看更多</summary>
  折叠内容写在这里。
</details>

<br>

<sup>上标</sup> 与 <sub>下标</sub>
~~~

## 常见用途

| 需求 | 写法 | 公众号是否保留 |
| --- | --- | --- |
| 折叠块 | details 与 summary | 否 |
| 强制换行 | br | 是 |
| 上下标 | sup 与 sub | 部分 |
| 居中 | div 加 align | 部分 |
| 锚点跳转 | a 加 name | 否 |

## 两条重要规则

1. **HTML 块内的 Markdown 默认不解析**，要解析就在块内首尾各留一个空行
2. **块级 HTML 必须顶格**，缩进会被当成代码

~~~markdown
<div>

**这段会被解析成加粗**

</div>
~~~

## 安全提醒

本站渲染管线有白名单过滤：script、iframe、on 开头的行内事件等会被移除。这既是安全需要，也是"导出到平台不被清空"的前提。

## 什么时候别用

- 目标平台是公众号（大部分标签会被过滤）
- 只想"看起来花哨"（排版交给主题）
- 需要跨平台一致（纯 Markdown 最稳）

## 小结

把 HTML 当兜底，不当主力。能用 Markdown 表达的结构，就别写标签。
