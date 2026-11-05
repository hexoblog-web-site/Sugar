/* category-bar.js —— 首页 / 分类页顶部的分类横条
 *
 * 对应模板 layout/_partial/home/category-bar.ejs
 * 对应样式 source/css/category-bar.css
 *
 * 改分类条的交互只改本文件，不会碰到文章卡片或其它板块。
 */
(function () {
  'use strict';
  var heo = window.heo = window.heo || {};

  /* 「下一批分类」按钮：滚到末尾就回到开头，否则按一屏的 70% 前进
     （最小 240px，保证在很窄的屏上也至少翻过一个分类） */
  heo.scrollCategoryBarToRight = function () {
    var box = document.querySelector('#category-bar-items');
    if (!box) return;
    var max = box.scrollWidth - box.clientWidth;
    if (box.scrollLeft >= max - 4) {
      box.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      box.scrollBy({ left: Math.max(240, box.clientWidth * 0.7), behavior: 'smooth' });
    }
  };
})();
