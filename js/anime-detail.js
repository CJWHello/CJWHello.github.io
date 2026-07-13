(() => {
  "use strict";

  const mount = document.querySelector("[data-acgn-detail]");
  if (!mount || !window.ACGN_ITEMS) return;

  const id = new URLSearchParams(window.location.search).get("id");
  const item = window.ACGN_ITEMS.find((entry) => entry.id === id) || window.ACGN_ITEMS[0];
  document.title = `${item.title} | 二次元`;

  mount.innerHTML = `
    <article class="acgn-detail-card glass-card">
      <img src="${item.cover}" alt="${item.title}" loading="eager" />
      <div>
        <p class="eyebrow">${item.type}</p>
        <h1>${item.title}</h1>
        <p>${item.summary}</p>
        <div class="skill-tags">${item.tags.map((tag) => `<span>${tag}</span>`).join("")}</div>
        <hr />
        <p>${item.content}</p>
        <a class="button button-ghost" href="./anime.html"><i class="fa-solid fa-arrow-left"></i><span>返回二次元</span></a>
      </div>
    </article>
    <section class="acgn-share-section">
      <div class="section-heading">
        <p class="eyebrow">Share Cards</p>
        <h2>分享卡片占位</h2>
        <p>这里可以放具体的追番记录、小说摘句、漫画分镜观察或任意短评。</p>
      </div>
      <div class="acgn-share-grid">
        ${(item.shares || []).map((share) => `
          <article class="acgn-share-card">
            <img src="${share.image}" alt="${share.title}" loading="lazy" />
            <div>
              <h3>${share.title}</h3>
              <p>${share.text}</p>
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
})();
