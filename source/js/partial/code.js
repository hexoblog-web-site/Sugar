/* code.js —— 正文代码块工具条
 *
 * 三件套：
 *   样式  source/css/highlight.css
 *   脚本  source/js/partial/code.js   （本文件）
 *   配置  _config.yml → code
 *
 * Hexo 默认（highlight.js + wrap: true）输出的是：
 *   figure.highlight.<lang> > table > (td.gutter 行号 + td.code 代码)
 * 这里在 figure 最前面插一条 .highlight-tools：语言名 + 复制按钮，
 * 代码过长时再补一个 .code-expand-btn 折叠/展开。
 *
 * 只加壳、不动代码本身，所以改样式去 highlight.css，不用碰这个文件。
 */
(function () {
  'use strict';
  var cfg = (window.HEO_CONFIG && window.HEO_CONFIG.code) || {};
  var heo = window.heo = window.heo || {};

  var SHOW_LANG = cfg.lang !== false;
  var SHOW_COPY = cfg.copy !== false;
  var HEIGHT_LIMIT = parseInt(cfg.heightLimit, 10);
  if (isNaN(HEIGHT_LIMIT)) HEIGHT_LIMIT = 420;

  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* 语言名：figure 的第二个 class（highlight 之后那个） */
  function langOf(fig) {
    var list = (fig.className || '').split(/\s+/);
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i] !== 'highlight' && list[i] !== 'code-folded') return list[i];
    }
    return 'code';
  }

  /* 取纯代码文本：行与行之间是 <br>，textContent 不会带换行，所以用 innerText */
  function codeText(fig) {
    var pre = fig.querySelector('td.code pre') || fig.querySelector('pre');
    if (!pre) return '';
    var text = pre.innerText;
    if (typeof text !== 'string') text = pre.textContent || '';
    return text.replace(/\n+$/, '');
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;';
      document.body.appendChild(ta);
      ta.select();
      try {
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        ok ? resolve() : reject(new Error('execCommand failed'));
      } catch (e) {
        document.body.removeChild(ta);
        reject(e);
      }
    });
  }

  function attach(fig) {
    if (fig.dataset.lbCode === '1') return;
    fig.dataset.lbCode = '1';

    /* ---- 先给 table 套一层横向滚动壳 ----
       放在 figure 上会让顶部工具条跟着滚走（复制按钮跑出屏幕），
       给 table 设 display:block 又会让行号列塌掉，所以单独包一层。 */
    var table = fig.querySelector(':scope > table') || fig.querySelector('table');
    if (table && !table.parentNode.classList.contains('code-body')) {
      var body = document.createElement('div');
      body.className = 'code-body';
      fig.insertBefore(body, table);
      body.appendChild(table);
    }

    var tools = document.createElement('div');
    tools.className = 'highlight-tools';

    var html = '';
    if (SHOW_LANG) html += '<span class="code-lang">' + langOf(fig) + '</span>';
    if (SHOW_COPY) {
      html += '<span class="copy-notice">已复制</span>' +
        '<button class="copy-button" type="button" aria-label="复制代码" heotip="复制代码">' +
        '<i class="heoblogIcon icon-file-copy-fill"></i></button>';
    }
    if (!html) return;
    tools.innerHTML = html;
    fig.insertBefore(tools, fig.firstChild);

    /* ---- 复制 ---- */
    var btn = tools.querySelector('.copy-button');
    if (btn) {
      btn.addEventListener('click', function () {
        var text = codeText(fig);
        var done = function () {
          tools.classList.add('copy-true');
          clearTimeout(btn._lbTimer);
          btn._lbTimer = setTimeout(function () { tools.classList.remove('copy-true'); }, 1600);
        };
        copyText(text).then(done, function () {
          /* 老浏览器兜底：选中代码，让用户自己 Ctrl+C */
          var pre = fig.querySelector('td.code pre') || fig.querySelector('pre');
          if (pre) {
            var range = document.createRange();
            range.selectNodeContents(pre);
            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
          }
          if (heo.toast) heo.toast('已选中代码，按 Ctrl+C 复制');
        });
      });
    }

    /* ---- 折叠：超过限制高度才加展开按钮 ---- */
    if (!HEIGHT_LIMIT || !table) return;
    if (table.offsetHeight <= HEIGHT_LIMIT + 24) return;

    /* 折叠高度由配置决定，别写死在样式里：这里把上限传给 CSS，
       换 height_limit 只改配置，不用同步改 css。 */
    fig.style.setProperty('--code-limit', HEIGHT_LIMIT + 'px');
    fig.classList.add('code-folded');
    var expand = document.createElement('div');
    expand.className = 'code-expand-btn';
    expand.setAttribute('aria-label', '展开/折叠代码');
    expand.innerHTML = '<i class="heoblogIcon icon-xiaxiangshuangjiantou"></i>';
    expand.addEventListener('click', function () {
      fig.classList.toggle('code-folded');
    });
    fig.appendChild(expand);
  }

  document.addEventListener('DOMContentLoaded', function () {
    $$('#article-container figure.highlight').forEach(attach);
  });
})();
