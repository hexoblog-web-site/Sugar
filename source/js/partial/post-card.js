/* post-card.js —— 列表里的文章卡片
 *
 * 对应模板 layout/_partial/home/post-card.ejs
 * 对应样式 source/css/post-card.css
 *
 * 以下行为只在卡片上生效，改它不会影响导航、侧栏、页脚。
 */
(function () {
  'use strict';
  var heo = window.heo = window.heo || {};

  /* 整块点击跳转：卡片任意空白处都能点进文章。
     两种情况要放行给浏览器自己处理：
       1) 按住 Ctrl / Cmd / Shift —— 用户想新标签打开，此时点击的是 <a>，交给浏览器；
       2) 点到的本身是链接（标题、封面、分类标签），避免重复跳转打断新标签打开。
     第三个参数 newTab：幻灯片里的精品推荐条目可以配 target: true 走新窗口，
     不传就是原来的行为（当前窗口跳）。 */
  heo.handlePostClick = function (url, e, newTab) {
    if (e && (e.ctrlKey || e.metaKey || e.shiftKey)) return;
    if (e && e.target && e.target.closest('a')) return;   // <a> 自己有 target
    if (!url) return;
    if (newTab) window.open(url, '_blank', 'noopener');
    else window.location.href = url;
  };

  /* ------------------------------------------------------------------ *
   * 卡片上的日期与已读标记
   * ------------------------------------------------------------------ */

  function formatRelative(dateStr) {
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    var now = new Date();
    var startOfDay = function (x) { return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime(); };
    var dayDiff = Math.floor((startOfDay(now) - startOfDay(d)) / 86400000);
    if (dayDiff < 0) dayDiff = 0;
    if (dayDiff === 0) return '今天';
    if (dayDiff === 1) return '昨天';
    if (dayDiff < 30) return dayDiff + '天前';
    var m = d.getMonth() + 1, day = d.getDate();
    if (d.getFullYear() === now.getFullYear()) return m + '/' + day;
    return d.getFullYear() + '/' + m + '/' + day;
  }

  function relativeDates() {
    var nodes = document.querySelectorAll('.recent-post-item .post-meta-date time[datetime]');
    nodes.forEach(function (el) {
      var rel = formatRelative(el.getAttribute('datetime'));
      if (rel) el.textContent = rel;
    });
  }

  function readedList() {
    try { return JSON.parse(localStorage.getItem('sugar-readed') || '[]'); } catch (e) { return []; }
  }

  function trackRead() {
    if (!document.body.classList.contains('post')) return;
    var path = location.pathname;
    var list = readedList();
    if (list.indexOf(path) === -1) {
      list.push(path);
      try { localStorage.setItem('sugar-readed', JSON.stringify(list.slice(-500))); } catch (e) {}
    }
  }

  function markUnread() {
    var list = readedList();
    document.querySelectorAll('.unReadPost[data-path]').forEach(function (el) {
      var p = el.getAttribute('data-path');
      if (p && list.indexOf(p.replace(/\/index\.html$/, '/')) !== -1) el.style.display = 'none';
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    relativeDates();
    trackRead();
    markUnread();
  });
})();
