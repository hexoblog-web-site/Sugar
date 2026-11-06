# hexo-theme-sugar

一个 Hexo 博客主题。视觉与结构对标 [blog.zhheo.com](https://blog.zhheo.com/) 与 [blog.anheyu.com](https://blog.anheyu.com/)，
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
  essay.ejs        即刻短文（/essay/）
  _partial/        头、脚、侧栏卡片等局部

source/css/        样式，按页面拆分；style.css 里 @import 汇总
source/js/         脚本，partial/ 下按页面拆
source/images/     主题图片
scripts/           Hexo 脚本
  sugar-config.js  模板 helper（导航、侧栏、作者信息）
  sugar-perf.js    把 css/js 打包成 bundle.css / bundle.js
_config.yml        主题配置（含 friends_lite 朋友圈段、essay.page 即刻短文段）
```

## 使用

把本目录放到站点 `themes/Sugar`，站点 `_config.yml` 里写 `theme: Sugar`，然后：

```bash
npx hexo server
```

## 配置入口

| 位置 | 管什么 |
|---|---|
| `_config.yml` | 导航、首页、侧栏、文章页、评论、页脚、代码块、朋友圈（`friends_lite`）、即刻短文页（`essay.page`） |
| 站点 `source/_data/about.yml` | 关于页内容 |
| 站点 `source/_data/link.yml` | 友链数据（分组 + 站点） |
| 站点 `source/_data/vignette.yml` | 即刻短文页数据（`/essay/`） |
| 站点 `source/_data/link_apply.yml` | 友链申请记录（可选） |

## 更新记录

### 2026-11-06

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
- 数据来自站点 `source/_data/vignette.yml`（40 条），构建期静态渲染；前端只做相对时间、加载更多、点赞
- 横幅文案 / 背景图 / 每屏条数集中到 `_config.yml` 的 `essay.page` 段，字段命名与 `friends_lite` 一致
- 导航「动态」由 `/memos/` 改指 `/essay/`，首页即刻条的「即刻」与箭头同步跳过去
- 补齐 `vignette.yml` 里 78 个失效配图的同名占位封面（`source/uploads/allimg/2024/0711/`），
  以后有真图同名覆盖即可

### 2026-11-05

- 友链页按新版参考站重做：推荐 / 小伙伴分组、卡片截图兜底、友链申请列表（搜索 / 状态筛选 / 分页）、免责声明折叠块
- 朋友圈页 `/fcircle/` 新建：横幅 + 钓鱼随机 + 卡片流 + 加载更多 + 排序开关 + 按博主筛选
- 朋友圈横幅文案 / 背景图 / 数据源集中到 `_config.yml` 的 `friends_lite` 段
