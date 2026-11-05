/* post-copyright.js —— 文章底部版权卡的交互
 *
 * 三件套：
 *   模板  layout/post.ejs 的 .post-copyright 段
 *   样式  source/css/post-copyright.css
 *   脚本  source/js/partial/post-copyright.js（本文件）
 *
 * 1) 打赏：点按钮在按钮上方弹出二维码面板（手机端从底部升起）；
 *    二维码来自 _config.yml → post.copyright.reward_images。
 * 2) 订阅：弹出「订阅博客更新」对话框，一栏邮箱 + 验证码 + 订阅，
 *    版式照 blog.anheyu.com。两个地址由站长在 yml 里填
 *    （subscribe.endpoint / subscribe.code_endpoint），不填就只提示。
 * 3) 分享：弹出「分享海报」对话框，左侧海报预览 + 下载，
 *    右侧复制链接、微博 / QQ / QQ空间。
 */
(function () {
  'use strict';
  var heo = window.heo = window.heo || {};

  /* ================= 通用弹窗 ================= */
  var openedModal = null;
  var lastFocus = null;

  /* 锁滚动只动 html 的 overflow，别用 body position:fixed，也不用 scrollTo 回位：
     - 给 body 设 overflow:hidden 会把文档滚动位置重置成 0，关掉后要滚回去，看着像页面在往下溜；
     - html 的 overflow:hidden 在 Chrome/Safari 里会保留 scrollY，关掉即原位，零跳动。
     scrollbar-gutter 是给滚动条留位置，免得锁定瞬间内容横向挪一下。 */
  function lockScroll(on) {
    var html = document.documentElement;
    html.style.overflow = on ? 'hidden' : '';
    html.style.scrollbarGutter = on ? 'stable' : '';
    document.body.classList.toggle('pc-modal-open', !!on);
  }

  function closeModal() {
    if (!openedModal) return;
    /* 弹窗自己的收尾（比如订阅的验证码倒计时），关掉就别继续数了 */
    if (typeof openedModal.__onClose === 'function') {
      try { openedModal.__onClose(); } catch (err) { /* 收尾出错不影响关窗 */ }
      openedModal.__onClose = null;
    }
    openedModal.hidden = true;
    openedModal.removeAttribute('data-open');
    openedModal = null;
    lockScroll(false);
    document.removeEventListener('keydown', onModalKey);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    lastFocus = null;
  }

  function onModalKey(e) {
    if (e.key === 'Escape') closeModal();
  }

  function openModal(id, trigger) {
    var el = document.getElementById(id);
    if (!el) return null;
    closeModal();
    closeReward();                 /* 弹窗一开，打赏面板就收起来，别叠着 */
    el.__onClose = null;
    lastFocus = trigger || null;
    el.hidden = false;
    el.setAttribute('data-open', '1');
    openedModal = el;
    lockScroll(true);
    document.addEventListener('keydown', onModalKey);
    var focusable = el.querySelector('.pc-modal-x');
    if (focusable) focusable.focus({ preventScroll: true });
    return el;
  }

  /* 点遮罩 / 关闭按钮 */
  document.addEventListener('click', function (e) {
    var closer = e.target.closest('[data-pc-close]');
    if (closer) { closeModal(); return; }
    /* 点弹窗四周空白（不在卡片内）也关掉 */
    if (openedModal && e.target === openedModal) closeModal();
  });

  heo.closeModal = closeModal;

  /* 模板把弹窗渲染在 #post 里面，那里可能有 transform / filter，
     会让 position:fixed 失效。统一挂到 body 末尾，层级最干净。 */
  function liftModals() {
    ['pc-sub-modal', 'pc-share-modal'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && el.parentNode !== document.body) document.body.appendChild(el);
    });
  }
  liftModals();

  /* ================= 打赏 =================
   * 点「打赏作者」在按钮上方弹二维码面板（手机端从底部升起），
   * 再点一次 / 点空白 / 按 Esc 收起。
   * 二维码来自 _config.yml → post.copyright.reward_images，
   * 模板把它 JSON 序列化在按钮的 data-images 上，这里负责铺出 li。 */
  function closeReward() {
    var open = document.querySelectorAll('.pc-reward.is-open');
    for (var i = 0; i < open.length; i++) {
      open[i].classList.remove('is-open');
      var btn = open[i].querySelector('.pc-btn--reward');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    }
    var quit = document.getElementById('pc-reward-quit');
    if (quit) quit.remove();
    document.removeEventListener('keydown', onRewardKey);
  }

  function onRewardKey(e) {
    if (e.key === 'Escape') closeReward();
  }

  heo.toggleReward = function (btn) {
    var wrap = btn.closest ? btn.closest('.pc-reward') : null;
    if (!wrap) return;

    var wasOpen = wrap.classList.contains('is-open');
    closeReward();
    if (wasOpen) return;                       /* 再点一次 = 收起 */

    if (!wrap.querySelector('.pc-reward-item')) {
      /* 一张二维码都没配：给句人话，别弹个空盒子让人以为按钮坏了 */
      heo.toast('作者还没放上打赏码，暂时不能打赏');
      return;
    }

    wrap.classList.add('is-open');
    btn.setAttribute('aria-expanded', 'true');

    /* 透明遮罩：只为接住「点空白处收起」，不压暗页面 */
    var quit = document.createElement('div');
    quit.id = 'pc-reward-quit';
    quit.addEventListener('click', closeReward);
    document.body.appendChild(quit);

    document.addEventListener('keydown', onRewardKey);
  };

  /* ================= 分享 ================= */
  function shareLinks(url, title, desc) {
    var u = encodeURIComponent(url);
    var t = encodeURIComponent(title || '');
    var d = encodeURIComponent(desc || '');
    return {
      weibo: 'https://service.weibo.com/share/share.php?url=' + u + '&title=' + t,
      qq: 'https://connect.qq.com/widget/shareqq/index.html?url=' + u + '&title=' + t + '&summary=' + d,
      qzone: 'https://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshare_onekey?url=' + u + '&title=' + t + '&summary=' + d
    };
  }

  heo.openShare = function (trigger) {
    var modal = openModal('pc-share-modal', trigger);
    if (!modal) return;

    var url = modal.getAttribute('data-url') || location.href;
    var title = modal.getAttribute('data-title') || document.title;
    var desc = modal.getAttribute('data-desc') || '';
    var links = shareLinks(url, title, desc);

    modal.querySelectorAll('[data-share]').forEach(function (a) {
      var kind = a.getAttribute('data-share');
      if (links[kind]) {
        a.href = links[kind];
        a.target = '_blank';
      }
    });

    /* 系统分享：只有手机才给入口，桌面上调起来是个半残的系统面板 */
    var sys = modal.querySelector('[data-share="system"]');
    var mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    if (sys) {
      if (navigator.share && mobile) {
        sys.hidden = false;
        sys.onclick = function () {
          navigator.share({ title: title, text: desc, url: url }).catch(function () {});
        };
      } else {
        sys.hidden = true;
      }
    }

    /* 链接框：点一下全选，方便手动复制 */
    var input = modal.querySelector('.pc-share-url');
    if (input) {
      input.value = url;
      input.onfocus = function () { input.select(); };
      input.onclick = function () { input.select(); };
    }

    var dl = modal.querySelector('.pc-poster-dl');
    if (dl) dl.onclick = function () { downloadPoster(modal, title); };

    /* 打开弹窗就把海报画好（和参考站一致：预览就是最终成图） */
    buildPoster(modal);
  };

  /* 旧接口保留：模板外还有地方调用 heo.sharePost 时不至于报错 */
  heo.sharePost = function (url, title) {
    var tmp = document.createElement('button');
    tmp.setAttribute('style', 'display:none');
    document.body.appendChild(tmp);
    var modal = document.getElementById('pc-share-modal');
    if (modal) {
      heo.openShare(tmp);
    } else if (navigator.share) {
      navigator.share({ title: title || document.title, url: url || location.href }).catch(function () {});
    } else {
      heo.copyLink(url || location.href);
    }
    tmp.remove();
  };

  /* ---------------- 海报 ---------------- */
  function loadImage(src, cross) {
    return new Promise(function (resolve) {
      if (!src) return resolve(null);
      var img = new Image();
      if (cross) img.crossOrigin = 'anonymous';
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = src;
    });
  }

  /* ================= 海报（对齐 blog.anheyu.com 的生成算法） =================
   * 750×1000 画布手工绘制，尺寸、字号、坐标全部照搬参考站：
   *   封面   750×420，cover 裁切居中；无封面时用 #3b82f6 → #60a5fa 渐变
   *   标题   bold 48 @ (40, 460)，行高 58，最大宽 670
   *   摘要   26 @ 标题末行 + 20 + 50，行高 38，最多画到 y≈750
   *   分割线 #e5e7eb @ y=800，x 40 → 710
   *   头像   50 圆形 @ y=820；站名 bold 26 @ y=874；副标题 18 @ y=908
   *   二维码 120 @ y=820，四周留 2 个模块白边；「扫码查看文章」18 居中 @ y=952
   * 改这里的数值就等于改版式，弹窗预览和下载永远是同一张图。
   */

  var POSTER_W = 750;
  var POSTER_H = 1000;
  var POSTER_COVER_H = 420;
  var POSTER_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif';
  var C_TEXT = '#1f2937';
  var C_GRAY = '#6b7280';

  /* 逐字折行，返回每一行文本 */
  function wrapLines(ctx, text, maxW) {
    var chars = String(text == null ? '' : text).split('');
    var lines = [];
    var cur = '';
    for (var i = 0; i < chars.length; i++) {
      var next = cur + chars[i];
      if (ctx.measureText(next).width > maxW && cur) {
        lines.push(cur);
        cur = chars[i];
      } else {
        cur = next;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  }

  /* 按行画文本；maxLines 有值时超出部分收进最后一行并补 ...，返回最后一行所在的 y */
  function drawText(ctx, text, x, y, maxW, lineH, maxLines) {
    var lines = wrapLines(ctx, text, maxW);

    if (maxLines && lines.length > maxLines) {
      var rest = lines.slice(maxLines - 1).join('');
      var t = rest;
      while (t.length > 0 && ctx.measureText(t + '...').width > maxW) t = t.slice(0, -1);
      lines = lines.slice(0, maxLines - 1);
      lines.push(t + '...');
    }

    for (var i = 0; i < lines.length; i++) ctx.fillText(lines[i], x, y + i * lineH);
    return y + (lines.length - 1) * lineH;
  }

  /* 单行截断，超宽补 ... */
  function clipText(ctx, text, maxW) {
    var s = String(text == null ? '' : text).trim();
    if (!s) return '';
    if (ctx.measureText(s).width <= maxW) return s;
    if (ctx.measureText('...').width > maxW) return '';
    var n = s.length;
    while (n > 0 && ctx.measureText(s.slice(0, n) + '...').width > maxW) n--;
    return n > 0 ? s.slice(0, n) + '...' : '';
  }

  /* 等比裁切填满目标块（object-fit: cover 的效果） */
  function drawCover(ctx, img, x, y, w, h) {
    var ratio = img.width / img.height;
    var target = w / h;
    var sw, sh, sx = 0, sy = 0;
    if (ratio > target) {
      sw = img.height * target;
      sh = img.height;
      sx = (img.width - sw) / 2;
    } else {
      sw = img.width;
      sh = img.width / target;
      sy = (img.height - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }

  /* 圆形头像，无图时用灰底占位 */
  function drawAvatar(ctx, img, x, y, size) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    if (img) drawCover(ctx, img, x, y, size, size);
    else {
      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(x, y, size, size);
    }
    ctx.restore();
  }

  /* 二维码：借 qrcodejs 算出的模块矩阵自己画，尺寸与白边和参考站一致。
     库画完会把 canvas 藏起来改用内部 img，所以只取矩阵、不取它的画布。 */
  function drawQR(ctx, text, x, y, size) {
    if (!text || !window.QRCode) return false;
    var holder = document.createElement('div');
    holder.style.cssText = 'position:absolute;left:-9999px;top:0;width:0;height:0;overflow:hidden';
    document.body.appendChild(holder);
    var model = null;
    try {
      var inst = new window.QRCode(holder, {
        text: text,
        width: size,
        height: size,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: window.QRCode.CorrectLevel.M
      });
      model = inst._oQRCode;
    } catch (e) {
      model = null;
    }
    if (holder.parentNode) holder.parentNode.removeChild(holder);
    if (!model) return false;

    var n = model.getModuleCount();
    var total = n + 4; /* 四周各留 2 个模块的白边 */
    var cell = size / total;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = '#000000';
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        if (!model.isDark(r, c)) continue;
        ctx.fillRect(
          Math.round(x + (c + 2) * cell),
          Math.round(y + (r + 2) * cell),
          Math.ceil(cell),
          Math.ceil(cell)
        );
      }
    }
    return true;
  }

  /* 画一张 750×1000 的海报，返回 canvas */
  function renderPoster(data) {
    var cvs = document.createElement('canvas');
    cvs.width = POSTER_W;
    cvs.height = POSTER_H;
    var ctx = cvs.getContext('2d');
    if (!ctx) return Promise.reject(new Error('no canvas'));

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, POSTER_W, POSTER_H);

    return Promise.all([
      loadImage(data.cover, true),
      loadImage(data.avatar, true)
    ]).then(function (imgs) {
      var cover = imgs[0];
      var avatar = imgs[1];

      /* 封面 */
      if (cover) {
        drawCover(ctx, cover, 0, 0, POSTER_W, POSTER_COVER_H);
      } else {
        var g = ctx.createLinearGradient(0, 0, POSTER_W, POSTER_COVER_H);
        g.addColorStop(0, '#3b82f6');
        g.addColorStop(1, '#60a5fa');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, POSTER_W, POSTER_COVER_H);
      }

      /* 正文白纸 */
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, POSTER_COVER_H, POSTER_W, POSTER_H - POSTER_COVER_H);

      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      /* 标题 */
      ctx.fillStyle = C_TEXT;
      ctx.font = 'bold 48px ' + POSTER_FONT;
      var y = drawText(ctx, data.title, 40, POSTER_COVER_H + 40, 670, 58) + 20;

      /* 摘要 */
      if (data.desc) {
        y += 50;
        ctx.fillStyle = C_GRAY;
        ctx.font = '26px ' + POSTER_FONT;
        var maxLines = Math.max(1, Math.floor((800 - y - 50) / 38));
        y = drawText(ctx, data.desc, 40, y, 670, 38, maxLines) + 16;
      }

      /* 分割线 */
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(40, 800);
      ctx.lineTo(710, 800);
      ctx.stroke();

      /* 底栏：头像 + 站名 + 副标题 + 二维码，整组水平居中 */
      var name = data.site || '';
      ctx.font = 'bold 26px ' + POSTER_FONT;
      var nameW = ctx.measureText(name).width;
      var sub = (data.sub || '').trim();
      ctx.font = '18px ' + POSTER_FONT;
      var textW = Math.min(Math.max(nameW, sub ? ctx.measureText(sub).width : 0), 446);
      var bx = Math.max(40, (POSTER_W - (64 + textW + 40 + 120)) / 2);
      var avY = 820;
      var qrX = bx + 64 + textW + 40;

      drawAvatar(ctx, avatar, bx, avY, 50);

      ctx.textAlign = 'left';
      ctx.fillStyle = C_TEXT;
      ctx.font = 'bold 26px ' + POSTER_FONT;
      ctx.fillText(clipText(ctx, name, textW), bx + 64, avY + 54);

      if (sub) {
        ctx.fillStyle = C_GRAY;
        ctx.font = '18px ' + POSTER_FONT;
        ctx.fillText(clipText(ctx, sub, textW), bx + 64, avY + 88);
      }

      drawQR(ctx, data.url, qrX, avY, 120);

      ctx.fillStyle = C_GRAY;
      ctx.font = '18px ' + POSTER_FONT;
      ctx.textAlign = 'center';
      ctx.fillText('扫码查看文章', qrX + 60, avY + 132);

      return cvs;
    });
  }

  /* 弹窗里的海报：打开时生成一次塞进 <img>，下载复用同一张，不重复画 */
  function buildPoster(modal) {
    var box = modal.querySelector('#pc-poster');
    var img = modal.querySelector('.pc-poster-img');
    if (!box || !img) return Promise.resolve(null);
    if (box.getAttribute('data-ready') === '1') return Promise.resolve(img.src);

    box.setAttribute('data-loading', '1');
    return renderPoster({
      title: modal.getAttribute('data-title') || '',
      desc: modal.getAttribute('data-desc') || '',
      cover: modal.getAttribute('data-cover') || '',
      site: modal.getAttribute('data-site') || '',
      sub: modal.getAttribute('data-sub') || '',
      avatar: modal.getAttribute('data-avatar') || '',
      url: modal.getAttribute('data-url') || location.href
    }).then(function (cvs) {
      var url = cvs.toDataURL('image/png', 1);
      img.src = url;
      img.hidden = false;
      box.removeAttribute('data-loading');
      box.setAttribute('data-ready', '1');
      return url;
    }).catch(function () {
      box.removeAttribute('data-loading');
      box.setAttribute('data-failed', '1');
      return null;
    });
  }

  function downloadPoster(modal, title) {
    var dl = modal.querySelector('.pc-poster-dl');
    var old = dl ? dl.textContent : '';
    if (dl) { dl.textContent = '生成中…'; dl.disabled = true; }

    buildPoster(modal).then(function (url) {
      if (!url) { heo.toast('海报生成失败，请刷新后重试'); return; }
      var name = (title || 'poster').replace(/[\\/:*?"<>|\s]+/g, '-').slice(0, 40) + '.png';
      var a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      heo.toast('海报已保存到下载目录');
    }).then(function () {
      if (dl) { dl.textContent = old; dl.disabled = false; }
    });
  }

  /* ================= 订阅 =================
   * 照着 blog.anheyu.com 的弹窗来：一栏邮箱 + 验证码 + 订阅。
   * 静态站自己发不了信，所以两个地址都由站长填：
   *   data-endpoint       订阅（邮箱 + 验证码）
   *   data-code-endpoint  发验证码（不填就复用 endpoint，多带一个 action=code）
   * 都没填时按钮照样能点，只是提示「还没接服务」—— 不装假成功。 */
  heo.openSubscribe = function (trigger) {
    var modal = openModal('pc-sub-modal', trigger);
    if (!modal) return;

    var form = modal.querySelector('.pc-sub-form');
    var mailInput = modal.querySelector('input[name="email"]');
    var codeInput = modal.querySelector('input[name="code"]');
    var sendBtn = modal.querySelector('.pc-sub-send');
    var submitBtn = modal.querySelector('.pc-sub-submit');
    if (!form || !mailInput) return;

    var endpoint = (modal.getAttribute('data-endpoint') || '').trim();
    var codeEndpoint = (modal.getAttribute('data-code-endpoint') || '').trim();
    var method = (modal.getAttribute('data-method') || 'post').toLowerCase();
    var field = modal.getAttribute('data-field') || 'email';
    var codeField = modal.getAttribute('data-code-field') || 'code';
    var okText = modal.getAttribute('data-success') || '订阅成功，请去邮箱确认';

    function isMail(v) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    }

    /* 发验证码：60 秒倒计时，期间按钮变成「重发 (59s)」 */
    var timer = null;
    var left = 0;
    function stopTimer() {
      if (timer) { clearInterval(timer); timer = null; }
    }
    function startTimer(sec) {
      left = sec;
      sendBtn.disabled = true;
      sendBtn.textContent = '重发(' + left + 's)';
      stopTimer();
      timer = setInterval(function () {
        left--;
        if (left <= 0) {
          stopTimer();
          sendBtn.disabled = false;
          sendBtn.textContent = '发送验证码';
        } else {
          sendBtn.textContent = '重发(' + left + 's)';
        }
      }, 1000);
    }

    /* 关弹窗时把倒计时清掉，免得开开关关叠一堆 */
    modal.__onClose = stopTimer;

    function post(url, payload) {
      var body = new URLSearchParams();
      Object.keys(payload).forEach(function (k) { body.append(k, payload[k]); });
      return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: body.toString()
      });
    }

    sendBtn.onclick = function () {
      var mail = (mailInput.value || '').trim();
      if (!isMail(mail)) { heo.toast('邮箱格式不对，检查一下'); mailInput.focus(); return; }
      if (!codeEndpoint) { heo.toast('作者还没接邮箱服务，暂时无法订阅'); return; }

      sendBtn.disabled = true;
      sendBtn.textContent = '发送中…';
      var task = method === 'get'
        ? fetch(codeEndpoint + (codeEndpoint.indexOf('?') > -1 ? '&' : '?') + field + '=' + encodeURIComponent(mail) + '&action=code')
        : post(codeEndpoint, (function () { var o = {}; o[field] = mail; o.action = 'code'; return o; })());

      task.then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        heo.toast('验证码已发出，去邮箱看看');
        startTimer(60);
      }).catch(function () {
        heo.toast('验证码发送失败，稍后再试');
        sendBtn.disabled = false;
        sendBtn.textContent = '发送验证码';
      });
    };

    form.onsubmit = function (e) {
      e.preventDefault();
      var mail = (mailInput.value || '').trim();
      var code = (codeInput.value || '').trim();
      if (!isMail(mail)) { heo.toast('邮箱格式不对，检查一下'); mailInput.focus(); return; }
      if (!code) { heo.toast('请先填验证码'); codeInput.focus(); return; }
      if (!endpoint) { heo.toast('作者还没接邮箱服务，暂时无法订阅'); return; }

      submitBtn.disabled = true;
      submitBtn.textContent = '提交中…';

      var payload = {};
      payload[field] = mail;
      payload[codeField] = code;
      var task = method === 'get'
        ? fetch(endpoint + (endpoint.indexOf('?') > -1 ? '&' : '?') + field + '=' + encodeURIComponent(mail) + '&' + codeField + '=' + encodeURIComponent(code))
        : post(endpoint, payload);

      task.then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        heo.toast(okText);
        form.reset();
        submitBtn.disabled = false;
        submitBtn.textContent = '订阅';
        heo.closeModal(modal);
      }).catch(function () {
        heo.toast('订阅失败，稍后再试');
        submitBtn.disabled = false;
        submitBtn.textContent = '订阅';
      });
    };
  };
})();
