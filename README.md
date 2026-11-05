# hexo-theme-liublog

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
  _partial/        头、脚、侧栏卡片等局部

source/css/        样式，按页面拆分；style.css 里 @import 汇总
source/js/         脚本，partial/ 下按页面拆
source/images/     主题图片
scripts/           Hexo 脚本
  liublog-config.js  模板 helper（导航、侧栏、作者信息）
  liublog-perf.js    把 css/js 打包成 bundle.css / bundle.js
_config.yml        主题配置（含 friends_lite 朋友圈段）
```

## 使用

把本目录放到站点 `themes/liublog`，站点 `_config.yml` 里写 `theme: liublog`，然后：

```bash
npx hexo server
```

## 配置入口

| 位置 | 管什么 |
|---|---|
| `_config.yml` | 导航、首页、侧栏、文章页、评论、页脚、代码块、朋友圈（`friends_lite`） |
| 站点 `source/_data/about.yml` | 关于页内容 |
| 站点 `source/_data/link.yml` | 友链数据（分组 + 站点） |

## 更新记录

### 2026-11-05

- 友链页按新版参考站重做：推荐 / 小伙伴分组、卡片截图兜底、友链申请列表（搜索 / 状态筛选 / 分页）、免责声明折叠块
- 朋友圈页 `/fcircle/` 新建：横幅 + 钓鱼随机 + 卡片流 + 加载更多 + 排序开关 + 按博主筛选
- 朋友圈横幅文案 / 背景图 / 数据源集中到 `_config.yml` 的 `friends_lite` 段
