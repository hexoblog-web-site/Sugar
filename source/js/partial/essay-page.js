/* essay-page.js —— 即刻短文页（/essay/）的交互
 *
 * 三件套：
 *   模板  layout/essay.ejs
 *   样式  source/css/essay-page.css
 *   脚本  source/js/partial/essay-page.js   （本文件）
 *
 * 页面本身是静态渲染的（数据来自 source/_data/vignette.yml，构建期就写进 HTML），
 * 所以这里只做三件小事，不请求任何接口：
 *   1) 相对时间：把 <time> 里的 2024/07/11 换成「1年前」
 *   2) 加载更多：先渲染全部，默认只露 perPage 条，点一次放一批
 *   3) 点赞：localStorage 记住，刷新不丢（没有后端，纯本地状态）
 */
(function () {
  'use strict';

  var cfg = window.ESSAY_CONFIG || {};
  var PER_PAGE = parseInt(cfg.perPage, 10) || 8;

  /* ---------- 1. 相对时间 ---------- */
  function relative(iso) {
    if (!iso) return '';
    var t = new Date(iso + 'T00:00:00');
    if (isNaN(t.getTime())) return '';
    var diff = Date.now() - t.getTime();
    if (diff < 0) return '刚刚';
    var min = 60 * 1000, hour = 60 * min, day = 24 * hour, month = 30 * day, year = 365 * day;
    if (diff < min) return '刚刚';
    if (diff < hour) return Math.floor(diff / min) + '分钟前';
    if (diff < day) return Math.floor(diff / hour) + '小时前';
    if (diff < month) return Math.floor(diff / day) + '天前';
    if (diff < year) return Math.floor(diff / month) + '个月前';
    return Math.floor(diff / year) + '年前';
  }

  function fillTime(root) {
    (root || document).querySelectorAll('.essay-ago').forEach(function (el) {
      var txt = relative(el.getAttribute('datetime'));
      if (txt) el.textContent = txt;
    });
  }

  /* ---------- 2. 加载更多 ---------- */
  function initMore() {
    var list = document.getElementById('essay-list');
    var btn = document.getElementById('essay-more');
    var wrap = document.getElementById('essay-more-wrap');
    if (!list || !btn || !wrap) return;

    var items = Array.prototype.slice.call(list.querySelectorAll('.essay-item'));

    function revealBatch() {
      var hidden = items.filter(function (li) { return li.classList.contains('is-hidden'); });
      hidden.slice(0, PER_PAGE).forEach(function (li, i) {
        /* 一条一条错开出来，别整块闪现 */
        li.style.animationDelay = (i * 40) + 'ms';
        li.classList.remove('is-hidden');
        li.classList.add('is-entering');
      });
      if (!hidden.length || hidden.length <= PER_PAGE) wrap.hidden = true;
      fillTime(list);
    }

    btn.addEventListener('click', function () {
      btn.classList.add('is-loading');
      /* 留 180ms 给按钮的加载态，体感上有个反馈 */
      setTimeout(function () {
        revealBatch();
        btn.classList.remove('is-loading');
      }, 180);
    });

    if (items.filter(function (li) { return li.classList.contains('is-hidden'); }).length === 0) {
      wrap.hidden = true;
    }
  }

  /* ---------- 3. 点赞 ---------- */
  var KEY = 'liublog-essay-likes';

  function readLikes() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '{}') || {};
    } catch (e) {
      return {};
    }
  }

  function writeLikes(obj) {
    try {
      localStorage.setItem(KEY, JSON.stringify(obj));
    } catch (e) { /* 隐私模式下写不进去，忽略 */ }
  }

  function initLikes() {
    var state = readLikes();
    document.querySelectorAll('.essay-like').forEach(function (btn) {
      var key = btn.getAttribute('data-key');
      if (!key) return;
      if (state[key]) btn.setAttribute('aria-pressed', 'true');

      btn.addEventListener('click', function () {
        var s = readLikes();
        var on = btn.getAttribute('aria-pressed') === 'true';
        if (on) {
          delete s[key];
          btn.setAttribute('aria-pressed', 'false');
        } else {
          s[key] = 1;
          btn.setAttribute('aria-pressed', 'true');
        }
        writeLikes(s);
      });
    });
  }

  function init() {
    if (!document.querySelector('.essay-page')) return;
    fillTime(document);
    initMore();
    initLikes();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
