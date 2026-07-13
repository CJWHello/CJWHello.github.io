/**
 * Loads editable Home page content from data/home.json.
 * The existing HTML remains as a fallback when fetch is unavailable locally.
 */
(() => {
  "use strict";

  if (!document.querySelector(".hero")) return;

  fetch("./data/home.json")
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(renderHome)
    .catch(() => {
      /* Keep the static HTML fallback. */
    });

  function escapeHtml(value = "") {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function icon(className) {
    return className ? `<i class="${escapeHtml(className)}"></i>` : "";
  }

  function tags(items = [], className = "skill-tags") {
    return `<div class="${className}">${items.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>`;
  }

  function renderHeading(section, config) {
    if (!section || !config) return;
    const eyebrow = section.querySelector(".section-heading .eyebrow");
    const title = section.querySelector(".section-heading h2");
    const description = section.querySelector(".section-heading p:not(.eyebrow)");
    if (eyebrow) eyebrow.textContent = config.eyebrow || "";
    if (title) title.textContent = config.title || "";
    if (description && Object.prototype.hasOwnProperty.call(config, "description")) {
      description.textContent = config.description || "";
    }
  }

  function renderHome(config) {
    renderHero(config.hero);
    renderProfile(config.profile);
    renderCapabilities(config.capabilities);
    renderNotesPreview(config.notesPreview);
    renderTimeline(config.timeline);
    renderMusings(config.musings);
    renderContact(config.contact);
    document.querySelectorAll("main .reveal").forEach((node) => node.classList.add("is-visible"));
  }

  function renderHero(hero) {
    if (!hero) return;
    const section = document.querySelector(".hero");
    const eyebrow = section?.querySelector(".hero-copy .eyebrow");
    const title = section?.querySelector(".hero-copy h1");
    const lead = section?.querySelector(".hero-lead");
    const actions = section?.querySelector(".hero-actions");
    const metrics = section?.querySelector(".hero-metrics");
    const visual = section?.querySelector(".hero-visual");

    if (eyebrow) eyebrow.textContent = hero.eyebrow || "";
    if (title) {
      const firstPhrase = hero.typing?.[0] || "";
      title.innerHTML = `${escapeHtml(hero.titlePrefix || "")} <span class="gradient-text typing-text" data-typing="${escapeHtml(JSON.stringify(hero.typing || []))}">${escapeHtml(firstPhrase)}</span>`;
    }
    if (lead) lead.textContent = hero.lead || "";
    if (actions) {
      actions.innerHTML = (hero.actions || []).map((action) => `
        <a class="button button-${escapeHtml(action.style || "ghost")}" href="${escapeHtml(action.href || "#")}">
          <span>${escapeHtml(action.label || "")}</span>
          ${icon(action.icon)}
        </a>
      `).join("");
    }
    if (metrics) {
      metrics.innerHTML = (hero.metrics || []).map((metric) => `
        <div>
          <strong data-count-to="${escapeHtml(metric.value || 0)}">${escapeHtml(metric.value || 0)}</strong>
          <span>${escapeHtml(metric.label || "")}</span>
        </div>
      `).join("");
    }
    if (visual && hero.visual) {
      const panels = (hero.visual.panels || []).map((panel) => `
        <div class="floating-panel ${escapeHtml(panel.className || "")}">
          ${panel.icon ? icon(panel.icon) : `<span class="mono">${escapeHtml(panel.label || "")}</span>`}
          ${panel.detail ? `<small>${escapeHtml(panel.detail)}</small>` : `<span>${escapeHtml(panel.label || "")}</span>`}
        </div>
      `).join("");
      const tagHtml = (hero.visual.tags || []).map((tag) => `<span class="orbit-tag ${escapeHtml(tag.className || "")}">${escapeHtml(tag.label || "")}</span>`).join("");
      visual.innerHTML = `
        <div class="profile-orb">
          <img src="${escapeHtml(hero.visual.image || "./assets/my.jpg")}" alt="${escapeHtml(hero.visual.imageAlt || "")}" loading="eager" />
        </div>
        ${panels}
        ${tagHtml}
      `;
    }
    initTyping(title?.querySelector("[data-typing]"), hero.typing || []);
  }

  function initTyping(node, phrases) {
    if (!node || !phrases.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
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

    window.setTimeout(tick, 800);
  }

  function renderProfile(profile) {
    const section = document.querySelector(".about-band");
    renderHeading(section, profile);
    const grid = section?.querySelector(".about-grid");
    if (!grid || !profile?.cards) return;
    grid.innerHTML = profile.cards.map((card) => `
      <article class="glass-card reveal">
        ${icon(`${card.icon || ""} card-icon`.trim())}
        <h3>${escapeHtml(card.title)}</h3>
        <p>${escapeHtml(card.description)}</p>
      </article>
    `).join("");
  }

  function renderCapabilities(capabilities) {
    const section = document.querySelector(".skills-section");
    renderHeading(section, capabilities);
    const grid = section?.querySelector(".skills-grid");
    if (!grid || !capabilities?.cards) return;
    grid.innerHTML = capabilities.cards.map((card) => `
      <article class="skill-card reveal" data-tilt-card>
        ${icon(card.icon)}
        <h3>${escapeHtml(card.title)}</h3>
        <p>${escapeHtml(card.description)}</p>
        ${tags(card.tags)}
      </article>
    `).join("");
  }

  function renderNotesPreview(notes) {
    const section = document.querySelector(".projects-preview");
    renderHeading(section, notes);
    const grid = section?.querySelector(".project-grid");
    if (grid && notes?.cards) {
      grid.innerHTML = notes.cards.map((card) => `
        <article class="project-card reveal" data-tilt-card>
          <img src="${escapeHtml(card.image)}" alt="${escapeHtml(card.imageAlt)}" loading="lazy" />
          <div class="project-content">
            <div class="project-meta">${(card.meta || []).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
            <h3>${escapeHtml(card.title)}</h3>
            <p>${escapeHtml(card.description)}</p>
            ${tags(card.tags, "tech-stack")}
            <div class="card-actions">
              ${(card.links || []).map((link) => `<a href="${escapeHtml(link.href)}">${icon(link.icon)} ${escapeHtml(link.label)}</a>`).join("")}
            </div>
          </div>
        </article>
      `).join("");
    }
    const more = section?.querySelector(".centered-action a");
    if (more && notes?.moreLink) {
      more.textContent = notes.moreLink.label || "";
      more.setAttribute("href", notes.moreLink.href || "#");
    }
  }

  function renderTimeline(timeline) {
    const section = document.querySelector(".timeline-section");
    renderHeading(section, timeline);
    const list = section?.querySelector(".timeline");
    if (!list || !timeline?.items) return;
    list.innerHTML = timeline.items.map((item) => `
      <article class="timeline-item reveal">
        <span class="timeline-dot"></span>
        <div class="timeline-card">
          <time>${escapeHtml(item.time)}</time>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.description)}</p>
        </div>
      </article>
    `).join("");
  }

  function renderMusings(musings) {
    const section = document.querySelector(".blog-preview");
    renderHeading(section, musings);
    const grid = section?.querySelector(".blog-grid");
    if (!grid || !musings?.cards) return;
    grid.innerHTML = musings.cards.map((card) => `
      <a class="blog-card reveal" href="${escapeHtml(card.href || "#")}">
        <span>${escapeHtml(card.label)}</span>
        <h3>${escapeHtml(card.title)}</h3>
        <p>${escapeHtml(card.description)}</p>
      </a>
    `).join("");
  }

  function renderContact(contact) {
    const card = document.querySelector(".contact-cta .cta-card");
    if (!card || !contact) return;
    card.innerHTML = `
      <p class="eyebrow">${escapeHtml(contact.eyebrow)}</p>
      <h2>${escapeHtml(contact.title)}</h2>
      <p>${escapeHtml(contact.description)}</p>
      <a class="button button-primary" href="${escapeHtml(contact.button?.href || "#")}">
        <span>${escapeHtml(contact.button?.label || "")}</span>
        ${icon(contact.button?.icon)}
      </a>
    `;
  }
})();
