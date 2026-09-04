/**
 * Ledger UI: wallet badge, explorer modal, toasts, reward hooks.
 */
(function (global) {
  function $(id) {
    return document.getElementById(id);
  }

  function shortHash(h) {
    if (!h) return "";
    return h.slice(0, 8) + "…" + h.slice(-6);
  }

  function toast(message, kind) {
    let el = $("ledgerToast");
    if (!el) {
      el = document.createElement("div");
      el.id = "ledgerToast";
      el.style.cssText =
        "position:fixed;right:1rem;bottom:1rem;z-index:9999;max-width:360px;padding:0.85rem 1rem;border-radius:10px;border:1px solid var(--border-color);background:var(--bg-secondary);color:var(--text-primary);box-shadow:0 10px 30px rgba(0,0,0,0.35);font-size:0.9rem;";
      document.body.appendChild(el);
    }
    el.style.borderColor =
      kind === "earn"
        ? "var(--accent-green)"
        : kind === "warn"
          ? "var(--accent-amber)"
          : "var(--accent-cyan)";
    el.innerHTML = message;
    el.style.display = "block";
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(() => {
      el.style.display = "none";
    }, 4200);
  }

  async function refreshWalletBadge() {
    if (!global.CompTIALedger) return;
    const state = await CompTIALedger.getState();
    const w = state.wallet;
    const bal = $("apxBalanceBadge");
    const rank = $("apxRankBadge");
    const chain = $("apxChainBadge");
    if (bal) bal.textContent = `${w.balance} ${state.tokenSymbol}`;
    if (rank) rank.textContent = `${w.rank.badge} ${w.rank.name}`;
    if (chain) {
      const tip = state.integrity.tip || "";
      chain.textContent = `#${w.height} · ${state.integrity.valid ? "valid" : "invalid"} ${shortHash(tip)}`;
      chain.title = state.integrity.valid
        ? `Chain valid. Tip ${tip}`
        : `Chain INVALID: ${state.integrity.error}`;
    }
    const streakEl = $("apxStreakBadge");
    if (streakEl) streakEl.textContent = `${w.streak}d`;
  }

  async function openLedgerModal() {
    $("ledgerModal").classList.add("active");
    await renderLedgerModal();
  }

  function closeLedgerModal() {
    $("ledgerModal").classList.remove("active");
  }

  async function renderLedgerModal() {
    const state = await CompTIALedger.getState();
    const w = state.wallet;
    $("ledgerWalletSummary").innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:0.75rem;">
        <div class="card" style="padding:0.85rem;"><div style="font-size:0.75rem;color:var(--text-secondary);">Balance</div><div style="font-size:1.4rem;font-weight:800;color:var(--gold-light);">${w.balance} ${state.tokenSymbol}</div></div>
        <div class="card" style="padding:0.85rem;"><div style="font-size:0.75rem;color:var(--text-secondary);">XP / Rank</div><div style="font-size:1.05rem;font-weight:700;">${w.xp} XP<br>${w.rank.badge} ${escapeSafe(w.rank.name)}</div></div>
        <div class="card" style="padding:0.85rem;"><div style="font-size:0.75rem;color:var(--text-secondary);">Streak</div><div style="font-size:1.4rem;font-weight:800;">${w.streak} days</div></div>
        <div class="card" style="padding:0.85rem;"><div style="font-size:0.75rem;color:var(--text-secondary);">Chain</div><div style="font-size:1.05rem;font-weight:700;">Height ${w.height}<br><span style="color:${state.integrity.valid ? "var(--accent-green)" : "var(--accent-red)"};">${state.integrity.valid ? "Valid" : "Broken"}</span></div></div>
      </div>
      <p style="margin-top:0.75rem;font-size:0.82rem;color:var(--text-secondary);">
        ${escapeSafe(state.tokenName)} (${state.tokenSymbol}) is an in-house learning token on a local signed Proof-of-Mastery ledger.
        Blocks are SHA-256 linked and ECDSA P-256 signed. Not a distributed chain.
      </p>
      <p style="margin-top:0.35rem;font-size:0.78rem;color:var(--text-secondary);font-family:monospace;">
        pubkey fingerprint: ${escapeSafe(state.publicKeyFingerprint || "n/a")}
        · key store: ${escapeSafe(state.keyStorage || "n/a")}
        · signed blocks: ${(state.integrity && state.integrity.signedCount) != null ? state.integrity.signedCount : "?"}
        ${(state.integrity && state.integrity.legacyUnsigned) ? " · legacy unsigned: " + state.integrity.legacyUnsigned : ""}
      </p>
      <div id="readinessLedgerBanner" style="margin-top:0.75rem;padding:0.75rem;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-card);font-size:0.85rem;"></div>
    `;
    if (global.CompTIAProductTrust && CompTIAProductTrust.refreshReadiness) {
      CompTIAProductTrust.refreshReadiness();
    }

    const ach = $("ledgerAchievements");
    const catalog = state.achievementsCatalog;
    ach.innerHTML = Object.values(catalog)
      .map((a) => {
        const owned = w.achievements.includes(a.id);
        return `<div style="padding:0.55rem 0.7rem;border:1px solid var(--border-color);border-radius:8px;opacity:${owned ? 1 : 0.45};background:var(--bg-card);">
          <strong>${owned ? "" : "Locked: "}${escapeSafe(a.name)}</strong>
          <div style="font-size:0.78rem;color:var(--text-secondary);">${escapeSafe(a.desc)} · +${a.apx} ${state.tokenSymbol} / +${a.xp} XP</div>
        </div>`;
      })
      .join("");

    const list = $("ledgerBlockList");
    const filter = ($("ledgerTypeFilter") && $("ledgerTypeFilter").value) || "all";
    const blocks = [...state.chain].reverse().filter((b) => filter === "all" || b.type === filter);
    list.innerHTML = blocks
      .slice(0, 80)
      .map((b) => {
        const delta = Number(b.tokenDelta) || 0;
        const deltaColor = delta > 0 ? "var(--accent-green)" : delta < 0 ? "var(--accent-red)" : "var(--text-secondary)";
        const deltaTxt = delta > 0 ? `+${delta}` : `${delta}`;
        return `<div style="padding:0.65rem 0.75rem;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-card);font-size:0.82rem;">
          <div style="display:flex;justify-content:space-between;gap:0.5rem;flex-wrap:wrap;">
            <strong>#${b.index} · ${escapeSafe(b.type)}</strong>
            <span style="color:${deltaColor};font-family:monospace;font-weight:700;">${deltaTxt} ${state.tokenSymbol} · +${b.xpDelta || 0} XP</span>
          </div>
          <div style="color:var(--text-secondary);margin-top:0.25rem;">${escapeSafe(b.timestamp)}</div>
          <div style="font-family:monospace;font-size:0.72rem;color:var(--accent-cyan);margin-top:0.35rem;">hash ${escapeSafe(shortHash(b.hash))}</div>
          <pre style="white-space:pre-wrap;margin-top:0.35rem;font-size:0.72rem;color:var(--text-secondary);">${escapeSafe(JSON.stringify(b.payload || {}, null, 0).slice(0, 280))}</pre>
        </div>`;
      })
      .join("");
  }

  function escapeSafe(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function onExamComplete(result) {
    if (!global.CompTIALedger) return null;
    const out = await CompTIALedger.recordExamComplete(result);
    await refreshWalletBadge();
    const rewardEl = $("apxExamRewardBanner");
    if (rewardEl) {
      rewardEl.style.display = "block";
      rewardEl.innerHTML = `
        <strong style="color:var(--accent-cyan);">+${out.reward.apx} APX</strong> mined into block
        <code>#${out.block.index}</code> (${shortHash(out.block.hash)})
        · +${out.reward.xp} XP
        ${out.minted.length ? ` · Achievements: ${out.minted.map((m) => m.payload.name).join(", ")}` : ""}
      `;
    }
    toast(
      `<strong>+${out.reward.apx} APX</strong> earned for this exam<br><span style="color:var(--text-secondary);font-size:0.8rem;">Block #${out.block.index} · ${shortHash(out.block.hash)}</span>`,
      "earn"
    );
    if (global.CompTIAProductTrust && CompTIAProductTrust.refreshReadiness) {
      CompTIAProductTrust.refreshReadiness();
    }
    return out;
  }

  async function onStudyOpen(doc) {
    if (!global.CompTIALedger || !doc) return;
    const out = await CompTIALedger.recordStudyOpen(doc);
    await refreshWalletBadge();
    if (!out.skipped) {
      toast(`<strong>+${out.apx} APX</strong> for studying<br>${escapeSafe(doc.title)}`, "earn");
    }
    return out;
  }

  async function onPbqComplete(labName) {
    if (!global.CompTIALedger) return;
    const out = await CompTIALedger.recordPbqComplete(labName);
    await refreshWalletBadge();
    if (!out.skipped) {
      toast(`<strong>+18 APX</strong> PBQ completed<br>${escapeSafe(labName)}`, "earn");
    }
    return out;
  }

  async function claimDaily() {
    const out = await CompTIALedger.claimDailyCheckin();
    await refreshWalletBadge();
    await renderLedgerModal();
    if (out.skipped) {
      toast("Daily check-in already claimed for today.", "warn");
    } else {
      toast(`<strong>+${out.apx} APX</strong> daily check-in · streak ${out.wallet.streak}d`, "earn");
    }
  }

  async function stakeSelectedDomain() {
    const val = $("domainSelect").value;
    const map = {
      c1_1: "1.0 Mobile Devices",
      c1_2: "2.0 Networking",
      c1_3: "3.0 Hardware",
      c1_4: "4.0 Virtualization and Cloud Computing",
      c1_5: "5.0 Hardware and Network Troubleshooting",
      c2_1: "1.0 Operating Systems",
      c2_2: "2.0 Security",
      c2_3: "3.0 Software Troubleshooting",
      c2_4: "4.0 Operational Procedures"
    };
    const domainKey = map[val] || val;
    const out = await CompTIALedger.stakeDomain(domainKey, 30);
    await refreshWalletBadge();
    if (!out.ok) {
      toast(escapeSafe(out.error), "warn");
      return;
    }
    toast(`Staked <strong>30 APX</strong> on ${escapeSafe(domainKey)}. Score 80%+ to earn yield.`, "earn");
  }

  async function exportLedger() {
    const json = await CompTIALedger.exportLedgerJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comptia_pom_ledger_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function verifyNow() {
    const v = await CompTIALedger.verifyChain();
    await refreshWalletBadge();
    await renderLedgerModal();
    toast(
      v.valid
        ? `Chain valid · height ${v.height} · tip ${shortHash(v.tip)} · fp ${escapeSafe((v.publicKeyFingerprint || "").slice(0, 8))}`
        : `INVALID: ${escapeSafe(v.error)}`,
      v.valid ? "earn" : "warn"
    );
  }

  async function init() {
    if (!global.CompTIALedger) {
      console.warn("ledger_engine.js not loaded");
      return;
    }
    await CompTIALedger.ensureGenesis();
    await refreshWalletBadge();
  }

  global.CompTIALedgerUI = {
    init,
    refreshWalletBadge,
    openLedgerModal,
    closeLedgerModal,
    renderLedgerModal,
    onExamComplete,
    onStudyOpen,
    onPbqComplete,
    claimDaily,
    stakeSelectedDomain,
    exportLedger,
    verifyNow,
    toast
  };

  // Expose for inline onclick handlers
  global.openLedgerModal = openLedgerModal;
  global.closeLedgerModal = closeLedgerModal;
  global.claimDailyApx = claimDaily;
  global.stakeSelectedDomain = stakeSelectedDomain;
  global.exportPomLedger = exportLedger;
  global.verifyPomLedger = verifyNow;
  global.renderLedgerModal = renderLedgerModal;
})(window);
