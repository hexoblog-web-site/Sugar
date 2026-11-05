/*!
 * 文章目录的滚动高亮
 * -----------------------------------------------------------------------------
 * 主题里 #card-toc 的样式一直写着 .toc-item.active / .toc-link:not(.active)，
 * 但没有任何脚本去加 active —— 长文读到哪里完全看不出来。
 * 这里补上：滚动时把「当前正在读的那一节」标出来，
 * 同时让目录卡自己滚动，保证高亮项始终在可视区内。
 *
 * 判定方式：取所有标题里「最后一个已经越过视口顶部（留 80px 导航高度）」的，
 * 比 IntersectionObserver 简单，且不会在快速滚动时来回跳。
 */
(function () {
  var card = document.getElementById('card-toc');
  if (!card) return;

  var links = Array.prototype.slice.call(card.querySelectorAll('.toc-link'));
  if (!links.length) return;

  function hashOf(a) {
    var href = a.getAttribute('href') || '';
    var i = href.indexOf('#');
    return i < 0 ? '' : decodeURIComponent(href.slice(i + 1));
  }

  /* 中文标题生成的 id 会被 hexo 做 URL 编码，这里按解码后的值取元素 */
  var items = [];
  links.forEach(function (a) {
    var id = hashOf(a);
    if (!id) return;
    var target = document.getElementById(id);
    if (!target) return;
    items.push({ link: a, el: target, li: a.parentElement });
  });
  if (!items.length) return;

  var current = -1;

  /* .toc-child 默认是收起的，只有 .toc-item.active 的下一级会展开。
     选中项如果在第 3 级，它的父级并没有 active，整条会被折没 ——
     所以沿 parent 链把祖先标成 is-open（展开）和 is-ancestor（只提亮，不放大）。 */
  function expandAncestors(li) {
    if (!li) return;
    items.forEach(function (it) {
      if (it.li) it.li.classList.remove('is-open', 'is-ancestor');
    });
    li.classList.add('is-open');
    var node = li.parentElement;
    while (node && !node.classList.contains('toc')) {
      /* hexo 的 toc() 生成的是 <ol class="toc-child">，不是 ul，按类名判断 */
      if (node.classList.contains('toc-child')) {
        var parentLi = node.parentElement;
        if (parentLi && parentLi.classList.contains('toc-item')) {
          parentLi.classList.add('is-open', 'is-ancestor');
        }
      }
      node = node.parentElement;
    }
  }

  function setActive(index) {
    if (index === current) return;
    current = index;
    items.forEach(function (it, i) {
      var on = i === index;
      if (it.li && it.li.classList.contains('toc-item')) {
        it.li.classList.toggle('active', on);
      }
      it.link.classList.toggle('active', on);
    });
    expandAncestors(items[index] && items[index].li);

    /* 让高亮项留在目录卡的可视区内（目录比卡片高时才需要） */
    var box = card.querySelector('.toc-content');
    var active = items[index] && items[index].link;
    if (!box || !active) return;
    if (box.scrollHeight <= box.clientHeight + 4) return;
    var linkTop = active.offsetTop - box.offsetTop;
    var target = linkTop - box.clientHeight / 2 + active.offsetHeight / 2;
    box.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
  }

  function update() {
    var line = 80; /* 固定导航的高度 */
    var index = 0;
    for (var i = 0; i < items.length; i++) {
      if (items[i].el.getBoundingClientRect().top - line <= 0) index = i;
    }
    var atBottom = window.innerHeight + window.pageYOffset >= document.body.scrollHeight - 4;
    if (atBottom) index = items.length - 1;
    setActive(index);
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      ticking = false;
      update();
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  /* 点目录：先立刻高亮，不等滚动结束 */
  items.forEach(function (it, i) {
    it.link.addEventListener('click', function () {
      setActive(i);
    });
  });

  update();
})();
