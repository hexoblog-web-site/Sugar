/* ==========================================================================
 * liublog 主题配置解析
 * --------------------------------------------------------------------------
 * 导航栏（nav）与侧栏（aside）都改成「按数组顺序渲染」，
 * yml 里只写顺序和字段，具体怎么落到 DOM 由这里统一处理，
 * 模板不必再关心配置细节，也不会出现「改了 yml 但某处没生效」。
 * ========================================================================== */

'use strict';

function arr(v) {
  return Array.isArray(v) ? v : [];
}

/* 分区配置的统一取值入口。
 * _config.yml 里三个大节的键名是：
 *   navigation_bar_settings   导航栏
 *   sidebar_settings          侧边栏
 *   footer_settings           页脚
 * 早期版本用的是 nav / aside / footer，这里保留旧键名兜底，
 * 换了模板但配置还是旧的（或反过来）都能正常跑，不会整块变空。 */
var SECTION_ALIAS = {
  navigation_bar_settings: 'nav',
  sidebar_settings: 'aside',
  footer_settings: 'footer'
};

function section(theme, key) {
  theme = theme || {};
  if (theme[key] && typeof theme[key] === 'object') return theme[key];
  var old = SECTION_ALIAS[key];
  if (old && theme[old] && typeof theme[old] === 'object') return theme[old];
  return {};
}

/* 模板里直接写 lb_nav_cfg() / lb_sidebar_cfg() / lb_footer_cfg()，
 * 不关心配置到底挂在哪个键名下。 */
hexo.extend.helper.register('lb_nav_cfg', function () {
  return section(this.theme, 'navigation_bar_settings');
});
hexo.extend.helper.register('lb_sidebar_cfg', function () {
  return section(this.theme, 'sidebar_settings');
});
hexo.extend.helper.register('lb_footer_cfg', function () {
  return section(this.theme, 'footer_settings');
});

/* 导航项的默认图标：yml 不填 icon 时用它 */
var NAV_ICON = {
  app_menu: 'icon-apps-fill',
  search: 'icon-search-2-line',
  random_post: 'icon-dice-line',
  console: 'icon-dashboard-fill',
  totop: 'icon-arrow-up-line',
  darkmode: 'icon-moon-clear-fill'
};

/* 导航项默认文字（用于 title / 无障碍标签） */
var NAV_TEXT = {
  site_name: '返回博客主页',
  app_menu: '站点导航',
  menu: '菜单',
  search: '站内搜索',
  random_post: '随机前往一个文章',
  console: '中控台',
  totop: '返回顶部',
  darkmode: '夜间模式'
};

/* 侧栏卡片：哪几张算「吸顶卡」。
 * author（站长信息）与 rss（订阅入口）不吸顶 —— 它们排在前面时随页面一起滚走；
 * 一旦出现第一张吸顶卡，从它开始往下的所有卡片（包括中间夹的订阅卡）都进同一个
 * .sticky_layout。整段侧栏只能有一个容器，因为 .sticky_layout 统一 top:66px，
 * 两个容器同 top 会互相压住。 */
var ASIDE_STICKY = {
  toc: true,
  archives: true,
  recent: true,
  rss: false,
  random: true,
  tags: true,
  webinfo: true
};

/* ---------- 导航栏 ---------- */
/* 统一取导航项列表：
   新写法 nav.items（一个数组，从上到下 = 从左到右，用 align 指定区域）
   旧写法 nav.left / nav.center / nav.right 仍然兼容 */
function lbNavRaw(theme) {
  var nav = section(theme, 'navigation_bar_settings');
  if (Array.isArray(nav.items) && nav.items.length) {
    return nav.items.map(function (it) {
      var o = {};
      for (var k in it) { if (Object.prototype.hasOwnProperty.call(it, k)) o[k] = it[k]; }
      o.align = it.align || 'left';
      return o;
    });
  }
  var legacy = [];
  ['left', 'center', 'right'].forEach(function (pos) {
    arr(nav[pos]).forEach(function (it) {
      if (!it) return;
      var o = {};
      for (var k in it) { if (Object.prototype.hasOwnProperty.call(it, k)) o[k] = it[k]; }
      o.align = o.align || pos;
      legacy.push(o);
    });
  });
  return legacy;
}

/* 返回某个区域（left / center / right）的导航项（已过滤 enable: false），保持 yml 里的先后顺序 */
hexo.extend.helper.register('lb_nav_items', function (pos) {
  var theme = this.theme || {};
  return lbNavRaw(theme).filter(function (it) {
    return it && it.type && it.enable !== false && (it.align || 'left') === pos;
  }).map(function (it) {
    var type = String(it.type);
    return {
      type: type,
      name: it.name || '',
      icon: it.icon || NAV_ICON[type] || '',
      /* 中控台按钮的「关闭态」图标，默认 ✕ */
      iconClose: it.icon_close || 'icon-guanbi',
      title: it.title || it.name || NAV_TEXT[type] || '',
      url: it.url || '',
      target: it.target || '',
      cfg: it,
      raw: it
    };
  });
});

