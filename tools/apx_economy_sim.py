#!/usr/bin/env python3
"""
APX economy Monte Carlo simulator.

Models casual / daily / grind / cheater personas against ledger_engine.js
parameter contract (tools/apx_economy_params.json).

Exit 0 when daily-persona bands hold and cheater/daily inflation ratio <= max.
Exit 1 with a JSON report otherwise (or with --baseline-red documenting leak).
"""
from __future__ import annotations

import argparse
import json
import math
import random
import statistics
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PARAMS = ROOT / "tools" / "apx_economy_params.json"


def load_params(path: Path) -> Dict[str, Any]:
    with path.open(encoding="utf-8") as f:
        return json.load(f)


@dataclass
class DayMint:
    practice: float = 0.0
    side: float = 0.0
    stake_yield: float = 0.0
    ach: float = 0.0

    @property
    def total(self) -> float:
        return self.practice + self.side + self.stake_yield + self.ach


@dataclass
class AgentResult:
    persona: str
    days_to_pro: Optional[int]
    cap_hit_rate: float
    unspent_30: float
    sink_velocity: float
    burn_ratio: float
    inflation: float
    practice_share: float
    mint_total: float
    burn_total: float


def clip_budget(raw: Dict[str, float], budget: float, memory_soft: float) -> Dict[str, float]:
    """Priority: practice > milestone > quest > study > pbq > plan > memory > checkin > stake_yield."""
    order = [
        "practice",
        "milestone",
        "quest",
        "study",
        "pbq",
        "plan",
        "memory",
        "checkin",
        "stake_yield",
    ]
    out = {k: 0.0 for k in order}
    remaining = budget
    mem_left = memory_soft
    for key in order:
        want = max(0.0, float(raw.get(key, 0.0)))
        if key == "memory":
            want = min(want, mem_left)
        take = min(want, remaining)
        out[key] = take
        remaining -= take
        if key == "memory":
            mem_left -= take
    return out


def persona_raw_day(persona: str, rng: random.Random, day: int, params: Dict[str, Any]) -> Tuple[Dict[str, float], bool]:
    """Return raw mint buckets and whether the agent is active today."""
    p_cap = float(params["examPracticeDailyCap"])
    if persona == "casual":
        if rng.random() > 3 / 7:
            return {}, False
        practice = max(0.0, min(p_cap, rng.gauss(45, 12)))
        raw = {
            "practice": practice,
            "milestone": 0.0,
            "quest": 20.0 if rng.random() < 0.5 else 0.0,
            "study": 6.0,
            "pbq": 18.0 if rng.random() < 0.15 else 0.0,
            "plan": 5.0 if rng.random() < 0.3 else 0.0,
            "memory": 0.0,
            "checkin": 0.0,
            "stake_yield": 0.0,
        }
        return raw, True

    if persona == "daily":
        practice = max(40.0, min(p_cap, rng.gauss(95, 15)))
        recalls = rng.randint(8, 20)
        raw = {
            "practice": practice,
            "milestone": 50.0 if day % 7 == 0 else 0.0,
            "quest": 40.0,
            "study": 9.0,
            "pbq": 18.0 if rng.random() < 0.4 else 0.0,
            "plan": 10.0,
            "memory": recalls * 4.0 + (25.0 if rng.random() < 0.5 else 0.0),
            "checkin": 0.0,
            "stake_yield": 5.0 if day % 7 == 3 else 0.0,
        }
        return raw, True

    if persona == "grind":
        recalls = rng.randint(40, 80)
        raw = {
            "practice": p_cap,
            "milestone": 50.0 if day % 3 == 0 else 0.0,
            "quest": 45.0,
            "study": 24.0,
            "pbq": 36.0,
            "plan": 25.0,
            "memory": recalls * 5.0 + 25.0,
            "checkin": 20.0,
            "stake_yield": 5.0,
        }
        return raw, True

    # cheater: forge / uncapped side spam
    raw = {
        "practice": p_cap,
        "milestone": 80.0,
        "quest": 45.0,
        "study": 80.0,
        "pbq": 54.0,
        "plan": 40.0,
        "memory": 400.0,
        "checkin": 40.0,
        "stake_yield": 36.0,
    }
    return raw, True


def apply_params_or_legacy(raw: Dict[str, float], params: Dict[str, Any], use_budget: bool) -> DayMint:
    if not use_budget:
        practice = min(raw.get("practice", 0.0), float(params["examPracticeDailyCap"]))
        side = sum(
            raw.get(k, 0.0)
            for k in ("milestone", "quest", "study", "pbq", "plan", "memory", "checkin")
        )
        return DayMint(practice=practice, side=side, stake_yield=raw.get("stake_yield", 0.0))

    clipped = clip_budget(
        raw,
        float(params["globalDailyApxBudget"]),
        float(params.get("memoryDailySoftCap", 40)),
    )
    practice = clipped["practice"]
    side = sum(clipped[k] for k in ("milestone", "quest", "study", "pbq", "plan", "memory", "checkin"))
    return DayMint(practice=practice, side=side, stake_yield=clipped["stake_yield"])


