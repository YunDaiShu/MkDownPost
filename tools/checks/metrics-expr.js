(function () {
  var ta = document.querySelector('#ta');
  var pre = document.querySelector('.editor__hl');
  var code = pre ? pre.querySelector('code') : null;
  function info(el) {
    if (!el) return null;
    var c = getComputedStyle(el);
    return { fam: c.fontFamily, size: c.fontSize, lh: c.lineHeight, ls: c.letterSpacing, ws: c.whiteSpace, wb: c.wordBreak, ow: c.overflowWrap, pad: c.paddingLeft };
  }
  function advance(el, text) {
    var sp = document.createElement('span');
    sp.textContent = text;
    sp.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;white-space:pre;';
    var c = getComputedStyle(el);
    sp.style.fontFamily = c.fontFamily;
    sp.style.fontSize = c.fontSize;
    sp.style.letterSpacing = c.letterSpacing;
    document.body.appendChild(sp);
    var w = sp.getBoundingClientRect().width;
    sp.remove();
    return Math.round(w * 100) / 100;
  }
  var s = '零第三方运行时依赖：不引入 React/Vue/Svelte 与 Tailwind';
  var taAdv = advance(ta, s);
  var codeAdv = code ? advance(code, s) : null;
  return JSON.stringify({
    ta: info(ta),
    pre: info(pre),
    code: info(code),
    taAdvance: taAdv,
    codeAdvance: codeAdv,
    sameAdvance: codeAdv === null ? null : Math.abs(taAdv - codeAdv) < 0.5
  });
})()