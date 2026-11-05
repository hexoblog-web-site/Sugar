/* essay.js —— 首页「即刻」短文条的滚动
 *
 * 三件套：
 *   模板  layout/_partial/home/essay.ejs
 *   样式  source/css/essay.css
 *   脚本  source/js/partial/essay.js   （本文件）
 *
 * 移植自安知鱼主题 source/js/utils.js 的 initIndexEssay()。原版拿 Swiper 做竖向轮播
 * （direction: vertical + loop + autoplay 3000），本主题没有 Swiper，也没必要为
 * 「一条一条往上滚」多下一次 40KB 的库，所以这里用 #bber-talk 的 transform 位移实现，
 * 观感一致：
 *   每 interval 毫秒往上滚一条 → 滚到最后一条后无缝回到第一条
 *   鼠标移上去暂停，移开继续
 *   系统开了「减少动态效果」就完全不动，只显示第一条
 *
 * 位移的单位高度是从真实 DOM 量出来的，不写死 30px，改字号也不会错行。
 */
(function () {
  'use strict';

  function init() {
    var bar = document.getElementById('bbTimeList');
    if (!bar) return;
    var box = document.getElementById('bbtalk');
    var rail = document.getElementById('bber-talk');
    if (!box || !rail) return;

    var items = Array.prototype.slice.call(rail.children);
    if (items.length < 2) return;                 /* 只有一条，没什么可滚的 */
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var interval = parseInt(bar.getAttribute('data-interval'), 10) || 3000;
    var unit = items[0].getBoundingClientRect().height || 30;

    /* 把第一条复制一份接在末尾：滚过最后一条之后接着滑上来的就是它，
       滑完再把位移清零，于是看起来是从第一条无缝重新开始 */
    var clone = items[0].cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    if (clone.tagName === 'A') clone.setAttribute('tabindex', '-1');
    rail.appendChild(clone);

    var idx = 0;
    var timer = null;

    function jumpBack() {
      rail.style.transition = 'none';
      rail.style.transform = 'translateY(0)';
      idx = 0;
      void rail.offsetHeight;      /* 强制回流，让上面的 none 立刻生效 */
      rail.style.transition = '';  /* 过渡交还给 CSS */
    }

    rail.addEventListener('transitionend', function (e) {
      if (e.target !== rail || e.propertyName !== 'transform') return;
      if (idx >= items.length) jumpBack();
    });

    function step() {
      idx++;
      rail.style.transform = 'translateY(-' + (idx * unit) + 'px)';
    }

    function stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }

    function start() {
      stop();
      timer = setInterval(step, interval);
    }

    /* 悬停暂停 */
    bar.addEventListener('mouseenter', stop);
    bar.addEventListener('mouseleave', start);

    /* 切到后台标签页时别空转 */
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop();
      else if (!bar.matches(':hover')) start();
    });

    /* 窗口尺寸变化（手机横竖屏）时一条的高度可能变，重算并保持当前那条 */
    window.addEventListener('resize', function () {
      unit = items[0].getBoundingClientRect().height || 30;
      rail.style.transition = 'none';
      rail.style.transform = 'translateY(-' + (idx * unit) + 'px)';
      void rail.offsetHeight;
      rail.style.transition = '';
    });

    start();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
