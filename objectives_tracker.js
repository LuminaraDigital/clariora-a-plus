/**
 * objectives_tracker.js
 * Checklist helpers for CompTIA A+ Core 1 / Core 2 official objectives.
 *
 * Expected HTML hooks (ids/classes):
 *   - #objectivesModal              overlay container (optional; create if missing)
 *   - #objectivesListContainer      scrollable list host
 *   - #objectivesExamFilter         select: all | core1 | core2
 *   - #objectivesDomainFilter       select: all | domain name
 *   - #objectivesSearchInput        text search
 *   - #objectivesProgressLabel      "N / M checked" label
 *   - #objectivesResetBtn           clear saved progress
 *   - button[onclick="openObjectivesModal()"]  launcher
 *
 * Data: window.COMPTIA_OBJECTIVES_DATA from objectives_data.js
 * Persist: localStorage key comptia_objectives_progress_v1
 *   shape: { "c1-1-1": true, "c2-2-5": true, ... }
 */
(function () {
  const STORAGE_KEY = "comptia_objectives_progress_v1";

  function escapeHTML(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (_) {
      return {};
    }
  }

  function saveProgress(map) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  }

  function getObjectives() {
    const data = window.COMPTIA_OBJECTIVES_DATA;
    return data && Array.isArray(data.objectives) ? data.objectives : [];
  }

  function openObjectivesModal() {
    const modal = document.getElementById("objectivesModal");
    if (modal) modal.classList.add("active");
    populateDomainFilter();
    renderObjectivesChecklist();
  }

  function closeObjectivesModal() {
    const modal = document.getElementById("objectivesModal");
    if (modal) modal.classList.remove("active");
  }

  function populateDomainFilter() {
    const sel = document.getElementById("objectivesDomainFilter");
    if (!sel) return;
    const exam = (document.getElementById("objectivesExamFilter") || {}).value || "all";
    const domains = new Set();
    getObjectives().forEach((o) => {
      if (exam === "all" || o.exam === exam) domains.add(o.domain);
    });
    const current = sel.value;
    sel.innerHTML = '<option value="all">All Domains</option>';
    Array.from(domains)
      .sort()
      .forEach((d) => {
        const opt = document.createElement("option");
        opt.value = d;
        opt.textContent = d;
        sel.appendChild(opt);
      });
    if ([...sel.options].some((o) => o.value === current)) sel.value = current;
  }

  function toggleObjective(id, checked) {
    const map = loadProgress();
    if (checked) map[id] = true;
    else delete map[id];
    saveProgress(map);
    updateProgressLabel();
  }

  function updateProgressLabel(visibleTotal, visibleChecked) {
    const label = document.getElementById("objectivesProgressLabel");
    if (!label) return;
    if (typeof visibleTotal === "number") {
      label.textContent = `${visibleChecked} / ${visibleTotal} visible checked`;
      return;
    }
    const all = getObjectives();
    const map = loadProgress();
    const checked = all.filter((o) => map[o.id]).length;
    label.textContent = `${checked} / ${all.length} objectives checked`;
  }

  function resetObjectivesProgress() {
    if (!confirm("Clear all saved objective checkmarks?")) return;
    localStorage.removeItem(STORAGE_KEY);
    renderObjectivesChecklist();
  }

  function renderObjectivesChecklist() {
    const container = document.getElementById("objectivesListContainer");
    if (!container) return;

    const search = ((document.getElementById("objectivesSearchInput") || {}).value || "").toLowerCase();
    const exam = (document.getElementById("objectivesExamFilter") || {}).value || "all";
    const domain = (document.getElementById("objectivesDomainFilter") || {}).value || "all";
    const map = loadProgress();

    container.innerHTML = "";
    let visible = 0;
    let visibleChecked = 0;

    getObjectives().forEach((o) => {
      const hay = `${o.code} ${o.title} ${o.domain} ${o.exam_code}`.toLowerCase();
      const matchExam = exam === "all" || o.exam === exam;
      const matchDom = domain === "all" || o.domain === domain;
      const matchSearch = !search || hay.includes(search);
      if (!(matchExam && matchDom && matchSearch)) return;

      visible += 1;
      const isChecked = !!map[o.id];
      if (isChecked) visibleChecked += 1;

      const row = document.createElement("label");
      row.style.cssText =
        "display:flex;align-items:flex-start;gap:0.65rem;background:var(--bg-card);border:1px solid var(--border-color);border-radius:6px;padding:0.65rem 0.85rem;font-size:0.9rem;cursor:pointer;";
      row.innerHTML = `
        <input type="checkbox" data-obj-id="${escapeHTML(o.id)}" ${isChecked ? "checked" : ""} style="margin-top:0.2rem;">
        <div>
          <div>
            <span style="background:rgba(6,182,212,0.15);color:var(--accent-cyan);font-weight:700;padding:0.1rem 0.4rem;border-radius:4px;font-size:0.75rem;margin-right:0.4rem;">${escapeHTML(o.exam_code)} ${escapeHTML(o.code)}</span>
            <strong>${escapeHTML(o.title)}</strong>
          </div>
          <div style="color:var(--text-secondary);font-size:0.8rem;margin-top:0.2rem;">${escapeHTML(o.domain)}</div>
        </div>`;
      const cb = row.querySelector("input");
      cb.addEventListener("change", () => toggleObjective(o.id, cb.checked));
      container.appendChild(row);
    });

    updateProgressLabel(visible, visibleChecked);
  }

  window.openObjectivesModal = openObjectivesModal;
  window.closeObjectivesModal = closeObjectivesModal;
  window.renderObjectivesChecklist = renderObjectivesChecklist;
  window.resetObjectivesProgress = resetObjectivesProgress;
  window.populateObjectivesDomainFilter = populateDomainFilter;

  document.addEventListener("DOMContentLoaded", () => {
    const examFilter = document.getElementById("objectivesExamFilter");
    if (examFilter) {
      examFilter.addEventListener("change", () => {
        populateDomainFilter();
        renderObjectivesChecklist();
      });
    }
    const domainFilter = document.getElementById("objectivesDomainFilter");
    if (domainFilter) domainFilter.addEventListener("change", renderObjectivesChecklist);
    const search = document.getElementById("objectivesSearchInput");
    if (search) search.addEventListener("input", renderObjectivesChecklist);
    const resetBtn = document.getElementById("objectivesResetBtn");
    if (resetBtn) resetBtn.addEventListener("click", resetObjectivesProgress);
  });
})();
