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
    // Allow a small trusted HTML subset from call sites; strip scripts and event handlers.
    el.textContent = "";
    const wrap = document.createElement("div");
    wrap.innerHTML = String(message == null ? "" : message);
    wrap.querySelectorAll("script,iframe,object,embed,link,meta").forEach(function (n) {
      n.remove();
    });
    wrap.querySelectorAll("*").forEach(function (n) {
      Array.prototype.slice.call(n.attributes || []).forEach(function (a) {
        if (/^on/i.test(a.name)) n.removeAttribute(a.name);
        if (
          (a.name === "href" || a.name === "src" || a.name === "xlink:href") &&
          /^\s*(javascript:|data:|vbscript:)/i.test(a.value || "")
        ) {
          n.removeAttribute(a.name);
        }
      });
    });
    while (wrap.firstChild) el.appendChild(wrap.firstChild);
    el.style.display = "block";
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(() => {
      el.style.display = "none";
    }, 4200);
  }

  function spawnCoinShower() {
    if (typeof document === 'undefined') return;
    const target = $("apxHeaderChip") || $("streakChip") || document.body;
    const rect = target.getBoundingClientRect();
    const destX = rect.left + rect.width / 2;
    const destY = rect.top + rect.height / 2;

    for (let i = 0; i < 7; i++) {
      const coin = document.createElement("div");
      coin.className = "l2e-floating-coin";
      coin.textContent = "🪙";
      coin.style.cssText = `
        position: fixed;
        left: ${window.innerWidth / 2 + (Math.random() * 100 - 50)}px;
        top: ${window.innerHeight / 2 + (Math.random() * 80 - 40)}px;
        font-size: 1.35rem;
        z-index: 10050;
        pointer-events: none;
        transition: all 0.75s cubic-bezier(0.2, 0.8, 0.2, 1);
        opacity: 1;
        transform: scale(0.5);
      `;
      document.body.appendChild(coin);

      setTimeout(() => {
        coin.style.left = `${destX}px`;
        coin.style.top = `${destY}px`;
        coin.style.transform = `scale(1.25) rotate(${Math.random() * 360}deg)`;
        coin.style.opacity = "0.2";
      }, 50 + i * 45);

      setTimeout(() => {
        if (coin.parentNode) coin.parentNode.removeChild(coin);
      }, 850);
    }
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

    // Persistent Header APX Balance Chip
    const headerBal = $("apxHeaderBalanceBadge");
    if (headerBal) headerBal.textContent = w.balance;

    if (typeof document !== "undefined" && document.body) {
      document.body.classList.toggle("theme-cyber-terminal", CompTIALedger.checkWalletUnlock(w, "CYBER_THEME"));
    }

    // Visual Streak Shield Aura
    const shieldBadge = $("apxStreakShieldBadge");
    if (shieldBadge) {
      const shields = (w.unlocks && w.unlocks.consumables && w.unlocks.consumables.STREAK_FREEZE) || 0;
      if (shields > 0) {
        shieldBadge.style.display = "inline";
        shieldBadge.title = `Streak Shield Active (${shields} equipped)`;
      } else {
        shieldBadge.style.display = "none";
      }
    }

    // Next Superpower Goal Progress Card
    const goalTitle = $("l2eGoalTitle");
    const goalCost = $("l2eGoalCostBadge");
    const goalBar = $("l2eGoalProgressBar");
    const goalText = $("l2eGoalProgressText");
    const goalRem = $("l2eGoalRemainingText");

    if (goalTitle && goalBar) {
      const catalog = state.unlocksCatalog || {};
      const perms = (w.unlocks && w.unlocks.permanent) || [];

      const candidates = Object.values(catalog)
        .filter((item) => item.type === "consumable" || !perms.includes(item.id))
        .sort((a, b) => a.cost - b.cost);
      const target =
        candidates.find((item) => item.cost > w.balance) ||
        candidates[candidates.length - 1] ||
        catalog.AI_BURST;

      if (target) {
        const pct = Math.min(100, Math.round((w.balance / target.cost) * 100));
        goalTitle.textContent = `${target.icon || "⚡"} ${target.name}`;
        if (goalCost) goalCost.textContent = `${target.cost} APX`;
        goalBar.style.width = `${pct}%`;
        if (goalText) goalText.textContent = `${w.balance} / ${target.cost} APX (${pct}%)`;

        if (goalRem) {
          if (w.balance >= target.cost) {
            goalRem.textContent = "🎉 Ready to Unlock! Tap to claim";
            goalRem.style.color = "var(--gold-light)";
            goalBar.style.background = "linear-gradient(90deg, #10B981, #059669)";
          } else {
            const need = target.cost - w.balance;
            goalRem.textContent = `Earn ${need} APX to unlock`;
            goalRem.style.color = "var(--accent-cyan)";
            goalBar.style.background = "linear-gradient(90deg, #F5D061, #E5A93C)";
          }
        }
      }
    }
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

    // Render Superpowers Store
    const storeEl = $("ledgerUnlocksStore");
    const buffEl = $("ledgerUnlocksBuffSummary");
    const unlocksCatalog = state.unlocksCatalog || {};
    const unlocksState = w.unlocks || { consumables: {}, permanent: [] };

    if (buffEl) {
      const activeBuffs = [];
      if (unlocksState.consumables && unlocksState.consumables.AI_BURST > 0) {
        activeBuffs.push(`🤖 AI Burst: ${unlocksState.consumables.AI_BURST} prompts`);
      }
      if (unlocksState.consumables && unlocksState.consumables.STREAK_FREEZE > 0) {
        activeBuffs.push(`🛡️ Streak Shield: Active (${unlocksState.consumables.STREAK_FREEZE})`);
      }
      if (unlocksState.permanent && unlocksState.permanent.length > 0) {
        activeBuffs.push(`⭐ ${unlocksState.permanent.length} permanent unlocked`);
      }
      buffEl.innerHTML = activeBuffs.length ? activeBuffs.join(" · ") : "No active buffs";
    }

    if (storeEl) {
      storeEl.innerHTML = Object.values(unlocksCatalog)
        .map((item) => {
          const isPerm = item.type === "permanent";
          const owned = isPerm && (unlocksState.permanent || []).includes(item.id);
          const consumableCharges = !isPerm && (unlocksState.consumables && unlocksState.consumables[item.id] || 0);
          const canAfford = w.balance >= item.cost;

          let btnHtml = "";
          if (owned && OWNED_ACTIONS[item.id]) {
            btnHtml = `<button type="button" class="btn btn-primary" style="font-size:0.8rem; padding:0.35rem 0.65rem;" onclick="useOwnedUnlock('${item.id}')">✓ ${OWNED_ACTIONS[item.id].label}</button>`;
          } else if (owned) {
            btnHtml = `<button type="button" class="btn btn-secondary" style="font-size:0.8rem; padding:0.35rem 0.65rem;" disabled>✓ Owned</button>`;
          } else if (!canAfford) {
            btnHtml = `<button type="button" class="btn btn-secondary" style="font-size:0.8rem; padding:0.35rem 0.65rem; opacity:0.6;" disabled>Need ${item.cost} ${state.tokenSymbol}</button>`;
          } else {
            btnHtml = `<button type="button" class="btn btn-primary" style="font-size:0.8rem; padding:0.35rem 0.65rem;" onclick="promptUnlock('${item.id}')">Unlock · ${item.cost} ${state.tokenSymbol}</button>`;
          }

          let badgeHtml = "";
          if (!isPerm && consumableCharges > 0) {
            badgeHtml = `<span style="font-size:0.72rem; color:var(--accent-green); font-weight:bold;">(${consumableCharges} active)</span>`;
          } else if (isPerm) {
            badgeHtml = `<span style="font-size:0.72rem; color:var(--gold-light);">Permanent</span>`;
          }

          return `<div style="padding:0.75rem; border:1px solid var(--border-color); border-radius:8px; background:var(--bg-card); display:flex; flex-direction:column; justify-content:space-between; gap:0.5rem;">
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong>${item.icon || "⚡"} ${escapeSafe(item.name)}</strong>
                ${badgeHtml}
              </div>
              <div style="font-size:0.78rem; color:var(--text-secondary); margin-top:0.3rem;">${escapeSafe(item.desc)}</div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.4rem; padding-top:0.4rem; border-top:1px solid rgba(255,255,255,0.06);">
              <span style="font-weight:700; color:var(--gold-light); font-size:0.9rem;">${item.cost} ${state.tokenSymbol}</span>
              ${btnHtml}
            </div>
          </div>`;
        })
        .join("");
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

  async function promptUnlock(unlockId) {
    if (!global.CompTIALedger) return;
    const state = await CompTIALedger.getState();
    const item = (state.unlocksCatalog || {})[unlockId];
    if (!item) return;

    let modal = $("ledgerSignTxModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "ledgerSignTxModal";
      modal.className = "modal-overlay";
      modal.style.cssText = "z-index: 10050;";
      document.body.appendChild(modal);
    }

    const shortPub = state.publicKeyFingerprint ? state.publicKeyFingerprint.slice(0, 10) + "…" : "Local WebCrypto Key";

    modal.innerHTML = `
      <div class="modal-card" style="max-width: 480px; border: 1px solid var(--gold-light); box-shadow: 0 16px 48px rgba(0,0,0,0.5);">
        <div class="modal-header">
          <div>
            <h3 style="font-size: 1.15rem; color: var(--gold-light);">Sign Cryptographic Transaction</h3>
            <p style="color: var(--text-secondary); font-size: 0.8rem; margin-top: 0.2rem;">Proof-of-Mastery Local Ledger (ECDSA P-256)</p>
          </div>
          <button style="background: none; border: none; color: var(--text-secondary); font-size: 1.5rem; cursor: pointer;" onclick="closeSignTxModal()">&times;</button>
        </div>

        <div style="background: var(--bg-card); padding: 0.85rem; border-radius: 8px; border: 1px solid var(--border-color); font-size: 0.82rem; margin: 0.75rem 0;">
          <div style="display:flex; justify-content:space-between; margin-bottom: 0.4rem;">
            <span style="color:var(--text-secondary);">Transaction:</span>
            <strong style="color:var(--accent-cyan);">SPEND_UNLOCK</strong>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom: 0.4rem;">
            <span style="color:var(--text-secondary);">Signer (You):</span>
            <code style="color:var(--gold-light);">${escapeSafe(shortPub)}</code>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom: 0.4rem;">
            <span style="color:var(--text-secondary);">Item:</span>
            <strong>${item.icon || "⚡"} ${escapeSafe(item.name)}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom: 0.4rem;">
            <span style="color:var(--text-secondary);">Cost:</span>
            <strong style="color:var(--accent-red); font-family:monospace;">-${item.cost} ${state.tokenSymbol}</strong>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span style="color:var(--text-secondary);">Balance after:</span>
            <strong style="color:var(--accent-green); font-family:monospace;">${state.wallet.balance - item.cost} ${state.tokenSymbol}</strong>
          </div>
        </div>

        <p style="font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 1rem; line-height: 1.4;">
          🔒 <strong>Educational Safe Transaction</strong>: This block will be signed on your device with your ECDSA P-256 private key and linked to your immutable audit chain. No external network fees or real money involved.
        </p>

        <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
          <button type="button" class="btn btn-secondary" onclick="closeSignTxModal()">Cancel</button>
          <button type="button" class="btn btn-primary" id="confirmSignTxBtn" onclick="confirmUnlock('${item.id}')">Sign Block &amp; Unlock</button>
        </div>
      </div>
    `;

    modal.classList.add("active");
  }

  function closeSignTxModal() {
    const modal = $("ledgerSignTxModal");
    if (modal) modal.classList.remove("active");
  }

  async function confirmUnlock(unlockId) {
    const btn = $("confirmSignTxBtn");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Signing with P-256...";
    }

    try {
      const res = await CompTIALedger.spendUnlock(unlockId);
      closeSignTxModal();
      if (!res.ok) {
        toast(`Transaction rejected: ${escapeSafe(res.error)}`, "warn");
        return;
      }

      if (global.TMABridge && typeof global.TMABridge.haptic === "function") {
        global.TMABridge.haptic("success");
      }
      spawnCoinShower();

      toast(
        `<strong>${res.item.icon || "⚡"} Unlocked: ${escapeSafe(res.item.name)}</strong><br><span style="color:var(--text-secondary);font-size:0.75rem;">Mined into Block #${res.block.index}</span>`,
        "earn"
      );

      await refreshWalletBadge();
      await renderLedgerModal();

      if (unlockId === "CYBER_THEME") {
        document.body.classList.add("theme-cyber-terminal");
      }
    } catch (err) {
      closeSignTxModal();
      toast(`Signature failed: ${escapeSafe((err && err.message) || err)}`, "warn");
    }
  }

  function escapeSafe(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function earnLimitNote(reward) {
    if (!reward) return "";
    const notes = [];
    if (reward.multiplier != null && reward.multiplier < 1) {
      notes.push(`repeat of today's quiz pays ${Math.round(reward.multiplier * 100)}%`);
    }
    if (reward.capped) notes.push("daily practice APX limit reached, XP still counts");
    if (reward.milestoneAlreadyClaimed) notes.push("pass bonus already claimed today for this exam");
    if (!notes.length) return "";
    return `<br><span style="color:var(--text-secondary);font-size:0.8rem;">${notes.join(" · ")}</span>`;
  }

  async function onExamComplete(result) {
    if (!global.CompTIALedger) return null;
    const out = await CompTIALedger.recordExamComplete(result);
    await refreshWalletBadge();

    if (global.TMABridge && typeof global.TMABridge.haptic === "function") {
      global.TMABridge.haptic("success");
    }
    spawnCoinShower();

    const rewardEl = $("apxExamRewardBanner");
    if (rewardEl) {
      rewardEl.style.display = "block";
      rewardEl.innerHTML = `
        <strong style="color:var(--accent-cyan);">+${out.reward.apx} APX</strong> mined into block
        <code>#${out.block.index}</code> (${shortHash(out.block.hash)})
        · +${out.reward.xp} XP
        ${out.minted.length ? ` · Achievements: ${out.minted.map((m) => m.payload.name).join(", ")}` : ""}
        ${earnLimitNote(out.reward)}
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
      if (global.TMABridge && typeof global.TMABridge.haptic === "function") {
        global.TMABridge.haptic("success");
      }
      spawnCoinShower();
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
      if (global.TMABridge && typeof global.TMABridge.haptic === "function") {
        global.TMABridge.haptic("success");
      }
      spawnCoinShower();
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
    toast(
      `Staked <strong>30 APX</strong> on ${escapeSafe(domainKey)}. Score 80%+ on a drill from tomorrow onward to get it back plus 12 APX.`,
      "earn"
    );
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
    try {
      const shield = await CompTIALedger.applyStreakShields();
      if (shield && shield.used > 0) {
        toast(
          `🛡️ <strong>Streak Shield used</strong> (${shield.used})<br>Your ${shield.streak}-day streak is safe. Study today to keep it going.`,
          "earn"
        );
      }
    } catch (err) {
      console.warn("Streak shield check failed:", err && err.message);
    }
    await refreshWalletBadge();
  }

  const OWNED_ACTIONS = {
    CRAM_SHEET: { label: "Print sheet", run: () => global.APlus && APlus.cramSheet && APlus.cramSheet.printAll() },
    WEAK_SCAN: { label: "Run scan", run: () => openDeficitScan() }
  };

  function useOwnedUnlock(unlockId) {
    const action = OWNED_ACTIONS[unlockId];
    if (!action) return;
    closeLedgerModal();
    action.run();
  }

  async function openDeficitScan() {
    if (!(await CompTIALedger.hasActiveUnlock("WEAK_SCAN"))) {
      toast("The Mastery Deficit Scan is a store unlock. Open the store to get it.", "warn");
      openLedgerModal();
      return;
    }
    const heatmap = global.APlus && APlus.masteryHeatmap;
    const report = heatmap && typeof heatmap.buildDeficitReport === "function" ? heatmap.buildDeficitReport() : null;
    if (!report) {
      toast("Mastery data is still loading. Try again in a moment.", "warn");
      return;
    }

    let modal = $("deficitScanModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "deficitScanModal";
      modal.className = "modal-overlay";
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.setAttribute("aria-labelledby", "deficitScanTitle");
      document.body.appendChild(modal);
    }

    const row = (o) => `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:0.75rem;padding:0.6rem 0.75rem;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-card);">
        <div style="min-width:0;">
          <strong>${o.exam === "core1" ? "Core 1" : "Core 2"} · ${escapeSafe(o.code)}</strong>
          <div style="font-size:0.78rem;color:var(--text-secondary);">${escapeSafe(o.title)}</div>
          <div style="font-size:0.72rem;color:var(--text-muted);">${o.correct}/${o.attempts} correct (${o.pct}%)</div>
        </div>
        <button type="button" class="btn btn-primary" style="font-size:0.78rem;padding:0.3rem 0.65rem;white-space:nowrap;" onclick="startDeficitDrill('${escapeSafe(o.code)}','${o.exam}')">Drill</button>
      </div>`;

    modal.innerHTML = `
      <div class="modal-card" style="max-width:640px;width:95%;max-height:90vh;overflow-y:auto;">
        <div class="modal-header" style="display:flex;justify-content:space-between;align-items:center;">
          <h3 id="deficitScanTitle" style="margin:0;">🔍 Mastery Deficit Scan</h3>
          <button type="button" class="btn btn-secondary btn-icon" onclick="closeDeficitScan()" aria-label="Close">X</button>
        </div>
        <p style="font-size:0.82rem;color:var(--text-secondary);margin:0.5rem 0 0.9rem;">
          Your weakest objectives across both exams, ranked by accuracy. Only objectives with at least ${report.minAttempts} answers are ranked.
        </p>
        <h4 style="margin:0 0 0.5rem;">Fix these first</h4>
        <div style="display:grid;gap:0.5rem;">
          ${report.weakest.length ? report.weakest.map(row).join("") : `<div style="font-size:0.85rem;color:var(--text-secondary);">No objective below ${report.weakThreshold}% yet. Keep practising to build a fuller picture.</div>`}
        </div>
        <h4 style="margin:1rem 0 0.5rem;">Not enough data yet (${report.untested.length})</h4>
        <div style="font-size:0.8rem;color:var(--text-secondary);line-height:1.5;">
          ${report.untested.slice(0, 20).map((o) => `${o.exam === "core1" ? "C1" : "C2"} ${escapeSafe(o.code)}`).join(" · ")}${report.untested.length > 20 ? " …" : ""}
        </div>
      </div>`;
    modal.classList.add("active");
  }

  function closeDeficitScan() {
    const modal = $("deficitScanModal");
    if (modal) modal.classList.remove("active");
  }

  function startDeficitDrill(code, exam) {
    closeDeficitScan();
    if (global.APlus && APlus.masteryHeatmap) APlus.masteryHeatmap.launchTargetedDrill(code, exam);
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
    promptUnlock,
    closeSignTxModal,
    confirmUnlock,
    useOwnedUnlock,
    openDeficitScan,
    toast
  };
  global.useOwnedUnlock = useOwnedUnlock;
  global.openDeficitScan = openDeficitScan;
  global.closeDeficitScan = closeDeficitScan;
  global.startDeficitDrill = startDeficitDrill;

  // Expose for inline onclick handlers
  global.openLedgerModal = openLedgerModal;
  global.closeLedgerModal = closeLedgerModal;
  global.claimDailyApx = claimDaily;
  global.stakeSelectedDomain = stakeSelectedDomain;
  global.exportPomLedger = exportLedger;
  global.verifyPomLedger = verifyNow;
  global.renderLedgerModal = renderLedgerModal;
  global.promptUnlock = promptUnlock;
  global.closeSignTxModal = closeSignTxModal;
  global.confirmUnlock = confirmUnlock;
})(window);
