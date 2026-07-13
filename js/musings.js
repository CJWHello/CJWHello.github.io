/**
 * Render musing cards from a simple JSON manifest.
 */
(() => {
  "use strict";

  const grid = document.querySelector("[data-musings-grid]");
  const filters = document.querySelectorAll("[data-musing-filter]");
  if (!grid) return;

  fetch("./data/musings.json")
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((payload) => {
      const items = Array.isArray(payload.musings) ? payload.musings : [];
      grid.innerHTML = items.map(renderCard).join("");
      bindFilters();
    })
    .catch(() => {
      grid.innerHTML = '<article class="sticky-note-card"><h2>Musings load failed</h2><p>GitHub Pages can render these cards after the JSON manifest is available.</p></article>';
    });

  function renderCard(post) {
    const tagText = (post.tags || []).join(" ");
    const tagHtml = (post.tags || []).map((tag) => `<span>${tag}</span>`).join("");
    return `
      <article class="sticky-note-card reveal is-visible" data-tags="${tagText}">
        <img src="${post.cover}" alt="${post.title}" loading="lazy" />
        <div class="sticky-note-body">
          <time>${post.date || ""}</time>
          <h2>${post.title}</h2>
          <p>${post.excerpt || ""}</p>
          <div class="skill-tags">${tagHtml}</div>
          <div class="card-actions"><a href="${post.href}"><i class="fa-regular fa-file-lines"></i> Open</a></div>
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
