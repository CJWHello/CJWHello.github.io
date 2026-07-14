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
      const orbiters = (hero.visual.orbiters || []).map((item) => `
        <div class="orbiter-ring" style="--orbit-radius:${escapeHtml(item.radius || 180)}px;--orbit-speed:${escapeHtml(item.speed || 30)}s;--orbit-delay:${escapeHtml(item.delay || 0)}s;">
          <span class="orbiter-track"></span>
          <div class="orbiter-satellite" style="--orbit-angle:${escapeHtml(item.angle || 0)}deg;">
            <button class="orbiter-dot" type="button" aria-label="${escapeHtml(item.label || "")}" title="${escapeHtml(item.label || "")}"></button>
          </div>
        </div>
      `).join("");
      const stars = (hero.visual.stars || []).map((item) => `
        <button
          class="star-chip size-${escapeHtml(item.size || "sm")}"
          type="button"
          style="top:${escapeHtml(item.top || "50%")};left:${escapeHtml(item.left || "50%")};--drift-x:${escapeHtml(item.driftX || 0)}px;--drift-y:${escapeHtml(item.driftY || 0)}px;--drift-duration:${escapeHtml(item.duration || 10)}s;"
          aria-label="${escapeHtml(item.label || "")}"
          title="${escapeHtml(item.label || "")}"
        >
          <span class="star-core"></span>
          <span class="star-label">${escapeHtml(item.label || "")}</span>
        </button>
      `).join("");
      visual.innerHTML = `
        <div class="hero-cosmos" aria-hidden="true">
          <span class="cosmos-glow glow-one"></span>
          <span class="cosmos-glow glow-two"></span>
        </div>
        <div class="profile-orb">
          <img src="${escapeHtml(hero.visual.image || "./assets/my.jpg")}" alt="${escapeHtml(hero.visual.imageAlt || "")}" loading="eager" />
        </div>
        ${orbiters}
        ${stars}
      `;
    }
  }
})();
