/* ==========================================================================
 * main.js —— 公共交互层
 * --------------------------------------------------------------------------
 * 只放「多个页面都要用」的东西：滚动工具、复制链接、toast、问候语、明暗切换、
 * 文章页封面取色、建站时间解析。板块自己的逻辑都不在这里。
 *
 * 加载方式：scripts/sugar-perf.js 按 main.js → partial/*.js → aside/*.js
 * 拼成 /js/bundle.js，浏览器一个请求拿完。顺序不能反：本文件先建好 window.heo。
 *
 * 板块地图（一个板块 = 同名 ejs / css / js 三件套，改哪块只看这三行）：
 *   文件名           模板                                 样式                    脚本
 *   nav              _partial/nav.ejs                     css/nav.css             js/partial/nav.js
 *   essay            _partial/home/essay.ejs              css/essay.css           js/partial/essay.js
 *   home-swiper      _partial/home/home-swiper.ejs        css/home-swiper.css     js/partial/home-swiper.js
 *   search           _partial/search.ejs                   css/search.css          js/partial/search.js
 *   sidebar          _partial/sidebar.ejs                  css/sidebar.css         js/partial/sidebar.js
 *   rightside        _partial/rightside.ejs                css/rightside.css       js/partial/rightside.js
 *   console          _partial/console.ejs                  css/console.css         js/partial/console.js
 *   footer           _partial/footer.ejs                   css/footer.css          js/partial/footer.js
 *   post-card        _partial/home/post-card.ejs           css/post-card.css       js/partial/post-card.js
 *   category-bar     _partial/home/category-bar.ejs        css/category-bar.css    js/partial/category-bar.js
 *   pagination       _partial/pagination.ejs               css/pagination.css      （无脚本）
 *
 * 命名规则：所有交互方法统一挂在 heo 上，模板里只写 heo.xxx
 * ========================================================================== */