def simulate_agent(
    persona: str,
    params: Dict[str, Any],
    days: int,
    rng: random.Random,
    use_budget: bool,
) -> AgentResult:
    balance = float(params["genesis"])
    pro_cost = float(params["proPassCost"])
    practice_cap = float(params["examPracticeDailyCap"])
    mint_total = 0.0
    burn_total = 0.0
    practice_mint = 0.0
    side_mint = 0.0
    active_days = 0
    cap_hits = 0
    days_to_pro: Optional[int] = None
    bought_pro = False

    for day in range(1, days + 1):
        raw, active = persona_raw_day(persona, rng, day, params)
        if not active:
            continue
        active_days += 1
        mint = apply_params_or_legacy(raw, params, use_budget)
        if mint.practice >= practice_cap - 1e-6:
            cap_hits += 1
        day_mint = mint.total
        balance += day_mint
        mint_total += day_mint
        practice_mint += mint.practice
        side_mint += mint.side + mint.stake_yield

        spent = 0.0
        if not bought_pro and balance >= pro_cost:
            balance -= pro_cost
            spent += pro_cost
            bought_pro = True
            days_to_pro = day
        elif bought_pro and balance >= 90 and rng.random() < 0.35:
            balance -= 90
            spent += 90
        burn_total += spent

    denom = practice_mint + side_mint
    practice_share = (practice_mint / denom) if denom > 0 else 0.0
    sink_vel = burn_total / days
    burn_ratio = (burn_total / mint_total) if mint_total > 0 else 0.0
    return AgentResult(
        persona=persona,
        days_to_pro=days_to_pro,
        cap_hit_rate=(cap_hits / active_days) if active_days else 0.0,
        unspent_30=balance,
        sink_velocity=sink_vel,
        burn_ratio=burn_ratio,
        inflation=mint_total / days,
        practice_share=practice_share,
        mint_total=mint_total,
        burn_total=burn_total,
    )


def percentile(xs: List[float], p: float) -> float:
    if not xs:
        return float("nan")
    ys = sorted(xs)
    if len(ys) == 1:
        return ys[0]
    k = (len(ys) - 1) * p
    f = math.floor(k)
    c = math.ceil(k)
    if f == c:
        return ys[int(k)]
    return ys[f] * (c - k) + ys[c] * (k - f)


def summarize(results: List[AgentResult]) -> Dict[str, Any]:
    days = [r.days_to_pro for r in results if r.days_to_pro is not None]
    never = sum(1 for r in results if r.days_to_pro is None) / max(1, len(results))
    return {
        "n": len(results),
        "median_days_to_pro": statistics.median(days) if days else None,
        "p10_days": percentile([float(d) for d in days], 0.1) if days else None,
        "p90_days": percentile([float(d) for d in days], 0.9) if days else None,
        "never_pct": never,
        "median_cap_hit": statistics.median([r.cap_hit_rate for r in results]),
        "median_unspent": statistics.median([r.unspent_30 for r in results]),
        "median_sink_vel": statistics.median([r.sink_velocity for r in results]),
        "median_burn_ratio": statistics.median([r.burn_ratio for r in results]),
        "median_inflation": statistics.median([r.inflation for r in results]),
        "median_practice_share": statistics.median([r.practice_share for r in results]),
    }


def monte_carlo(
    params: Dict[str, Any],
    n: int,
    days: int,
    use_budget: bool,
    seed: int = 0,
) -> Dict[str, Any]:
    personas = ["casual", "daily", "grind", "cheater"]
    out: Dict[str, Any] = {"params": {"use_budget": use_budget, "n": n, "days": days}, "by_persona": {}}
    for persona in personas:
        results = [
            simulate_agent(persona, params, days, random.Random(seed + i * 17 + hash(persona) % 997), use_budget)
            for i in range(n)
        ]
        out["by_persona"][persona] = summarize(results)
    daily_inf = out["by_persona"]["daily"]["median_inflation"] or 1.0
    cheat_inf = out["by_persona"]["cheater"]["median_inflation"] or 0.0
    out["cheater_daily_inflation_ratio"] = cheat_inf / daily_inf if daily_inf else float("inf")
    return out


