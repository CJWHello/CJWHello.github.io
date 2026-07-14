/**
 * Loads editable Home page content from data/home.json.
 * The existing HTML remains as a fallback when fetch is unavailable locally.
 */
(() => {
  "use strict";

  if (!document.querySelector(".hero")) return;

  fetch("./data/home.json")
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(renderHome)
    .catch(() => {
      /* Keep the static HTML fallback. */
    });

  function escapeHtml(value = "") {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderHome(config) {
    renderHero(config.hero);
    document.querySelectorAll("main .reveal").forEach((node) => node.classList.add("is-visible"));
  }

  function renderHero(hero) {
    if (!hero) return;
    const section = document.querySelector(".hero");
    const visual = section?.querySelector(".hero-visual");

    if (visual && hero.visual) {
      const satellites = (hero.visual.satellites || []).map((item, index) => {
        const direction = index % 2 === 0 ? 1 : -1;
        return `
        <div
          class="orbit-ring"
          data-direction="${direction}"
          style="--orbit-radius:${escapeHtml(item.radius || 140)}px;--orbit-speed:${escapeHtml(item.speed || 40)}s;--orbit-delay:${escapeHtml(item.delay || 0)}s;--orbit-direction:${direction};"
        >
          <span
            class="orbit-node ${item.size ? `is-${escapeHtml(item.size)}` : ""}"
            style="--orbit-angle:${escapeHtml(item.angle || index * 30)}deg;"
          ><span class="orbit-label">${escapeHtml(item.label || "")}</span></span>
        </div>
      `;
      }).join("");
      visual.innerHTML = `
        <div class="profile-orb">
          <img src="${escapeHtml(hero.visual.image || "./assets/my.jpg")}" alt="${escapeHtml(hero.visual.imageAlt || "")}" loading="eager" />
        </div>
        ${satellites}
      `;
    }
  }
})();
