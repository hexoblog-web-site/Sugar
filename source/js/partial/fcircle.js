/* ==========================================================================
   朋友圈页（layout: fcircle）
   数据源：window.FC_CONFIG.api（默认 https://quanzi.liublog.cn/all.json）
   接口返回：{ statistical_data: {friends_num, active_num, article_num, last_updated_time},
              article_data: [{title, created, link, author, avatar, description}] }
   职责：拉数据 → 渲染卡片流（分页 24/页）→ 钓鱼随机 → 按时间/随机排序 → 按博主筛选
   ========================================================================== */
(function () {
  'use strict';

  var cfg = window.FC_CONFIG || {};
  var grid = document.getElementById('fc-grid');
  if (!grid) return;

  var PAGE_SIZE = cfg.pageSize || 24;
  var DEFAULT_AVATAR = cfg.avatar || '/images/avatar.svg';

  /* 钓鱼文案池（取自参考站，随机 + 「来自友链 X 的文章」） */
  var LINES = [
    '你和小伙伴抢夺着',
    '今年亩产突破了八千万斤，多亏了',
    '科考队在南极大陆发现了被冰封的',
    '在艺术大街上被贴满了相同的纸，走近一看是',
    '上卫生间没带纸，直接提裤跑路也不愿意玷污手中',
    '玄天境重要的是锻体，为师赠你此书，好好修炼去吧，这是',
    '上百祖境高手在天威湖大战三天三夜为了抢夺',
    '新版语文书拟增加一篇熟读并背诵的',
    '因为卷子上没写名字，老师罚抄',
    '隔壁家的孩子英语考了满分，都是因为看了'
  ];

  var state = {
    all: [],        /* 全量文章（已按时间倒序） */
    view: [],       /* 当前视图（筛选 / 排序后的结果） */
    shown: 0,
    byTime: true,
    author: '',
    shuffled: null
  };

  var els = {
    dice: document.getElementById('fc-dice'),
    random: document.getElementById('fc-random'),
    more: document.getElementById('fc-more'),
    empty: document.getElementById('fc-empty'),
    sort: document.getElementById('fc-sort'),
    chip: document.getElementById('fc-filter-clear'),
    friends: document.getElementById('fc-friends'),
    active: document.getElementById('fc-active'),
    articles: document.getElementById('fc-articles'),
    updated: document.getElementById('fc-updated')
  };

  function esc(t) {
    return String(t == null ? '' : t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* 接口里的 description 是文章正文的开头，混着 HTML 标签和 Markdown 记号，
     直接显示会很脏，这里清一遍再截两行 */
  function cleanText(s) {
    return String(s || '')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/<[^>]*>/g, ' ')
      .replace(/<[^>]*$/, ' ')
      .replace(/^#{1,6}\s*/gm, '')
      .replace(/^>\s?/gm, '')
      .replace(/\*\*|__|[*_`~]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function dateOf(s) {
    var m = String(s || '').match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (!m) return '';
    return m[1] + '-' + (m[2].length < 2 ? '0' + m[2] : m[2]) + '-' + (m[3].length < 2 ? '0' + m[3] : m[3]);
  }

  function tsOf(s) {
    var t = Date.parse(String(s || '').replace(/-/g, '/'));
    return isNaN(t) ? 0 : t;
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  var CLOCK = '<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" viewBox="0 0 512 512"><path fill="currentColor" d="M256 0a256 256 0 1 1 0 512a256 256 0 1 1 0-512m-24 120v136c0 8 4 15.5 10.7 20l96 64c11 7.4 25.9 4.4 33.3-6.7s4.4-25.9-6.7-33.3L280 243.2V120c0-13.3-10.7-24-24-24s-24 10.7-24 24"/></svg>';

  function cardHTML(it) {
    var author = it.author || '佚名';
    var sum = cleanText(it.description);
    return '<div class="moment-item">'
      + '<div class="moment-card">'
      + '<a class="moment-title" href="' + esc(it.link) + '" target="_blank" rel="noopener nofollow" title="' + esc(it.title) + '">' + esc(it.title || '无标题') + '</a>'
      + '<div class="moment-summary">' + esc(sum) + '</div>'
      + '<div class="moment-bottom">'
      + '<img class="moment-avatar" src="' + esc(it.avatar || DEFAULT_AVATAR) + '" alt="' + esc(author) + '" loading="lazy" decoding="async" onerror="this.onerror=null;this.src=\'' + DEFAULT_AVATAR + '\'">'
      + '<button type="button" class="moment-author" data-author="' + esc(author) + '" title="只看 ' + esc(author) + '">' + esc(author) + '</button>'
      + '<span class="moment-time">' + CLOCK + esc(dateOf(it.created)) + '</span>'
      + '</div>'
      + '</div></div>';
  }

  /* ---------- 列表渲染 ---------- */
  function buildView() {
    var list = state.all;
    if (state.author) {
      list = list.filter(function (it) { return (it.author || '佚名') === state.author; });
    }
    if (!state.byTime) {
      if (!state.shuffled || state.shuffled.length !== list.length) state.shuffled = shuffle(list);
      list = state.shuffled;
    }
    state.view = list;
    state.shown = 0;
  }

  function render(reset) {
    if (reset) {
      grid.innerHTML = '';
      state.shown = 0;
    }
    var end = Math.min(state.shown + PAGE_SIZE, state.view.length);
    var html = '';
    for (var i = state.shown; i < end; i++) html += cardHTML(state.view[i]);
    grid.insertAdjacentHTML('beforeend', html);
    state.shown = end;

    var empty = state.view.length === 0;
    els.empty.hidden = !empty;
    if (empty) {
      els.empty.innerHTML = state.author
        ? '没有找到 ' + esc(state.author) + ' 的文章'
        : '暂时没有捞到文章，稍后再来看看';
    }
    els.more.hidden = empty || state.shown >= state.view.length;

    if (els.chip) {
      els.chip.hidden = !state.author;
      if (state.author) els.chip.textContent = '只看 ' + state.author + ' ✕';
    }
  }

  /* 数据加载失败时给一个可重试的空态，不要留白屏 */
  function renderError(msg) {
    grid.innerHTML = '';
    els.more.hidden = true;
    els.empty.hidden = false;
    els.empty.innerHTML = '朋友圈数据加载失败' + (msg ? '（' + esc(msg) + '）' : '') + ' <button type="button" id="fc-retry">重试</button>';
    var r = document.getElementById('fc-retry');
    if (r) r.addEventListener('click', function () { els.empty.hidden = true; load(); });
  }

  /* ---------- 钓鱼 ---------- */
  function pickRandom() {
    if (!state.all.length) return;
    var it = state.all[Math.floor(Math.random() * state.all.length)];
    var line = LINES[Math.floor(Math.random() * LINES.length)];
    els.random.innerHTML = '<div>' + esc(line)
      + ' 来自友链 <b>' + esc(it.author || '佚名') + '</b> 的文章：'
      + '<a class="random-friends-post" href="' + esc(it.link) + '" target="_blank" rel="noopener nofollow">'
      + esc(it.title || '无标题') + '</a></div>';
  }

  /* 钓鱼等级：点一次 +1，存在 localStorage，只在加载提示里露面 */
  function fishLevel() {
    var lv = parseInt(localStorage.getItem('fc_fish_level') || '0', 10) || 0;
    lv += 1;
    localStorage.setItem('fc_fish_level', lv);
    var title = lv < 10 ? '钓鱼新手' : (lv < 20 ? '钓鱼高手' : '钓鱼大师');
    return 'Lv.' + lv + ' 当前称号：' + title;
  }

  function onDice() {
    if (!state.all.length) return;
    if (els.dice.classList.contains('is-loading')) return;
    els.dice.classList.add('is-loading');
    els.random.innerHTML = '<div class="fc-dice-loading">钓鱼中… （' + fishLevel() + '）</div>';
    setTimeout(function () {
      pickRandom();
      els.dice.classList.remove('is-loading');
      els.dice.style.transform = 'rotate(360deg)';
      setTimeout(function () { els.dice.style.transform = ''; }, 320);
    }, 600);
  }

  /* ---------- 统计栏 ---------- */
  function renderStats(st) {
    st = st || {};
    if (els.friends) els.friends.textContent = st.friends_num != null ? st.friends_num : '--';
    if (els.active) els.active.textContent = st.active_num != null ? st.active_num : '--';
    if (els.articles) els.articles.textContent = st.article_num != null ? st.article_num : '--';
    if (els.updated) {
      els.updated.textContent = '更新于：' + (st.last_updated_time || '--');
    }
  }

  /* ---------- 事件 ---------- */
  if (els.dice) els.dice.addEventListener('click', onDice);

  if (els.more) {
    els.more.addEventListener('click', function () { render(false); });
  }

  if (els.sort) {
    els.sort.addEventListener('click', function () {
      state.byTime = !state.byTime;
      els.sort.setAttribute('aria-checked', state.byTime ? 'true' : 'false');
      state.shuffled = null;
      buildView();
      render(true);
    });
  }

  /* 点作者名 = 只看这个人；再点一次或点筛选胶囊清除 */
  grid.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('.moment-author') : null;
    if (!btn) return;
    e.preventDefault();
    var name = btn.getAttribute('data-author');
    state.author = state.author === name ? '' : name;
    buildView();
    render(true);
    var top = document.querySelector('.moments-list > .title-section--plain');
    if (top && state.author) top.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  if (els.chip) {
    els.chip.addEventListener('click', function () {
      state.author = '';
      buildView();
      render(true);
    });
  }

  /* ---------- 拉数据 ---------- */
  function load() {
    if (!cfg.api) { renderError('未配置接口'); return; }
    fetch(cfg.api, { credentials: 'omit' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        var list = (data && data.article_data) || [];
        list.sort(function (a, b) { return tsOf(b.created) - tsOf(a.created); });
        state.all = list;
        renderStats(data && data.statistical_data);
        buildView();
        render(true);
        pickRandom();
      })
      .catch(function (err) { renderError(err && err.message); });
  }

  load();
})();
