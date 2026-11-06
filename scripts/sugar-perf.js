/* ==========================================================================
 * sugar 性能层
 * --------------------------------------------------------------------------
 * 1) 样式合并：把 head.ejs 里原来的 12 个 <link> 合并成 1 个 css/bundle.css
 *    - 顺序与原来完全一致，层叠优先级不变，视觉零差异
 *    - 源文件仍然是 source/css/*.css，改哪个都行，生成时自动重新拼接
 * 2) 稳定版本号：资源指纹取内容 md5（原来是 Date.now()）
 *    - 只改一篇文章时，css/js 的 URL 不变，访客不用重新下载
 * 3) 图标字体按需：Font Awesome 只在该页正文真的用了 fa-* 图标时才加载
 * ========================================================================== */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/* 拼接清单以 source/css/style.css 为准 --------------------------------------
 * 那里用 @import 写着「有哪些样式、按什么顺序」，是唯一真相：
 *   - 加一张卡片：在 style.css 里加一行 @import，这里不用改
 *   - 调整层叠顺序：改 style.css 的行序即可
 * 注意 style.css 只用来当清单，不交给浏览器（否则会退化成 N 个串行请求）；
 * 浏览器拿到的始终是这里拼出来的 /css/bundle.css 单文件。
 * ------------------------------------------------------------------------- */
const ENTRY_FILE = 'style.css';

