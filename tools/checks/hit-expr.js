(function () {
  var ta = document.querySelector('#ta');
  var pre = document.querySelector('.editor__hl');
  var code = pre ? pre.querySelector('code') : null;
  if (!code) return JSON.stringify({ error: 'no overlay' });
  var cs = getComputedStyle(ta);
  var padL = parseFloat(cs.paddingLeft);
  var padT = parseFloat(cs.paddingTop);
  var lh = parseFloat(cs.lineHeight);
  var taBox = ta.getBoundingClientRect();
  var preBox = pre.getBoundingClientRect();
  // 用 canvas 按 textarea 的计算字体量出每个字符的宽度
  var cv = document.createElement('canvas').getContext('2d');
  cv.font = cs.fontSize + ' ' + cs.fontFamily;
  var firstLine = (ta.value.split('\n')[0] || '');
  var cols = [0, 5, 10, 20, 30];
  var rows = [];
  // 覆盖层中第一行文本节点的 Range 起点，作为“看到的字”的坐标
  function overlayPoint(offset) {
    var node = code.firstChild;
    if (!node || node.nodeType !== 3) return null;
    var r = document.createRange();
    r.setStart(node, Math.min(offset, node.length));
    r.setEnd(node, Math.min(offset, node.length));
    var rect = r.getBoundingClientRect();
    return { x: rect.left - preBox.left, y: rect.top - preBox.top };
  }
  for (var i = 0; i < cols.length; i++) {
    var col = cols[i];
    if (col > firstLine.length) continue;
    var expectX = padL + cv.measureText(firstLine.slice(0, col)).width;
    var seen = overlayPoint(col);
    rows.push({
      col: col,
      caretX: Math.round(expectX * 10) / 10,
      glyphX: seen ? Math.round(seen.x * 10) / 10 : null,
      dx: seen ? Math.round((seen.x - expectX) * 10) / 10 : null
    });
  }
  // 第二行：整段文本在一个文本节点里，用换行符后的偏移量定位
  var secondLineTop = padT + lh;
  var seenY = null;
  var nodeAll = code.firstChild;
  if (nodeAll && nodeAll.nodeType === 3) {
    var nl = nodeAll.data.indexOf('\n');
    if (nl >= 0 && nl + 1 <= nodeAll.length) {
      var r2 = document.createRange();
      r2.setStart(nodeAll, nl + 1); r2.setEnd(nodeAll, nl + 1);
      seenY = r2.getBoundingClientRect().top - preBox.top;
    }
  }
  return JSON.stringify({
    overlaySize: { w: Math.round(pre.clientWidth), h: Math.round(pre.clientHeight) },
    taSize: { w: ta.clientWidth, h: ta.clientHeight },
    offset: { left: Math.round((taBox.left - preBox.left) * 10) / 10, top: Math.round((taBox.top - preBox.top) * 10) / 10 },
    lineHeight: lh,
    cols: rows,
    secondLineExpectedY: Math.round(secondLineTop * 10) / 10,
    secondLineSeenY: seenY === null ? null : Math.round(seenY * 10) / 10,
    contentH_ta: Math.round((ta.scrollHeight - padT - parseFloat(cs.paddingBottom)) * 10) / 10,
    contentH_overlay: Math.round((pre.scrollHeight - parseFloat(getComputedStyle(pre).paddingTop) - parseFloat(getComputedStyle(pre).paddingBottom)) * 10) / 10
  });
})()