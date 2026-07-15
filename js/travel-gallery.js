(() => {
  "use strict";

  const root = document.querySelector("[data-travel-gallery]");
  if (!root) return;

  fetch("./data/travel.json")
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((payload) => {
      renderHero(payload);
      renderDestinations(Array.isArray(payload.destinations) ? payload.destinations : []);
      bindSliders();
      document.querySelectorAll("main .reveal").forEach((node) => node.classList.add("is-visible"));
    })
    .catch(() => {
      root.innerHTML = `
        <article class="travel-gallery-card reveal is-visible">
          <div class="travel-gallery-head">
            <p class="eyebrow">Travel</p>
            <h2>\u65c5\u884c\u6570\u636e\u8bfb\u53d6\u5931\u8d25</h2>
          </div>
        </article>
      `;
    });

  function renderHero(payload) {
    const hero = document.querySelector(".travel-hero-shell");
    if (!hero) return;

    hero.innerHTML = `
      <p class="eyebrow">Travel</p>
      <h1>${escapeHtml(payload.title || "\u4e2a\u4eba\u65c5\u6e38\u96c6\u9526")}</h1>
      <p>${escapeHtml(payload.lead || "")}</p>
    `;
  }

  function renderDestinations(destinations) {
    if (!destinations.length) {
      root.innerHTML = `
        <article class="travel-gallery-card reveal is-visible">
          <div class="travel-gallery-head">
            <p class="eyebrow">Travel</p>
            <h2>\u8fd8\u6ca1\u6709\u65c5\u884c\u5730\u70b9</h2>
          </div>
        </article>
      `;
      return;
    }

    root.innerHTML = destinations.map((destination, index) => renderGallery(destination, index)).join("");
  }

  function renderGallery(destination, index) {
    const fallbackTitle = "\u672a\u547d\u540d\u5730\u70b9";
    const fallbackAltBase = "\u65c5\u884c\u7167\u7247";
    const images = Array.isArray(destination.images) && destination.images.length
      ? destination.images
      : [{ src: "./assets/images/project-nexus.svg", alt: `${destination.title || fallbackTitle}\u9ed8\u8ba4\u56fe\u7247` }];

    return `
      <article class="travel-gallery-card reveal is-visible" data-travel-card>
        <div class="travel-gallery-head">
          <p class="eyebrow">${escapeHtml(destination.subtitle || `Trip ${index + 1}`)}</p>
          <h2>${escapeHtml(destination.title || fallbackTitle)}</h2>
        </div>
        <div class="travel-slider-shell">
          <button class="travel-slider-button is-prev" type="button" data-travel-prev aria-label="\u4e0a\u4e00\u5f20">
            <i class="fa-solid fa-chevron-left"></i>
          </button>
          <div class="travel-slider-viewport" data-travel-viewport>
            <div class="travel-slider-track" data-travel-track>
              ${images.map((image) => `
                <figure class="travel-slide">
                  <img src="${escapeHtml(image.src || "./assets/images/project-nexus.svg")}" alt="${escapeHtml(image.alt || destination.title || fallbackAltBase)}" loading="lazy" />
                </figure>
              `).join("")}
            </div>
          </div>
          <button class="travel-slider-button is-next" type="button" data-travel-next aria-label="\u4e0b\u4e00\u5f20">
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
        <div class="travel-slider-dots" data-travel-dots>
          ${images.map((_, imageIndex) => `
            <button
              class="travel-dot${imageIndex === 0 ? " is-active" : ""}"
              type="button"
              data-travel-dot="${imageIndex}"
              aria-label="\u5207\u6362\u5230\u7b2c ${imageIndex + 1} \u5f20"
            ></button>
          `).join("")}
        </div>
      </article>
    `;
  }

  function bindSliders() {
    document.querySelectorAll("[data-travel-card]").forEach((card) => {
      const viewport = card.querySelector("[data-travel-viewport]");
      const track = card.querySelector("[data-travel-track]");
      const dots = [...card.querySelectorAll("[data-travel-dot]")];
      const prev = card.querySelector("[data-travel-prev]");
      const next = card.querySelector("[data-travel-next]");
      if (!viewport || !track || !dots.length) return;

      let activeIndex = 0;

      const sync = () => {
        const slideWidth = viewport.clientWidth;
        track.style.transform = `translateX(-${activeIndex * slideWidth}px)`;
        dots.forEach((dot, index) => dot.classList.toggle("is-active", index === activeIndex));
      };

      prev?.addEventListener("click", () => {
        activeIndex = (activeIndex - 1 + dots.length) % dots.length;
        sync();
      });

      next?.addEventListener("click", () => {
        activeIndex = (activeIndex + 1) % dots.length;
        sync();
      });

      dots.forEach((dot, index) => {
        dot.addEventListener("click", () => {
          activeIndex = index;
          sync();
        });
      });

      window.addEventListener("resize", sync, { passive: true });
      sync();
    });
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
