/* nav.js —— 顶部导航栏
 *
 * 三件套：
 *   模板  layout/_partial/nav.ejs
 *   样式  source/css/nav.css
 *   脚本  source/js/partial/nav.js   （本文件）
 *
 * 三件事：
 *   1) 左上角九宫格站点菜单：悬停展开、点击可锁定
 *   2) 滚动状态机：顶部 nav-at-top → 下滚 nav-fixed（导航铺白底）→ 上滚 nav-fixed + nav-visible，
 *      顺带更新回顶按钮的百分比
 *   3) 阅读进度条：把滚动比例写给 #nav-progress-bar 的宽度
 *
 * 注意 nav-fixed 必须挂在 #page-header 上：CSS 写的是
 * #page-header.nav-fixed #nav{position:fixed}，挂到 #nav 上没有任何规则命中，
 * 导航栏会直接跟着页面滚出视口。
 *
 * 右悬浮工具条的显隐不在这里判断，只把滚动值转交给 heo.rightsideOnScroll。
 */
(function () {
  'use strict';
  var heo = window.heo = window.heo || {};

  function $(s, r) { return (r || document).querySelector(s); }

  /* ------------------------------------------------------------------ *
   * 一、九宫格站点菜单
   * ------------------------------------------------------------------ */
  function appMenu() {
    var btn = $('.app-menu-button');
    if (!btn) return;
    var timer = null;
    /* pinned：点击打开后锁住，鼠标移开也不收，方便点菜单里的链接 */
    var pinned = false;
    var close = function () { pinned = false; btn.classList.remove('active'); };
    btn.addEventListener('mouseenter', function () {
      clearTimeout(timer);
      btn.classList.add('active');
    });
    btn.addEventListener('mouseleave', function () {
      if (pinned) return;
      timer = setTimeout(function () { btn.classList.remove('active'); }, 180);
    });
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (pinned) close();
      else { pinned = true; clearTimeout(timer); btn.classList.add('active'); }
    });
    document.addEventListener('click', function (e) {
      if (!btn.contains(e.target)) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });
  }

  /* ------------------------------------------------------------------ *
   * 二、滚动状态机
   * ------------------------------------------------------------------ */
  var lastScrollY = 0;
  function onScroll() {
    var y = window.pageYOffset;
    var header = document.getElementById('page-header');
    if (header) {
      if (header.classList.contains('post-bg')) {
        // 文章页：顶部保留大页头，滚动后切小页头状态
        header.classList.toggle('not-top-img', y <= 60);
      } else if (!header.classList.contains('not-top-img')) {
        // 首页 / 分类 / 标签 / 归档等：页头只是导航的占位块，恒为 60px。
        // 原逻辑在滚动超过 60px 时移除该类，会命中
        // @media(min-width:1300px){#page-header{height:25rem}} → 页头 60→500，
        // 页面总高 +440px；回顶时再以 0.5s 缓动收回，
        // 表现为"内容先弹下去、留一条空白、再弹回来"。
        header.classList.add('not-top-img');
      }
      header.classList.toggle('nav-fixed', y > 60);
      header.classList.toggle('nav-at-top', y <= 60);
      if (y > 60 && y < lastScrollY) header.classList.add('nav-visible');
      else if (y > 60 && y > lastScrollY) header.classList.remove('nav-visible');
      else if (y <= 60) header.classList.remove('nav-visible');
    }
    lastScrollY = y;

    var nav = document.getElementById('nav');
    if (nav) nav.classList.toggle('nav-fixed', y > 60);

    /* 右悬浮工具条（rightside.js）自己判断显隐，这里只传滚动值 */
    if (heo.rightsideOnScroll) heo.rightsideOnScroll(y);

    var pct = document.getElementById('percent');
    var h = document.documentElement.scrollHeight - window.innerHeight;
    var ratio = h > 0 ? Math.min(1, Math.max(0, y / h)) : 0;
    if (pct) pct.textContent = Math.round(ratio * 100);

    /* 导航下沿的阅读进度条：宽度 = 当前滚动占总可滚动高度的比例 */
    var bar = document.getElementById('nav-progress-bar');
    if (bar) bar.style.width = (ratio * 100).toFixed(2) + '%';
    var totop = document.getElementById('nav-totop');
    if (totop) totop.classList.toggle('show', y > 300);
  }

  /* 供外部（比如异步插入内容后）手动刷新一次 */
  heo.navOnScroll = onScroll;

  document.addEventListener('DOMContentLoaded', function () {
    appMenu();
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  });
})();
