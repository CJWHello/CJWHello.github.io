/**
 * Render lightweight sticky-note cards from Markdown files.
 * Markdown files use simple front matter:
 * title/date/tags/cover/excerpt
 */
(() => {
  "use strict";

  const grid = document.querySelector("[data-musings-grid]");
  const filters = document.querySelectorAll("[data-musing-filter]");
  if (!grid) return;

  const posts = [
    "./musings/research-life.md",
    "./musings/paper-reading.md",
    "./musings/night-debug.md"
  ];

  Promise.all(posts.map(loadPost))
    .then((items) => {
      grid.innerHTML = items.map(renderCard).join("");
      bindFilters();
    })
    .catch(() => {
      grid.innerHTML = '<article class="sticky-note-card"><h2>随想加载失败</h2><p>本地直接打开 HTML 时，浏览器可能会阻止读取 Markdown。部署到 GitHub Pages 后可正常加载。</p></article>';
    });

  function loadPost(path) {
    return fetch(path)
      .then((response) => {
        if (!response.ok) throw new Error(path);
        return response.text();
      })
      .then((markdown) => {
        const meta = parseFrontMatter(markdown);
        return {
          path,
          title: meta.title || fileName(path),
          date: meta.date || "",
          tags: meta.tags || [],
          cover: meta.cover || firstImage(markdown),
          excerpt: meta.excerpt || firstParagraph(markdown)
        };
      });
  }

  function parseFrontMatter(markdown) {
    const match = markdown.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return {};
    const meta = {};
    match[1].split("\n").forEach((line) => {
      const pair = line.match(/^(\w+):\s*(.+)$/);
      if (!pair) return;
      const key = pair[1];
      let value = pair[2].trim().replace(/^"|"$/g, "");
      if (key === "tags") {
        value = value.replace(/^\[|\]$/g, "").split(",").map((tag) => tag.trim().replace(/^"|"$/g, "")).filter(Boolean);
      }
      meta[key] = value;
    });
    return meta;
  }

  function firstImage(markdown) {
    const match = markdown.match(/!\[[^\]]*\]\(([^)]+)\)/);
    return match ? match[1] : "./assets/images/project-dashboard.svg";
  }

  function firstParagraph(markdown) {
    return markdown.replace(/^---[\s\S]*?---/, "").split("\n").map((line) => line.trim()).find((line) => line && !line.startsWith("#") && !line.startsWith("!")) || "";
  }

  function fileName(path) {
    return path.split("/").pop().replace(/\.md$/i, "");
  }

  function renderCard(post) {
    const tagText = post.tags.join(" ");
    const tagHtml = post.tags.map((tag) => `<span>${tag}</span>`).join("");
    return `
      <article class="sticky-note-card reveal is-visible" data-tags="${tagText}">
        <img src="${post.cover}" alt="${post.title}" loading="lazy" />
        <div class="sticky-note-body">
          <time>${post.date}</time>
          <h2>${post.title}</h2>
          <p>${post.excerpt}</p>
          <div class="skill-tags">${tagHtml}</div>
          <div class="card-actions"><a href="${post.path}"><i class="fa-regular fa-file-lines"></i> Raw MD</a></div>
        </div>
      </article>
    `;
  }

  function bindFilters() {
    filters.forEach((button) => {
      button.addEventListener("click", () => {
        const tag = button.dataset.musingFilter;
        filters.forEach((item) => item.classList.toggle("active", item === button));
        grid.querySelectorAll("[data-tags]").forEach((card) => {
          const tags = card.dataset.tags || "";
          card.classList.toggle("is-hidden", tag !== "all" && !tags.includes(tag));
        });
      });
    });
  }
})();
