/* sidebar.js —— 手机端抽屉侧栏
 *
 * 对应模板 layout/_partial/sidebar.ejs
 * 对应样式 source/css/sidebar.css
 *
 * 桌面端不显示抽屉，这套逻辑只在窄屏（≤899px）有意义。
 */
(function () {
  'use strict';
  var heo = window.heo = window.heo || {};

  /* 汉堡按钮：同时切换 body 上的遮罩态和抽屉自身的滑入态，
     两个类缺一个都会导致「点开了但看不见」或「点关了遮罩还在」。 */
  heo.toggleMobileMenu = function (e) {
    if (e) e.stopPropagation();
    document.body.classList.toggle('sidebar-open');
    var sb = document.getElementById('sidebar');
    if (sb) sb.classList.toggle('open');
  };

  /* 点遮罩、点菜单项、按 Esc 都会走这里 */
  heo.closeSidebar = function () {
    document.body.classList.remove('sidebar-open');
    var sb = document.getElementById('sidebar');
    if (sb) sb.classList.remove('open');
  };
})();
