# 图表与公式

## 流程图

```mermaid
flowchart LR
  A[写 Markdown] --> B[实时预览]
  B --> C{导出目标}
  C -->|公众号| D[全内联 HTML]
  C -->|小黑盒| E[结构保留]
  C -->|TapTap| F[降级文本]
```

## 时序图

```mermaid
sequenceDiagram
  participant U as 作者
  participant E as 编辑器
  participant P as 平台
  U->>E: 写 Markdown
  E-->>U: 实时预览
  U->>P: 粘贴导出结果
```

## 行内公式

质能方程 $E = mc^2$，以及二次方程求根公式 $x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}$。

## 块级公式

$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$

> 若本机没有下载 Mermaid / KaTeX 库，图表会显示源码、公式保留原始写法，正文不受影响。
