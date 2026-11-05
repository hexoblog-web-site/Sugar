/* ==========================================================================
 * 侧栏「网站统计」卡（source/js/aside/card-webinfo.js）
 * --------------------------------------------------------------------------
 * 模板 card-webinfo.ejs 输出的运行天数是一行占位 "-"，
 * 这里按 data-start（建站时间）算出「X 年 Y 天」。
 * 建站时间解析复用 main.js 里的 heo.parseStart，没有就自己兜底。
 * 命名与 layout/_partial/aside/card-webinfo.ejs、source/css/aside/card-webinfo.css 对应。
 * ========================================================================== */
(function () {
  'use strict';

  function parseStart(str) {
    if (window.heo && typeof window.heo.parseStart === 'function') {
      return window.heo.parseStart(str);
    }
    if (!str) return null;
    var d = new Date(String(str).trim());
    return isNaN(d.getTime()) ? null : d;
  }

  function webinfoRuntime() {
    var els = document.querySelectorAll('[data-runtime-start], #webinfo-runtime');
    Array.prototype.forEach.call(els, function (el) {
      if (el.getAttribute('data-runtime-done') === '1') return;
      var start = parseStart(el.getAttribute('data-start') || el.getAttribute('data-runtime-start'));
      if (!start) return;
      var days = Math.max(0, Math.floor((Date.now() - start) / 86400000));
      var y = Math.floor(days / 365);
      var rest = days - y * 365;
      el.textContent = y > 0 ? (y + ' 年 ' + rest + ' 天') : (days + ' 天');
      el.setAttribute('data-runtime-done', '1');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', webinfoRuntime);
  } else {
    webinfoRuntime();
  }
})();
