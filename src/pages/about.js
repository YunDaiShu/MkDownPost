/* src/pages/about.js — 关于：定位、平台适配状态表（自动读取适配器）、已知限制、技术栈 */
import { list as adapterList } from '../adapters/index.js?v=vmvtdx1zq';
import { THEMES } from '../../data/themes.js?v=vmvtdx1zq';

export default function render(root) {
  const ads = adapterList();
  root.innerHTML = `
    <section class="section prose">
      <h1>关于 MkDownPost（码稿）</h1>
      <p>面向公众号 / 小黑盒 / TapTap 等平台创作者的 <b>Markdown 写作与排版工作台</b>：写一份 Markdown，导出各平台可用的排版结果。</p>

      <h2>我们不做什么</h2>
      <ul>
        <li><b>不做任何 AI 功能</b>：没有对话、润色、生成摘要。</li>
        <li><b>不做登录注册 / 用户系统 / 云端同步</b>：没有服务器，没有账号。</li>
        <li><b>不上传你的内容</b>：草稿只写在本机浏览器的 localStorage。</li>
        <li><b>不写"一键发布"</b>：只做排版导出。公众号个人主体没有公开发布接口。</li>
      </ul>

      <h2>平台适配（${ads.length} 个）</h2>
      <table class="about-table">
        <thead><tr><th>平台</th><th>状态</th><th>处理方式</th></tr></thead>
        <tbody>
          ${ads.map((a) => '<tr><td><b>' + a.name + '</b></td><td>' +
            (a.status === 'stable' ? '稳定' : '实验') + '</td><td>' + (a.desc || '按平台规则调整结构与样式') + '</td></tr>').join('')}
        </tbody>
      </table>
      <p class="muted">在编辑器「导出 → 平台适配」里选平台，会给出处理说明与可复制的 HTML。</p>

      <h2>主题</h2>
      <p>当前内置 <b>${THEMES.length} 套</b>主题，每套含明暗两套完整变量，全部通过 WCAG AA 对比度校验。色值为<b>近似取色，非官方规范</b>，替换只需修改 <code>data/themes.js</code> 一处。</p>

      <h2>主题不只是换颜色</h2>
      <p>每套主题包含 23 个颜色令牌（主色 / 主色文字 / 浅底 / 链接 / 引用条 / 代码底 / 边框 / 选中 / 焦点环…），并按主题分组切换<b>排版装饰</b>：开发者向是等宽下划线标题，社交向是居中标题 + 居中渐变短线，游戏向是菱形前缀，系统向是全宽下划线与大圆角引用。</p>

      <h2>已知限制</h2>
      <ul>
        <li>小红书以图片为主，纯 Markdown 排版帮助有限，未做适配器。</li>
        <li>公众号编辑器会过滤部分标签与外链，粘贴后请确认图片与表格。</li>
        <li>草稿只存在当前浏览器，换设备/清缓存会丢失（无云端同步是硬性设计）。</li>
        <li>导出的内联 HTML 以当前主题配色为基准，切换主题后需重新导出。</li>
      </ul>

      <h2>技术栈</h2>
      <p>纯 HTML / CSS / JavaScript（ES Module），零构建工具、无框架、无后端。若改用 React + Vite + TS，差异在于：需引入构建链与组件化状态管理，路由改为 react-router，主题仍用同一套 CSS 变量即可复用。</p>
    </section>`;
}
