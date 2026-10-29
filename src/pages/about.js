/* src/pages/about.js — 关于：定位、平台适配状态表、已知限制、技术栈 */
import { list as adapterList } from '../adapters/index.js';
import { THEMES } from '../../data/themes.js';

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

      <h2>平台适配状态</h2>
      <table class="about-table">
        <thead><tr><th>平台</th><th>状态</th><th>处理方式</th></tr></thead>
        <tbody>
          ${ads.map((a) => '<tr><td>' + a.name + '</td><td>' + (a.status === 'stable' ? '稳定' : '实验') + '</td><td>' +
            (a.key === 'wechat' ? '全内联样式、字号收敛、图片 max-width' : a.key === 'xiaoheihe' ? '标题层级降级、链接新窗口、图片限宽' : '任务列表与表格降级为文本') + '</td></tr>').join('')}
        </tbody>
      </table>

      <h2>主题</h2>
      <p>当前内置 <b>${THEMES.length} 套</b>主题，每套含明暗两套完整变量，全部通过 WCAG AA 对比度校验。色值为<b>近似取色，非官方规范</b>，替换只需修改 <code>data/themes.js</code> 一处。</p>

      <h2>已知限制</h2>
      <ul>
        <li>Mermaid / KaTeX / 代码高亮需要本地库：执行 <code>node tools/vendor.mjs</code> 下载后生效；未下载时图表显示源码、公式保留原文，正文不受影响。</li>
        <li>公众号编辑器会过滤部分标签与外链，粘贴后请确认图片与表格。</li>
        <li>草稿只存在当前浏览器，换设备/清缓存会丢失（无云端同步是硬性设计）。</li>
        <li>导出的内联 HTML 以当前主题配色为基准，切换主题后需重新导出。</li>
      </ul>

      <h2>技术栈</h2>
      <p>纯 HTML / CSS / JavaScript（ES Module），零构建工具、无框架、无后端。若改用 React + Vite + TS，差异在于：需引入构建链与组件化状态管理，路由改为 react-router，主题仍用同一套 CSS 变量即可复用。</p>
    </section>`;
}
