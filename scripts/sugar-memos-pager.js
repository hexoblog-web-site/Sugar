/* ==========================================================================
 * 微语页的静态分页（/memos/page/2/、/memos/page/3/ …）
 * --------------------------------------------------------------------------
 * 之前是「一次性渲染全部 + 点按钮放一批」：HTML 里躺着 40 条说说，
 * 首屏白背 30 多条看不见的 DOM，而且第 9 条以后的图片链接爬虫也当噪声。
 * 现在改成构建期切页：每页只渲染 page_size 条，页码是真实 URL。
 *
 * 分工：
 *   第 1 页  source/memos/index.md（layout: memos）—— Hexo 自己出
 *   第 2..N 页  本文件注册的 generator —— 补齐后面的
 *
 * generator 的 data 会原样变成模板里的 page 对象，所以模板读 page.memos_pager
 * 就知道自己排在第几页、总共几页；第 1 页没有这个字段，按 current = 1 处理。
 *
 * 每页条数只认主题 _config.yml 的 memos.page_size，模板与这里共用同一个值，
 * 两处各配一份迟早会错行（首页 index_generator.per_page 也是同样的道理）。
 * ========================================================================== */

'use strict';

hexo.extend.generator.register('memos_pager', function (locals) {
  var mp = (hexo.theme.config && hexo.theme.config.memos) || {};

  /* 页面整体关掉了就不必生成分页 */
  if (mp.enable === false) return [];

  var per = parseInt(mp.page_size, 10);
  if (!(per > 0)) per = 8;

  var list = (locals.data && locals.data.vignette) || [];
  var total = Math.ceil(list.length / per);
  if (total < 2) return [];

  var base = '/memos';
  var routes = [];

  for (var n = 2; n <= total; n++) {
    routes.push({
      /* 显式写上 index.html：Hexo 对没有扩展名的 path 会自己补，
         但写清楚了在 public 里一眼能看出生成结果 */
      path: base.replace(/^\//, '') + '/page/' + n + '/index.html',
      layout: ['memos'],
      data: {
        title: (mp.title || '微语') + ' - 第 ' + n + ' 页',
        layout: 'memos',
        /* 模板只读这三个字段，别往里塞整个列表 —— 页面对象越干净越好 */
        memos_pager: {
          current: n,
          total: total,
          base: base,
          per_page: per
        }
      }
    });
  }

  return routes;
});
