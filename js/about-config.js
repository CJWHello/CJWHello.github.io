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
    const image = escapeHtml(puzzle.image || "./assets/my.jpg");
    const imageAlt = escapeHtml(puzzle.imageAlt || "");

    container.setAttribute("aria-label", imageAlt || "个人信息拼图");

    container.innerHTML = tiles.map((tile, index) => {
      const col = index % grid;
      const row = Math.floor(index / grid);
      const pieceClass = getPieceClass(index, row, col);
      const pieceStyle = getPieceStyle(index);

      return `
        <article class="puzzle-tile ${pieceClass}" style="${pieceStyle}" tabindex="0" aria-label="${escapeHtml(tile.label || "")}">
          <div class="puzzle-tile-inner">
            <div class="puzzle-face puzzle-face-front" style="--piece-col:${col};--piece-row:${row};--piece-grid:${grid};" aria-hidden="true">
              <img class="puzzle-fragment" src="${image}" alt="" loading="lazy" />
            </div>
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

  function getPieceClass(index, row, col) {
    const classes = [`piece-row-${row}`, `piece-col-${col}`];

    if (col < 2) classes.push((row + col) % 2 === 0 ? "piece-tab-right" : "piece-notch-right");
    if (row < 2) classes.push((row + col) % 2 === 0 ? "piece-notch-bottom" : "piece-tab-bottom");

    if (col > 0) classes.push((row + col) % 2 === 0 ? "piece-notch-left" : "piece-tab-left");
    if (row > 0) classes.push((row + col) % 2 === 0 ? "piece-tab-top" : "piece-notch-top");

    classes.push(`piece-variant-${index % 3}`);
    return classes.join(" ");
  }

  function getPieceStyle(index) {
    const presets = [
      ["-4px", "-3px", "-1.6deg"],
      ["0px", "-5px", "1.1deg"],
      ["4px", "-2px", "-0.8deg"],
      ["-5px", "2px", "1.4deg"],
      ["0px", "0px", "0deg"],
      ["5px", "1px", "-1.2deg"],
      ["-3px", "4px", "-1deg"],
      ["1px", "5px", "0.9deg"],
      ["4px", "3px", "-1.4deg"]
    ];
    const [x, y, r] = presets[index % presets.length];
    return `--piece-shift-x:${x};--piece-shift-y:${y};--piece-tilt:${r};`;
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
