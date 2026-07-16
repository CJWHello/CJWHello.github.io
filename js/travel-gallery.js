(() => {
  "use strict";

  const mapRoot = document.querySelector("[data-travel-map]");
  const galleryRoot = document.querySelector("[data-travel-gallery]");
  if (!mapRoot || !galleryRoot) return;

  fetch("./data/travel.json")
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((payload) => {
      renderMap(payload);
      renderGallery(payload);
      document.querySelectorAll("main .reveal").forEach((node) => node.classList.add("is-visible"));
    })
    .catch(() => {
      mapRoot.innerHTML = `
        <p class="eyebrow">Travel</p>
        <h1>旅行地图加载失败</h1>
        <p>请检查 data/travel.json 是否可访问。</p>
      `;
      galleryRoot.innerHTML = `
        <article class="travel-photo-card reveal is-visible">
          <div class="travel-photo-copy">
            <h2>旅行画廊加载失败</h2>
          </div>
        </article>
      `;
    });

  function renderMap(payload) {
    const title = escapeHtml(payload.title || "中国旅行地图");
    const lead = escapeHtml(payload.lead || "");
    const label = escapeHtml(payload.map?.label || "去过的城市");
    const points = Array.isArray(payload.map?.points) ? payload.map.points : [];

    mapRoot.innerHTML = `
      <p class="eyebrow">Travel</p>
      <h1>${title}</h1>
      <p>${lead}</p>
      <div class="travel-map-board">
        <div class="travel-map-visual">
          ${chinaMapSvg()}
          ${points.map(renderPoint).join("")}
        </div>
      </div>
      <p class="travel-map-hint">${label}</p>
    `;
  }

  function renderPoint(point) {
    const city = escapeHtml(point.city || "未知城市");
    const x = Number(point.x) || 0;
    const y = Number(point.y) || 0;
    return `
      <button class="travel-map-point" type="button" style="left:${x}%; top:${y}%;" aria-label="${city}">
        <span class="travel-map-point-dot" aria-hidden="true"></span>
        <span class="travel-map-point-label">${city}</span>
      </button>
    `;
  }

  function renderGallery(payload) {
    const items = Array.isArray(payload.gallery) ? payload.gallery : [];
    if (!items.length) {
      galleryRoot.innerHTML = `
        <article class="travel-photo-card reveal is-visible">
          <div class="travel-photo-copy">
            <h2>还没有旅行照片</h2>
          </div>
        </article>
      `;
      return;
    }

    galleryRoot.innerHTML = items.map((item) => `
      <article class="travel-photo-card reveal is-visible">
        <img src="${escapeHtml(item.image || "")}" alt="${escapeHtml(item.alt || item.city || "旅行照片")}" loading="lazy" />
        <div class="travel-photo-copy">
          <p class="eyebrow">${escapeHtml(item.city || "")}</p>
          <h2>${escapeHtml(item.spot || "")}</h2>
        </div>
      </article>
    `).join("");
  }

  function chinaMapSvg() {
    return `
      <svg class="travel-map-svg" viewBox="0 0 800 500" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="travelMapFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="rgba(96, 234, 255, 0.16)" />
            <stop offset="100%" stop-color="rgba(158, 121, 255, 0.10)" />
          </linearGradient>
        </defs>
        <path class="travel-map-shape" d="M117 197 L155 156 L206 145 L242 114 L315 104 L370 128 L423 120 L470 137 L527 131 L594 163 L654 156 L704 192 L689 234 L725 278 L697 327 L713 372 L672 409 L609 421 L556 404 L497 430 L447 412 L395 433 L344 417 L311 379 L249 384 L207 356 L173 320 L134 317 L102 276 L88 236 Z" />
        <path class="travel-map-outline" d="M117 197 L155 156 L206 145 L242 114 L315 104 L370 128 L423 120 L470 137 L527 131 L594 163 L654 156 L704 192 L689 234 L725 278 L697 327 L713 372 L672 409 L609 421 L556 404 L497 430 L447 412 L395 433 L344 417 L311 379 L249 384 L207 356 L173 320 L134 317 L102 276 L88 236 Z" />
        <path class="travel-map-island" d="M584 321 L605 311 L628 316 L637 336 L620 350 L592 346 Z" />
        <path class="travel-map-island" d="M548 361 L566 354 L582 362 L577 377 L557 381 L541 373 Z" />
      </svg>
    `;
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
