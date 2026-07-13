/**
 * Scroll and element animations.
 * Uses IntersectionObserver for low-cost reveal and requestAnimationFrame for
 * transform-heavy interactions.
 */
(() => {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function initRevealObserver() {
    const revealNodes = document.querySelectorAll(".reveal");
    if (!revealNodes.length) return;

    if (!("IntersectionObserver" in window) || prefersReducedMotion) {
      revealNodes.forEach((node) => node.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, {
      root: null,
      threshold: 0.16,
      rootMargin: "0px 0px -8% 0px"
    });

    revealNodes.forEach((node) => observer.observe(node));
  }

  function initCountUp() {
    const counters = document.querySelectorAll("[data-count-to]");
    if (!counters.length) return;

    const animateCounter = (node) => {
      const target = Number(node.dataset.countTo || "0");
      const duration = 1250;
      const start = performance.now();

      const tick = (now) => {
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        node.textContent = String(Math.round(target * eased));
        if (progress < 1) window.requestAnimationFrame(tick);
      };

      window.requestAnimationFrame(tick);
    };

    if (!("IntersectionObserver" in window) || prefersReducedMotion) {
      counters.forEach((node) => {
        node.textContent = node.dataset.countTo || "0";
      });
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });

    counters.forEach((node) => observer.observe(node));
  }

  function initTiltCards() {
    const cards = document.querySelectorAll("[data-tilt-card]");
    if (!cards.length || prefersReducedMotion || window.matchMedia("(pointer: coarse)").matches) return;

    cards.forEach((card) => {
      let frame = 0;

      const reset = () => {
        card.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0)";
      };

      card.addEventListener("pointermove", (event) => {
        if (frame) return;
        frame = window.requestAnimationFrame(() => {
          const rect = card.getBoundingClientRect();
          const x = (event.clientX - rect.left) / rect.width - 0.5;
          const y = (event.clientY - rect.top) / rect.height - 0.5;
          const rotateX = y * -8;
          const rotateY = x * 8;
          card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
          frame = 0;
        });
      }, { passive: true });

      card.addEventListener("pointerleave", reset);
      card.addEventListener("blur", reset);
    });
  }

  function initParallax() {
    const visual = document.querySelector(".hero-visual");
    const panels = document.querySelectorAll(".floating-panel");
    if ((!visual && !panels.length) || prefersReducedMotion) return;

    let ticking = false;

    const update = () => {
      const scroll = window.scrollY;
      if (visual) {
        visual.style.setProperty("--parallax-y", `${scroll * 0.03}px`);
        visual.style.translate = `0 ${scroll * -0.018}px`;
      }
      panels.forEach((panel, index) => {
        panel.style.translate = `0 ${scroll * (index % 2 ? -0.025 : 0.02)}px`;
      });
      ticking = false;
    };

    window.addEventListener("scroll", () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
  }

  function initTypingText() {
    const node = document.querySelector("[data-typing]");
    if (!node || prefersReducedMotion) return;

    let phrases = [];
    try {
      phrases = JSON.parse(node.dataset.typing || "[]");
    } catch {
      phrases = [];
    }
    if (!phrases.length) return;

    let phraseIndex = 0;
    let charIndex = phrases[0].length;
    let deleting = true;

    const tick = () => {
      const phrase = phrases[phraseIndex];
      node.textContent = phrase.slice(0, charIndex);

      if (deleting) {
        charIndex -= 1;
        if (charIndex <= 0) {
          deleting = false;
          phraseIndex = (phraseIndex + 1) % phrases.length;
        }
      } else {
        charIndex += 1;
        if (charIndex >= phrases[phraseIndex].length) {
          deleting = true;
          window.setTimeout(tick, 1200);
          return;
        }
      }

      window.setTimeout(tick, deleting ? 34 : 62);
    };

    window.setTimeout(tick, 1500);
  }

  initRevealObserver();
  initCountUp();
  initTiltCards();
  initParallax();
  initTypingText();
})();
