(() => {
  "use strict";

  const grid = document.querySelector("[data-musings-grid]");
  if (!grid) return;

  fetch("./data/musings.json")
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((payload) => {
      const years = Array.isArray(payload.years) ? payload.years : [];
      grid.innerHTML = renderTimeline(years);
    })
    .catch(() => {
      grid.innerHTML = '<div class="musing-year-group"><h2 class="musing-year-heading">Musings</h2><p class="musing-empty">无法读取 musings.json。</p></div>';
    });

  function renderTimeline(years) {
    if (!years.length) {
      return '<div class="musing-year-group"><h2 class="musing-year-heading">Musings</h2><p class="musing-empty">还没有随想记录。</p></div>';
    }

    return years
      .map((group) => {
        const entries = Array.isArray(group.entries) ? group.entries : [];
        return `
          <section class="musing-year-group reveal is-visible">
            <h2 class="musing-year-heading">${group.year || ""}</h2>
            <div class="musing-timeline-list">
              ${entries.map(renderEntry).join("")}
            </div>
          </section>
        `;
      })
      .join("");
  }

  function renderEntry(post) {
    const dateLine = [post.date || "", post.time || ""].filter(Boolean).join("  ");
    return `
      <a class="musing-timeline-entry" href="./musing.html?file=${encodeURIComponent(post.href || "")}">
        <time class="musing-entry-date">${dateLine}</time>
        <span class="musing-entry-title">${post.title || ""}</span>
      </a>
    `;
  }
})();
