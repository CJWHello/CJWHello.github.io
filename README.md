# 恍如昨日的多模态学习记录主页

一个现代、高级、可直接部署到 GitHub Pages 的个人学习记录主页。项目使用纯 HTML5、CSS3、JavaScript ES6+ 构建，不依赖 Node 服务、不需要后端，主要用于沉淀多模态大模型学习路线、Markdown 笔记、项目复盘和算法面试准备。

## Features

- 多页面结构：首页、关于、笔记库、小项目、随想、二次元、联系、Markdown 阅读页、404
- 默认深色主题，并支持深浅色切换
- Glassmorphism、轻量 Neumorphism、Aurora、Mesh Gradient、动态粒子
- Hero 动态打字、数字滚动、滚动揭示、视差、鼠标光效
- Markdown 笔记卡片、随想便签、小项目展示、分类筛选、返回顶部
- IntersectionObserver 与 requestAnimationFrame 优化动画性能
- `prefers-reduced-motion` 动效降级
- 已填入恍如昨日的基础信息、教育背景、项目经历、专业技能与联系方式
- SEO meta、Open Graph、Twitter Card、favicon、robots.txt、sitemap.xml
- 所有站内资源使用相对路径，适合 `github.io` 静态部署

## Project Structure

```text
/
├── index.html
├── about.html
├── projects.html           # Notes / Markdown 笔记索引
├── works.html              # Projects / 小项目展示
├── blog.html               # Musings / 随想便签
├── anime.html              # 二次元卡片列表
├── anime-detail.html       # 二次元详情页
├── contact.html
├── note.html
├── 404.html
├── css/
│   ├── style.css
│   ├── animation.css
│   └── responsive.css
├── js/
│   ├── main.js
│   ├── animation.js
│   ├── particles.js
│   ├── site-data.js
│   ├── markdown.js
│   ├── musings.js
│   ├── anime.js
│   └── anime-detail.js
├── data/
│   ├── home.json
│   ├── notes.json
│   ├── projects.json
│   ├── musings.json
│   └── acgn.json
├── musings/
│   ├── research-life.md
│   ├── paper-reading.md
│   └── night-debug.md
├── assets/
│   ├── images/
│   ├── icons/
│   └── background/
├── notes/
│   ├── vlm/
│   │   └── 多模态大模型算法学习路线.md
│   ├── interview/
│   │   └── Diffusion视频算法面试八股.md
│   └── projects/
│       └── 简历项目.md
├── robots.txt
├── sitemap.xml
├── .nojekyll
├── README.md
└── LICENSE
```

## Local Preview

这是纯静态项目，可以直接双击打开 `index.html`。如果你希望模拟线上路径，可以在项目目录运行任意静态服务器，例如：

```bash
python -m http.server 8080
```

然后访问：

```text
http://localhost:8080
```

## Deploy to GitHub Pages

1. 创建 GitHub 仓库，例如 `<yourname>.github.io`，或任意普通仓库名。
2. 将本项目所有文件提交到仓库根目录。
3. 打开仓库的 `Settings`。
4. 进入 `Pages`。
5. 在 `Build and deployment` 中选择：
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
6. 保存后等待 GitHub Pages 构建完成。
7. 访问 `https://<yourname>.github.io/`。

如果你部署到普通仓库，例如 `portfolio`，访问地址通常是：

```text
https://你的用户名.github.io/portfolio/
```

本项目使用相对路径，所以两种部署方式都可以工作。

## Customize Content

主要替换以下内容：

- `js/site-data.js`：姓名、缩写、年龄、籍贯、邮箱、电话、GitHub、教育背景、荣誉证书等集中在这里维护
- `data/home.json`：首页 Hero、Profile、Capabilities、Notes Preview、Timeline、Musings、Contact CTA 文案集中在这里维护
- HTML 中带 `data-profile`、`data-href`、`data-action`、`data-profile-list` 的位置会自动读取 `site-data.js`
- 首页 Hero 文案
- 笔记卡片标题、描述、技术栈与 Markdown 链接
- 随想 Markdown 内容与标签
- Open Graph URL 和图片说明

建议优先编辑：

- `index.html`
- `about.html`
- `projects.html`
- `works.html`
- `blog.html`
- `contact.html`

## Customize Colors

主题颜色集中在 `css/style.css` 的 `:root` 中：

