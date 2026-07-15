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
      bindGalleries();
      document.querySelectorAll("main .reveal").forEach((node) => node.classList.add("is-visible"));
    })
    .catch(() => {
      root.innerHTML = [
        '<article class="travel-gallery-card reveal is-visible">',
        '  <div class="travel-gallery-head">',
        '    <p class="eyebrow">Travel</p>',
        "    <h2>\u65c5\u884c\u6570\u636e\u8bfb\u53d6\u5931\u8d25</h2>",
        "  </div>",
        "</article>"
      ].join("");
    });

  function renderHero(payload) {
    const hero = document.querySelector(".travel-hero-shell");
    if (!hero) return;

    hero.innerHTML = [
      '<p class="eyebrow">Travel</p>',
      `<h1>${escapeHtml(payload.title || "\u4e2a\u4eba\u65c5\u6e38\u96c6\u9526")}</h1>`,
      `<p>${escapeHtml(payload.lead || "")}</p>`
    ].join("");
  }

  function renderDestinations(destinations) {
    if (!destinations.length) {
      root.innerHTML = [
        '<article class="travel-gallery-card reveal is-visible">',
        '  <div class="travel-gallery-head">',
        '    <p class="eyebrow">Travel</p>',
        "    <h2>\u8fd8\u6ca1\u6709\u65c5\u884c\u5730\u70b9</h2>",
        "  </div>",
        "</article>"
      ].join("");
      return;
    }

    root.innerHTML = destinations.map((destination, index) => renderGallery(destination, index)).join("");
  }

  function renderGallery(destination, index) {
    const title = destination.title || "\u672a\u547d\u540d\u5730\u70b9";
    const subtitle = destination.subtitle || `Trip ${index + 1}`;
    const images = Array.isArray(destination.images) && destination.images.length
      ? destination.images
      : [{ src: "./assets/images/project-nexus.svg", alt: `${title}\u9ed8\u8ba4\u56fe\u7247` }];

    return [
      '<article class="travel-gallery-card reveal is-visible" data-travel-card>',
      '  <div class="travel-gallery-head">',
      "    <div>",
      `      <p class="eyebrow">${escapeHtml(subtitle)}</p>`,
      `      <h2>${escapeHtml(title)}</h2>`,
      "    </div>",
      '    <div class="travel-gallery-status">',
      `      <span data-travel-count>01 / ${String(images.length).padStart(2, "0")}</span>`,
      "    </div>",
      "  </div>",
      '  <div class="travel-coverflow-shell">',
      '    <button class="travel-slider-button is-prev" type="button" data-travel-prev aria-label="\u4e0a\u4e00\u5f20">',
      '      <i class="fa-solid fa-chevron-left"></i>',
      "    </button>",
      '    <div class="travel-coverflow-stage" data-travel-stage>',
      images.map((image, imageIndex) => [
        '      <figure class="travel-slide-card" data-travel-slide',
        `        data-slide-index="${imageIndex}"`,
        `        aria-hidden="${imageIndex === 0 ? "false" : "true"}">`,
        `        <img src="${escapeHtml(image.src || "./assets/images/project-nexus.svg")}" alt="${escapeHtml(image.alt || title)}" loading="lazy" />`,
        '        <span class="travel-slide-glow" aria-hidden="true"></span>',
        "      </figure>"
      ].join("")).join(""),
      "    </div>",
      '    <button class="travel-slider-button is-next" type="button" data-travel-next aria-label="\u4e0b\u4e00\u5f20">',
      '      <i class="fa-solid fa-chevron-right"></i>',
      "    </button>",
      "  </div>",
      '  <div class="travel-slider-dots" data-travel-dots>',
      images.map((_, imageIndex) => (
        `<button class="travel-dot${imageIndex === 0 ? " is-active" : ""}" type="button" data-travel-dot="${imageIndex}" aria-label="\u5207\u6362\u5230\u7b2c ${imageIndex + 1} \u5f20"></button>`
      )).join(""),
      "  </div>",
      "</article>"
    ].join("");
  }

  function bindGalleries() {
    document.querySelectorAll("[data-travel-card]").forEach((card) => {
      const slides = [...card.querySelectorAll("[data-travel-slide]")];
      const dots = [...card.querySelectorAll("[data-travel-dot]")];
      const count = card.querySelector("[data-travel-count]");
      const prev = card.querySelector("[data-travel-prev]");
      const next = card.querySelector("[data-travel-next]");
      if (!slides.length) return;

      let activeIndex = 0;
      let autoTimer = null;

      const sync = () => {
        slides.forEach((slide, index) => {
          const offset = getWrappedOffset(index, activeIndex, slides.length);
          slide.classList.remove("is-active", "is-prev", "is-next", "is-hidden-left", "is-hidden-right");
          slide.setAttribute("aria-hidden", offset === 0 ? "false" : "true");

          if (offset === 0) slide.classList.add("is-active");
          else if (offset === -1) slide.classList.add("is-prev");
          else if (offset === 1) slide.classList.add("is-next");
          else if (offset < 0) slide.classList.add("is-hidden-left");
          else slide.classList.add("is-hidden-right");
        });

        dots.forEach((dot, index) => dot.classList.toggle("is-active", index === activeIndex));
        if (count) {
          count.textContent = `${String(activeIndex + 1).padStart(2, "0")} / ${String(slides.length).padStart(2, "0")}`;
        }
      };

      const goTo = (index) => {
        activeIndex = (index + slides.length) % slides.length;
        sync();
        restartAuto();
      };

      const restartAuto = () => {
        window.clearInterval(autoTimer);
        if (slides.length < 2) return;
        autoTimer = window.setInterval(() => {
          activeIndex = (activeIndex + 1) % slides.length;
          sync();
        }, 4200);
      };

      prev?.addEventListener("click", () => goTo(activeIndex - 1));
      next?.addEventListener("click", () => goTo(activeIndex + 1));
      dots.forEach((dot, index) => dot.addEventListener("click", () => goTo(index)));
      card.addEventListener("mouseenter", () => window.clearInterval(autoTimer));
      card.addEventListener("mouseleave", restartAuto);

      sync();
      restartAuto();
    });
  }

  function getWrappedOffset(index, activeIndex, total) {
    let offset = index - activeIndex;
    if (offset > total / 2) offset -= total;
    if (offset < -total / 2) offset += total;
    return offset;
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
