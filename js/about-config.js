/**
 * Loads editable About page content from data/about.json.
 */
(() => {
  "use strict";

  if (!document.querySelector("[data-about-puzzle]")) return;

  fetch("./data/about.json")
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(renderAbout)
    .catch(() => {
      /* Keep the static fallback. */
    });

  function escapeHtml(value = "") {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderAbout(config) {
    renderCopy(config.pet || config.hero);
    renderPuzzle(config.puzzle);
    renderTimeline(config.timeline);
    initAboutPet(config.pet);
    document.querySelectorAll("main .reveal").forEach((node) => node.classList.add("is-visible"));
  }

  function renderCopy(pet) {
    const container = document.querySelector("[data-about-copy]");
    if (!container || !pet) return;
    const meta = Array.isArray(pet.meta) ? pet.meta : [];
    const image = escapeHtml(pet.image || "./assets/my.jpg");
    const initialText = escapeHtml((pet.actions && pet.actions[0] && pet.actions[0].text) || "今天也在认真值班。");
    container.innerHTML = `
      <div class="about-pet-shell" data-about-pet>
        <p class="eyebrow">${escapeHtml(pet.eyebrow || "Pet")}</p>
        <div class="about-pet-stage">
          <button class="about-pet is-idle" type="button" aria-label="互动桌宠" style="--pet-image:url('${image}');--pet-x:56px;--pet-y:84px;">
            <span class="pet-speech">${initialText}</span>
            <span class="pet-floor"></span>
            <span class="pet-actor">
              <span class="pet-tail"></span>
              <span class="pet-body"></span>
              <span class="pet-hood-ear ear-left"></span>
              <span class="pet-hood-ear ear-right"></span>
              <span class="pet-arm arm-left"></span>
              <span class="pet-arm arm-right"></span>
              <span class="pet-leg leg-left"></span>
              <span class="pet-leg leg-right"></span>
              <span class="pet-avatar-shell">
                <span class="pet-avatar"></span>
                <span class="pet-face-overlay">
                  <span class="pet-eye eye-left"></span>
                  <span class="pet-eye eye-right"></span>
                  <span class="pet-blush blush-left"></span>
                  <span class="pet-blush blush-right"></span>
                </span>
              </span>
              <span class="pet-badge"></span>
            </span>
          </button>
        </div>
        <h1>${escapeHtml(pet.title || "今日值班的小桌宠")}</h1>
        <p class="about-puzzle-lead">${escapeHtml(pet.lead || "")}</p>
        <div class="about-puzzle-meta">
          ${meta.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
        </div>
      </div>
    `;
  }

  function initAboutPet(config) {
    const pet = document.querySelector(".about-pet");
    const stage = document.querySelector(".about-pet-stage");
    const speech = pet?.querySelector(".pet-speech");
    if (!pet || !speech || !stage) return;

    const actions = Array.isArray(config?.actions) && config.actions.length ? config.actions : [
      { state: "is-idle", text: "今天也在认真值班。" },
      { state: "is-wave", text: "你好，欢迎来到 About。" },
      { state: "is-jump", text: "让我原地蹦一下。" },
      { state: "is-nap", text: "先小睡一会儿。" },
      { state: "is-proud", text: "状态良好，继续前进。" }
    ];
    const hoverText = config?.hoverText || "已进入互动模式，正在认真营业。";

    let index = 0;
    let roamTimer = null;

    function movePet() {
      const stageRect = stage.getBoundingClientRect();
      const petRect = pet.getBoundingClientRect();
      const maxX = Math.max(20, stageRect.width - petRect.width - 20);
      const minY = 74;
      const maxY = Math.max(minY, stageRect.height - petRect.height - 12);
      const x = Math.round(Math.random() * maxX);
      const y = Math.round(minY + Math.random() * Math.max(0, maxY - minY));
      pet.style.setProperty("--pet-x", `${x}px`);
      pet.style.setProperty("--pet-y", `${y}px`);
    }

    function applyAction(nextIndex, shouldMove) {
      index = nextIndex % actions.length;
      const stateClasses = actions.map((item) => item.state);
      pet.classList.remove(...stateClasses);
      pet.classList.add(actions[index].state);
      speech.textContent = actions[index].text;
      if (shouldMove) movePet();
    }

    function startRoam() {
      clearInterval(roamTimer);
      roamTimer = window.setInterval(() => {
        if (pet.matches(":hover")) return;
        applyAction((index + 1) % actions.length, true);
      }, 4200);
    }

    pet.addEventListener("pointerenter", () => {
      pet.classList.add("is-hovering");
      speech.textContent = hoverText;
    });

    pet.addEventListener("pointerleave", () => {
      pet.classList.remove("is-hovering");
      speech.textContent = actions[index].text;
    });

    pet.addEventListener("click", () => {
      applyAction((index + 1) % actions.length, true);
    });

    window.addEventListener("resize", movePet, { passive: true });
    applyAction(0, false);
    movePet();
    startRoam();
  }

  function renderPuzzle(puzzle) {
    const container = document.querySelector("[data-about-puzzle]");
    if (!container || !puzzle) return;

    const tiles = Array.isArray(puzzle.tiles) ? puzzle.tiles.slice(0, 9) : [];
    const grid = Number(puzzle.grid) || 3;
    const image = escapeHtml(puzzle.image || "./assets/my.jpg");
    const imageAlt = escapeHtml(puzzle.imageAlt || "");

    container.setAttribute("aria-label", imageAlt || "个人信息拼图");
    container.style.setProperty("--about-image", `url('${image}')`);

    container.innerHTML = tiles.map((tile, index) => {
      const col = index % grid;
      const row = Math.floor(index / grid);
      const pieceClass = getPieceClass(index, row, col);
      const pieceStyle = getPieceStyle(index);
      const pieceShape = getPieceShape(tile, row, col, grid);
      const pieceMask = getPieceMask(pieceShape);
      const maskStyle = `--piece-mask:${pieceMask};-webkit-mask-image:var(--piece-mask);mask-image:var(--piece-mask);-webkit-mask-size:100% 100%;mask-size:100% 100%;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;`;

      return `
        <article class="puzzle-tile ${pieceClass}" style="${pieceStyle}" tabindex="0" aria-label="${escapeHtml(tile.label || "")}">
          <div class="puzzle-tile-inner">
            <div class="puzzle-face puzzle-face-front" style="${maskStyle}" aria-hidden="true">
              <svg class="puzzle-svg" viewBox="-12 -12 124 124" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <clipPath id="clip-${index}" clipPathUnits="userSpaceOnUse">
                    <path d="${pieceShape}"></path>
                  </clipPath>
                </defs>
                <image
                  href="${image}"
                  x="${-100 * col}"
                  y="${-100 * row}"
                  width="${100 * grid}"
                  height="${100 * grid}"
                  preserveAspectRatio="xMidYMid slice"
                  clip-path="url(#clip-${index})"
                ></image>
                <path class="puzzle-outline" d="${pieceShape}"></path>
              </svg>
            </div>
            <div class="puzzle-face puzzle-face-back" style="${maskStyle}">
              <span>${escapeHtml(tile.label || "")}</span>
              <h2>${escapeHtml(tile.title || "")}</h2>
              <p>${escapeHtml(tile.description || "")}</p>
            </div>
          </div>
        </article>
      `;
    }).join("");
  }

  function getPieceClass(index, row, col) {
    const classes = [`piece-row-${row}`, `piece-col-${col}`];

    if (col < 2) classes.push((row + col) % 2 === 0 ? "piece-tab-right" : "piece-notch-right");
    if (row < 2) classes.push((row + col) % 2 === 0 ? "piece-notch-bottom" : "piece-tab-bottom");

    if (col > 0) classes.push((row + col) % 2 === 0 ? "piece-notch-left" : "piece-tab-left");
    if (row > 0) classes.push((row + col) % 2 === 0 ? "piece-tab-top" : "piece-notch-top");

    classes.push(`piece-variant-${index % 3}`);
    return classes.join(" ");
  }

  function getPieceStyle(index) {
    const presets = [
      ["-4px", "-3px", "-1.6deg"],
      ["0px", "-5px", "1.1deg"],
      ["4px", "-2px", "-0.8deg"],
      ["-5px", "2px", "1.4deg"],
      ["0px", "0px", "0deg"],
      ["5px", "1px", "-1.2deg"],
      ["-3px", "4px", "-1deg"],
      ["1px", "5px", "0.9deg"],
      ["4px", "3px", "-1.4deg"]
    ];
    const [x, y, r] = presets[index % presets.length];
    return `--piece-shift-x:${x};--piece-shift-y:${y};--piece-tilt:${r};`;
  }

  function getPieceShape(tile, row, col, grid) {
    const edges = tile && typeof tile === "object" ? tile.edges : null;
    const top = parseEdge(edges?.top, row === 0 ? 0 : getHorizontalSign(row - 1, col));
    const right = parseEdge(edges?.right, col === grid - 1 ? 0 : getVerticalSign(row, col));
    const bottom = parseEdge(edges?.bottom, row === grid - 1 ? 0 : -getHorizontalSign(row, col));
    const left = parseEdge(edges?.left, col === 0 ? 0 : -getVerticalSign(row, col - 1));
    return buildPuzzlePath(top, right, bottom, left);
  }

  function parseEdge(value, fallback) {
    if (typeof value !== "string") return fallback;
    const normalized = value.trim().toLowerCase();
    if (normalized === "flat" || normalized === "line" || normalized === "straight") return 0;
    if (normalized === "in" || normalized === "inside" || normalized === "notch" || normalized === "concave") return -1;
    if (normalized === "out" || normalized === "outside" || normalized === "tab" || normalized === "convex") return 1;
    return fallback;
  }

  function getHorizontalSign(row, col) {
    return (row + col) % 2 === 0 ? 1 : -1;
  }

  function getVerticalSign(row, col) {
    return (row + col) % 2 === 0 ? -1 : 1;
  }

  function buildPuzzlePath(top, right, bottom, left) {
    const edge = 30;
    const depth = 10;
    const neck = 8;
    const centerMin = 42;
    const centerMax = 58;
    const d = ["M 0 0"];

    if (top === 0) {
      d.push("L 100 0");
    } else {
      d.push(`L ${edge} 0`);
      d.push(`C ${edge + neck} 0 ${centerMin} ${top * -depth} 50 ${top * -depth}`);
      d.push(`C ${centerMax} ${top * -depth} ${100 - edge - neck} 0 ${100 - edge} 0`);
      d.push("L 100 0");
    }

    if (right === 0) {
      d.push("L 100 100");
    } else {
      d.push(`L 100 ${edge}`);
      d.push(`C 100 ${edge + neck} ${100 + right * depth} ${centerMin} ${100 + right * depth} 50`);
      d.push(`C ${100 + right * depth} ${centerMax} 100 ${100 - edge - neck} 100 ${100 - edge}`);
      d.push("L 100 100");
    }

    if (bottom === 0) {
      d.push("L 0 100");
    } else {
      d.push(`L ${100 - edge} 100`);
      d.push(`C ${100 - edge - neck} 100 ${centerMax} ${100 + bottom * depth} 50 ${100 + bottom * depth}`);
      d.push(`C ${centerMin} ${100 + bottom * depth} ${edge + neck} 100 ${edge} 100`);
      d.push("L 0 100");
    }

    if (left === 0) {
      d.push("Z");
    } else {
      d.push(`L 0 ${100 - edge}`);
      d.push(`C 0 ${100 - edge - neck} ${left * -depth} ${centerMax} ${left * -depth} 50`);
      d.push(`C ${left * -depth} ${centerMin} 0 ${edge + neck} 0 ${edge}`);
      d.push("Z");
    }

    return d.join(" ");
  }

  function getPieceMask(pieceShape) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-12 -12 124 124" preserveAspectRatio="none"><path fill="white" d="${pieceShape}"/></svg>`;
    return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
  }

  function renderTimeline(timeline) {
    if (!timeline) return;

    const heading = document.querySelector("[data-about-timeline-heading]");
    const container = document.querySelector("[data-about-timeline]");
    const items = Array.isArray(timeline.items) ? timeline.items : [];

    if (heading) {
      heading.innerHTML = `
        <p class="eyebrow">${escapeHtml(timeline.eyebrow || "Education")}</p>
        <h2>${escapeHtml(timeline.title || "")}</h2>
      `;
    }

    if (container && items.length) {
      container.innerHTML = items.map((item) => `
        <article class="timeline-item reveal">
          <span class="timeline-dot"></span>
          <div class="timeline-card">
            <time>${escapeHtml(item.period || "")}</time>
            <h3>${escapeHtml(item.title || "")}</h3>
            <p>${escapeHtml(item.description || "")}</p>
          </div>
        </article>
      `).join("");
    }
  }
})();
