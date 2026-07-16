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
      renderMap(payload);
      renderGallery(payload);
      document.querySelectorAll("main .reveal").forEach((node) => node.classList.add("is-visible"));
      watchThemeChanges();
    })
    .catch(() => {
      mapRoot.innerHTML = [
        '<p class="eyebrow">Travel</p>',
        "<h1>旅行地图加载失败</h1>",
        "<p>请检查 data/travel.json 与 ECharts 地图脚本是否可访问。</p>"
      ].join("");

      galleryRoot.innerHTML = [
        '<article class="travel-photo-card reveal is-visible">',
        '  <div class="travel-photo-copy">',
        "    <h2>旅行画廊加载失败</h2>",
        "  </div>",
        "</article>"
      ].join("");
    });

  function renderMap(payload) {
    const title = escapeHtml(payload.title || "中国旅行地图");
    const lead = escapeHtml(payload.lead || "");
    const label = escapeHtml(payload.map?.label || "去过的城市");

    mapRoot.innerHTML = [
      '<p class="eyebrow">Travel</p>',
      `<h1>${title}</h1>`,
      `<p>${lead}</p>`,
      '<div class="travel-map-board">',
      '  <div class="travel-map-visual">',
      '    <div class="travel-map-chart" data-travel-map-chart aria-label="中国旅行地图"></div>',
      "  </div>",
      "</div>",
      `<p class="travel-map-hint">${label}</p>`
    ].join("");

    const chartNode = mapRoot.querySelector("[data-travel-map-chart]");
    initChinaMap(chartNode, Array.isArray(payload.map?.points) ? payload.map.points : []);
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
      if (container) {
        container.innerHTML = '<div class="travel-map-fallback">中国地图资源加载失败</div>';
      }
      return;
    }

    if (travelChart) {
      travelChart.dispose();
    }

    const theme = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    const isLight = theme === "light";

    travelChart = window.echarts.init(container, null, { renderer: "canvas" });
    const data = points
      .filter((point) => Number.isFinite(Number(point.lng)) && Number.isFinite(Number(point.lat)))
      .map((point) => ({
        name: point.city || "未知城市",
        value: [Number(point.lng), Number(point.lat)]
      }));

    travelChart.setOption({
      animation: true,
      tooltip: {
        trigger: "item",
        backgroundColor: isLight ? "rgba(255,255,255,0.96)" : "rgba(8,13,34,0.92)",
        borderColor: isLight ? "rgba(82, 109, 255, 0.18)" : "rgba(132, 246, 255, 0.18)",
        borderWidth: 1,
        textStyle: {
          color: isLight ? "#071024" : "#f5f7ff",
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
        zoom: 1.08,
        layoutCenter: ["50%", "52%"],
        layoutSize: "112%",
        itemStyle: {
          areaColor: isLight ? "#eef4ff" : "#101a33",
          borderColor: isLight ? "#9eb7ff" : "#6ecfff",
          borderWidth: 1.15,
          shadowBlur: 22,
          shadowColor: isLight ? "rgba(114, 151, 255, 0.18)" : "rgba(98, 234, 255, 0.16)"
        },
        emphasis: {
          itemStyle: {
            areaColor: isLight ? "#dbe7ff" : "#182850",
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
            color: isLight ? "#5a67ff" : "#84f6ff",
            shadowBlur: 18,
            shadowColor: isLight ? "rgba(90, 103, 255, 0.5)" : "rgba(132, 246, 255, 0.8)"
          },
          emphasis: {
            scale: 1.15,
            itemStyle: {
              color: isLight ? "#7f5cff" : "#b996ff"
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
            color: isLight ? "#7f5cff" : "#9de9ff"
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
        '<article class="travel-photo-card reveal is-visible">',
        '  <div class="travel-photo-copy">',
        "    <h2>还没有旅行照片</h2>",
        "  </div>",
        "</article>"
      ].join("");
      return;
    }

    galleryRoot.innerHTML = items.map((item) => [
      '<article class="travel-photo-card reveal is-visible">',
      `  <img src="${escapeHtml(item.image || "")}" alt="${escapeHtml(item.alt || item.city || "旅行照片")}" loading="lazy" />`,
      '  <div class="travel-photo-copy">',
      `    <p class="eyebrow">${escapeHtml(item.city || "")}</p>`,
      `    <h2>${escapeHtml(item.spot || "")}</h2>`,
      "  </div>",
      "</article>"
    ].join("")).join("");
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