/* 中间下拉菜单的内容：取 type: menu 那一项的 menus（也接受 children） */
hexo.extend.helper.register('lb_nav_menu', function () {
  var theme = this.theme || {};
  var nav = section(theme, 'navigation_bar_settings');
  var item = lbNavRaw(theme).filter(function (it) {
    return it && it.type === 'menu' && it.enable !== false;
  })[0];
  if (item) return arr(item.menus).length ? item.menus : arr(item.children);
  return arr(nav.menu);   // 旧写法：nav.menu 单独写
});

/* 九宫格应用菜单的内容：取 type: app_menu 那一项的 groups + more */
hexo.extend.helper.register('lb_app_menu', function () {
  var theme = this.theme || {};
  var nav = section(theme, 'navigation_bar_settings');
  var item = lbNavRaw(theme).filter(function (it) {
    return it && it.type === 'app_menu' && it.enable !== false;
  })[0];
  var groups = [];
  var more = nav.app_menu_more || {};
  if (item) {
    groups = arr(item.groups).length ? item.groups : arr(item.children);
    if (item.more !== undefined) more = item.more || {};
  } else {
    groups = arr(nav.app_menu);   // 旧写法：nav.app_menu 单独写
  }
  return { groups: groups, more: more };
});

/* 是否配置了某个 type（菜单是否显示等判断用它，避免模板里翻配置） */
hexo.extend.helper.register('lb_nav_has', function (type) {
  return lbNavRaw(this.theme || {}).some(function (it) {
    return it && it.type === type && it.enable !== false;
  });
});

/* 导航条背景皮肤：itlaoli（铺白蓝渐变 + 斜纹底图）| none（不铺）
 * 模板只在 #page-header 上挂一个 nav-skin-* 类，具体样式在 css/nav.css 末尾 */
hexo.extend.helper.register('lb_nav_skin', function () {
  var nav = section(this.theme, 'navigation_bar_settings');
  var style = String(nav.style || 'itlaoli').toLowerCase();
  if (style === 'none' || style === 'glass' || style === 'off' || style === 'false') return '';
  return 'itlaoli';
});

/* 导航条背景的内联变量：yml 里填了就覆盖皮肤自带的默认值，没填就用 css 里的
 *   亮色：color / gradient / shadow
 *         head_image / head_opacity / head_position / head_size      上沿光晕
 *         image / image_width / image_opacity                        右上角斜纹
 *   夜间：dark_color / dark_gradient / dark_shadow
 *         dark_head_image / dark_head_opacity
 *         dark_image / dark_image_width / dark_image_opacity
 * 这样换配色、换配图、调浓淡只改 yml，不用动 css。 */
hexo.extend.helper.register('lb_nav_bg_style', function () {
  var theme = this.theme || {};
  var bg = section(theme, 'navigation_bar_settings').background || {};
  var urlFor = this.url_for.bind(this);
  var out = [];
  function put(name, val) {
    if (val === undefined || val === null) return;
    val = String(val).trim();
    if (!val) return;
    out.push(name + ':' + val);
  }
  function putImg(name, val) {
    if (val === undefined || val === null) return;
    val = String(val).trim();
    if (!val) return;
    /* 写 none 表示不要图 */
    if (/^none$/i.test(val)) { out.push(name + ':none'); return; }
    out.push(name + ':url(' + urlFor(val) + ')');
  }
  /* 底色 / 渐变 / 投影 */
  put('--lb-nav-bg', bg.color);
  put('--lb-nav-grad', bg.gradient);
  put('--lb-nav-shadow', bg.shadow);
  /* 上沿光晕 */
  putImg('--lb-nav-head-img', bg.head_image);
  put('--lb-nav-head-opacity', bg.head_opacity);
  put('--lb-nav-head-pos', bg.head_position || bg.head_pos);
  put('--lb-nav-head-size', bg.head_size);
  /* 右上角斜纹 */
  putImg('--lb-nav-img', bg.image);
  put('--lb-nav-img-width', bg.image_width);
  put('--lb-nav-img-opacity', bg.image_opacity);
  /* 夜间模式 */
  put('--lb-nav-bg-dark', bg.dark_color);
  put('--lb-nav-grad-dark', bg.dark_gradient);
  put('--lb-nav-shadow-dark', bg.dark_shadow);
  putImg('--lb-nav-head-img-dark', bg.dark_head_image);
  put('--lb-nav-head-opacity-dark', bg.dark_head_opacity);
  putImg('--lb-nav-img-dark', bg.dark_image);
  put('--lb-nav-img-width-dark', bg.dark_image_width);
  put('--lb-nav-img-opacity-dark', bg.dark_image_opacity);
  return out.join(';');
});

