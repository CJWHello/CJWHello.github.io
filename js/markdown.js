/**
 * Tiny Markdown renderer for GitHub Pages note viewing.
 * It intentionally supports the common structures used by learning notes:
 * headings, paragraphs, unordered lists, ordered lists, blockquotes, code fences,
 * inline code, bold text, links, and horizontal rules.
 */
(() => {
  "use strict";

  const output = document.querySelector("[data-markdown-output]");
  const titleNode = document.querySelector("[data-note-title]");
  const subtitleNode = document.querySelector("[data-note-subtitle]");
  const rawLink = document.querySelector("[data-raw-note]");
  if (!output) return;

  const fallbackNotes = [
    { key: "multimodal-roadmap", title: "多模态大模型算法学习路线", path: "./notes/vlm/多模态大模型算法学习路线.md" },
    { key: "diffusion-interview", title: "Diffusion 视频算法面试八股", path: "./notes/interview/Diffusion视频算法面试八股.md" },
    { key: "resume-projects", title: "简历项目", path: "./notes/projects/简历项目.md" }
  ];

  const params = new URLSearchParams(window.location.search);
  const key = params.get("file") || "multimodal-roadmap";

  loadNotes()
    .then((notes) => {
      const note = notes.find((item) => item.key === key);

      if (!note?.path) {
        output.innerHTML = "<p>未找到对应笔记。请从笔记库重新进入。</p>";
        return;
      }

      if (rawLink) rawLink.setAttribute("href", note.path);
      return fetch(note.path)
        .then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.text();
        })
        .then((markdown) => {
          const firstHeading = markdown.match(/^#\s+(.+)$/m);
          const displayTitle = note.title || (firstHeading ? firstHeading[1].trim() : fileNameFromPath(note.path));
          if (titleNode) titleNode.textContent = displayTitle;
          if (subtitleNode) subtitleNode.textContent = "Markdown 笔记已渲染为网页阅读模式。";
          document.title = `${displayTitle} | 恍如昨日`;
          output.innerHTML = renderMarkdown(markdown);
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
    });

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

  function escapeHtml(value) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function preserveMath(value) {
    const tokens = [];
    let text = value;

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
      tokens.push(`<div class="math-block">$$${formula}$$</div>`);
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

  function renderInline(value) {
    const math = preserveMath(value);
    let text = escapeHtml(math.text);
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy" />');
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
    text = text.replace(/~~([^~]+)~~/g, "<del>$1</del>");
    text = text.replace(/(\*\*|__)(.+?)\1/g, "<strong>$2</strong>");
    text = text.replace(/(^|[\s>])(\*|_)([^*_]+)\2/g, "$1<em>$3</em>");
    return math.restore(text);
  }

  function renderMarkdown(markdown) {
    const lines = markdown.replace(/\r\n/g, "\n").split("\n");
    const html = [];
    let inCode = false;
    let codeBuffer = [];
    let codeLang = "";
    let listType = null;
    let paragraphBuffer = [];

    const closeList = () => {
      if (listType) {
        html.push(`</${listType}>`);
        listType = null;
      }
    };

    const flushParagraph = () => {
      if (!paragraphBuffer.length) return;
      closeList();
      html.push(`<p>${renderInline(paragraphBuffer.join(" "))}</p>`);
      paragraphBuffer = [];
    };

    const isTableSeparator = (line) => {
      const cells = splitTableRow(line);
      return cells.length > 1 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
    };

    const splitTableRow = (line) => {
      return line
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => cell.trim());
    };

    const tableAlign = (marker) => {
      const value = marker.trim();
      if (value.startsWith(":") && value.endsWith(":")) return "center";
      if (value.endsWith(":")) return "right";
      return "left";
    };

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const trimmed = line.trim();
      const fence = trimmed.match(/^```([\w-]*)/);

      if (fence) {
        if (inCode) {
          const langClass = codeLang ? ` class="language-${escapeHtml(codeLang)}"` : "";
          html.push(`<pre><code${langClass}>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
          codeBuffer = [];
          codeLang = "";
          inCode = false;
        } else {
          flushParagraph();
          closeList();
          codeLang = fence[1] || "";
          inCode = true;
        }
        continue;
      }

      if (inCode) {
        codeBuffer.push(line);
        continue;
      }

      if (!trimmed) {
        flushParagraph();
        closeList();
        continue;
      }

      if (trimmed === "$$" || (/^\$\$/.test(trimmed) && !/\$\$$/.test(trimmed.slice(2)))) {
        flushParagraph();
        closeList();
        const block = [line];
        while (index + 1 < lines.length) {
          index += 1;
          block.push(lines[index]);
          if (lines[index].trim().endsWith("$$")) break;
        }
        html.push(`<div class="math-block">${block.join("\n")}</div>`);
        continue;
      }

      if (trimmed === "\\[" || (/^\\\[/.test(trimmed) && !/\\\]$/.test(trimmed))) {
        flushParagraph();
        closeList();
        const block = [line];
        while (index + 1 < lines.length) {
          index += 1;
          block.push(lines[index]);
          if (lines[index].trim().endsWith("\\]")) break;
        }
        html.push(`<div class="math-block">${block.join("\n")}</div>`);
        continue;
      }

      if (trimmed.includes("|") && lines[index + 1] && isTableSeparator(lines[index + 1])) {
        flushParagraph();
        closeList();
        const headers = splitTableRow(trimmed);
        const markers = splitTableRow(lines[index + 1]);
        const aligns = markers.map(tableAlign);
        const rows = [];
        index += 2;

        while (index < lines.length && lines[index].trim().includes("|")) {
          rows.push(splitTableRow(lines[index]));
          index += 1;
        }
        index -= 1;

        const head = headers
          .map((cell, cellIndex) => `<th style="text-align:${aligns[cellIndex] || "left"}">${renderInline(cell)}</th>`)
          .join("");
        const body = rows
          .map((row) => `<tr>${headers.map((_, cellIndex) => `<td style="text-align:${aligns[cellIndex] || "left"}">${renderInline(row[cellIndex] || "")}</td>`).join("")}</tr>`)
          .join("");

        html.push(`<div class="markdown-table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`);
        continue;
      }

      const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        flushParagraph();
        closeList();
        const level = Math.min(heading[1].length + 1, 6);
        html.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
        continue;
      }

      if (/^---+$/.test(trimmed)) {
        flushParagraph();
        closeList();
        html.push("<hr />");
        continue;
      }

      if (trimmed.startsWith(">")) {
        flushParagraph();
        closeList();
        const quoteLines = [];
        while (index < lines.length && lines[index].trim().startsWith(">")) {
          quoteLines.push(lines[index].trim().replace(/^>\s?/, ""));
          index += 1;
        }
        index -= 1;
        html.push(`<blockquote>${quoteLines.map(renderInline).join("<br />")}</blockquote>`);
        continue;
      }

      const task = trimmed.match(/^[-*]\s+\[([ xX])\]\s+(.+)$/);
      if (task) {
        flushParagraph();
        if (listType !== "ul") {
          closeList();
          html.push("<ul>");
          listType = "ul";
        }
        const checked = task[1].toLowerCase() === "x" ? " checked" : "";
        html.push(`<li class="task-list-item"><input type="checkbox" disabled${checked} /> ${renderInline(task[2])}</li>`);
        continue;
      }

      const unordered = trimmed.match(/^[-*·]\s+(.+)$/);
      if (unordered) {
        flushParagraph();
        if (listType !== "ul") {
          closeList();
          html.push("<ul>");
          listType = "ul";
        }
        html.push(`<li>${renderInline(unordered[1])}</li>`);
        continue;
      }

      const ordered = trimmed.match(/^\d+[.)]\s+(.+)$/);
      if (ordered) {
        flushParagraph();
        if (listType !== "ol") {
          closeList();
          html.push("<ol>");
          listType = "ol";
        }
        html.push(`<li>${renderInline(ordered[1])}</li>`);
        continue;
      }

      paragraphBuffer.push(trimmed);
    }

    if (inCode) {
      const langClass = codeLang ? ` class="language-${escapeHtml(codeLang)}"` : "";
      html.push(`<pre><code${langClass}>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
    }
    flushParagraph();
    closeList();
    return html.join("\n");
  }
})();

