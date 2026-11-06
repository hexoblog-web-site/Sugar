# hexo-theme-sugar

一个 Hexo 博客主题。视觉与结构对标 [blog.anheyu.com](https://blog.anheyu.com/)，
从安知鱼主题的样式体系改造而来，改用 EJS 模板重写。

## 目录结构

```
layout/            EJS 模板
  layout.ejs       全站骨架
  index.ejs        首页
  post.ejs         文章页
  archive.ejs      归档
  categories.ejs   分类
  tags.ejs         标签
  about.ejs        关于
  links.ejs        友链（/links/）
  fcircle.ejs      朋友圈（/fcircle/）
  memos.ejs        微语（/memos/）
  _partial/        头、脚、侧栏卡片等局部

source/css/        样式，按页面拆分；style.css 里 @import 汇总
source/js/         脚本，partial/ 下按页面拆
source/images/     主题图片
scripts/           Hexo 脚本
  sugar-config.js  模板 helper（导航、侧栏、作者信息）
  sugar-perf.js    把 css/js 打包成 bundle.css / bundle.js
_config.yml        主题配置（含 friends_lite 朋友圈段、memos 微语段）
```

## 使用

把本目录放到站点 `themes/Sugar`，站点 `_config.yml` 里写 `theme: Sugar`，然后：

```bash
npx hexo server
```

## 配置入口

| 位置 | 管什么 |
|---|---|
| `_config.yml` | 导航、首页、侧栏、文章页、评论、页脚、代码块、朋友圈（`friends_lite`）、微语页（`memos`） |
| 站点 `source/_data/about.yml` | 关于页内容 |
| 站点 `source/_data/link.yml` | 友链数据（分组 + 站点） |
| 站点 `source/_data/vignette.yml` | 微语页数据（`/memos/`） |
| 站点 `source/_data/link_apply.yml` | 友链申请记录（可选） |

## 更新记录

### v1.1.0 · 2026-11-06

- **首页两处收尾**：① 顶部滚动条的「即刻」字样改为「微语」，并让它直接吃微语页那份
  `vignette.yml`（按日期倒序取最新的 `essay.count` 条），不再显示「这里写第一条即刻，
  随便说点什么」的占位文案；数据查找变成三级：`essay.yml` → `vignette.yml` → `essay.items`。
  ② 幻灯片下方「精选」横条从 `999px` 胶囊改成主题默认的 `8px` 圆角（共 11 处，含移动端断点），
  与卡片风格统一。顺手修了暗色下选中项的深色文字压在蓝底上看不清：
  `color: var(--heo-card-bg)` → `var(--heo-white)`（4 处），与分页条那次是同一个坑

- **即刻短文页整体迁到「微语」`/memos/`**：路由 `/essay/` → `/memos/`，页面名「即刻短文」→「微语」。
  模板 / 样式 / 脚本 / 分页生成器一并改名（`memos.ejs`、`memos-page.css`、`memos-page.js`、
  `sugar-memos-pager.js`），类名 `.essay-*` 全量换成 `.memos-*`。body 的 class 由 `page.layout`
  直接得出，所以选择器 `body.essay` 必须同步改成 `body.memos`，否则整页样式全丢；
  分页数据字段 `essay_pager` → `memos_pager`（模板与 head 的 `rel=prev/next` 两处都要改）。
  配置从 `essay.page` 独立成顶层 `memos:` 段（`essay:` 只剩首页那条滚动条的字段，`link` 指 `/memos/`），
  导航「动态」与「专栏 / 页脚」原本的「留言板 / 留言」统一改称「微语」——这四处以前都指向
  那个没有模板的空壳页，现在才真正落到页面上

- **新增装备页 `/equipment/`**：1:1 复刻 `blog.anheyu.com/equipment`，内容取自该页并落到
  `source/_data/equipment.yml`（1 个板块 / 2 个分组 / 8 件装备），配图本地化到
  `source/uploads/equipment/`。实测值全部照抄：容器 `max-width 1400` + 上下 32 / 左右 24，
  横幅 300 高 · 12 圆角 · `left 37%` cover · 32 内边距 · `rgba(0,0,0,.4)` 遮罩，
  分组标题 24/32·700、副标题 14、组间距 40（横幅到首组 32），
  网格 4/3/2/1 列 + 24 间距，卡片最小高 400 · 图片区 200 · `#F1F3F8` 底 · 图 260×160 contain。
  两个坑：① 主列 `.layout > div:first-child` 带 `display:flex; gap:10px`，
  不显式 `display:block` 会让 32/40 的间距变成 42/50；② 横幅内边距不能加在背景层上，
  `background-origin` 默认 padding-box，加了会让 cover 按缩小后的区域缩放、图无故放大一圈，
  所以文案层改用 `inset:32px` 定位
- 装备页卡片右下角的图标按钮在原站是「把这条点评引用到评论框」，本站评论未启用，
  改为滚动到评论区（无评论区时按钮闪一下作反馈）；卡片配色直接吃主题变量，暗色自动跟随

- **即刻页改静态分页**：`/essay/` 不再一次性渲染 40 条再靠「加载更多」放出来，改成构建期切页，
  每页 `page_size`（默认 8）条，第 2 页起是真实地址 `/essay/page/2/ …`，共 5 页。
  第 1 页仍由 `source/essay/index.md` 出，其余由新增的 `scripts/sugar-essay-pager.js` 生成；
  分页条复用 `_partial/pagination.ejs`（与首页同一套圆角页码 / 上下页胶囊 / 跳页框）。
  顺带：卡片点赞 key 换成全局序号，翻页后不会串到别条说说；`<title>` 带「第 N 页」，
  head 里按页输出 `rel=prev/next`。单页 HTML 从 244 KB 降到 112 KB
- **修暗色下分页页码看不清**：当前页是主色实心块，数字原来用 `var(--heo-card-bg)`，
  亮色下卡片白正好，暗色下卡片变 `#1f2024`，数字跟着变深灰压在蓝底上几乎不可读。
  `css/pagination.css` 改用 `var(--heo-white)`，全站（首页 / 归档 / 即刻）一起修好
- 即刻页手机端补「第几 / 共几」（`2 / 5`）：窄屏主题会隐藏页码圆点，只剩上/下页两个胶囊，
  而它们几乎占满整行、中间没缝，所以这句放在分页条下面单独一行
- **图片悬浮显示正文**：鼠标滑过即刻卡片的任意图片，图片下沿淡入一条渐变文字条，
  内容是这条说说的正文（去 HTML 标签、压成一行、超 56 字截断）。
  主题会把 `display:-webkit-box` 规范成 `flow-root`，`-webkit-line-clamp` 控不住行数
  （第二行会被裁一半），所以改用固定 86px + 底部对齐；右列图片的文字给右下角分页圆点让位，
  触屏设备（`hover: none`）不显示
- **图片灯箱**：即刻页点任意图片弹出大图，同一条说说的全部图片可左右切换
  （按钮 / 方向键 / 触屏滑动，首尾相接，计数 + 圆点，Esc 或点空白关闭）。
  脚本动态创建、挂在 body 下，卡片内翻页仍然独立可用；Ctrl/Cmd 点击依旧开新窗口看原图。
  遮罩固定深色不随主题变；锁滚动用拦截 wheel / touchmove，不用 `overflow:hidden`，
  否则打开灯箱会把页面滚回顶部、关掉就丢位置
- **主题更名为 Sugar**：目录 `themes/Sugar`、站点 `theme: Sugar`；`scripts/sugar-*.js`、
  `source/css/sugar-fix.css`、`package.json` 一并更新。朋友圈接口域名 `quanzi.liublog.cn`
  与站点域名 `www.liublog.cn` 是业务地址，保持原样
- 即刻页图片区改成**两图一屏的翻页图集**：每屏 2 张，多出来的收进下一页，左右按钮 /
  触屏滑动切换、首尾相接、右下角圆点指示。4 张 = 2 屏；3 张 = 2 屏（末屏单张留左格）；
  2 张 = 1 屏不出按钮；1 张撑满整行
- 即刻页正文锁定两行（`line-clamp: 2` + 固定 `3.8em` 高），短内容也占满两行，卡片高度统一
- 即刻页从整宽改为**主列 + 侧栏**两栏（主列 1044 / 侧栏 298，1440 视口）：横幅自动跟随主列，
  手机端侧栏自动隐藏不留白。侧栏卡片沿用全站 `sidebar_settings.widgets`，无需单独配置
- 即刻短文页 `/essay/` 新建：布局对标 `blog.anheyu.com/essay`（横幅 + 列表 + 评论），
  唯一差别是把目标站的 3 列网格改成**单列列表卡片**；卡片视觉沿用目标卡实测值
  （白底 / 12px 圆角 / 1px `#E3E8F7` 描边 / `0 8px 16px -4px` 阴影），直接吃主题变量，暗色自动跟随
- 数据来自站点 `source/_data/vignette.yml`（40 条），构建期静态渲染并切页；前端只做相对时间、点赞、图集翻页与灯箱
- 横幅文案 / 背景图 / 每屏条数集中到 `_config.yml` 的 `essay.page` 段，字段命名与 `friends_lite` 一致
- 导航「动态」由 `/memos/` 改指 `/essay/`，首页即刻条的「即刻」与箭头同步跳过去
- 补齐 `vignette.yml` 里 78 个失效配图的同名占位封面（`source/uploads/allimg/2024/0711/`），
  以后有真图同名覆盖即可

### 2026-11-05

- 友链页按新版参考站重做：推荐 / 小伙伴分组、卡片截图兜底、友链申请列表（搜索 / 状态筛选 / 分页）、免责声明折叠块
- 朋友圈页 `/fcircle/` 新建：横幅 + 钓鱼随机 + 卡片流 + 加载更多 + 排序开关 + 按博主筛选
- 朋友圈横幅文案 / 背景图 / 数据源集中到 `_config.yml` 的 `friends_lite` 段
