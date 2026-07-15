/**
 * Main interaction layer for the static portfolio.
 * The code avoids framework dependencies so the site can run directly on GitHub Pages.
 */
(() => {
  "use strict";

  const root = document.documentElement;
  const body = document.body;
  const header = document.querySelector(".site-header");
  const nav = document.querySelector(".site-nav");
  const navAvatarToggle = header?.querySelector(".brand");
  const menuToggle = document.querySelector("[data-menu-toggle]");
  const themeToggle = document.querySelector("[data-theme-toggle]");
  const backToTop = document.querySelector("[data-back-to-top]");
  const progress = document.querySelector(".scroll-progress");
  const cursorGlow = document.querySelector(".cursor-glow");
  const loader = document.querySelector(".page-loader");
  const yearNodes = document.querySelectorAll("[data-current-year]");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const storage = {
    get(key) {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch {
        /* localStorage can be blocked in private contexts. */
      }
    }
  };

  function initLoader() {
    if (!loader || window.getComputedStyle(loader).display === "none") return;
    body.classList.add("is-loading");
    window.addEventListener("load", () => {
      window.setTimeout(() => {
        loader?.classList.add("is-hidden");
        body.classList.remove("is-loading");
      }, 420);
    });
  }

  function initYear() {
    const year = new Date().getFullYear();
    yearNodes.forEach((node) => {
      node.textContent = String(year);
    });
  }

  function hydrateProfileData() {
    const profile = window.SITE_PROFILE;
    if (!profile) return;

    document.querySelectorAll("[data-profile]").forEach((node) => {
      const key = node.dataset.profile;
      if (Object.prototype.hasOwnProperty.call(profile, key)) {
        node.textContent = profile[key];
      }
    });

    document.querySelectorAll("[data-profile-list]").forEach((node) => {
      const key = node.dataset.profileList;
      const items = profile[key];
      if (!Array.isArray(items)) return;
      node.innerHTML = items.map((item) => `<p>${item}</p>`).join("");
    });

    document.querySelectorAll("[data-href]").forEach((node) => {
      const key = node.dataset.href;
      if (key === "email") node.setAttribute("href", `mailto:${profile.email}`);
      if (key === "phone") node.setAttribute("href", `tel:${profile.phone}`);
      if (key === "github") node.setAttribute("href", profile.github);
    });

    document.querySelectorAll("[data-action]").forEach((node) => {
      const key = node.dataset.action;
      if (key === "email") node.setAttribute("action", `mailto:${profile.email}`);
    });
  }

  function initTheme() {
    const saved = storage.get("portfolio-theme");
    const systemLight = window.matchMedia("(prefers-color-scheme: light)").matches;
    const initialTheme = saved || (systemLight ? "light" : "dark");
    root.setAttribute("data-theme", initialTheme);
    syncThemeIcon(initialTheme);

    themeToggle?.addEventListener("click", () => {
      const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      root.setAttribute("data-theme", next);
      storage.set("portfolio-theme", next);
      syncThemeIcon(next);
    });
  }

  function syncThemeIcon(theme) {
    const icon = themeToggle?.querySelector("i");
    if (!icon) return;
    icon.className = theme === "light" ? "fa-solid fa-sun" : "fa-solid fa-moon";
  }

  function initMenu() {
    if (!header || !nav) return;

    const mobileMenu = window.matchMedia("(max-width: 860px)");
    if (!nav.id) nav.id = "primary-navigation";

    const setMenu = (open) => {
      header.classList.toggle("is-expanded", open);
      nav.classList.toggle("is-open", open);
      body.classList.remove("menu-open");
      navAvatarToggle?.setAttribute("aria-expanded", String(open));
      menuToggle?.setAttribute("aria-label", "Collapse navigation");
      const icon = menuToggle?.querySelector("i");
      if (icon) icon.className = "fa-solid fa-chevron-left";
    };

    navAvatarToggle?.setAttribute("role", "button");
    navAvatarToggle?.setAttribute("aria-controls", nav.id);
    navAvatarToggle?.setAttribute("aria-expanded", "false");
    navAvatarToggle?.setAttribute("aria-label", "Toggle navigation");

    navAvatarToggle?.addEventListener("click", (event) => {
      if (header.classList.contains("is-expanded")) return;
      event.preventDefault();
      setMenu(true);
    });

    navAvatarToggle?.addEventListener("keydown", (event) => {
      if (event.key !== " " || header.classList.contains("is-expanded")) return;
      event.preventDefault();
      setMenu(true);
    });

    menuToggle?.addEventListener("click", () => {
      setMenu(false);
    });

    mobileMenu.addEventListener?.("change", () => {
      body.classList.remove("menu-open");
    });

    setMenu(true);
  }

  function initScrollProgress() {
    let ticking = false;

    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? window.scrollY / max : 0;
      if (progress) progress.style.width = `${Math.min(100, Math.max(0, ratio * 100))}%`;
      ticking = false;
    };

    window.addEventListener("scroll", () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });

    update();
  }

  function initBackToTop() {
    backToTop?.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
    });
  }

  function initFooterPet() {
    const footer = document.querySelector(".site-footer");
    if (!footer || footer.querySelector(".footer-pet-runner")) return;

    const frames = [
      { kind: "walk", src: "./assets/pet/right_walk.jpg", alt: "Footer pet walking" },
      { kind: "pose", src: "./assets/pet/stand.jpg", alt: "Footer pet standing" },
      { kind: "pose", src: "./assets/pet/wave.jpg", alt: "Footer pet waving" },
      { kind: "pose", src: "./assets/pet/smile.jpg", alt: "Footer pet smiling" },
      { kind: "pose", src: "./assets/pet/jump.jpg", alt: "Footer pet jumping" },
      { kind: "pose", src: "./assets/pet/sit.jpg", alt: "Footer pet sitting" },
      { kind: "pose", src: "./assets/pet/proud.jpg", alt: "Footer pet posing" },
      { kind: "pose", src: "./assets/pet/lookback.jpg", alt: "Footer pet looking back" },
      { kind: "pose", src: "./assets/pet/crouch.jpg", alt: "Footer pet crouching" },
      { kind: "pose", src: "./assets/pet/guitar.jpg", alt: "Footer pet playing guitar" },
      { kind: "pose", src: "./assets/pet/sleep.jpg", alt: "Footer pet sleeping" }
    ];

    const runner = document.createElement("div");
    runner.className = "footer-pet-runner";
    runner.innerHTML = `
      <span class="footer-pet-track" aria-hidden="true">
        <img class="footer-pet-frame" src="${frames[0].src}" alt="${frames[0].alt}" loading="lazy" />
      </span>
    `;
    footer.appendChild(runner);

    const track = runner.querySelector(".footer-pet-track");
    const frame = runner.querySelector(".footer-pet-frame");
    if (!track || !frame) return;

    let index = 0;
    let movingRight = true;

    const resolveFrame = (item) => {
      if (item.kind === "walk") {
        return movingRight ? "./assets/pet/right_walk.jpg" : "./assets/pet/left_walk.jpg";
      }
      return item.src;
    };

    const applyFrame = (nextIndex) => {
      index = nextIndex % frames.length;
      const item = frames[index];
      frame.src = resolveFrame(item);
      frame.alt = item.alt;
      frame.classList.toggle("is-returning", !movingRight);
    };

    track.addEventListener("animationiteration", () => {
      movingRight = !movingRight;
      frame.classList.toggle("is-returning", !movingRight);
      if (frames[index]?.kind === "walk") {
        frame.src = resolveFrame(frames[index]);
      }
    });

    applyFrame(0);
    window.setInterval(() => {
      applyFrame((index + 1) % frames.length);
    }, 2400);
  }

  function initButtonRipples() {
    document.querySelectorAll(".button").forEach((button) => {
      button.addEventListener("pointermove", (event) => {
        const rect = button.getBoundingClientRect();
        button.style.setProperty("--x", `${event.clientX - rect.left}px`);
        button.style.setProperty("--y", `${event.clientY - rect.top}px`);
      });

      button.addEventListener("click", (event) => {
        if (prefersReducedMotion) return;
        const rect = button.getBoundingClientRect();
        const ripple = document.createElement("span");
        ripple.className = "ripple";
        ripple.style.left = `${event.clientX - rect.left}px`;
        ripple.style.top = `${event.clientY - rect.top}px`;
        button.appendChild(ripple);
        window.setTimeout(() => ripple.remove(), 660);
      });
    });
  }

  function initCursorGlow() {
    if (!cursorGlow || prefersReducedMotion || window.matchMedia("(pointer: coarse)").matches) return;

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;

    window.addEventListener("pointermove", (event) => {
      targetX = event.clientX;
      targetY = event.clientY;
      cursorGlow.style.opacity = "1";
    }, { passive: true });

    document.addEventListener("mouseleave", () => {
      cursorGlow.style.opacity = "0";
    });

    const render = () => {
      currentX += (targetX - currentX) * 0.16;
      currentY += (targetY - currentY) * 0.16;
      cursorGlow.style.transform = `translate3d(${currentX - 120}px, ${currentY - 120}px, 0)`;
      window.requestAnimationFrame(render);
    };

    render();
  }

  function initProjectFilters() {
    const buttons = document.querySelectorAll("[data-filter]");
    const cards = document.querySelectorAll("[data-category]");
    if (!buttons.length || !cards.length) return;

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const filter = button.dataset.filter;
        buttons.forEach((item) => item.classList.toggle("active", item === button));
        cards.forEach((card) => {
          const shouldShow = filter === "all" || card.dataset.category === filter;
          card.classList.toggle("is-hidden", !shouldShow);
        });
      });
    });
  }

  function initContactFormHint() {
    const form = document.querySelector(".contact-form");
    if (!form) return;

    form.addEventListener("submit", () => {
      const button = form.querySelector("button[type='submit'] span");
      if (button) button.textContent = "Opening Mail App";
    });
  }

  initLoader();
  hydrateProfileData();
  initYear();
  initTheme();
  initMenu();
  initScrollProgress();
  initBackToTop();
  initFooterPet();
  initButtonRipples();
  initCursorGlow();
  initProjectFilters();
  initContactFormHint();
})();
