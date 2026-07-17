(() => {
  "use strict";

  const mount = document.querySelector("[data-acgn-detail]");
  if (!mount) return;

  fetch("./data/acgn.json")
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((payload) => {
      const items = Array.isArray(payload.items) ? payload.items : [];
      if (!items.length) return;
      const id = new URLSearchParams(window.location.search).get("id");
      const item = items.find((entry) => entry.id === id) || items[0];
      document.title = `${item.title} | 二次元`;
      const shares = Array.isArray(item.shares) ? item.shares : [];
      const cover = shares[0]?.image || item.cover || "./assets/images/acgn-anime.svg";

      mount.innerHTML = `
        <article class="acgn-detail-card glass-card">
          <img src="${cover}" alt="${item.title}" loading="eager" />
          <div>
            <p class="eyebrow">${item.type}</p>
            <h1>${item.title}</h1>
            <a class="button button-ghost" href="./anime.html"><i class="fa-solid fa-arrow-left"></i><span>返回二次元</span></a>
          </div>
        </article>
        <section class="acgn-share-section">
          <div class="section-heading">
            <p class="eyebrow">Gallery</p>
            <h2>相关图片</h2>
          </div>
          <div class="acgn-share-grid">
            ${shares.map((share) => `
              <article class="acgn-share-card">
                <img src="${share.image}" alt="${share.title}" loading="lazy" />
                <div>
                  <h3>${share.title}</h3>
                </div>
              </article>
            `).join("")}
          </div>
        </section>
      `;
    });
})();
