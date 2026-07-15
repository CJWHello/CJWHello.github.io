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
      grid.innerHTML = items.map(renderCard).join("");
    })
    .catch(() => {
      grid.innerHTML = '<article class="sticky-note-card"><div class="sticky-note-body"><h2>Musings load failed</h2><p>请检查 musings.json 是否可读取。</p></div></article>';
    });

  function renderCard(post) {
    const dateTime = [post.date || "", post.time || ""].filter(Boolean).join(" ");
    return `
      <a class="sticky-note-card reveal is-visible" href="./musing.html?file=${encodeURIComponent(post.href || "")}">
        <img src="${post.cover}" alt="${post.title}" loading="lazy" />
        <div class="sticky-note-body">
          <time>${dateTime}</time>
          <h2>${post.title}</h2>
          <p>${post.excerpt || ""}</p>
        </div>
      </a>
    `;
  }
})();