/* 读 style.css，把其中的 @import 目标按出现顺序取出来 */
function entryList(dir) {
  const entry = path.join(dir, ENTRY_FILE);
  let text = '';
  try {
    text = fs.readFileSync(entry, 'utf8');
  } catch (e) {
    hexo.log.error('[sugar] 找不到 source/css/%s，样式清单为空', ENTRY_FILE);
    return [];
  }

  /* 先去掉注释，避免把说明文字里的 @import 示例也读进来 */
  text = text.replace(/\/\*[\s\S]*?\*\//g, '');

  const out = [];
  const re = /@import\s+(?:url\(\s*)?["']([^"')]+)["']/g;
  let m;
  while ((m = re.exec(text))) {
    out.push(m[1].replace(/^\.\//, '').trim());
  }
  return out;
}

const cache = new Map(); // absPath -> { key, hash }

function cssDir() {
  return path.join(hexo.theme_dir, 'source', 'css');
}

/* 去掉注释，体积能再小一点；@charset 必须留在最前面，这里不碰 */
function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/* 读文件 + 内容 hash（按 mtime/size 命中缓存，避免每页重复读盘） */
function readWithHash(file) {
  let st;
  try {
    st = fs.statSync(file);
  } catch (e) {
    return null;
  }
  const key = st.mtimeMs + ':' + st.size;
  const hit = cache.get(file);
  if (hit && hit.key === key) return hit;

  const buf = fs.readFileSync(file);
  const rec = {
    key,
    hash: crypto.createHash('md5').update(buf).digest('hex').slice(0, 10),
    text: buf.toString('utf8')
  };
  cache.set(file, rec);
  return rec;
}

/* 拼接结果的缓存。
 * buildBundle 会被每一页调用一次（模板里要 md5 版本号），而一次 hexo g 会渲染上百页；
 * 每次重读重拼 300KB 纯属浪费。这里用「所有源文件的 mtime + size」当缓存键，
 * 文件一变键就变，hexo server 热更新也能跟上。 */
let cssCache = null;
let jsCache = null;

function statKey(files) {
  return files.map(function (f) {
    try {
      const st = fs.statSync(f);
      return f + ':' + st.mtimeMs + ':' + st.size;
    } catch (e) {
      return f + ':missing';
    }
  }).join('|');
}

function buildBundle() {
  const dir = cssDir();
  const list = entryList(dir);
  const key = statKey(list.map(function (name) { return path.join(dir, name); }));
  if (cssCache && cssCache.key === key) return cssCache;

  const missing = [];
  const parts = [];

  if (!list.length) {
    hexo.log.warn('[sugar] source/css/%s 里没有读到任何 @import，页面将没有样式', ENTRY_FILE);
  }

  list.forEach(function (name) {
    const rec = readWithHash(path.join(dir, name));
    if (!rec) {
      missing.push(name);
      return;
    }
    parts.push('/* ' + name + ' */\n' + rec.text);
  });

  if (missing.length) {
    hexo.log.warn('[sugar] CSS 合并缺少文件：%s（首页样式可能不完整）', missing.join(', '));
  }

  const css = parts.join('\n');
  cssCache = {
    key: key,
    css: css,
    hash: crypto.createHash('md5').update(css).digest('hex').slice(0, 10)
  };
  return cssCache;
}

/* ---------- 生成 css/bundle.css ---------- */
hexo.extend.generator.register('sugar_css_bundle', function () {
  return {
    path: 'css/bundle.css',
    data: buildBundle().css
  };
});

/* ---------- 生成 js/bundle.js ---------- */

/* 脚本清单 <-> 加载顺序。源文件仍然是一个板块一份，浏览器只拿合并后的那一个。
 * 顺序不能乱：main.js 里先建好 window.heo 和公共工具，后面的板块脚本才挂得上去。
 *   main.js              公共工具（heo.xxx）、页面级初始化
 *   partial/*.js         板块脚本，字典序，板块之间互不依赖
 *   aside/aside-base.js  侧栏骨架，必须先于各卡片
 *   aside/card-*.js      侧栏卡片
 * ------------------------------------------------------------------------- */
const JS_ENTRY = 'main.js';

/* 第三方浏览器库统一放 source/lib/，由 Hexo 原样发布到 /lib/xxx.js，
 * 模板里用 <script> 按需引入，不进 bundle —— bundle 只装主题自己的脚本。
 * 好处：库能单独缓存、按页面加载（例如 qrcode.min.js 只给文章页），bundle 也不会被撑大。
 * ------------------------------------------------------------------------- */

function listJs(dirRel) {
  const abs = path.join(hexo.theme_dir, 'source', 'js', dirRel);
  try {
    return fs.readdirSync(abs).filter(f => /\.js$/.test(f)).sort();
  } catch (e) {
    return [];
  }
}

function jsManifest() {
  const out = [JS_ENTRY];
  listJs('partial').forEach(f => out.push('partial/' + f));
  const aside = listJs('aside');
  const rank = f => (f === 'aside-base.js' ? 0 : 1);
  aside.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  aside.forEach(f => out.push('aside/' + f));
  return out;
}

/* 汇总成 { abs, label }：主题脚本清单 */
function jsFiles() {
  const themeDir = hexo.theme_dir;
  const out = [];
  const base = path.join(themeDir, 'source', 'js');
  jsManifest().forEach(function (rel) {
    out.push({ abs: path.join(base, rel), label: rel });
  });
  return out;
}

function buildJsBundle() {
  const files = jsFiles();
  const key = statKey(files.map(function (f) { return f.abs; }));
  if (jsCache && jsCache.key === key) return jsCache;

  const missing = [];
  const parts = [];
  files.forEach(function (f) {
    const rec = readWithHash(f.abs);
    if (!rec) { missing.push(f.label); return; }
    /* 每个文件前留一条 banner：压缩后仍能一眼看出这段是谁的 */
    parts.push('/* ===== ' + f.label + ' ===== */\n' + rec.text);
  });
  if (missing.length) {
    hexo.log.warn('[sugar] JS 合并缺少文件：%s（页面交互可能不完整）', missing.join(', '));
  }
  const js = parts.join('\n');
  jsCache = {
    key: key,
    js: js,
    hash: crypto.createHash('md5').update(js).digest('hex').slice(0, 10)
  };
  return jsCache;
}

hexo.extend.generator.register('sugar_js_bundle', function () {
  return {
    path: 'js/bundle.js',
    data: buildJsBundle().js
  };
});

/* ---------- 模板助手 ---------- */

/* 合并后样式的指纹：样式没改动，URL 就不变 */
hexo.extend.helper.register('lb_css_ver', function () {
  return buildBundle().hash;
});

/* 合并后脚本的指纹：同上 */
hexo.extend.helper.register('lb_js_ver', function () {
  return buildJsBundle().hash;
});

/* 任意静态资源的指纹（用于 js 等）：传站内路径，如 /js/main.js */
hexo.extend.helper.register('lb_asset_ver', function (rel) {
  const clean = String(rel || '').replace(/^\/+/, '').split('?')[0];
  const abs = path.join(hexo.theme_dir, 'source', clean);
  const rec = readWithHash(abs);
  return rec ? rec.hash : '0';
});

/* 该页是否真的用到 Font Awesome（正文里出现 fa 图标类才加载 89K 的样式） */
hexo.extend.helper.register('lb_need_fontawesome', function () {
  const page = this.page || {};
  const html = page.content;
  /* 首页 / 归档 / 分类 / 标签：模板里没有任何 fa 图标，不加载 */
  if (!html) return false;
  if (html.indexOf('fa') === -1) return false;

  /* 同时认 FA5 的 fas/far/fab/fal 和 FA6 的 fa-solid 这类写法；
     只看 <i>/<span> 的 class，正文里提到 "fa-"（比如代码块里的示例）不算 */
  const tagRe = /<(i|span)\b[^>]*\bclass\s*=\s*"([^"]*)"/gi;
  let m;
  while ((m = tagRe.exec(html))) {
    const list = m[2].split(/\s+/);
    for (let i = 0; i < list.length; i++) {
      if (/^fa[srlb]$/.test(list[i]) || /^fa-/.test(list[i])) return true;
    }
  }
  return false;
});
