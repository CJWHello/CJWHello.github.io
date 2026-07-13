(() => {
  "use strict";

  const grid = document.querySelector("[data-projects-grid]");
  if (!grid) return;

  fetch("./data/projects.json")
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((payload) => {
      const projects = Array.isArray(payload.projects) ? payload.projects : [];
      if (!projects.length) return;
      grid.innerHTML = projects.map(renderCard).join("");
      grid.querySelectorAll(".reveal").forEach((node) => node.classList.add("is-visible"));
    })
    .catch(() => {
      /* Keep static fallback cards when JSON is unavailable. */
    });

  function escapeHtml(value = "") {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderCard(project) {
    const tags = (project.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");
    return `
      <a class="project-card note-card-link reveal is-visible" href="${escapeHtml(project.href || "#")}">
        <img src="${escapeHtml(project.cover || "./assets/images/project-nexus.svg")}" alt="${escapeHtml(project.title || "项目")}预览" loading="lazy" />
        <div class="project-content">
          <div class="project-meta"><span>${escapeHtml(project.category || "Project")}</span><span>${escapeHtml(project.type || "Entry")}</span></div>
          <h2>${escapeHtml(project.title || "未命名项目")}</h2>
          <p>${escapeHtml(project.summary || "暂无说明。")}</p>
          <div class="tech-stack">${tags}</div>
        </div>
      </a>
    `;
  }
})();
