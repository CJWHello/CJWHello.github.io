(() => {
  "use strict";

  const page = document.querySelector("[data-contact-page]");
  if (!page) return;

  fetch("./data/contact.json")
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(renderContactPage)
    .catch(() => {
      /* Keep static fallback. */
    });

  function escapeHtml(value = "") {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderContactPage(config) {
    renderHero(config.hero);
    renderAccounts(config.accounts || []);
    document.querySelectorAll("main .reveal").forEach((node) => node.classList.add("is-visible"));
  }

  function renderHero(hero) {
    if (!hero) return;
    const section = document.querySelector("[data-contact-hero]");
    if (!section) return;
    const eyebrow = section.querySelector(".eyebrow");
    const title = section.querySelector("h1");
    const description = section.querySelector("p:not(.eyebrow)");
    if (eyebrow) eyebrow.textContent = hero.eyebrow || "";
    if (title) title.textContent = hero.title || "";
    if (description) description.textContent = hero.description || "";
  }

  function renderAccounts(accounts) {
    const grid = document.querySelector("[data-contact-grid]");
    if (!grid) return;
    grid.innerHTML = accounts.map((account) => `
      <a
        class="contact-account-card reveal accent-${escapeHtml(account.accent || "blue")}"
        href="${escapeHtml(account.href || "#")}"
        ${/^https?:/i.test(account.href || "") ? 'target="_blank" rel="noopener"' : ""}
      >
        <img src="${escapeHtml(account.image || "./assets/my.jpg")}" alt="${escapeHtml(account.imageAlt || account.nickname || "")}" loading="lazy" />
        <div class="contact-account-body">
          <span>${escapeHtml(account.platform || "")}</span>
          <h2>${escapeHtml(account.nickname || "")}</h2>
        </div>
      </a>
    `).join("");
  }
})();
