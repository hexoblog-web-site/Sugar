/* home-swiper.js —— 首页「全站推荐」轮播
 *
 * 三件套（文件名与类名 #home_swiper / .home-swiper-* 严格对应）：
 *   模板  layout/_partial/home/home-swiper.ejs
 *   样式  source/css/home-swiper.css
 *   脚本  source/js/partial/home-swiper.js   （本文件）
 *
 * 这里做两件事，改轮播只改这一个文件：
 *   1) 轮播本身：自动播放、左右箭头、圆点指示器、延迟加载封面、标题与链接同步
 *   2) 取色染色：从当前这张封面里取出主色，写到 body 的 CSS 变量上
 *      （--console-tint / --banner-tint / --banner-tint-deep），
 *      中控台环境色、首页柔光、侧栏作者卡都靠这三个变量上色
 *
 * 染色工具对外只暴露一个入口 heo.applyPageTint(rgb)：
 * 文章页的封面取色（main.js 的 coverColor）也走它，保证两处颜色过渡完全一致。
 */
(function () {
  'use strict';
  var cfg = window.HEO_CONFIG || {};
  /* 主色联动开关（主题 _config.yml → home.home_top.swiper.tint），关闭时整段染色逻辑不执行 */
  var TINT_ON = cfg.bannerTint !== false;
  var heo = window.heo = window.heo || {};

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* ------------------------------------------------------------------ *
   * 一、取色
   * ------------------------------------------------------------------ */

  /* 从图片取「主色」：按色相分桶，取饱和度加权最高的那一段（而不是全图均值，
     均值会把多色封面平均成灰，导致几张图取出来几乎同一个颜色） */
  function sampleImage(img, size) {
    try {
      if (!img.complete || !img.naturalWidth) return null;
      var s = size || 48;
      var cv = document.createElement('canvas');
      cv.width = s; cv.height = s;
      var ctx = cv.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, s, s);
      var data = ctx.getImageData(0, 0, s, s).data;
      var BINS = 36;
      var bins = new Array(BINS);
      for (var k = 0; k < BINS; k++) bins[k] = 0;
      var px = [];
      for (var i = 0; i < data.length; i += 4) {
        var R = data[i], G = data[i + 1], B = data[i + 2];
        var max = Math.max(R, G, B), min = Math.min(R, G, B);
        var v = max / 255;
        var sat = max === 0 ? 0 : (max - min) / max;
        if (sat < 0.18 || v < 0.1 || v > 0.98) continue;
        var hsl = rgbToHsl(R, G, B);
        var bin = Math.floor(hsl[0] * BINS) % BINS;
        if (bin < 0) bin += BINS;
        var w = sat * v;
        bins[bin] += w;
        px.push([R, G, B, bin, w]);
      }
      if (!px.length) return null;
      /* 相邻桶一起算，避免主色刚好卡在桶边界被拆成两半 */
      var best = 0, bestW = -1;
      for (var j = 0; j < BINS; j++) {
        var sum = bins[(j + BINS - 1) % BINS] + bins[j] + bins[(j + 1) % BINS];
        if (sum > bestW) { bestW = sum; best = j; }
      }
      var r = 0, g = 0, b = 0, n = 0;
      for (var p = 0; p < px.length; p++) {
        var d = Math.abs(px[p][3] - best);
        if (d > 1 && d < BINS - 1) continue;
        r += px[p][0] * px[p][4]; g += px[p][1] * px[p][4]; b += px[p][2] * px[p][4];
        n += px[p][4];
      }
      if (!n) return null;
      return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
    } catch (e) { return null; }
  }

  function hexToRgb(hex) {
    var m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(hex || '').trim());
    return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h /= 6;
    }
    return [h, s, l];
  }

  function hslToRgb(h, s, l) {
    var hue2rgb = function (p, q, t) {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    if (s === 0) { var v = Math.round(l * 255); return [v, v, v]; }
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    return [Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
            Math.round(hue2rgb(p, q, h) * 255),
            Math.round(hue2rgb(p, q, h - 1 / 3) * 255)];
  }

  /* 把主色收敛到「适合做玻璃染色」的区间：饱和度抬到能看出来的程度，
     亮度压在 0.46~0.56，避免过灰/过曝/过暗 */
  function tintColor(rgb) {
    var hsl = rgbToHsl(rgb[0], rgb[1], rgb[2]);
    var s = Math.min(Math.max(hsl[1], 0.55), 0.86);
    var l = Math.min(Math.max(hsl[2], 0.46), 0.56);
    return hslToRgb(hsl[0], s, l);
  }

  /* 把一张图的主色写进页面：中控台环境色 + 首页横幅柔光 + 侧栏作者卡 */
  var tintFrame = null;
  function setTintVars(cur, deep) {
    var b = document.body.style;
    b.setProperty('--console-tint', cur.join(','));
    b.setProperty('--banner-tint', cur.join(','));
    b.setProperty('--banner-tint-deep', deep.join(','));
  }

  function deepOf(rgb) {
    var hsl = rgbToHsl(rgb[0], rgb[1], rgb[2]);
    return hslToRgb(hsl[0], Math.min(hsl[1] + 0.06, 0.95), Math.max(hsl[2] - 0.16, 0.2));
  }

  /* 颜色渐变过渡：CSS 变量驱动的渐变（background-image）本身没法 transition，
     所以在这里逐帧插值，换图时背景是「渐变过去」而不是硬切 */
  function applyPageTint(rgb) {
    if (!TINT_ON || !rgb) return;
    var end = tintColor(rgb);
    var endDeep = deepOf(end);
    var raw = (getComputedStyle(document.body).getPropertyValue('--banner-tint') || '').trim();
    var start = raw ? raw.split(',').map(Number) : null;
    if (!start || start.length !== 3 || start.some(function (n) { return !isFinite(n); })) {
      setTintVars(end, endDeep);
      return;
    }
    if (tintFrame) cancelAnimationFrame(tintFrame);
    var t0 = (window.performance && performance.now) ? performance.now() : Date.now();
    var DUR = 620;
    var step = function (now) {
      var k = Math.min(1, (now - t0) / DUR);
      var e = 1 - Math.pow(1 - k, 3);
      var cur = [
        Math.round(start[0] + (end[0] - start[0]) * e),
        Math.round(start[1] + (end[1] - start[1]) * e),
        Math.round(start[2] + (end[2] - start[2]) * e)
      ];
      setTintVars(cur, deepOf(cur));
      if (k < 1) tintFrame = requestAnimationFrame(step);
      else tintFrame = null;
    };
    tintFrame = requestAnimationFrame(step);
  }
  /* 对外：文章页封面取色（main.js）复用它，两处过渡参数保持一致 */
  heo.applyPageTint = applyPageTint;

  /* 轮播切到哪张，就把中控台的环境色换成那张图的主色
     warm=true 时只算不写（预热用），避免把当前这张的颜色覆盖掉 */
  function bannerTint(item, warm) {
    if (!TINT_ON || !item) return;
    var fallback = hexToRgb(item.dataset.bannerColor || '');
    var apply = function (rgb) {
      if (!rgb || warm) return;
      applyPageTint(rgb);
    };
    var img = item.querySelector('img');
    if (!img) { if (fallback) apply(fallback); return; }
    if (img.dataset.bannerTint) {
      apply(img.dataset.bannerTint.split(',').map(Number));
      return;
    }
    var run = function () {
      var rgb = sampleImage(img, 48);
      if (rgb) {
        img.dataset.bannerTint = rgb.join(',');
        apply(rgb);
      } else if (fallback && !warm && !document.body.style.getPropertyValue('--console-tint')) {
        /* 取不到色时不要退回固定的紫色，否则看起来就像「颜色一直没变」 */
        apply(fallback);
      }
    };
    if (img.complete && img.naturalWidth) run();
    else {
      img.addEventListener('load', run, { once: true });
    }
  }

  /* ------------------------------------------------------------------ *
   * 二、轮播
   * ------------------------------------------------------------------ */

  var bannerIdx = 0, bannerTimer = null;
  function banners() { return $$('#home_swiper .home-swiper-banner-item'); }
  function indicators() { return $$('#home_swiper .home-swiper-indicator'); }

  /* 轮播图延迟加载：非首张用 data-src 占位，切到该张时才真正下载；
     每次切换后只预取「下一张」，不把 4 张一次性下完（首屏省下 100KB） */
  function hydrateBanner(el) {
    if (!el) return;
    var img = el.querySelector('.home-swiper-cover-img');
    if (img && img.dataset.src && !img.getAttribute('src')) {
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
    }
  }

  function prefetchNextBanner() {
    var list = banners();
    if (list.length < 2) return;
    setTimeout(function () {
      hydrateBanner(list[(bannerIdx + 1) % list.length]);
    }, 900);
  }

  function applyBanner(i) {
    var list = banners();
    if (!list.length) return;
    i = (i + list.length) % list.length;
    bannerIdx = i;
    hydrateBanner(list[i]);
    prefetchNextBanner();
    list.forEach(function (el, k) { el.classList.toggle('active', k === i); });
    indicators().forEach(function (el, k) { el.classList.toggle('active', k === i); });
    var item = list[i];
    var titleEl = $('#home_swiper .home-swiper-title > a');
    if (titleEl && item.dataset.title) {
      var link = item.dataset.link || '#';
      var newTab = item.dataset.target === '1';
      titleEl.textContent = item.dataset.title;
      titleEl.setAttribute('href', link);
      titleEl.setAttribute('onclick', "heo.handlePostClick('" + link + "', event, " + (newTab ? 'true' : 'false') + ")");
      /* 新窗口那条要把 target 挂回标题链接上，否则中键/右键「新标签打开」还是同窗口 */
      if (newTab) {
        titleEl.setAttribute('target', '_blank');
        titleEl.setAttribute('rel', 'noopener');
      } else {
        titleEl.removeAttribute('target');
        titleEl.removeAttribute('rel');
      }
    }
    /* 摘要跟着当前这张一起换：悬停时才显示，但内容必须是这一篇的 */
    var exEl = $('#home_swiper .home-swiper-excerpt');
    if (exEl) exEl.textContent = item.dataset.excerpt || '';
    var center = $('#home_swiper .home-swiper-content');
    if (center && item.dataset.bannerColor) center.style.setProperty('--banner-color', item.dataset.bannerColor);
    bannerTint(item);
  }

  /* 圆点 / 左右箭头都是模板里的 onclick="heo.xxx"，所以必须挂在 heo 上 */
  heo.goBanner = function (i, e) { if (e) e.stopPropagation(); applyBanner(i); restartBanner(); };
  heo.stepHomeCenterBanner = function (dir, e) {
    if (e) e.stopPropagation();
    applyBanner(bannerIdx + (dir || 1));
    restartBanner();
  };

  function startBanner() {
    clearInterval(bannerTimer);
    /* interval 配 0 = 不自动播；只有一张也没什么可切的 */
    var iv = +cfg.bannerInterval;
    if (!(iv > 0)) return;
    if (banners().length < 2) return;
    bannerTimer = setInterval(function () { applyBanner(bannerIdx + 1); }, iv);
  }
  function restartBanner() { clearInterval(bannerTimer); startBanner(); }

  document.addEventListener('DOMContentLoaded', function () {
    if (!banners().length) return;
    applyBanner(0);
    startBanner();
    /* 鼠标停在轮播上先别切走：简介是悬停才浮出来的，正要读的时候被翻页最烦 */
    if (cfg.bannerPause !== false) {
      var root = $('#home_swiper');
      if (root) {
        root.addEventListener('mouseenter', function () { clearInterval(bannerTimer); });
        root.addEventListener('mouseleave', function () { restartBanner(); });
      }
    }
    /* 预热每张轮播图的主色：切过去时立刻就有颜色，不会先闪一下默认色 */
    banners().forEach(function (el) { bannerTint(el, true); });
  });
})();
