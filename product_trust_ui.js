/**
 * Product / trust UI: profiles, backup, sync, study plan, readiness, objectives.
 */
(function (global) {
  function $(id) {
    return document.getElementById(id);
  }

  function escapeSafe(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function toast(msg, kind) {
    if (global.CompTIALedgerUI && CompTIALedgerUI.toast) {
      CompTIALedgerUI.toast(msg, kind || "earn");
      return;
    }
    alert(String(msg).replace(/<[^>]+>/g, ""));
  }

  function refreshProfileSelect() {
    const sel = $("profileSelect");
    if (!sel || !global.CompTIAProfiles) return;
    const active = CompTIAProfiles.getActiveId();
    const list = CompTIAProfiles.listProfiles();
    sel.innerHTML = list
      .map(
        (p) =>
          '<option value="' +
          escapeSafe(p.id) +
          '"' +
          (p.id === active ? " selected" : "") +
          ">" +
          escapeSafe(p.name) +
          "</option>"
      )
      .join("");
    const label = $("activeProfileLabel");
    if (label) {
      const p = CompTIAProfiles.getActive();
      label.textContent = p ? p.name : "";
    }
  }

  async function afterProfileChange() {
    if (global.CompTIALedger && CompTIALedger.clearKeyCache) CompTIALedger.clearKeyCache();
    if (typeof updateMissedCountDisplay === "function") updateMissedCountDisplay();
    if (typeof renderHistoryTable === "function") renderHistoryTable();
    if (global.CompTIALedgerUI) await CompTIALedgerUI.init();
    await refreshReadiness();
    renderStudyPlanPanel();
    renderObjectivesChecklist();
    refreshProfileSelect();
  }

  async function onProfileSwitch() {
    const sel = $("profileSelect");
    if (!sel) return;
    const id = sel.value;
    const out = CompTIAProfiles.switchProfile(id);
    if (!out.ok) {
      toast(escapeSafe(out.error), "warn");
      return;
    }
    await afterProfileChange();
    toast("Switched to profile <strong>" + escapeSafe(out.profile.name) + "</strong>", "earn");
  }

  async function onCreateProfile() {
    const name = prompt("New profile name:", "Learner");
    if (name == null) return;
    const p = CompTIAProfiles.createProfile(name);
    CompTIAProfiles.switchProfile(p.id);
    await afterProfileChange();
    toast("Created profile <strong>" + escapeSafe(p.name) + "</strong>", "earn");
  }

  async function onRenameProfile() {
    const p = CompTIAProfiles.getActive();
    if (!p) return;
    const name = prompt("Rename profile:", p.name);
    if (name == null) return;
    const out = CompTIAProfiles.renameProfile(p.id, name);
    if (!out.ok) {
      toast(escapeSafe(out.error), "warn");
      return;
    }
    refreshProfileSelect();
    toast("Renamed profile", "earn");
  }

  async function onDeleteProfile() {
    const p = CompTIAProfiles.getActive();
    if (!p) return;
    if (!confirm('Delete profile "' + p.name + '" and all its isolated history/ledger/plan data? This cannot be undone.')) {
      return;
    }
    const out = CompTIAProfiles.deleteProfile(p.id);
    if (!out.ok) {
      toast(escapeSafe(out.error), "warn");
      return;
    }
    await afterProfileChange();
    toast("Profile deleted", "warn");
  }

  async function onExportBackup() {
    const out = await CompTIALearnerState.exportFullBackup();
    if (out.ok) toast("Full backup downloaded: " + escapeSafe(out.filename), "earn");
  }

  async function onImportBackup() {
    if (!confirm("Import full backup? This replaces all local profile data on this device.")) return;
    const out = await CompTIALearnerState.importFullBackupFromPicker();
    if (out.cancelled) return;
    if (!out.ok) {
      toast(escapeSafe(out.error), "warn");
      return;
    }
    if (out.activeProfileId) CompTIAProfiles.switchProfile(out.activeProfileId);
    const theme = CompTIALearnerState.themeGet();
    document.documentElement.setAttribute("data-theme", theme);
    if (typeof updateThemeBtn === "function") updateThemeBtn(theme);
    await afterProfileChange();
    toast("Backup imported", "earn");
  }

  async function onSaveSync() {
    const out = await CompTIALearnerState.saveSyncFile();
    if (out.cancelled) return;
    if (!out.ok) {
      toast(escapeSafe(out.error || "Save failed"), "warn");
      return;
    }
    toast(
      "Sync file saved (" +
        escapeSafe(out.method) +
        "). Place <code>comptia_a_plus_sync.json</code> in OneDrive/Dropbox if syncing devices.",
      "earn"
    );
  }

  async function onLoadSync() {
    if (!confirm("Load sync file? This replaces local profile data with the file contents.")) return;
    const out = await CompTIALearnerState.loadSyncFile();
    if (out.cancelled) return;
    if (!out.ok) {
      toast(escapeSafe(out.error), "warn");
      return;
    }
    const theme = CompTIALearnerState.themeGet();
    document.documentElement.setAttribute("data-theme", theme);
    if (typeof updateThemeBtn === "function") updateThemeBtn(theme);
    await afterProfileChange();
    toast("Sync file loaded", "earn");
  }

  async function refreshReadiness() {
    if (!global.CompTIAReadiness) return null;
    const result = await CompTIAReadiness.computeAll();
    const home = $("readinessHomeBanner");
    const ledger = $("readinessLedgerBanner");
    const date = result.examDate || "your exam date";
    const html =
      '<div style="font-weight:700;margin-bottom:0.35rem;">Exam readiness</div>' +
      '<div>You are <strong style="color:var(--accent-cyan);">' +
      result.core1.percent +
      "%</strong> ready for Core 1 by " +
      escapeSafe(date) +
      "</div>" +
      '<div>You are <strong style="color:var(--accent-cyan);">' +
      result.core2.percent +
      "%</strong> ready for Core 2 by " +
      escapeSafe(date) +
      "</div>";
    if (home) home.innerHTML = html;
    if (ledger) ledger.innerHTML = html;
    return result;
  }

  function renderObjectivesChecklist() {
    const el = $("objectivesChecklist");
    if (!el || !global.CompTIAProfiles) return;
    const obj = CompTIAProfiles.getObjectives();
    let html = "";
    ["core1", "core2"].forEach((exam) => {
      html +=
        '<div style="margin-bottom:0.75rem;"><strong>' +
        (exam === "core1" ? "Core 1" : "Core 2") +
        "</strong>";
      Object.keys(obj[exam]).forEach((key) => {
        const checked = obj[exam][key] ? "checked" : "";
        const id = "obj_" + exam + "_" + key.replace(/[^a-z0-9]/gi, "_");
        html +=
          '<label style="display:flex;gap:0.5rem;align-items:center;margin:0.35rem 0;font-size:0.85rem;cursor:pointer;">' +
          '<input type="checkbox" id="' +
          id +
          '" ' +
          checked +
          ' onchange="CompTIAProductTrust.toggleObjective(\'' +
          exam +
          "', '" +
          escapeSafe(key).replace(/'/g, "\\'") +
          "')\" /> " +
          escapeSafe(key) +
          "</label>";
      });
      html += "</div>";
    });
    el.innerHTML = html;
  }

  async function toggleObjective(exam, key) {
    CompTIAProfiles.toggleObjective(exam, key);
    await refreshReadiness();
  }

  function openStudyPlanModal() {
    const m = $("studyPlanModal");
    if (m) m.classList.add("active");
    const plan = CompTIAStudyPlan.getPlan();
    if (plan) {
      if ($("studyPlanExamDate")) $("studyPlanExamDate").value = plan.examDate || "";
      if ($("studyPlanTarget")) $("studyPlanTarget").value = plan.target || "both";
      if ($("studyPlanHours")) $("studyPlanHours").value = plan.hoursPerWeek || 7;
    }
    renderStudyPlanPanel();
  }

  function closeStudyPlanModal() {
    const m = $("studyPlanModal");
    if (m) m.classList.remove("active");
  }

  function onGenerateStudyPlan() {
    const examDate = ($("studyPlanExamDate") && $("studyPlanExamDate").value) || "";
    const target = ($("studyPlanTarget") && $("studyPlanTarget").value) || "both";
    const hours = Number(($("studyPlanHours") && $("studyPlanHours").value) || 7);
    if (!examDate) {
      toast("Set an exam date first", "warn");
      return;
    }
    CompTIAStudyPlan.generatePlan({ examDate, target, hoursPerWeek: hours });
    renderStudyPlanPanel();
    refreshReadiness();
    toast("Study plan generated", "earn");
  }

  function renderStudyPlanPanel() {
    const panel = $("studyPlanPanelBody");
    const home = $("studyPlanHomeSummary");
    if (!global.CompTIAStudyPlan) return;
    const plan = CompTIAStudyPlan.getPlan();
    if (!plan) {
      if (panel) panel.innerHTML = '<p style="color:var(--text-secondary);">No plan yet. Set exam date, target, and hours/week, then generate.</p>';
      if (home) home.textContent = "No study plan set";
      return;
    }
    const today = CompTIAStudyPlan.getTodayTasks();
    const doneCount = (plan.dailyTasks || []).filter((t) => t.done).length;
    const total = (plan.dailyTasks || []).length;
    if (home) {
      home.textContent =
        "Target " +
        plan.target +
        " by " +
        plan.examDate +
        " · " +
        doneCount +
        "/" +
        total +
        " tasks · today " +
        today.length;
    }
    if (!panel) return;

    let html =
      '<p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:0.75rem;">' +
      escapeSafe(plan.target) +
      " · exam " +
      escapeSafe(plan.examDate) +
      " · " +
      plan.hoursPerWeek +
      " hrs/week · " +
      doneCount +
      "/" +
      total +
      " tasks done</p>";

    html += "<h4 style=\"margin:0.5rem 0;\">Today</h4>";
    if (!today.length) {
      html += '<p style="color:var(--text-secondary);font-size:0.85rem;">No tasks scheduled for today.</p>';
    } else {
      today.forEach((t) => {
        html += taskRow(t);
      });
    }

    html += "<h4 style=\"margin:1rem 0 0.5rem;\">This week</h4>";
    const week = (plan.weeksOut || [])[0];
    if (week) {
      week.tasks.forEach((t) => {
        html += taskRow(t);
      });
    }
    panel.innerHTML = html;
  }

  function taskRow(t) {
    return (
      '<div style="display:flex;justify-content:space-between;gap:0.75rem;align-items:center;padding:0.55rem 0.65rem;border:1px solid var(--border-color);border-radius:8px;margin-bottom:0.4rem;background:var(--bg-card);font-size:0.82rem;">' +
      "<div><strong>" +
      escapeSafe(t.title) +
      '</strong><div style="color:var(--text-secondary);">' +
      escapeSafe(t.date) +
      " · " +
      t.minutes +
      " min · " +
      escapeSafe(t.actionHint) +
      "</div></div>" +
      (t.done
        ? '<span style="color:var(--accent-green);font-weight:700;">Done</span>'
        : '<button class="btn btn-secondary" style="padding:0.3rem 0.55rem;font-size:0.75rem;" onclick="CompTIAProductTrust.completeTask(\'' +
          escapeSafe(t.id) +
          "')\">Complete (+5 APX)</button>") +
      "</div>"
    );
  }

  async function completeTask(taskId) {
    const out = await CompTIAStudyPlan.completeTask(taskId);
    if (!out.ok) {
      toast(escapeSafe(out.error), "warn");
      return;
    }
    renderStudyPlanPanel();
    if (global.CompTIALedgerUI) await CompTIALedgerUI.refreshWalletBadge();
    await refreshReadiness();
    if (out.already) toast("Task already completed", "warn");
    else if (out.reward && !out.reward.skipped) toast("<strong>+5 APX</strong> study-plan task", "earn");
    else toast("Task marked complete", "earn");
  }

  async function init() {
    if (global.CompTIAProfiles) CompTIAProfiles.ensureInitialized();
    refreshProfileSelect();
    renderObjectivesChecklist();
    renderStudyPlanPanel();
    await refreshReadiness();
  }

  global.CompTIAProductTrust = {
    init,
    refreshProfileSelect,
    onProfileSwitch,
    onCreateProfile,
    onRenameProfile,
    onDeleteProfile,
    onExportBackup,
    onImportBackup,
    onSaveSync,
    onLoadSync,
    refreshReadiness,
    openStudyPlanModal,
    closeStudyPlanModal,
    onGenerateStudyPlan,
    renderStudyPlanPanel,
    completeTask,
    toggleObjective,
    renderObjectivesChecklist,
    afterProfileChange
  };

  global.openStudyPlanModal = openStudyPlanModal;
  global.closeStudyPlanModal = closeStudyPlanModal;
})(window);
