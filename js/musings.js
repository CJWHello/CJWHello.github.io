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
      grid.innerHTML = '<article class="sticky-note-card"><div class="sticky-note-body"><h2>Musings load failed</h2><p>请检查 musings.json 是否可读取。</p></div></article>';
    });

  function renderCard(post) {
    const tagText = (post.tags || []).join(" ");
    return `
      <a class="sticky-note-card reveal is-visible" data-tags="${tagText}" href="./musing.html?file=${encodeURIComponent(post.href || "")}">
        <img src="${post.cover}" alt="${post.title}" loading="lazy" />
        <div class="sticky-note-body">
          <h2>${post.title}</h2>
          <p>${post.excerpt || ""}</p>
        </div>
      </a>
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