(function () {
  'use strict';
  var cfg = window.HEO_CONFIG || {};
  var heo = window.heo = {};

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* ---------- 滚动工具 ---------- */
  heo.scrollToDest = function (top, ms) {
    var start = window.pageYOffset, t0 = Date.now(), d = ms || 500;
    (function step() {
      var p = Math.min((Date.now() - t0) / d, 1);
      var e = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
      window.scrollTo(0, start + (top - start) * e);
      if (p < 1) requestAnimationFrame(step);
    })();
  };

  /* ---------- 复制链接 ---------- */
  heo.copyLink = function (text) {
    var done = function () { heo.toast('链接已复制'); };
    /* 复制不了（非 https、浏览器禁用剪贴板）时把链接摊出来让用户自己选 */
    var fail = function () {
      heo.toast('复制失败，请手动复制');
      window.prompt('复制下面的链接', text);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, fail);
      return;
    }
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { fail(); }
    document.body.removeChild(ta);
  };
  heo.toast = function (msg) {
    var el = document.getElementById('heo-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'heo-toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove('show'); }, 1800);
  };

  /* 问候语：配置写在 aside.card_author.sayhi_list，EJS 序列化到 data-sayhi */
  function sayhiEl() {
    return document.getElementById('author-info__sayhi');
  }
  function sayhiData() {
    var el = sayhiEl();
    if (!el) return null;
    try { return JSON.parse(el.getAttribute('data-sayhi') || 'null'); } catch (e) { return null; }
  }
  /* 当前小时命中的时段（闭区间，支持跨零点如 22→3） */
  function greetByHour(list, fallback) {
    var h = new Date().getHours();
    for (var i = 0; i < list.length; i++) {
      var s = list[i].s, e = list[i].e;
      if (s === null || s === undefined) continue;
      var end = (e === null || e === undefined) ? s : e;
      var hit = s <= end ? (h >= s && h <= end) : (h >= s || h <= end);
      if (hit) return list[i].g;
    }
    return fallback;
  }
  /* 首次加载：按时间写一句 */
  heo.initSayhi = function () {
    var el = sayhiEl(), d = sayhiData();
    if (!el || !d) return;
    if (d.mode === 'time') el.textContent = greetByHour(d.list, d.fallback);
  };
  /* 点击胶囊：时段模式按列表顺序看下一句，纯列表模式随机 */
  heo.changeSayHelloText = function () {
    var el = sayhiEl(), d = sayhiData();
    if (!el || !d || !d.list || !d.list.length) return;
    var list = d.list;
    if (list.length === 1) { el.textContent = list[0].g; return; }
    var cur = (el.textContent || '').trim();
    var idx = -1;
    for (var i = 0; i < list.length; i++) { if (list[i].g === cur) { idx = i; break; } }
    if (d.mode === 'time') {
      el.textContent = list[(idx + 1) % list.length].g;
      return;
    }
    var j = Math.floor(Math.random() * list.length);
    if (list[j].g === cur) j = (j + 1) % list.length;
    el.textContent = list[j].g;
  };

  /* ---------- 明暗模式 ---------- */
  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    /* 浏览器地址栏颜色跟着一起换，别停在首屏那个浅色值 */
    var mt = document.querySelector('meta[name="theme-color"]');
    if (mt) mt.setAttribute('content', t === 'dark' ? '#17191d' : '#f7f9fe');
    /* remember_mode: false 时只切当前页，不写入 localStorage */
    if (cfg.rememberMode === false) return;
    try { localStorage.setItem('theme', t); } catch (e) {}
  }
  heo.toggleDarkMode = function () {
    var cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    setTheme(cur);
  };
  /* 别名：模板里写 heo.toggleTheme（旧名）的继续可用 */
  heo.toggleTheme = heo.toggleDarkMode;

  /* 建站时间解析：侧栏卡片脚本（source/js/aside/*.js）会复用它 */
  heo.parseStart = parseStart;

  /* ---------- 其它 ---------- */
  heo.toRandomPost = function () {
    var list = cfg.posts || [];
    if (!list.length) return;
    var p = list[Math.floor(Math.random() * list.length)];
    window.location.href = p.u;
  };
  heo.toPage = function (base) {
    var v = parseInt((document.getElementById('toPageText') || {}).value, 10);
    if (!v || v < 1) return;
    window.location.href = (v === 1 ? (base || '') + '/' : (base || '') + '/page/' + v + '/');
  };

  // ---------- 文章页头：从封面提取主色调 ----------
  function coverColor() {
    var img = document.getElementById('post-cover');
    var header = document.getElementById('page-header');
    if (!img || !header || !img.src) return;
    function hslAdjust(r, g, b) {
      r /= 255; g /= 255; b /= 255;
      var max = Math.max(r, g, b), min = Math.min(r, g, b);
      var h, s, l = (max + min) / 2;
      if (max === min) { h = s = 0; }
      else {
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          default: h = (r - g) / d + 4;
        }
        h /= 6;
      }
      // 压一压亮度/饱和度，保证白字可读
      s = Math.min(Math.max(s, 0.35), 0.62);
      l = 0.42;
      var hue2rgb = function (p, q, t) {
        if (t < 0) t += 1; if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      var q2 = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p2 = 2 * l - q2;
      return [Math.round(hue2rgb(p2, q2, h + 1 / 3) * 255),
              Math.round(hue2rgb(p2, q2, h) * 255),
              Math.round(hue2rgb(p2, q2, h - 1 / 3) * 255)];
    }
    function apply(rgb) {
      header.style.setProperty('--heo-cover-bg', 'rgb(' + rgb.join(',') + ')');
      /* 文章页打开中控台时，环境色跟着封面走。
         染色实现在 source/js/partial/home-swiper.js，这里只调它的公开入口；
         该脚本在本文件之后加载，DOMContentLoaded 时一定已经就绪。 */
      if (heo.applyPageTint) heo.applyPageTint(rgb);
    }
    var done = false;
    function extract() {
      if (done) return; done = true;
      try {
        var cv = document.createElement('canvas');
        var ctx = cv.getContext('2d', { willReadFrequently: true });
        cv.width = 60; cv.height = 60;
        ctx.drawImage(img, 0, 0, 60, 60);
        var data = ctx.getImageData(0, 0, 60, 60).data;
        var r = 0, g = 0, b = 0, n = 0;
        for (var i = 0; i < data.length; i += 4) {
          var R = data[i], G = data[i + 1], B = data[i + 2];
          var mx = Math.max(R, G, B), mn = Math.min(R, G, B);
          var lum = (R + G + B) / 3;
          if (mx - mn < 10) continue;   // 跳过灰色像素
          if (lum > 238 || lum < 24) continue;
          r += R; g += G; b += B; n++;
        }
        if (!n) { r = 66; g = 90; b = 239; n = 1; } // 兜底主题蓝
        apply(hslAdjust(r / n, g / n, b / n));
      } catch (e) { /* 跨域等异常时保持默认 */ }
    }
    if (img.complete && img.naturalWidth) extract();
    else {
      img.addEventListener('load', extract);
      img.addEventListener('error', function () { done = true; });
      setTimeout(extract, 2500);
    }
  }

  // ---------- 建站时间解析（兼容 '2024-07-10 00:00:00' / '2024-07-10' / '07/10/2024 00:00:00'） ----------
  // 供页脚运行时间与 source/js/aside/card-webinfo.js 共用（挂到 heo.parseStart） ----------
  function parseStart(str) {
    if (!str) return null;
    var s = String(str).trim();
    if (!s) return null;
    var d = new Date(s);
    if (isNaN(d.getTime())) {
      // Safari 不支持 'YYYY-MM-DD HH:mm:ss'，转成斜杠格式再试
      d = new Date(s.replace(/^(\d{4})-(\d{1,2})-(\d{1,2})/, '$1/$2/$3').replace(/-/g, '/').replace('T', ' '));
    }
    return isNaN(d.getTime()) ? null : d;
  }

  /* 本文件的初始化只做「页面级」的事：问候语（作者卡）、文章页封面取色、快捷键。
     各板块自己的初始化在各自的 partial 脚本里完成：
       导航状态机 / 九宫格菜单 → nav.js        轮播与取色 → home-swiper.js
       页脚运行时长 / 副标题 / 友链 → footer.js
       卡片相对日期 / 已读标记 → post-card.js
       抽屉侧栏 → sidebar.js   中控台 → console.js   右悬浮 → rightside.js
       搜索弹层 → search.js */
  document.addEventListener('DOMContentLoaded', function () {
    /* /search/ 落地页跳回首页时带了标记，这里自动把搜索弹层打开 */
    try {
      if (sessionStorage.getItem('sugar-open-search') === '1') {
        sessionStorage.removeItem('sugar-open-search');
        setTimeout(function () { heo.openSearch(); }, 260);
      }
    } catch (e) {}
    heo.initSayhi();
    coverColor();
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        heo.closeSearch();
        var c = document.getElementById('console');
        if (c && c.classList.contains('show')) heo.toggleConsole();
        var tips = document.getElementById('keyboard-tips');
        if (tips) tips.classList.remove('show');
      }
    });
  });
})();
