/* home-top.js —— 首页右侧「新品框架」推荐墙的交互补充
 *
 * 对应模板 layout/_partial/home/home-top.ejs
 * 对应样式 source/css/home-top.css
 *
 * 悬停露底的主体是 CSS（@media (hover:hover)），本文件只补两件 CSS 干不了的事：
 *
 * 1) 指针压在右下角「更多推荐」上时，给整块加 .hold，让遮罩不淡出。
 *    不加这一条的话，鼠标一进这块遮罩就开始消失，按钮跟着一起没了 ——
 *    点下去落到底下的文章卡上，永远进不去「更多」那个页面。
 *    这里按坐标判断而不是用 :hover，是因为遮罩淡出后 pointer-events:none，
 *    里面的按钮收不到 hover；按坐标也不会在遮罩上留一块看不见的可点区。
 *
 * 2) 没有悬停的设备（触屏）上：点遮罩展开六张卡，点页面别处收回。
 *    键盘用户由 CSS 的 :focus-within 负责，这里不用管。
 *
 * 3) 遮罩上那行 hello 的书写动画，要在「进入视口」和「遮罩重新盖回来」时
 *    各播一遍。动画本身在 CSS 里，但这两个时机 CSS 判断不了。
 */
(function () {
  'use strict';

  function init() {
    var group = document.getElementById('new_frame_group');
    if (!group) return;
    var card = document.getElementById('new_frame_card');
    if (!card) return;
    var action = card.querySelector('.new-frame-card-action');
    var btn = card.querySelector('.banner-button');

    /* ---------- 1. 悬停按钮时不露底 ---------- */
    var rect = null;
    var held = false;
    /* 边界给 4px 容错：贴着按钮边缘走的时候别一进一出地闪 */
    var PAD = 4;

    function measure() {
      rect = action ? action.getBoundingClientRect() : null;
    }

    function setHold(on) {
      if (on === held) return;
      held = on;
      group.classList.toggle('hold', on);
    }

    if (action) {
      group.addEventListener('pointerenter', measure);
      group.addEventListener('pointerleave', function () {
        measure();
        setHold(false);
      });
      group.addEventListener('pointermove', function (e) {
        if (!rect) measure();
        if (!rect) return;
        setHold(
          e.clientX >= rect.left - PAD && e.clientX <= rect.right + PAD &&
          e.clientY >= rect.top - PAD && e.clientY <= rect.bottom + PAD
        );
      });
      /* 滚动、改窗口大小都会挪位置，重新量一次 */
      window.addEventListener('resize', measure);
      window.addEventListener('scroll', measure, { passive: true });
    }

    /* ---------- 2. 遮罩上的 hello：进视口写一遍，盖回来再写一遍 ----------
     * 两种载体，触发时机完全一样，只是「写」的动作不同：
     *   .new-frame-hello-lottie  原版手写动画。从原站 hello.lottie 里解出的
     *                            json，交给 lottie-web 的 light 构建播放（库
     *                            按需注入，不进 bundle，只有首页会用到）
     *   .new-frame-hello         自己填的文字：靠 CSS 挂 .is-writing 触发擦出
     * CSS 判断不了「遮罩刚刚重新盖回来」这件事，所以由这里统一触发。 */
    var helloLottie = card.querySelector('.new-frame-hello-lottie');
    var hello = card.querySelector('.new-frame-hello:not(.new-frame-hello-lottie)');
    var helloAnim = null;
    var helloPending = false;

    /* 库还在路上就被要求播：先记下，加载完立刻补播，别让第一次动画丢掉 */
    function playLottie() {
      if (!helloAnim) { helloPending = true; return; }
      helloPending = false;
      /* 从头再来一遍：第二参数 true 表示连同一帧上的其它动画一起重置 */
      helloAnim.goToAndPlay(0, true);
    }

    function writeHello() {
      if (helloLottie) return playLottie();
      if (!hello) return;
      /* 已经在写的时候又被触发，得先摘掉类并强制回流，动画才会从头来一遍 */
      if (hello.classList.contains('is-writing')) {
        hello.classList.remove('is-writing');
        void hello.offsetWidth;
      }
      hello.classList.add('is-writing');
    }

    if (helloLottie) {
      var bootLottie = function () {
        var lottie = window.lottie || window.bodymovin;
        if (!lottie) return;
        helloAnim = lottie.loadAnimation({
          container: helloLottie,
          renderer: 'svg',            /* 跟原站同一个渲染器，出来是内联 SVG */
          loop: false,                /* 原动画 3s 一遍，写完就停 */
          /* 不自动播，统一由「进入视口 / 遮罩盖回来」那条路径触发：
             autoplay 再叠一个 IntersectionObserver，会出现刚播两帧又被打回 0 */
          autoplay: false,
          path: helloLottie.dataset.src,
          rendererSettings: {
            /* 原站的写法：画布 500×500 等比装进容器，字自然居中 */
            preserveAspectRatio: 'xMidYMid meet',
            progressiveLoad: true
          }
        });
        /* 库加载期间就有人要求播（首屏通常如此）：这里补上。
           浏览器没有 IntersectionObserver 时没人会来触发，直接播。 */
        if (helloPending || !('IntersectionObserver' in window)) playLottie();
      };

      /* 这块在 ≤1200px 整块 display:none（跟安知鱼同一个断点），
         那种情况下没人看得见，就别为它拉 45KB 的播放器。
         窗口拖宽了再补上 —— resize 里试，加载过就不再重复。 */
      var lottieAsked = false;
      var startLottie = function () {
        if (lottieAsked) return true;
        if (helloLottie.offsetParent === null) return false;
        lottieAsked = true;
        if (window.lottie || window.bodymovin) {
          bootLottie();
        } else {
          var lib = document.createElement('script');
          lib.src = helloLottie.dataset.lib;
          lib.async = true;
          lib.onload = bootLottie;
          lib.onerror = function () {
            /* 库挂了就退回纯渐变文字，别让遮罩中间空一块 */
            helloLottie.innerHTML =
              '<span class="new-frame-hello-fallback">hello</span>';
          };
          (document.head || document.documentElement).appendChild(lib);
        }
        return true;
      };

      if (!startLottie()) {
        window.addEventListener('resize', startLottie, { passive: true });
      }
    }

    if (hello) {
      /* 播完摘掉类：动画停在终态，和基态一致，摘掉不会跳一下。
         目前只有文字版（new_frame.hello 写了字）走 CSS 动画，名字是 nf-hello-write；
         手写版是 lottie，播完由播放器自己停在最后一帧，不需要收尾。 */
      hello.addEventListener('animationend', function (e) {
        if (e.animationName === 'nf-hello-write') hello.classList.remove('is-writing');
      });
    }

    if (hello || helloLottie) {
      /* 第一次滚到这块的时候写一遍 */
      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
          for (var i = 0; i < entries.length; i++) {
            if (!entries[i].isIntersecting) continue;
            io.disconnect();
            writeHello();
            return;
          }
        }, { threshold: 0.3 });
        io.observe(group);
      }
    }

    /* ---------- 3. 触屏：点遮罩展开 / 收回 ---------- */
    /* 指针移开、遮罩重新盖回来的时候再写一遍 —— 正好和 0.28s 的淡入接上。
       触屏上 pointerleave 是手指抬起，那种情况归下面的 setOpen 管，这里跳过。 */
    group.addEventListener('pointerleave', function () {
      if (group.classList.contains('is-open')) return;
      writeHello();
    });

    function setOpen(open) {
      group.classList.toggle('is-open', open);
      if (btn && btn.tagName === 'BUTTON') {
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      }
      if (!open) writeHello();
    }

    if (btn && btn.tagName === 'BUTTON') {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        setOpen(!group.classList.contains('is-open'));
      });
    }

    /* 点遮罩图本身也能展开 —— 触屏上没人会去瞄那个小按钮。
       点的是按钮（<a> 或 <button>）就不管，让它自己跳。 */
    card.addEventListener('click', function (e) {
      if (e.target.closest('.banner-button')) return;
      setOpen(!group.classList.contains('is-open'));
    });

    /* 展开状态下点页面别处收回。点的是下面的文章卡（<a>）就照常跳转，不拦。 */
    document.addEventListener('click', function (e) {
      if (!group.classList.contains('is-open')) return;
      if (group.contains(e.target)) return;
      setOpen(false);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
