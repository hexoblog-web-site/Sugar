/* footer.js —— 页脚
 *
 * 三件套：
 *   模板  layout/_partial/footer.ejs
 *   样式  source/css/footer.css
 *   脚本  source/js/partial/footer.js   （本文件）
 *
 * 三块内容：
 *   1) 运行时长：从建站时间算到现在，每秒刷新一次；顺带按钟点换「上班/下班」配图
 *   2) 打字机副标题：按 data-sub 里的句子逐字打出、回删、换下一句
 *   3) 随机友链：从 data-friends 里随机抽 N 个，点「换一批」重抽
 *
 * 建站时间的解析在 heo.parseStart（main.js），侧栏的运行天数卡片也用它。
 */
(function () {
  'use strict';
  var heo = window.heo = window.heo || {};

  /* ---------- 页脚：运行时长 / 打字机副标题 / 随机友链 ---------- */
  heo.randomFriends = function () {
    var box = document.getElementById('friend-links-in-footer');
    if (!box) return;
    var all = [];
    try { all = JSON.parse(box.getAttribute('data-friends') || '[]'); } catch (e) {}
    if (!all.length) return;
    var n = parseInt(box.getAttribute('data-count') || '4', 10);
    var pool = all.slice(), picked = [];
    while (picked.length < n && pool.length) {
      picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    box.innerHTML = '';
    picked.forEach(function (f) {
      var a = document.createElement('a');
      a.className = 'footer-item';
      a.href = f.u;
      a.title = f.t;
      a.textContent = f.t;
      a.target = '_blank';
      a.rel = 'external nofollow';
      box.appendChild(a);
    });
  };

  function footerRuntime() {
    var box = document.getElementById('workboard');
    if (!box) return;
    var grt = heo.parseStart(box.getAttribute('data-launch'));
    if (!grt) return;
    var img = box.querySelector('.workSituationImg');
    function pad(v) { return v < 10 ? '0' + v : '' + v; }
    function render() {
      var now = new Date();
      var diff = Math.max(0, now - grt) / 1000;
      var d = Math.floor(diff / 86400);
      var h = Math.floor((diff % 86400) / 3600);
      var m = Math.floor((diff % 3600) / 60);
      var s = Math.floor(diff % 60);
      var tip = document.getElementById('runtimeTextTip');
      if (tip) tip.innerHTML = '本站居然运行了 ' + d + ' 天<span id="runtime"> ' + pad(h) + ' 小时 ' + pad(m) + ' 分 ' + pad(s) + ' 秒</span>';
      /* 9 点前 / 18 点后换成下班图 */
      var hour = now.getHours();
      if (img && (hour < 9 || hour >= 18)) {
        img.src = box.getAttribute('data-off-img');
        img.title = img.alt = box.getAttribute('data-off-desc');
      } else if (img) {
        img.src = box.getAttribute('data-work-img');
        img.title = img.alt = box.getAttribute('data-work-desc');
      }
    }
    render();
    setInterval(render, 1000);
  }

  function footerSubtitle() {
    var el = document.getElementById('footer-bar-subtitle');
    if (!el) return;
    var lines = [];
    try { lines = JSON.parse(el.getAttribute('data-sub') || '[]'); } catch (e) {}
    if (!lines.length) return;
    if (el.getAttribute('data-effect') === 'false') { el.textContent = lines[0]; return; }
    var speed = parseInt(el.getAttribute('data-speed'), 10) || 150;
    var back = parseInt(el.getAttribute('data-back'), 10) || 50;
    var delay = parseInt(el.getAttribute('data-delay'), 10) || 300;
    var loop = el.getAttribute('data-loop') !== 'false';
    var i = 0, len = 0, del = false;
    function tick() {
      var text = lines[i];
      len += del ? -1 : 1;
      el.textContent = text.slice(0, len);
      var wait = del ? back : speed;
      if (!del && len >= text.length) { del = true; wait = 1400; }
      else if (del && len <= 0) {
        del = false;
        i++;
        if (i >= lines.length) { if (!loop) return; i = 0; }
        wait = delay;
      }
      setTimeout(tick, wait);
    }
    setTimeout(tick, delay);
  }

  /* 三个效果各自判断自己的 DOM 在不在（页脚在每页都有，但运行时长/副标题可能没配） */
  document.addEventListener('DOMContentLoaded', function () {
    heo.randomFriends();
    footerRuntime();
    footerSubtitle();
  });
})();
