/* ==========================================================================
 * 关于页交互  about.js
 * --------------------------------------------------------------------------
 * 唯一逻辑：追求卡的彩色词轮播（学习 → 生活 → 程序 → 体验）。
 *
 * 原理与目标站一致：每个词绝对定位在遮罩下方一行（top:36px），
 * 加上 data-show 滑到可视位（-100%），被顶掉的那个加 data-up 滑到上方（-200%）。
 * 转满一圈后把最老的词清空属性复位，避免元素一直堆在上面。
 * ========================================================================== */

(function () {
  'use strict';

  var mask = document.querySelector('.about-word-mask');
  if (!mask) return;

  var items = mask.querySelectorAll('.about-word-item');
  if (items.length < 2) return;

  var idx = 0;
  var timer = null;

  function tick() {
    var prev = items[idx];
    idx = (idx + 1) % items.length;
    var cur = items[idx];
    var old = items[(idx - 2 + items.length) % items.length];

    /* 上上个已经滚出遮罩，复位到初始位置（看不见，不会闪） */
    if (old && old !== prev && old !== cur) {
      old.removeAttribute('data-show');
      old.removeAttribute('data-up');
    }

    prev.removeAttribute('data-show');
    prev.setAttribute('data-up', '');
    cur.setAttribute('data-show', '');
  }

  function start() {
    if (timer) return;
    timer = setInterval(tick, 3000);
  }

  function stop() {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
  }

  start();

  /* 页面切到后台就停掉，回来再继续 */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop();
    else start();
  });
})();

/* ============ 为TA充电 → 打赏弹窗 ============ */
(function () {
  var mask = document.getElementById('about-reward-dialog');
  var btn = document.querySelector('.about-reward-charge-btn');
  if (!mask || !btn) return;

  var closeBtn = mask.querySelector('.about-reward-dialog-close');
  var panel = mask.querySelector('.about-reward-dialog');
  var lastFocus = null;

  function open() {
    lastFocus = document.activeElement;
    mask.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    if (closeBtn) closeBtn.focus();
  }

  function close() {
    mask.hidden = true;
    document.documentElement.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  btn.addEventListener('click', open);
  if (closeBtn) closeBtn.addEventListener('click', close);

  mask.addEventListener('click', function (e) {
    if (e.target === mask) close();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !mask.hidden) close();
  });

  /* 面板内滚动不要穿透到页面 */
  if (panel) {
    panel.addEventListener('wheel', function (e) { e.stopPropagation(); }, { passive: true });
  }
})();