/* 导航左侧的站点 logo（有图用图，没图用文字）
 *   image       亮色模式用的图
 *   image_dark  夜间模式用的图，留空复用 image
 *   height      图片高度（px）
 *   tagline     站名下面那行小字（比如网址），留空不显示 */
hexo.extend.helper.register('lb_nav_logo', function () {
  var theme = this.theme || {};
  var nav = section(theme, 'navigation_bar_settings');
  var l = nav.logo || {};
  var site = theme.site_settings || {};
  /* 没配 nav.logo.image 时，退回旧的 site_settings.site_logo */
  var img = l.image || site.site_logo || theme.site_logo || '';
  var h = parseInt(l.height, 10);
  return {
    image: img,
    image_dark: l.image_dark || img,
    height: h > 0 ? h : 40,
    tagline: l.tagline || ''
  };
});

/* ---------- 侧栏 ---------- */
/* 返回侧栏卡片列表（已过滤 enable: false、连带补上默认值） */
hexo.extend.helper.register('lb_aside_widgets', function () {
  var aside = section(this.theme, 'sidebar_settings');
  var list = arr(aside.widgets);
  var out = [];
  list.forEach(function (w) {
    if (!w || !w.type || w.enable === false) return;
    var type = String(w.type);
    var item = {
      type: type,
      title: w.title || '',
      icon: w.icon || '',
      count: w.count,
      sticky: !!ASIDE_STICKY[type],
      cfg: w
    };
    out.push(item);
  });
  return out;
});

/* 取单张卡的配置（模板里写 lb_widget('recent').count 这样读） */
hexo.extend.helper.register('lb_widget', function (type) {
  var aside = section(this.theme, 'sidebar_settings');
  var found = null;
  arr(aside.widgets).forEach(function (w) {
    if (!found && w && String(w.type) === String(type)) found = w;
  });
  return found || {};
});

/* 侧栏作者卡配置：多处复用（文章页头像、页脚中间头像、中控台、首页卡片） */
hexo.extend.helper.register('lb_author', function () {
  var author = this.lb_widget('author') || {};
  var theme = this.theme || {};
  var config = this.config || {};
  return {
    name: author.name || config.author || config.title || '',
    desc: author.desc || config.subtitle || '',
    avatar: author.avatar || '/images/avatar.jpg',
    link: author.link || '/about/',
    social: (author.social && Object.keys(author.social).length) ? author.social : (theme.social || {}),
    status_img: author.status_img || ''
  };
});

/* ---------- Site settings ---------- */
/* 站点级配置统一收在 _config.yml 的 site_settings 里，模板里写 lb_site('favicon') 这样读。
 * 取值顺序：site_settings.<key> → 旧的顶层 theme.<key> → 默认值。
 * 保留第二级是为了让「只换了模板没换配置」的旧 yml 仍然能跑，不会因为搬家整个变空。 */
hexo.extend.helper.register('lb_site', function (key, def) {
  var theme = this.theme || {};
  var s = theme.site_settings || {};
  var has = function (o, k) {
    return o[k] !== undefined && o[k] !== null && o[k] !== '';
  };
  if (has(s, key)) return s[key];
  if (has(theme, key)) return theme[key];
  return def;
});

/* 文章列表样式：card 卡片式 / banner 横幅长条。
 * 模板只问 lb_post_list().banner，不再各自翻 yml 判断字符串。 */
hexo.extend.helper.register('lb_post_list', function () {
  var theme = this.theme || {};
  var cfg = (theme.site_settings && theme.site_settings.post_list) || theme.post_list || {};
  var style = cfg.style === 'banner' ? 'banner' : 'card';
  var len = parseInt(cfg.excerpt_length, 10);
  return {
    style: style,
    banner: style === 'banner',
    excerpt_length: len > 0 ? len : 96,
    alternate_cover: cfg.alternate_cover !== false
  };
});

/* 建站时间：侧栏网站统计里的 start_date 优先，其次 site_settings.start_time */
hexo.extend.helper.register('lb_start_time', function () {
  var w = this.lb_widget('webinfo') || {};
  return w.start_date || this.lb_site('start_time', '');
});

/* 主色联动开关（横幅取色 → 整页染色）。
 * 默认开，只有显式写 false 才关：home.home_top.swiper.tint。
 * 模板里只判断 lb_banner_tint()，不用各自再抄一遍这个表达式。 */
hexo.extend.helper.register('lb_banner_tint', function () {
  var theme = this.theme || {};
  var sw = ((theme.home || {}).home_top || {}).swiper || {};
  return sw.tint !== false;
});
