(() => {
  "use strict";

  const grid = document.querySelector("[data-acgn-grid]");
  if (!grid || !window.ACGN_ITEMS) return;

  grid.innerHTML = window.ACGN_ITEMS.map((item) => `
    <a class="acgn-card reveal is-visible" href="./anime-detail.html?id=${item.id}">
      <img src="${item.cover}" alt="${item.title}" loading="lazy" />
      <div class="acgn-card-body">
        <span>${item.type}</span>
        <h2>${item.title}</h2>
        <p>${item.summary}</p>
        <div class="skill-tags">${item.tags.map((tag) => `<em>${tag}</em>`).join("")}</div>
      </div>
    </a>
  `).join("");
})();
