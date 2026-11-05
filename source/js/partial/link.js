/* ============ 友情链接页：随机访问 / 钓鱼 / 申请列表 ============ */
(function () {
  var data = window.FLINK_DATA || [];

  function pick(exclude) {
    if (data.length === 1) return data[0];
    var i;
    do {
      i = Math.floor(Math.random() * data.length);
    } while (exclude && data[i] === exclude);
    return data[i];
  }

  /* 顶部「随机访问」：随机跳一个友链 */
  var randomBtn = document.getElementById('flink-random');
  if (randomBtn && data.length) {
    randomBtn.addEventListener('click', function () {
      var it = pick(null);
      if (it && it.u) window.open(it.u, '_blank', 'noopener');
    });
  }

  /* 钓鱼区：随机展示一句文案 + 一个友链，点刷新换一个 */
  var box = document.getElementById('random-post');
  var dice = document.getElementById('flink-dice');
  var lines = window.FLINK_LINES || ['三十年河东，三十年河西，莫欺我没有看过'];
  var cur = null;

  function render(it) {
    if (!box || !it) return;
    cur = it;

    var row = document.createElement('div');
    row.appendChild(document.createTextNode(lines[Math.floor(Math.random() * lines.length)] + ' 来自友链 '));

    var name = document.createElement('b');
    name.textContent = it.n;
    row.appendChild(name);

    row.appendChild(document.createTextNode(' 的文章：'));

    var article = document.createElement('a');
    article.className = 'random-friends-post';
    article.href = it.u;
    article.target = '_blank';
    article.rel = 'external nofollow';
    article.textContent = it.d || '最新文章';
    row.appendChild(article);

    box.innerHTML = '';
    box.appendChild(row);
  }

  if (box && data.length) {
    /* 首屏随机一次，避免每次都显示同一条 */
    render(pick(null));

    if (dice) {
      dice.addEventListener('click', function () {
        render(pick(cur));
        /* 给个转圈反馈 */
        dice.style.transition = 'none';
        dice.style.transform = 'rotate(0deg)';
        requestAnimationFrame(function () {
          dice.style.transition = '';
          dice.style.transform = '';
        });
      });
    }
  }

  /* ---------- 友链申请列表：状态筛选 / 名称搜索 / 分页 ---------- */
  var appData = window.LINK_APPLY || [];
  var itemsBox = document.getElementById('app-items');
  if (!itemsBox) return;

  var statusSel = document.getElementById('app-status');
  var searchInput = document.getElementById('app-search');
  var pager = document.getElementById('app-pagination');
  var countEl = document.getElementById('app-count');
  var PER_PAGE = 20;
  var page = 1;

  var STATUS_TEXT = { pending: '待审核', approved: '已通过', rejected: '未通过' };
  var TYPE_TEXT = { new: '新增', edit: '修改' };

  function currentRows() {
    var kw = ((searchInput && searchInput.value) || '').trim().toLowerCase();
    var st = (statusSel && statusSel.value) || 'all';
    return appData.filter(function (a) {
      if (st !== 'all' && a.status !== st) return false;
      if (kw && String(a.name || '').toLowerCase().indexOf(kw) < 0) return false;
      return true;
    });
  }

  function renderApps() {
    var rows = currentRows();
    var pages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
    if (page > pages) page = pages;
    var slice = rows.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    itemsBox.innerHTML = '';
    slice.forEach(function (a) {
      var item = document.createElement('div');
      item.className = 'application-item';

      var content = document.createElement('div');
      content.className = 'item-content';

      var header = document.createElement('div');
      header.className = 'item-header';

      var name = document.createElement('span');
      name.className = 'item-name';
      name.textContent = a.name || '';

      var tags = document.createElement('div');
      tags.className = 'item-tags';

      var status = document.createElement('span');
      status.className = 'item-tag item-tag-status is-' + (a.status || 'pending');
      status.textContent = STATUS_TEXT[a.status] || STATUS_TEXT.pending;
      tags.appendChild(status);

      var type = document.createElement('span');
      type.className = 'item-tag item-tag-type is-' + (a.type || 'new');
      type.textContent = TYPE_TEXT[a.type] || TYPE_TEXT.new;
      tags.appendChild(type);

      header.appendChild(name);
      header.appendChild(tags);

      var desc = document.createElement('div');
      desc.className = 'item-description';
      desc.textContent = a.descr || '';

      content.appendChild(header);
      content.appendChild(desc);
      item.appendChild(content);
      itemsBox.appendChild(item);
    });

    if (!slice.length) {
      var empty = document.createElement('div');
      empty.className = 'applications-empty';
      empty.textContent = '暂无申请记录';
      itemsBox.appendChild(empty);
    }

    if (countEl) countEl.textContent = '（共 ' + rows.length + ' 条）';

    if (pager) {
      pager.innerHTML = '';

      var prev = document.createElement('button');
      prev.type = 'button';
      prev.className = 'page-btn';
      prev.textContent = '上一页';
      prev.disabled = page <= 1;
      prev.addEventListener('click', function () {
        if (page > 1) { page--; renderApps(); }
      });

      var info = document.createElement('span');
      info.className = 'page-info';
      info.textContent = page + ' / ' + pages;

      var next = document.createElement('button');
      next.type = 'button';
      next.className = 'page-btn';
      next.textContent = '下一页';
      next.disabled = page >= pages;
      next.addEventListener('click', function () {
        if (page < pages) { page++; renderApps(); }
      });

      pager.appendChild(prev);
      pager.appendChild(info);
      pager.appendChild(next);
    }
  }

  if (statusSel) statusSel.addEventListener('change', function () { page = 1; renderApps(); });
  if (searchInput) searchInput.addEventListener('input', function () { page = 1; renderApps(); });

  renderApps();
})();
