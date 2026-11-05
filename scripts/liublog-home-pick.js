/* ==========================================================================
 * 首页顶部两块的选文规则（幻灯片 + 新品框架）
 * --------------------------------------------------------------------------
 * 两个坑都出在「取谁」上，所以把规则收进一个 helper，两边共用一份：
 *
 *   1) 首页列表展示的就是最新的一批文章。顶部推荐位如果也从最新的取，
 *      上面 6 张小卡和下面列表就是同一批 —— 往下滚等于什么也没翻新。
 *   2) 幻灯片和右框各算各的，会选出同一批文章，两块之间又重一遍。
 *
 * 现在的取法：
 *
 *   池子 = 全部文章（时间倒序）－ 首页第一页 － 幻灯片已经用掉的
 *   幻灯片先取，右框再从剩下的里面取 → 列表 / 幻灯片 / 右框 三处互不重样。
 *   右框还要按封面去重：本站一篇分类图常常复用几十次，不去重会六格同图。
 *
 *   右框配了 home.home_top.new_frame.items 时按 items 显示（只认 link，
 *   标题和封面从对应文章里补，允许逐条覆盖），这时不再自动取。
 *   幻灯片配了 items（精品推荐）时不占池子，但它点名的文章右框要避开 ——
 *   否则同一个作者的推荐位里，左边大图和右边小卡是同一篇。
 *
 * 首页每页多少篇由站点 _config.yml 的 index_generator.per_page 决定，
 * 这里只读它、不另配一份 —— 两处配了不一致，判重就会错行。
 * ========================================================================== */

'use strict';

function arr(v) {
  return Array.isArray(v) ? v : [];
}

function swiperCfg(theme) {
  return (((theme || {}).home || {}).home_top || {}).swiper || {};
}

function frameCfg(theme) {
  return (((theme || {}).home || {}).home_top || {}).new_frame || {};
}

/* 首页每页文章数：优先 index_generator.per_page，其次老配置 per_page */
function perPage(config) {
  var g = (config && config.index_generator) || {};
  var n = parseInt(g.per_page, 10);
  if (!(n > 0)) n = parseInt((config || {}).per_page, 10);
  return n > 0 ? n : 10;
}

/* 封面：三个字段都认（主题里各处写法不一致，这里统一一下） */
function coverOf(p) {
  return (p && (p.cover || p.top_img || p.thumbnail)) || '';
}

/* 全部文章，时间倒序 */
function allPosts(ctx) {
  var out = [];
  var posts = ctx.site && ctx.site.posts;
  if (!posts) return out;
  posts.sort('date', -1).each(function (p) {
    out.push(p);
  });
  return out;
}

/* 首页第一页那批文章 —— 顶部两块都不许碰，碰了就和下面列表重样 */
function pageOneSet(ctx) {
  var set = {};
  var n = perPage(ctx.config);
  var posts = ctx.site && ctx.site.posts;
  if (!posts) return set;
  posts.sort('date', -1).limit(n).each(function (p) {
    set[p.path] = 1;
  });
  return set;
}

/* 按链接找文章：/articles/x.html 与 articles/x.html 两种写法都认。
 * 注意文章对象的 path 是不带前导斜杠的（url_for 才补），所以两边都归一化再比，
 * 直接拿 yml 里写的 "/articles/x.html" 去比 p.path 会一篇都对不上。 */
function resolvePost(ctx, link) {
  if (!link) return null;
  var l = String(link).replace(/^\/+/, '');
  var list = allPosts(ctx);
  for (var i = 0; i < list.length; i++) {
    if (String(list[i].path).replace(/^\/+/, '') === l) return list[i];
  }
  return null;
}

/* 幻灯片的「精品推荐」条目（home.home_top.swiper.items）。
 * 每条最少写 link：标题、简介、封面都能从文章里补；想改哪个就写哪个。
 * 字段名两种都认：cover / image、link / url、description / excerpt
 * （image 是老主题 banner 的叫法，抄过来不用改字段）。
 * 外链必须自己给 title 和 image —— 站内查不到文章，补不出这两样。
 * 凑不出标题或封面的条目直接丢掉：轮播少一张，好过出现一张空白帧。 */
function swiperManualItems(ctx) {
  var out = [];
  arr(swiperCfg(ctx.theme).items).forEach(function (it) {
    if (!it) return;
    if (typeof it === 'string') it = { link: it };   // 只写一个链接也算一条
    var link = it.link || it.path || it.url || '';
    var p = resolvePost(ctx, link);
    var title = it.title || (p && p.title) || '';
    var cover = it.cover || it.image || (p && coverOf(p)) || '';
    if (!title || !cover) return;
    out.push({
      title: title,
      description: it.description || it.excerpt || '',
      link: link || (p && p.path) || '/',
      cover: cover,
      color: it.color || '#7454fc',
      /* target 不写就按链接自己判断：站内当前窗口，站外新窗口 */
      newTab: newTabOf(it, link),
      post: p
    });
  });
  return out;
}

/* 新窗口：写了 target 就听它的（true / false 都认），
 * 没写就按「是不是外链」判断 —— 站内跳转留在当前窗口，外链另开一张。 */