```css
:root {
  --bg: #050816;
  --primary: #5B8CFF;
  --secondary: #00E5FF;
  --accent: #8B5CF6;
  --text: #FFFFFF;
  --muted: rgba(255, 255, 255, 0.75);
}
```

浅色主题在 `[data-theme="light"]` 中配置。修改变量即可改变全站配色。

## Manage Notes

Markdown 笔记按类别放在 `notes/` 子目录：

- `notes/vlm/多模态大模型算法学习路线.md`
- `notes/interview/Diffusion视频算法面试八股.md`
- `notes/projects/简历项目.md`

如果新增笔记：

1. 按类别把新的 `.md` 文件放进 `notes/` 下的子目录，例如 `notes/vlm/`、`notes/interview/`。
2. 手动在 `data/notes.json` 里新增一条笔记配置。
3. `projects.html` 会根据 `data/notes.json` 自动生成分类按钮和笔记卡片。
4. 点击卡片后，`note.html` 会按配置里的 `path` 读取对应 Markdown 详情。

推荐在 `data/notes.json` 中为每篇笔记配置这些字段：

```json
{
  "key": "vlm-your-note",
  "title": "你的笔记标题",
  "category": "vlm",
  "categoryLabel": "VLM",
  "type": "Note",
  "path": "./notes/vlm/你的笔记.md",
  "cover": "./assets/images/your-cover.png",
  "excerpt": "卡片上的简要概述",
  "tags": ["VLM", "Qwen2-VL"]
}
```

`note.html` 会通过 `js/markdown.js` 在浏览器端读取并渲染 Markdown。例如：

```text
note.html?file=multimodal-roadmap
note.html?file=diffusion-interview
note.html?file=resume-projects
```

现在 `note.html` 会优先读取 `data/notes.json`，不再需要手动维护 `js/markdown.js` 的路径映射。

## Component-like Data

如果你希望像 Vue 自定义组件一样维护卡片数据，现在这几个页面都可以按数据文件维护：

- `Notes`：`data/notes.json`
- `Travel`：`data/travel.json`
- `Musings`：`data/musings.json`
- `二次元`：`data/acgn.json`

你只需要填封面路径、介绍文本、跳转链接或 Markdown 路径，页面会自动渲染卡片。

## Manage Musings

随想放在 `musings/` 目录。每篇 Markdown 顶部使用 front matter：

```text
---
title: "标题"
date: "2026-07-13"
tags: ["科研", "日常"]
cover: "./assets/images/project-vision.svg"
excerpt: "卡片摘要"
---
```

新增随想后，在 `js/musings.js` 的 `posts` 数组里加入文件路径即可。

## Manage ACGN

二次元内容集中在 `data/acgn.json`：

```json
{
  "id": "anime-watchlist",
  "type": "Anime",
  "title": "追番清单",
  "cover": "./assets/images/acgn-anime.svg",
  "summary": "卡片摘要",
  "tags": ["动画", "追番"],
  "content": "详情页正文"
}
```

新增动漫、小说或漫画条目时，在 `items` 数组里追加对象，并准备对应封面图即可。

## Replace Images

图片都在 `assets/images/` 中：

- `project-vision.svg`：项目预览图
- `project-dashboard.svg`：项目预览图
- `project-diffusion.svg`：项目预览图
- `project-nexus.svg`：项目预览图
- `og-cover.svg`：社交分享封面

可以替换为 `.jpg`、`.png`、`.webp` 或 `.svg`。替换后同步更新 HTML 中的 `src` 路径。

## Contact Form

`contact.html` 当前使用静态 `mailto:2426815661@qq.com` 表单，适合 GitHub Pages 的无后端部署。

如果希望真正收集表单，可以使用：

- Formspree
- Basin
- Getform
- Netlify Forms

替换 `<form>` 的 `action` 即可。

## Performance Notes

- 粒子动画使用单个 Canvas，数量随屏幕面积自适应。
- 滚动动画通过 IntersectionObserver 触发，避免持续监听大量元素。
- 鼠标、视差和粒子动画使用 requestAnimationFrame。
- 移动端和用户开启减少动态效果时，会自动降低动效。
- 图片使用 `loading="lazy"`，首屏关键图使用 `loading="eager"`。

## License

MIT License. 你可以自由修改、部署和二次开发。

