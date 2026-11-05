/* ==========================================================================
 * 侧栏骨架（source/js/aside/aside-base.js）
 * --------------------------------------------------------------------------
 * 只做侧栏布局本身的事，不掺任何具体卡片的内容逻辑。
 *
 * 负责两件事：
 * 1. 「吸顶区」(.sticky_layout) 贴在导航栏下方（top = 72px）。
 * 2. 吸顶区比视口还高时（文章页目录 + 热门 + 随机 + 标签 + 统计很容易到 1200+），
 *    让它随页面滚动慢慢上滑，而不是一直钉在顶上去遮住底部卡片。
 *
 * 为什么不做「一上来就贴底」（top = vh - h - gap）：
 *   那样 top 会变成负数，目录卡直接被顶出视口，读长文时目录全程看不见。
 * 现在的做法是从贴顶开始，滚动多少、上滑多少，最多滑到「底部刚好对齐视口底」，
 * 目录先在第一屏，往下读时侧栏底部的卡片会自己升上来。
 *
 * 命名与 source/css/aside/aside-base.css 对应。
 * ========================================================================== */
(function () {
  'use strict';

  var GAP = 72;        // 导航栏 60px + 12px 呼吸位
  var BOTTOM_GAP = 20; // 吸顶区底部离视口底的最小距离
  var state = { need: 0, startY: 0 };

  function layoutEl() {
    return document.querySelector('#aside-content .sticky_layout');
  }

  /* 计算：吸顶区需要上滑多少（need）、从哪个滚动位置开始上滑（startY） */
  function measure() {
    var layout = layoutEl();
    if (!layout) return null;
    if (window.innerWidth < 900) {
      layout.style.top = '';
      return null;
    }
    var cont = document.getElementById('aside-content');
    /* 先复位再量：sticky 生效时 getBoundingClientRect 是「已经吸住」的位置，
       量出来会偏，所以先清掉 inline top，取它真实的自然位置 */
    layout.style.top = '';
    var h = layout.offsetHeight;
    var free = window.innerHeight - GAP - BOTTOM_GAP;
    state.need = Math.max(0, h - free);
    var contRect = cont.getBoundingClientRect();
    var contTopAbs = contRect.top + window.scrollY;
    var innerOffset = layout.getBoundingClientRect().top - contRect.top;
    state.startY = contTopAbs + innerOffset - GAP;
    return layout;
  }

  function apply() {
    var layout = layoutEl();
    if (!layout || window.innerWidth < 900) return;
    if (!state.need) { layout.style.top = GAP + 'px'; return; }
    var dy = window.scrollY - state.startY;
    var slide = dy > 0 ? Math.min(state.need, dy) : 0;
    layout.style.top = (GAP - slide) + 'px';
  }

  function refresh() {
    if (measure()) apply();
  }

  function init() {
    refresh();
    window.addEventListener('load', refresh);
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () { apply(); ticking = false; });
    }, { passive: true });
    var rzTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(rzTimer);
      rzTimer = setTimeout(refresh, 150);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