function newTabOf(it, link) {
  var t = it.target;
  if (t === true || t === 'true' || t === '_blank') return true;
  if (t === false || t === 'false' || t === '_self') return false;
  return /^https?:/i.test(String(link || ''));
}

/* 幻灯片自动模式会占掉的那几张：条数看 count，封面必须有，相同封面只算一张。
 * 右框要避开它们，所以这里算出来的就是「已经用掉的名额」。 */
function swiperAutoPosts(ctx) {
  var sw = swiperCfg(ctx.theme);
  if (sw.enable === false) return [];
  /* 精品推荐生效时它不占池子（它点名的那几篇由 framePicks 单独避开）；
     配了 items 却一条都没能落地（全写错）时退回自动，跟模板的判断保持一致 */
  if (swiperManualItems(ctx).length) return [];

  var n = parseInt(sw.count, 10);
  if (!(n > 0)) n = 4;

  var page1 = pageOneSet(ctx);
  var list = allPosts(ctx);
  var picked = [];
  var seenCover = {};

  list.forEach(function (p) {
    if (picked.length >= n) return;
    if (page1[p.path]) return;
    var c = coverOf(p);
    if (!c || seenCover[c]) return;
    seenCover[c] = 1;
    picked.push(p);
  });
  /* 封面去重后不够数，用剩下的补齐（和幻灯片自己的兜底一致） */
  if (picked.length < n) {
    list.forEach(function (p) {
      if (picked.length >= n) return;
      if (page1[p.path] || !coverOf(p)) return;
      if (picked.indexOf(p) >= 0) return;
      picked.push(p);
    });
  }
  return picked;
}

/* 右框：配了 items 就按 items，否则从池子里取 */
function framePicks(ctx, count) {
  var n = count > 0 ? count : 6;
  var out = [];
  var list = allPosts(ctx);

  /* ---- 手动：只认 link，标题 / 封面自动从文章补，也可逐条覆盖 ---- */
  var items = arr(frameCfg(ctx.theme).items);
  if (items.length) {
    items.forEach(function (it) {
      if (out.length >= n || !it) return;
      if (typeof it === 'string') it = { link: it };
      var link = it.link || it.path || it.url;
      if (!link) return;                      // 没写跳转的条目直接跳过
      var p = resolvePost(ctx, link);
      /* 站内查不到这篇文章、又没手写标题 —— 跳过。
         否则会渲染出一张没图没字的空卡（链接写错时最容易踩到）。 */
      if (!p && !it.title) return;
      out.push({
        path: p ? p.path : link,
        title: it.title || (p && p.title) || '',
        cover: it.cover || it.image || (p && coverOf(p)) || '',
        newTab: newTabOf(it, link),
        /* 手动条目可能指向站内文章以外的地方，模板据此决定要不要 url_for */
        isManual: true
      });
    });
    /* 配了 items 但一条都没落地（链接基本都写错）→ 退回自动，别让整块空掉 */
    if (out.length) return out;
  }

  /* ---- 自动：池子 = 全部 － 首页第一页 － 幻灯片（精品推荐点名的那几篇也算占用）---- */
  var page1 = pageOneSet(ctx);
  var taken = {};
  swiperManualItems(ctx).forEach(function (it) {
    if (it.post) taken[it.post.path] = 1;
  });
  swiperAutoPosts(ctx).forEach(function (p) { taken[p.path] = 1; });

  /* 封面去重（new_frame.cover_dedupe，默认开）：本站大部分文章复用了同一张分类图
     （manim.jpg 一篇图占了 69 篇），按时间硬取前 6 篇会出现 5 张一模一样的图。
     所以先各挑一张不同的封面，实在凑不够再拿同一封面的补位 ——
     宁可用旧一点的独立封面，也不要六格同图。关掉就是纯按时间取最新几篇。 */
  var dedupe = frameCfg(ctx.theme).cover_dedupe !== false;
  var distinct = [];
  var dup = [];
  var noCover = [];
  var seenCover = {};
  list.forEach(function (p) {
    if (page1[p.path] || taken[p.path]) return;
    var c = coverOf(p);
    if (!c) { noCover.push(p); return; }
    if (!dedupe) { distinct.push(p); return; }
    if (seenCover[c]) { dup.push(p); return; }
    seenCover[c] = 1;
    distinct.push(p);
  });
  return distinct.concat(dup, noCover).slice(0, n);
}

/* kind: 'swiper' | 'frame' → 返回文章数组（frame 可能是手动条目，字段见上）。
 * 幻灯片的「精品推荐」条目用 lb_swiper_items，不走这里。 */
hexo.extend.helper.register('lb_home_pick', function (kind, count) {
  var n = parseInt(count, 10);
  if (kind === 'frame') return framePicks(this, n);
  if (kind === 'swiper') return swiperAutoPosts(this);
  return [];
});

/* 幻灯片的精品推荐条目（已补全 title / cover，链接已解析） */
hexo.extend.helper.register('lb_swiper_items', function () {
  return swiperManualItems(this);
});

/* 封面字段统一：模板里不用再各写一遍 cover || top_img || thumbnail */
hexo.extend.helper.register('lb_post_cover', coverOf);
