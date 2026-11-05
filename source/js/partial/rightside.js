/* rightside.js —— 右悬浮工具条
 *
 * 对应模板 layout/_partial/rightside.ejs
 * 对应样式 source/css/rightside.css
 *
 * 改「设置 / 单栏切换 / 回顶」这几个按钮的行为，只改本文件。
 *
 * 说明：#rightside 在目标站与本主题里都是 display:none —— 那排按钮已经被
 * 底部工具栏取代，属于保留结构。这里仍然把交互写好，将来把面板显示出来时
 * 不需要再动脚本。
 */
(function () {
  'use strict';
  var heo = window.heo = window.heo || {};

  /* 展开 / 收起「设置」那一排隐藏按钮 */
  heo.toggleRightside = function () {
    var rs = document.getElementById('rightside');
    if (rs) rs.classList.toggle('open');
  };

  /* 单栏 / 双栏切换。右悬浮与中控台各有一个入口，共用这一个方法 */
  heo.toggleAside = function () {
    document.body.classList.toggle('hide-aside');
  };

  /* 滚动超过 300px 才出现。由 main.js 的 onScroll 每帧调用，避免重复绑监听 */
  heo.rightsideOnScroll = function (y) {
    var rs = document.getElementById('rightside');
    if (rs) rs.classList.toggle('show', y > 300);
  };
})();
