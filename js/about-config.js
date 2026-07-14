/**
 * Loads editable About page content from data/about.json.
 */
(() => {
  "use strict";

  if (!document.querySelector("[data-about-puzzle]")) return;

  fetch("./data/about.json")
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(renderAbout)
    .catch(() => {
      /* Keep the static fallback. */
    });

  function escapeHtml(value = "") {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderAbout(config) {
    renderCopy(config.hero);
    renderPuzzle(config.puzzle);
    renderTimeline(config.timeline);
    document.querySelectorAll("main .reveal").forEach((node) => node.classList.add("is-visible"));
  }

  function renderCopy(hero) {
    const container = document.querySelector("[data-about-copy]");
    if (!container || !hero) return;
    const meta = Array.isArray(hero.meta) ? hero.meta : [];

    container.innerHTML = `
      <p class="eyebrow">${escapeHtml(hero.eyebrow || "About")}</p>
      <h1>${escapeHtml(hero.title || "")}</h1>
      <p class="about-puzzle-lead">${escapeHtml(hero.lead || "")}</p>
      <div class="about-puzzle-meta">
        ${meta.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
      </div>
    `;
  }

  function renderPuzzle(puzzle) {
    const container = document.querySelector("[data-about-puzzle]");
    if (!container || !puzzle) return;

    const tiles = Array.isArray(puzzle.tiles) ? puzzle.tiles.slice(0, 9) : [];
    const grid = Number(puzzle.grid) || 3;
    const denominator = Math.max(grid - 1, 1);
    const image = escapeHtml(puzzle.image || "./assets/my.jpg");
    const imageAlt = escapeHtml(puzzle.imageAlt || "");

    container.style.setProperty("--about-image", `url('${image}')`);
    container.setAttribute("aria-label", imageAlt || "个人信息拼图");

    container.innerHTML = tiles.map((tile, index) => {
      const col = index % grid;
      const row = Math.floor(index / grid);
      const bgX = `${(col / denominator) * 100}%`;
      const bgY = `${(row / denominator) * 100}%`;

      return `
        <article class="puzzle-tile" tabindex="0" aria-label="${escapeHtml(tile.label || "")}">
          <div class="puzzle-tile-inner">
            <div class="puzzle-face puzzle-face-front" style="--bg-x:${bgX};--bg-y:${bgY};" aria-hidden="true"></div>
            <div class="puzzle-face puzzle-face-back">
              <span>${escapeHtml(tile.label || "")}</span>
              <h2>${escapeHtml(tile.title || "")}</h2>
              <p>${escapeHtml(tile.description || "")}</p>
            </div>
          </div>
        </article>
      `;
    }).join("");
  }

  function renderTimeline(timeline) {
    if (!timeline) return;

    const heading = document.querySelector("[data-about-timeline-heading]");
    const container = document.querySelector("[data-about-timeline]");
    const items = Array.isArray(timeline.items) ? timeline.items : [];

    if (heading) {
      heading.innerHTML = `
        <p class="eyebrow">${escapeHtml(timeline.eyebrow || "Education")}</p>
        <h2>${escapeHtml(timeline.title || "")}</h2>
      `;
    }

    if (container && items.length) {
      container.innerHTML = items.map((item) => `
        <article class="timeline-item reveal">
          <span class="timeline-dot"></span>
          <div class="timeline-card">
            <time>${escapeHtml(item.period || "")}</time>
            <h3>${escapeHtml(item.title || "")}</h3>
            <p>${escapeHtml(item.description || "")}</p>
          </div>
        </article>
      `).join("");
    }
  }
})();
