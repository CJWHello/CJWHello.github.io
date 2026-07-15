(() => {
  "use strict";

  const output = document.querySelector("[data-markdown-output]");
  if (!output) return;

  const params = new URLSearchParams(window.location.search);
  const file = params.get("file");

  loadMusings()
    .then((items) => {
      const post = items.find((item) => item.href === file) || items[0];

      if (!post?.href) {
        output.innerHTML = "<p>未找到对应随想。请从 Musings 页重新进入。</p>";
        return;
      }

      return fetch(post.href)
        .then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.text();
        })
        .then((markdown) => {
          const firstHeading = markdown.match(/^#\s+(.+)$/m);
          const displayTitle = post.title || (firstHeading ? firstHeading[1].trim() : fileNameFromPath(post.href));
          document.title = `${displayTitle} | 恍如昨日`;
          output.innerHTML = renderMarkdown(markdown);
        });
    })
    .catch(() => {
      output.innerHTML = [
        "<h2>随想加载失败</h2>",
        "<p>如果你是直接双击打开 HTML，浏览器可能会阻止读取本地 Markdown 文件。</p>",
        "<p>部署到 GitHub Pages 后可以正常访问；本地预览建议运行 <code>python -m http.server 8080</code>。</p>"
      ].join("");
    });

  function loadMusings() {
    return fetch("./data/musings.json")
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((payload) => Array.isArray(payload.musings) ? payload.musings : [])
      .catch(() => []);
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

  function renderInline(value) {
    let text = escapeHtml(value);
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy" />');
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
    text = text.replace(/~~([^~]+)~~/g, "<del>$1</del>");
    text = text.replace(/(\*\*|__)(.+?)\1/g, "<strong>$2</strong>");
    text = text.replace(/(^|[\s>])(\*|_)([^*_]+)\2/g, "$1<em>$3</em>");
    return text;
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

    const splitTableRow = (line) => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());

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

      if (!trimmed || trimmed === "---") {
        flushParagraph();
        closeList();
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

        const head = headers.map((cell, cellIndex) => `<th style="text-align:${aligns[cellIndex] || "left"}">${renderInline(cell)}</th>`).join("");
        const body = rows.map((row) => `<tr>${headers.map((_, cellIndex) => `<td style="text-align:${aligns[cellIndex] || "left"}">${renderInline(row[cellIndex] || "")}</td>`).join("")}</tr>`).join("");
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
