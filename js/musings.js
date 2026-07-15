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
      const items = Array.isArray(payload.musings) ? payload.musings : [];
      grid.innerHTML = renderTimeline(items);
    })
    .catch(() => {
      grid.innerHTML = '<div class="musing-year-group"><h2 class="musing-year-heading">Musings</h2><p class="musing-empty">无法读取 musings.json。</p></div>';
    });

  function renderTimeline(items) {
    if (!items.length) {
      return '<div class="musing-year-group"><h2 class="musing-year-heading">Musings</h2><p class="musing-empty">还没有随想记录。</p></div>';
    }

    const groups = items.reduce((bucket, item) => {
      const year = (item.date || "").slice(0, 4) || "Unknown";
      if (!bucket[year]) bucket[year] = [];
      bucket[year].push(item);
      return bucket;
    }, {});

    return Object.keys(groups)
      .sort((a, b) => Number(b) - Number(a))
      .map((year) => {
        const rows = groups[year]
          .sort((a, b) => `${b.date || ""} ${b.time || ""}`.localeCompare(`${a.date || ""} ${a.time || ""}`))
          .map(renderEntry)
          .join("");

        return `
          <section class="musing-year-group reveal is-visible">
            <h2 class="musing-year-heading">${year}</h2>
            <div class="musing-timeline-list">
              ${rows}
            </div>
          </section>
        `;
      })
      .join("");
  }

  function renderEntry(post) {
    return `
      <a class="musing-timeline-entry" href="./musing.html?file=${encodeURIComponent(post.href || "")}">
        <time class="musing-entry-date">${formatDate(post.date || "")}</time>
        <span class="musing-entry-title">${post.title || ""}</span>
      </a>
    `;
  }

  function formatDate(value) {
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return value;
    return `${match[2]}-${match[3]}`;
  }
})();
