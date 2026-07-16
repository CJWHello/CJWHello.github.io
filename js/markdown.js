(() => {
  "use strict";

  const output = document.querySelector("[data-markdown-output]");
  const tocRoot = document.querySelector("[data-note-toc]");
  const rawLink = document.querySelector("[data-raw-note]");
  if (!output) return;

  const fallbackNotes = [
    { key: "multimodal-roadmap", title: "多模态大模型算法学习路线", path: "./notes/vlm/多模态大模型算法学习路线.md" },
    { key: "diffusion-interview", title: "Diffusion 视频算法面试八股", path: "./notes/interview/Diffusion视频算法面试八股.md" },
    { key: "resume-projects", title: "简历项目", path: "./notes/projects/简历项目.md" }
  ];

  const params = new URLSearchParams(window.location.search);
  const key = params.get("file") || "multimodal-roadmap";
  const headings = [];

  const md = createMarkdownRenderer(headings);

  loadNotes()
    .then((notes) => {
      const note = notes.find((item) => item.key === key);

      if (!note?.path) {
        output.innerHTML = "<p>未找到对应笔记。请从笔记库重新进入。</p>";
        renderToc([]);
        return;
      }

      if (rawLink) rawLink.setAttribute("href", note.path);

      return fetch(note.path)
        .then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.text();
        })
        .then((markdown) => {
          headings.length = 0;
          const prepared = preserveMath(markdown);
          const rendered = md.render(prepared.text);
          output.innerHTML = wrapTables(prepared.restore(rendered));
          renderToc(headings);
          document.title = `${note.title || fileNameFromPath(note.path)} | 恍如昨日`;

          if (window.MathJax?.typesetPromise) {
            window.MathJax.typesetPromise([output]).catch(() => {});
          }
        });
    })
    .catch(() => {
      output.innerHTML = [
        "<h2>笔记加载失败</h2>",
        "<p>如果你是直接双击打开 HTML，浏览器可能会阻止读取本地 Markdown 文件。</p>",
        "<p>部署到 GitHub Pages 后可以正常访问；本地预览建议运行 <code>python -m http.server 8080</code>。</p>"
      ].join("");
      renderToc([]);
    });

  function createMarkdownRenderer(headingStore) {
    if (!window.markdownit) {
      throw new Error("markdown-it unavailable");
    }

    const slugCount = new Map();
    const instance = window.markdownit({
      html: true,
      breaks: true,
      linkify: true,
      typographer: true
    });

    if (typeof window.markdownitTaskLists === "function") {
      instance.use(window.markdownitTaskLists, { enabled: true, label: true, labelAfter: true });
    }

    const defaultHeadingOpen = instance.renderer.rules.heading_open
      || ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));
    instance.renderer.rules.heading_open = (tokens, idx, options, env, self) => {
      const inline = tokens[idx + 1];
      const text = inline?.content?.trim() || "";
      const level = Number(tokens[idx].tag.replace("h", ""));
      const slug = createSlug(text, slugCount);
      tokens[idx].attrSet("id", slug);
      if (level >= 1 && level <= 4) {
        headingStore.push({ level, text, slug });
      }
      return defaultHeadingOpen(tokens, idx, options, env, self);
    };

    const defaultImage = instance.renderer.rules.image
      || ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));
    instance.renderer.rules.image = (tokens, idx, options, env, self) => {
      const token = tokens[idx];
      const loadingIndex = token.attrIndex("loading");
      if (loadingIndex < 0) token.attrPush(["loading", "lazy"]);
      else token.attrs[loadingIndex][1] = "lazy";
      return defaultImage(tokens, idx, options, env, self);
    };

    const defaultLinkOpen = instance.renderer.rules.link_open
      || ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));
    instance.renderer.rules.link_open = (tokens, idx, options, env, self) => {
      const token = tokens[idx];
      setOrPushAttr(token, "target", "_blank");
      setOrPushAttr(token, "rel", "noopener");
      return defaultLinkOpen(tokens, idx, options, env, self);
    };

    return instance;
  }

  function createSlug(text, slugCount) {
    const base = String(text || "")
      .toLowerCase()
      .replace(/<[^>]*>/g, "")
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .trim()
      .replace(/\s+/g, "-")
      || "section";
    const count = slugCount.get(base) || 0;
    slugCount.set(base, count + 1);
    return count ? `${base}-${count}` : base;
  }

  function setOrPushAttr(token, name, value) {
    const index = token.attrIndex(name);
    if (index < 0) token.attrPush([name, value]);
    else token.attrs[index][1] = value;
  }

  function renderToc(items) {
    if (!tocRoot) return;
    if (!items.length) {
      tocRoot.innerHTML = [
        '<p class="note-toc-title">Outline</p>',
        '<p class="note-toc-empty">当前笔记没有可用标题。</p>'
      ].join("");
      return;
    }

    tocRoot.innerHTML = [
      '<p class="note-toc-title">Outline</p>',
      '<nav class="note-toc-nav" aria-label="Markdown outline">',
      items.map((item) => (
        `<a class="note-toc-link level-${item.level}" href="#${item.slug}">${escapeHtml(item.text)}</a>`
      )).join(""),
      "</nav>"
    ].join("");
  }

  function loadNotes() {
    return fetch("./data/notes.json")
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((payload) => Array.isArray(payload.notes) ? payload.notes : fallbackNotes)
      .catch(() => fallbackNotes);
  }

  function fileNameFromPath(path) {
    return decodeURIComponent(path.split("/").pop().replace(/\.md$/i, ""));
  }

  function preserveMath(markdown) {
    const tokens = [];
    let text = markdown;

    text = text.replace(/```math\s*([\s\S]*?)```/g, (_, formula) => {
      const token = `@@MATH_${tokens.length}@@`;
      tokens.push(`<div class="math-block">$$${formula.trim()}$$</div>`);
      return token;
    });

    text = text.replace(/\\\[([\s\S]+?)\\\]/g, (_, formula) => {
      const token = `@@MATH_${tokens.length}@@`;
      tokens.push(`<div class="math-block">\\[${formula}\\]</div>`);
      return token;
    });

    text = text.replace(/\\\(([\s\S]+?)\\\)/g, (_, formula) => {
      const token = `@@MATH_${tokens.length}@@`;
      tokens.push(`\\(${formula}\\)`);
      return token;
    });

    text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, formula) => {
      const token = `@@MATH_${tokens.length}@@`;
      tokens.push(`<div class="math-block">$$${formula.trim()}$$</div>`);
      return token;
    });

    text = text.replace(/(^|[^$\\])\$([^\n$]+?)\$(?!\$)/g, (_, prefix, formula) => {
      const token = `@@MATH_${tokens.length}@@`;
      tokens.push(`${prefix}$${formula}$`);
      return token;
    });

    return {
      text,
      restore(rendered) {
        return tokens.reduce((acc, token, index) => acc.replaceAll(`@@MATH_${index}@@`, token), rendered);
      }
    };
  }

  function wrapTables(html) {
    return html
      .replace(/<table>/g, '<div class="markdown-table-wrap"><table>')
      .replace(/<\/table>/g, "</table></div>");
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();
