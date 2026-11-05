/* console.js —— 中控台面板
 *
 * 对应模板 layout/_partial/console.ejs
 * 对应样式 source/css/console.css
 *
 * 打开方式：导航栏右侧的仪表盘按钮（a.console_switchbutton）。
 * 该按钮的图标旋转动画在 nav.css 里，属于导航栏，不在本文件管辖范围。
 */
(function () {
  'use strict';
  var heo = window.heo = window.heo || {};

  heo.toggleConsole = function () {
    var c = document.getElementById('console');
    if (!c) return;
    var open = c.classList.toggle('show');
    document.body.classList.toggle('console-open', open);
    /* 同步导航栏按钮状态：打开时右上角图标由「仪表盘」旋转淡出为「✕」 */
    var btns = document.querySelectorAll('a.console_switchbutton');
    for (var i = 0; i < btns.length; i++) btns[i].classList.toggle('console-open', open);
    if (!open) {
      var tips = document.getElementById('keyboard-tips');
      if (tips) tips.classList.remove('show');
    }
  };

  /* 快捷键说明浮层 */
  heo.toggleKeyboard = function () {
    var tips = document.getElementById('keyboard-tips');
    if (!tips) return;
    tips.classList.toggle('show');
  };

  /* 点导航栏空白处收起中控台；点在 #nav-console 里则不收（那是面板本身） */
  heo.onNavBlankClickCloseConsole = function (e) {
    if (e && e.target && e.target.closest('#nav-console')) return;
    var c = document.getElementById('console');
    if (c && c.classList.contains('show')) heo.toggleConsole();
  };
})();