def assert_bands(report: Dict[str, Any], params: Dict[str, Any]) -> Tuple[bool, List[str], str]:
    bands = params["bands"]
    daily = report["by_persona"]["daily"]
    issues: List[str] = []
    zone = "green"

    d = daily["median_days_to_pro"]
    lo, hi = bands["daysToPro"]
    if d is None:
        issues.append("daily never reaches Pro Pass within horizon")
        zone = "red"
    else:
        if d < 7 or d > 28:
            issues.append(f"days_to_pro={d} outside hard Red [7,28]")
            zone = "red"
        elif not (lo <= d <= hi):
            issues.append(f"days_to_pro={d} outside target [{lo},{hi}]")
            if zone != "red":
                zone = "yellow"

    share = daily["median_practice_share"]
    if share < 0.45:
        issues.append(f"practice_share={share:.3f} < 0.45 (Red)")
        zone = "red"
    elif share < bands["practiceShareMin"]:
        issues.append(f"practice_share={share:.3f} < {bands['practiceShareMin']}")
        if zone != "red":
            zone = "yellow"

    alpha = report["cheater_daily_inflation_ratio"]
    if alpha > 2.0:
        issues.append(f"cheater/daily inflation α={alpha:.2f} > 2 (Red)")
        zone = "red"
    elif alpha > bands["cheaterInflationMax"]:
        issues.append(f"cheater/daily inflation α={alpha:.2f} > {bands['cheaterInflationMax']}")
        if zone != "red":
            zone = "yellow"

    unspent = daily["median_unspent"]
    ulo, uhi = bands["unspent30"]
    if unspent < ulo or unspent > uhi * 2:
        if unspent > 2000 or unspent < 0:
            issues.append(f"unspent_30={unspent:.0f} Red-ish")
            if zone == "green":
                zone = "yellow"
        elif not (ulo <= unspent <= uhi):
            issues.append(f"unspent_30={unspent:.0f} outside [{ulo},{uhi}]")
            if zone == "green":
                zone = "yellow"

    ok = zone == "green" and not issues
    return ok, issues, zone


def suggest_delta(report: Dict[str, Any], params: Dict[str, Any]) -> Dict[str, Any]:
    """Yellow-zone deterministic suggestions. Never writes files."""
    daily = report["by_persona"]["daily"]
    d = daily["median_days_to_pro"]
    share = daily["median_practice_share"]
    budget = int(params["globalDailyApxBudget"])
    mem = int(params.get("memoryDailySoftCap", 40))
    yield_rate = float(params["stakeYieldRate"])
    lo, hi = params["bands"]["daysToPro"]
    patch: Dict[str, Any] = {}
    if d is not None:
        if d < lo:
            budget = max(120, budget - 10 * math.ceil((lo - d) / 2))
            patch["globalDailyApxBudget"] = budget
        elif d > hi:
            budget = min(200, budget + 10 * math.ceil((d - hi) / 2))
            patch["globalDailyApxBudget"] = budget
    if share < params["bands"]["practiceShareMin"]:
        mem = max(10, mem - 10)
        patch["memoryDailySoftCap"] = mem
    alpha = report["cheater_daily_inflation_ratio"]
    if alpha > params["bands"]["cheaterInflationMax"]:
        patch["note"] = "caps not binding on forge path; keep Red until typed mint / server points"
    if abs(yield_rate - 0.15) > 1e-9 and d is not None and d < lo:
        patch["stakeYieldRate"] = max(0.05, round(yield_rate - 0.05, 2))
    return patch


def main(argv: Optional[List[str]] = None) -> int:
    ap = argparse.ArgumentParser(description="APX economy Monte Carlo")
    ap.add_argument("--params", type=Path, default=DEFAULT_PARAMS)
    ap.add_argument("--n", type=int, default=200)
    ap.add_argument("--days", type=int, default=30)
    ap.add_argument("--seed", type=int, default=0)
    ap.add_argument("--ci", action="store_true", help="Exit 1 unless Green bands hold")
    ap.add_argument(
        "--legacy",
        action="store_true",
        help="Simulate pre-rebalance (no global budget) to document Red baseline",
    )
    ap.add_argument("--suggest", action="store_true", help="Print Yellow param suggestions")
    ap.add_argument("--json-out", type=Path, default=None)
    args = ap.parse_args(argv)

    params = load_params(args.params)
    use_budget = not args.legacy
    report = monte_carlo(params, args.n, args.days, use_budget=use_budget, seed=args.seed)
    ok, issues, zone = assert_bands(report, params)
    report["zone"] = zone
    report["ok"] = ok
    report["issues"] = issues
    if args.suggest or zone == "yellow":
        report["suggest"] = suggest_delta(report, params)

    text = json.dumps(report, indent=2)
    print(text)
    if args.json_out:
        args.json_out.write_text(text, encoding="utf-8")

    if args.legacy:
        # Document baseline leak; always exit 0 so CI can archive the report.
        print("NOTE: --legacy run documents Red baseline; not a pass/fail gate.", file=sys.stderr)
        return 0

    if args.ci:
        return 0 if ok else 1
    return 0 if zone != "red" else 1


if __name__ == "__main__":
    raise SystemExit(main())
