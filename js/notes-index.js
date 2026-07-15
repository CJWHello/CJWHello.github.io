/**
 * Builds the Notes index from data/notes.json.
 * Browser cannot list GitHub Pages directories, so the JSON manifest is the source of truth.
 */
(() => {
  "use strict";

  const grid = document.querySelector(".notes-compact-grid");
  const filterBar = document.querySelector(".filter-bar");
  if (!grid || !filterBar) return;

  fetch("./data/notes.json")
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((payload) => {
      const notes = Array.isArray(payload.notes) ? payload.notes : [];
      if (!notes.length) return;
      renderFilters(notes);
      renderNotes(notes, "all");
    })
    .catch(() => {
      /* Keep static fallback cards. */
    });

  function escapeHtml(value = "") {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatCategoryLabel(category) {
    const value = String(category || "").trim();
    if (!value) return "Note";
    if (value.length <= 4) return value.toUpperCase();
    return value
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function uniqueCategories(notes) {
    const seen = new Map();
    notes.forEach((note) => {
      if (!note.category) return;
      if (!seen.has(note.category)) {
        seen.set(note.category, note.categoryLabel || formatCategoryLabel(note.category));
      }
    });
    return [...seen.entries()].map(([key, label]) => ({ key, label }));
  }

  function renderFilters(notes) {
    const categories = uniqueCategories(notes);
    filterBar.innerHTML = [
      '<button class="filter-button active" type="button" data-filter="all">All</button>',
      ...categories.map((category) => `<button class="filter-button" type="button" data-filter="${escapeHtml(category.key)}">${escapeHtml(category.label)}</button>`)
    ].join("");

    filterBar.querySelectorAll("[data-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        const filter = button.dataset.filter || "all";
        filterBar.querySelectorAll("[data-filter]").forEach((item) => {
          item.classList.toggle("active", item === button);
        });
        renderNotes(notes, filter);
      });
    });
  }

  function renderNotes(notes, filter) {
    const visibleNotes = filter === "all" ? notes : notes.filter((note) => note.category === filter);
    grid.innerHTML = visibleNotes.map((note, index) => renderCard(note, index)).join("");
    grid.querySelectorAll(".reveal").forEach((node) => node.classList.add("is-visible"));
  }

  function renderCoverTitle(title) {
    return String(title || "")
      .split(/([\u3400-\u9FFF]+)/)
      .filter((part) => part && part.trim())
      .map((part) => {
        const className = /[\u3400-\u9FFF]/.test(part) ? "note-cover-zh" : "note-cover-en";
        return `<span class="${className}">${escapeHtml(part.trim())}</span>`;
      })
      .join("");
  }

  function renderCrestLabel(note) {
    const value = String(note.categoryLabel || note.category || "N").trim();
    const parts = value.split(/[-_\s]+/).filter(Boolean);
    if (!parts.length) return "N";
    return escapeHtml(parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join(""));
  }

  function renderCard(note, index) {
    const href = `./note.html?file=${encodeURIComponent(note.key || "")}`;
    const tags = (note.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");
    const categoryLabel = note.categoryLabel || formatCategoryLabel(note.category);
    const volume = String(index + 1).padStart(2, "0");

    return `
      <a class="project-card note-card-link note-book-card reveal is-visible" href="${href}" data-category="${escapeHtml(note.category || "")}" aria-label="阅读 ${escapeHtml(note.title || "笔记")}">
        <span class="note-corner note-corner-top-left" aria-hidden="true"></span>
        <span class="note-corner note-corner-top-right" aria-hidden="true"></span>
        <span class="note-corner note-corner-bottom-left" aria-hidden="true"></span>
        <span class="note-corner note-corner-bottom-right" aria-hidden="true"></span>
        <span class="note-volume-badge" aria-hidden="true">Vol. ${volume}</span>
        <div class="project-content">
          <div class="project-meta"><span>${escapeHtml(categoryLabel)}</span></div>
          <div class="note-cover-crest" aria-hidden="true">
            <span class="note-cover-crest-ring"></span>
            <span class="note-cover-crest-core">${renderCrestLabel(note)}</span>
          </div>
          <h2 class="note-cover-title">${renderCoverTitle(note.title || "未命名笔记")}</h2>
          <p>${escapeHtml(note.excerpt || "暂无摘要。")}</p>
          <div class="tech-stack">${tags}</div>
        </div>
      </a>
    `;
  }
})();
