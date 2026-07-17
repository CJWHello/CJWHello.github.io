(() => {
  "use strict";

  const home = document.querySelector("[data-acgn-home]");
  const rowsRoot = document.querySelector("[data-acgn-rows]");
  const heroRoot = document.querySelector(".acgn-home-hero");
  if (!home || !rowsRoot || !heroRoot) return;

  fetch("./data/acgn.json")
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((payload) => {
      renderHero(payload.hero || {}, payload.items || []);
      renderRows(Array.isArray(payload.items) ? payload.items : []);
    })
    .catch(() => {
      heroRoot.innerHTML = [
        '<p class="eyebrow">ACGN</p>',
        "<h1>二次元页面加载失败</h1>",
        "<p>请检查 data/acgn.json 是否可访问。</p>"
      ].join("");
      rowsRoot.innerHTML = "";
    });

  function renderHero(hero, items) {
    const cover = hero.background || items[0]?.cover || "./assets/images/acgn-anime.svg";
    heroRoot.style.setProperty("--acgn-hero-image", `url("${cover}")`);
    heroRoot.innerHTML = [
      '<p class="eyebrow">ACGN</p>',
      `<h1>${escapeHtml(hero.title || "二次元收藏柜")}</h1>`,
      `<p>${escapeHtml(hero.subtitle || "把喜欢的动漫、漫画和小说铺成三条长廊。")}</p>`
    ].join("");
  }

  function renderRows(items) {
    if (!items.length) {
      rowsRoot.innerHTML = "";
      return;
    }

    rowsRoot.innerHTML = items.map((item) => {
      const tiles = buildTiles(item);
      return [
        `<section class="acgn-row reveal is-visible" aria-label="${escapeHtml(item.typeLabel || item.type || "")}">`,
        '  <div class="acgn-row-heading">',
        `    <p>${escapeHtml(item.type || "ACGN")}</p>`,
        `    <h2>${escapeHtml(item.typeLabel || item.title || "")}</h2>`,
        "  </div>",
        '  <div class="acgn-row-strip">',
        tiles.map((tile) => [
          `    <a class="acgn-strip-card" href="./anime-detail.html?id=${encodeURIComponent(item.id || "")}" aria-label="${escapeHtml(tile.title)}">`,
          `      <img src="${escapeHtml(tile.image)}" alt="${escapeHtml(tile.title)}" loading="lazy" />`,
          '      <div class="acgn-strip-overlay">',
          `        <span class="acgn-strip-badge">${escapeHtml(item.typeLabel || item.type || "")}</span>`,
          `        <strong>${escapeHtml(tile.title)}</strong>`,
          "      </div>",
          "    </a>"
        ].join("")).join(""),
        "  </div>",
        "</section>"
      ].join("");
    }).join("");
  }

  function buildTiles(item) {
    const tiles = [
      { title: item.title || item.typeLabel || "未命名", image: item.cover || "./assets/images/acgn-anime.svg" },
      ...((item.shares || []).map((share) => ({
        title: share.title || item.title || "未命名",
        image: share.image || item.cover || "./assets/images/acgn-anime.svg"
      })))
    ];

    return tiles.slice(0, 3);
  }

  function escapeHtml(value = "") {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();
