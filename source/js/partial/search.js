/* search.js —— 搜索弹层
 *
 * 三件套：
 *   模板  layout/_partial/search.ejs
 *   样式  source/css/search.css
 *   脚本  source/js/partial/search.js   （本文件）
 *
 * 数据走本地索引 /search.xml（hexo-generator-searchdb 生成），不依赖外部服务。
 *
 * 弹层的三种状态都由这里管：
 *   空关键词   → 推荐位（随机推荐 / 最新文章 / 博主推荐友链）
 *   有命中     → 分页结果，按标题命中位置 + 正文命中次数打分排序
 *   无命中     → 空态提示
 *
 * 改搜索的行为只改本文件；弹层的外观在 search.css，结构在 search.ejs。
 */
(function () {
  'use strict';
  var cfg = window.HEO_CONFIG || {};
  var heo = window.heo = window.heo || {};

  /* ---------- 搜索（本地 /search.xml，DOM 结构对齐 blog.zhheo.com） ---------- */
  var searchData = null;      // [{ title, url, content }]
  var searchMeta = {};        // url -> { t, u, c, d, k }（来自 HEO_CONFIG.posts）
  var searchKw = '';
  var searchTab = 'all';
  var searchTimer = null;
  var searchList = [];   // 当前关键词的全部命中（未分页）
  var searchPage = 1;    // 当前页码

  (cfg.posts || []).forEach(function (p) { if (p && p.u) searchMeta[p.u] = p; });

  function sdialog() { return document.querySelector('#heosearch .search-dialog'); }
  function escHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function splitKw(kw) {
    return String(kw || '').toLowerCase().split(/\s+/).filter(function (x) { return x; });
  }
  function hlText(text, kws) {
    var out = escHtml(text);
    kws.forEach(function (k) {
      var safe = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (!safe) return;
      out = out.replace(new RegExp('(' + safe + ')', 'gi'), '<em>$1</em>');
    });
    return out;
  }

  heo.openSearch = function () {
    var dlg = sdialog();
    var mask = document.getElementById('search-mask');
    if (!dlg) return;
    dlg.style.display = 'flex';
    dlg.style.animation = '';
    if (mask) { mask.style.display = 'block'; mask.style.animation = 'to_show .4s'; }
    var tabs = document.getElementById('heosearch-tabs');
    if (tabs) tabs.style.display = 'flex';
    document.documentElement.classList.add('search-open');
    var input = document.getElementById('local-search-input');
    if (input) { setTimeout(function () { input.focus(); input.select(); }, 60); }
    if (cfg.searchEnable === false) {
      var hits = document.getElementById('heosearch-hits');
      if (hits) hits.innerHTML = '<div id="heosearch-hits-empty">未开启本地搜索：请在主题 _config.yml 打开 search.enable 并安装 hexo-generator-searchdb</div>';
      return;
    }
    if (!searchData) loadSearch();
    else if (!searchKw) renderHome();
  };

  heo.closeSearch = function () {
    var dlg = sdialog();
    var mask = document.getElementById('search-mask');
    if (!dlg || dlg.style.display !== 'flex') return;
    dlg.style.animation = 'search_close .3s forwards';
    if (mask) mask.style.animation = 'to_hide .3s forwards';
    document.documentElement.classList.remove('search-open');
    setTimeout(function () {
      dlg.style.display = 'none';
      dlg.style.animation = '';
      if (mask) { mask.style.display = 'none'; mask.style.animation = ''; }
    }, 300);
  };

  function loadSearch() {
    var hits = document.getElementById('heosearch-hits');
    if (hits) hits.innerHTML = '<div class="heosearch-suggest-loading"><span class="search-loading-spinner" aria-hidden="true"></span><span>正在加载索引…</span></div>';
    fetch(cfg.searchPath).then(function (r) { return r.text(); }).then(function (xml) {
      var doc = new DOMParser().parseFromString(xml, 'text/xml');
      searchData = Array.prototype.map.call(doc.querySelectorAll('entry'), function (e) {
        var g = function (t) { var n = e.querySelector(t); return n ? n.textContent : ''; };
        return {
          title: g('title').replace(/\s+/g, ' ').trim(),
          url: g('url').trim(),
          content: g('content').replace(/\s+/g, ' ').trim()
        };
      });
      if (searchKw) runSearch(); else renderHome();
    }).catch(function () {
      searchData = [];
      var box = document.getElementById('heosearch-hits');
      if (box) box.innerHTML = '<div id="heosearch-hits-empty">索引加载失败，请确认 /search.xml 可访问</div>';
    });
  }

  function scoreItem(it, kws) {
    var t = it.title.toLowerCase();
    var c = it.content.toLowerCase();
    var s = 0;
    for (var i = 0; i < kws.length; i++) {
      var k = kws[i];
      var ti = t.indexOf(k);
      var ci = c.indexOf(k);
      if (ti === -1 && ci === -1) return -1;
      if (ti !== -1) s += 100 - ti;
      if (ci !== -1) {
        s += 10;
        var n = 0, p = ci;
        while (p !== -1 && n < 20) { n++; s += 2; p = c.indexOf(k, p + k.length); }
      }
    }
    return s;
  }

  function hitItem(it, kws) {
    var m = searchMeta[it.url] || {};
    var cover = m.c ? '<span class="heosearch-hit-cover"><img src="' + escHtml(m.c) + '" alt="" loading="lazy" decoding="async"></span>' : '';
    return '<span class="heosearch-hit-item"><a href="' + escHtml(it.url) + '">' + cover +
      '<span class="heosearch-hit-title">' + hlText(it.title, kws) + '</span></a></span>';
  }

  function runSearch() {
    var input = document.getElementById('local-search-input');
    var kw = input ? input.value.trim() : '';
    searchKw = kw;
    var hits = document.getElementById('heosearch-hits');
    var sug = document.getElementById('heosearch-suggests');
    var stats = document.getElementById('heosearch-stats');
    if (!hits) return;
    if (sug) sug.innerHTML = '';
    if (!kw) { searchList = []; searchPage = 1; if (stats) stats.innerHTML = ''; renderPager(0); renderHome(); return; }
    if (!searchData) { loadSearch(); return; }

    var kws = splitKw(kw);
    searchList = searchData.map(function (it) { return { it: it, s: scoreItem(it, kws) }; })
      .filter(function (x) { return x.s >= 0; })
      .sort(function (a, b) { return b.s - a.s; })
      .map(function (x) { return x.it; });
    searchPage = 1;
    renderPage();
  }
  heo.runSearch = runSearch;

  /* 分页渲染：results 里只放当前页，翻页靠下面的 pager，不再靠滚动条 */
  function renderPage() {
    var hits = document.getElementById('heosearch-hits');
    var stats = document.getElementById('heosearch-stats');
    if (!hits) return;
    var size = Math.max(1, parseInt(cfg.searchPageSize, 10) || 10);
    var total = searchList.length;
    hits.classList.add('is-hits');
    if (!total) {
      hits.innerHTML = '<div id="heosearch-hits-empty">找不到你查询的内容：' + escHtml(searchKw) + '</div>';
      if (stats) stats.innerHTML = '';
      renderPager(0);
      return;
    }
    var pages = Math.ceil(total / size);
    if (searchPage < 1) searchPage = 1;
    if (searchPage > pages) searchPage = pages;
    var start = (searchPage - 1) * size;
    var kws = splitKw(searchKw);
    hits.innerHTML = searchList.slice(start, start + size).map(function (it) { return hitItem(it, kws); }).join('');
    if (stats) {
      stats.innerHTML = '找到 ' + total + ' 条与「' + escHtml(searchKw) + '」相关的文章' +
        (pages > 1 ? ' · 第 ' + searchPage + '/' + pages + ' 页' : '');
    }
    renderPager(pages);
    var res = document.getElementById('heosearch-results');
    if (res) { res.classList.add('results--hits'); res.scrollTop = 0; }
  }

  function pageNumbers(cur, pages) {
    var out = [], i;
    if (pages <= 7) { for (i = 1; i <= pages; i++) out.push(i); return out; }
    out.push(1);
    var s = Math.max(2, cur - 1), e = Math.min(pages - 1, cur + 1);
    if (s > 2) out.push('...');
    for (i = s; i <= e; i++) out.push(i);
    if (e < pages - 1) out.push('...');
    out.push(pages);
    return out;
  }

  function renderPager(pages) {
    var pager = document.getElementById('heosearch-pager');
    if (!pager) return;
    if (!pages || pages <= 1) { pager.innerHTML = ''; pager.style.display = 'none'; return; }
    var out = [];
    out.push('<li class="ais-pagination--item' + (searchPage === 1 ? ' is-disabled' : '') + '">' +
      '<a href="javascript:void(0);" data-page="' + (searchPage - 1) + '" aria-label="上一页"><i class="heoblogIcon icon-arrow-left-line"></i></a></li>');
    pageNumbers(searchPage, pages).forEach(function (n) {
      if (n === '...') { out.push('<li class="ais-pagination--item is-ellipsis"><span>…</span></li>'); return; }
      out.push('<li class="ais-pagination--item' + (n === searchPage ? ' current' : '') + '">' +
        '<a href="javascript:void(0);" data-page="' + n + '">' + n + '</a></li>');
    });
    out.push('<li class="ais-pagination--item' + (searchPage === pages ? ' is-disabled' : '') + '">' +
      '<a href="javascript:void(0);" data-page="' + (searchPage + 1) + '" aria-label="下一页"><i class="heoblogIcon icon-arrow-right-line"></i></a></li>');
    pager.innerHTML = out.join('');
    pager.style.display = 'flex';
  }

  function postCard(p) {
    var cover = p.c ? '<span class="heosearch-post-card-cover"><img src="' + escHtml(p.c) + '" alt="" loading="lazy" decoding="async"></span>' : '';
    return '<div class="heosearch-post-card"><a class="heosearch-post-card-link" href="' + escHtml(p.u) + '">' + cover +
      '<span class="heosearch-post-card-title-wrap"><span class="heosearch-post-card-title">' + escHtml(p.t) + '</span></span></a></div>';
  }

  function section(title, posts, moreUrl) {
    return '<div class="heosearch-section">' +
      '<div class="heosearch-section-head">' +
      '<span class="heosearch-section-title">' + escHtml(title) + '</span>' +
      (moreUrl ? '<a class="heosearch-section-more" href="' + escHtml(moreUrl) + '">更多<i class="heoblogIcon icon-arrow-right-up-line"></i></a>' : '') +
      '</div><div id="heosearch-post-grid">' + posts.map(postCard).join('') + '</div></div>';
  }

  function flinkItem(f) {
    var av = f.a ? '<span class="heosearch-flink-avatar"><img src="' + escHtml(f.a) + '" alt="" loading="lazy" decoding="async"></span>' : '';
    var tag = f.t ? '<span class="heosearch-flink-tag">' + escHtml(f.t) + '</span>' : '';
    return '<a class="heosearch-flink-item" href="' + escHtml(f.u) + '" target="_blank" rel="noopener external nofollow">' + av +
      '<span class="heosearch-flink-body"><span class="heosearch-flink-name">' +
      '<span class="heosearch-flink-name-text">' + escHtml(f.n) + '</span>' + tag + '</span>' +
      (f.d ? '<span class="heosearch-flink-descr">' + escHtml(f.d) + '</span>' : '') +
      '</span></a>';
  }

  function flinkSection(title, list) {
    if (!list.length) return '';
    return '<div class="heosearch-section">' +
      '<div class="heosearch-section-head">' +
      '<span class="heosearch-section-title">' + escHtml(title) + '</span>' +
      '<a class="heosearch-section-more" href="/links/">更多<i class="heoblogIcon icon-arrow-right-up-line"></i></a>' +
      '</div><div class="heosearch-flink-grid">' + list.map(flinkItem).join('') + '</div></div>';
  }

  function renderHome() {
    var hits = document.getElementById('heosearch-hits');
    var stats = document.getElementById('heosearch-stats');
    if (!hits) return;
    var posts = (cfg.posts || []).slice();
    if (!posts.length) { hits.innerHTML = '<div id="heosearch-hits-empty">还没有文章可以推荐</div>'; return; }
    hits.classList.remove('is-hits');
    var withCover = posts.filter(function (p) { return p.c; });
    var pool = (withCover.length >= 6 ? withCover : posts).slice();
    for (var i = pool.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
    }
    var html = '';
    if (searchTab === 'all') html += section('随机推荐', pool.slice(0, 6), '/archives/');
    html += section('最新文章', posts.slice(0, 6), '/archives/');
    html += flinkSection('博主推荐', (cfg.friends || []).slice(0, 10));
    hits.innerHTML = html;
    if (stats) stats.innerHTML = '';
    renderPager(0);
    var res0 = document.getElementById('heosearch-results');
    if (res0) res0.classList.remove('results--hits');
  }

  function bindSearch() {
    var input = document.getElementById('local-search-input');
    if (input) {
      input.addEventListener('input', function () {
        var v = this.value.trim();
        clearTimeout(searchTimer);
        if (!v) { searchKw = ''; renderHome(); return; }
        searchTimer = setTimeout(runSearch, 180);
      });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); clearTimeout(searchTimer); runSearch(); }
      });
    }
    var tabs = document.getElementById('heosearch-tabs');
    if (tabs) {
      tabs.addEventListener('click', function (e) {
        var el = e.target.closest('.php-search-tab');
        if (!el) return;
        Array.prototype.forEach.call(tabs.querySelectorAll('.php-search-tab'), function (x) { x.classList.remove('active'); });
        el.classList.add('active');
        searchTab = el.getAttribute('data-type') || 'all';
        var input2 = document.getElementById('local-search-input');
        if (input2 && input2.value.trim()) runSearch(); else renderHome();
      });
    }
    var pager = document.getElementById('heosearch-pager');
    if (pager) {
      pager.addEventListener('click', function (e) {
        var a = e.target.closest('a[data-page]');
        if (!a) return;
        var n = parseInt(a.getAttribute('data-page'), 10);
        if (!n || n === searchPage) return;
        searchPage = n;
        renderPage();
      });
    }
  }
  bindSearch();

  /* 键盘 / 唤起搜索（键盘提示里写着这一条） */
  document.addEventListener('keydown', function (e) {
    var tag = (e.target && e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || (e.target && e.target.isContentEditable)) return;
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      heo.openSearch();
    }
  });
})();
