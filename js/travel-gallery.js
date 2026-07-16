(() => {
  "use strict";

  const mapRoot = document.querySelector("[data-travel-map]");
  const galleryRoot = document.querySelector("[data-travel-gallery]");
  if (!mapRoot || !galleryRoot) return;

  let travelChart = null;
  let currentPayload = null;
  let resizeBound = false;
  let themeObserver = null;

  fetch("./data/travel.json")
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((payload) => {
      currentPayload = payload;
      renderGallery(payload);
      bindPostcards();
      document.querySelectorAll("main .reveal").forEach((node) => node.classList.add("is-visible"));
      watchThemeChanges();
      return renderMap(payload);
    })
    .catch(() => {
      mapRoot.innerHTML = [
        '<p class="eyebrow">Travel</p>',
        '<p class="travel-map-lead">旅行地图加载失败，请检查 data/travel.json 是否可访问。</p>'
      ].join("");

      galleryRoot.innerHTML = [
        '<article class="travel-postcard reveal is-visible">',
        '  <div class="travel-postcard-copy">',
        "    <h2>旅行明信片加载失败</h2>",
        "  </div>",
        "</article>"
      ].join("");
    });

  function renderMap(payload) {
    const lead = escapeHtml(payload.lead || "");
    const label = escapeHtml(payload.map?.label || "去过的城市");

    mapRoot.innerHTML = [
      '<p class="eyebrow">Travel</p>',
      `<p class="travel-map-lead">${lead}</p>`,
      '<div class="travel-map-board">',
      '  <div class="travel-map-visual">',
      '    <div class="travel-map-chart" data-travel-map-chart aria-label="中国旅行地图"></div>',
      "  </div>",
      "</div>",
      `<p class="travel-map-hint">${label}</p>`
    ].join("");

    const chartNode = mapRoot.querySelector("[data-travel-map-chart]");
    if (!chartNode) return Promise.resolve();

    chartNode.innerHTML = '<div class="travel-map-fallback">正在加载中国地图资源...</div>';

    return ensureChinaMapRegistered()
      .then(() => initChinaMap(chartNode, Array.isArray(payload.map?.points) ? payload.map.points : []))
      .catch(() => {
        chartNode.innerHTML = '<div class="travel-map-fallback">中国地图资源加载失败</div>';
      });
  }

  function ensureChinaMapRegistered() {
    if (!window.echarts || !window.echarts.registerMap) {
      return Promise.reject(new Error("echarts unavailable"));
    }

    if (window.echarts.getMap && window.echarts.getMap("china")) {
      return Promise.resolve();
    }

    return fetch("./assets/maps/china.json")
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((geoJson) => {
        window.echarts.registerMap("china", geoJson);
      });
  }

  function watchThemeChanges() {
    if (themeObserver) return;
    themeObserver = new MutationObserver(() => {
      if (currentPayload) {
        renderMap(currentPayload);
      }
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  }

  function initChinaMap(container, points) {
    if (!container || !window.echarts || !window.echarts.getMap || !window.echarts.getMap("china")) {
      container.innerHTML = '<div class="travel-map-fallback">中国地图资源加载失败</div>';
      return;
    }

    if (travelChart) {
      travelChart.dispose();
    }

    const isLight = document.documentElement.getAttribute("data-theme") === "light";
    const data = points
      .filter((point) => Number.isFinite(Number(point.lng)) && Number.isFinite(Number(point.lat)))
      .map((point) => ({
        name: point.city || "未知城市",
        value: [Number(point.lng), Number(point.lat)]
      }));

    travelChart = window.echarts.init(container, null, { renderer: "canvas" });
    travelChart.setOption({
      animation: true,
      tooltip: {
        trigger: "item",
        backgroundColor: isLight ? "rgba(255,250,242,0.96)" : "rgba(8,13,34,0.92)",
        borderColor: isLight ? "rgba(140, 112, 64, 0.28)" : "rgba(132, 246, 255, 0.18)",
        borderWidth: 1,
        textStyle: {
          color: isLight ? "#2a2015" : "#f5f7ff",
          fontSize: 13,
          fontWeight: 600
        },
        formatter(params) {
          return escapeHtml(params.name || "未知城市");
        }
      },
      geo: {
        map: "china",
        roam: false,
        zoom: 0.96,
        layoutCenter: ["50%", "55%"],
        layoutSize: "100%",
        top: 24,
        itemStyle: {
          areaColor: isLight ? "#edf3ff" : "#101a33",
          borderColor: isLight ? "#93aef8" : "#6ecfff",
          borderWidth: 1.1,
          shadowBlur: 18,
          shadowColor: isLight ? "rgba(114, 151, 255, 0.15)" : "rgba(98, 234, 255, 0.14)"
        },
        emphasis: {
          itemStyle: {
            areaColor: isLight ? "#dae6ff" : "#182850",
            borderColor: isLight ? "#6d92ff" : "#9a7bff"
          },
          label: {
            show: false
          }
        },
        regions: [
          {
            name: "南海诸岛",
            itemStyle: {
              opacity: 0
            },
            label: {
              show: false
            }
          }
        ]
      },
      series: [
        {
          type: "scatter",
          coordinateSystem: "geo",
          data,
          symbol: "circle",
          symbolSize: 12,
          zlevel: 3,
          itemStyle: {
            color: isLight ? "#6c63ff" : "#84f6ff",
            shadowBlur: 18,
            shadowColor: isLight ? "rgba(108, 99, 255, 0.46)" : "rgba(132, 246, 255, 0.8)"
          },
          emphasis: {
            scale: 1.15,
            itemStyle: {
              color: isLight ? "#8f5eff" : "#b996ff"
            }
          }
        },
        {
          type: "effectScatter",
          coordinateSystem: "geo",
          data,
          symbol: "circle",
          symbolSize: 10,
          zlevel: 2,
          rippleEffect: {
            scale: 3.2,
            brushType: "stroke"
          },
          itemStyle: {
            color: isLight ? "#8f5eff" : "#9de9ff"
          },
          tooltip: {
            show: false
          }
        }
      ]
    });

    const resizeChart = () => {
      if (travelChart) {
        travelChart.resize();
      }
    };

    if (!resizeBound) {
      window.addEventListener("resize", resizeChart, { passive: true });
      resizeBound = true;
    }
  }

  function renderGallery(payload) {
    const items = Array.isArray(payload.gallery) ? payload.gallery : [];
    if (!items.length) {
      galleryRoot.innerHTML = [
        '<article class="travel-postcard reveal is-visible">',
        '  <div class="travel-postcard-copy">',
        "    <h2>还没有旅行明信片</h2>",
        "  </div>",
        "</article>"
      ].join("");
      return;
    }

    galleryRoot.innerHTML = items.map((item, itemIndex) => {
      const slides = normalizeImages(item);
      const place = item.placeEn || [item.cityEn, item.spotEn].filter(Boolean).join(" ");
      const date = item.date || "";
      return [
        `<article class="travel-postcard reveal is-visible" data-postcard data-postcard-index="${itemIndex}">`,
        '  <div class="travel-postcard-visual">',
        '    <div class="travel-postcard-frame">',
        slides.map((slide, slideIndex) => (
          `      <img class="travel-postcard-image${slideIndex === 0 ? " is-active" : ""}" src="${escapeHtml(slide.src)}" alt="${escapeHtml(slide.alt)}" loading="lazy" data-postcard-image="${slideIndex}" />`
        )).join(""),
        "    </div>",
        slides.length > 1 ? [
          '    <button class="travel-postcard-button is-prev" type="button" data-postcard-prev aria-label="上一张">',
          "      <span>&lsaquo;</span>",
          "    </button>",
          '    <button class="travel-postcard-button is-next" type="button" data-postcard-next aria-label="下一张">',
          "      <span>&rsaquo;</span>",
          "    </button>"
        ].join("") : "",
        "  </div>",
        '  <div class="travel-postcard-seal">',
        `    <p class="travel-postcard-place">${escapeHtml(place || "")}</p>`,
        `    <p class="travel-postcard-date">${escapeHtml(date)}</p>`,
        "  </div>",
        slides.length > 1
          ? `    <div class="travel-postcard-dots">${slides.map((_, slideIndex) => `<button class="travel-postcard-dot${slideIndex === 0 ? " is-active" : ""}" type="button" data-postcard-dot="${slideIndex}" aria-label="切换到第 ${slideIndex + 1} 张"></button>`).join("")}</div>`
          : "",
        "</article>"
      ].join("");
    }).join("");
  }

  function normalizeImages(item) {
    if (Array.isArray(item.images) && item.images.length) {
      return item.images.map((image) => ({
        src: image.src || "",
        alt: image.alt || item.city || "旅行照片"
      }));
    }

    if (item.image) {
      return [{
        src: item.image,
        alt: item.alt || item.city || "旅行照片"
      }];
    }

    return [{
      src: "./assets/images/project-nexus.svg",
      alt: item.city || "旅行照片"
    }];
  }

  function bindPostcards() {
    galleryRoot.querySelectorAll("[data-postcard]").forEach((card) => {
      const images = [...card.querySelectorAll("[data-postcard-image]")];
      const dots = [...card.querySelectorAll("[data-postcard-dot]")];
      const prev = card.querySelector("[data-postcard-prev]");
      const next = card.querySelector("[data-postcard-next]");
      if (images.length < 2) return;

      let current = 0;

      const sync = () => {
        images.forEach((image, index) => {
          image.classList.toggle("is-active", index === current);
        });
        dots.forEach((dot, index) => {
          dot.classList.toggle("is-active", index === current);
        });
      };

      const go = (nextIndex) => {
        current = (nextIndex + images.length) % images.length;
        sync();
      };

      prev?.addEventListener("click", () => go(current - 1));
      next?.addEventListener("click", () => go(current + 1));
      dots.forEach((dot, index) => {
        dot.addEventListener("click", () => go(index));
      });

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
