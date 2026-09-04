"""
practice_exam.py
CompTIA A+ (Core 1 & Core 2) Terminal Practice Exam Engine
Runs authentic 90-minute, 90-question simulations with 100-900 scaled scoring.
"""

import json
import os
import random
import sys
import time

# ANSI color codes for rich terminal display
class Color:
    RESET = "\033[0m"
    BOLD = "\033[1m"
    CYAN = "\033[96m"
    BLUE = "\033[94m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    MAGENTA = "\033[95m"
    GRAY = "\033[90m"

HISTORY_FILE = ".exam_history.json"

def load_exam_data():
    if not os.path.exists("exam_data.json"):
        print(f"{Color.RED}Error: exam_data.json not found! Run generate_complete_exam_bank.py first.{Color.RESET}")
        sys.exit(1)
    with open("exam_data.json", "r", encoding="utf-8") as f:
        return json.load(f)

def load_history():
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {"history": [], "missed": []}
    return {"history": [], "missed": []}

def save_history(data):
    try:
        with open(HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Warning: could not save history: {e}")

def calculate_scaled_score(correct, total):
    if total == 0:
        return 100
    # CompTIA scaled formula: 100 - 900
    return round(100 + (800 * (correct / total)))

def print_header(title):
    print(f"\n{Color.CYAN}{'=' * 75}{Color.RESET}")
    print(f"{Color.BOLD}{Color.CYAN}   {title}{Color.RESET}")
    print(f"{Color.CYAN}{'=' * 75}{Color.RESET}\n")

def run_exam_session(questions, time_limit_minutes, exam_title, passing_score=675):
    random.shuffle(questions)
    total_q = len(questions)
    time_limit_sec = time_limit_minutes * 60
    start_time = time.time()

    print_header(f"{exam_title} ({total_q} Questions · {time_limit_minutes} Mins)")
    print(f"{Color.YELLOW}• Passing Score: {passing_score} / 900 (CompTIA Standard Scale){Color.RESET}")
    print(f"{Color.YELLOW}• Type A, B, C, or D for your answer.{Color.RESET}")
    print(f"{Color.YELLOW}• Type 'skip' to defer a question or 'quit' to finish early.{Color.RESET}\n")

    user_answers = {}
    letters = ["A", "B", "C", "D"]

    for idx, q in enumerate(questions):
        elapsed = time.time() - start_time
        remaining = max(0, time_limit_sec - elapsed)
        rem_m = int(remaining // 60)
        rem_s = int(remaining % 60)

        if elapsed >= time_limit_sec and time_limit_minutes > 0:
            print(f"\n{Color.RED}⏰ Time has expired! Scoring your exam now...{Color.RESET}\n")
            break

        timer_str = f"[{rem_m:02d}:{rem_s:02d} remaining]" if time_limit_minutes > 0 else "[Untimed]"
        print(f"{Color.BOLD}{Color.BLUE}───────────────────────────────────────────────────────────────────────────{Color.RESET}")
        print(f"{Color.BOLD}Question {idx + 1} of {total_q}  {Color.MAGENTA}[{q.get('domain', 'General')}]{Color.RESET}  {Color.GRAY}{timer_str}{Color.RESET}")
        print(f"\n{q['question']}\n")

        for opt_idx, opt_text in enumerate(q['options']):
            print(f"  {Color.CYAN}{letters[opt_idx]}){Color.RESET} {opt_text}")
        print()

        while True:
            choice = input(f"{Color.BOLD}Your Choice (A-D): {Color.RESET}").strip().upper()
            if choice == "QUIT":
                print(f"{Color.YELLOW}Exiting exam early...{Color.RESET}")
                return finish_scoring(questions[:idx], user_answers, passing_score, exam_title)
            elif choice == "SKIP":
                print(f"{Color.GRAY}Question skipped.{Color.RESET}\n")
                break
            elif choice in letters:
                user_answers[idx] = letters.index(choice)
                print(f"{Color.GREEN}Selected: {choice}{Color.RESET}\n")
                break
            else:
                print(f"{Color.RED}Invalid input. Please enter A, B, C, D, 'skip', or 'quit'.{Color.RESET}")

    return finish_scoring(questions, user_answers, passing_score, exam_title)

def finish_scoring(questions, user_answers, passing_score, exam_title):
    total = len(questions)
    correct_count = 0
    domain_stats = {}
    missed_list = []
    letters = ["A", "B", "C", "D"]

    for idx, q in enumerate(questions):
        domain = q.get('domain', 'General')
        if domain not in domain_stats:
            domain_stats[domain] = {"total": 0, "correct": 0}
        domain_stats[domain]["total"] += 1

        ans = user_answers.get(idx)
        if ans is not None and ans == q['answer']:
            correct_count += 1
            domain_stats[domain]["correct"] += 1
        else:
            missed_list.append((q, ans))

    scaled_score = calculate_scaled_score(correct_count, total)
    is_passed = (scaled_score >= passing_score)
    pct = (correct_count / total * 100) if total > 0 else 0

    print_header("COMPTIA A+ SCORE REPORT & DIAGNOSTICS")

    if is_passed:
        status_banner = f"{Color.BOLD}{Color.GREEN}🎉 CONGRATULATIONS! YOU PASSED! 🎉{Color.RESET}"
    else:
        status_banner = f"{Color.BOLD}{Color.RED}⚠️ DID NOT PASS - FURTHER STUDY REQUIRED{Color.RESET}"

    print(f"  {status_banner}\n")
    print(f"  {Color.BOLD}Scaled Score:{Color.RESET}   {Color.CYAN}{scaled_score} / 900{Color.RESET}  (Passing: {passing_score})")
    print(f"  {Color.BOLD}Raw Score:{Color.RESET}      {correct_count} / {total} ({pct:.1f}% accuracy)")
    print(f"  {Color.BOLD}Exam Track:{Color.RESET}     {exam_title}")
    print(f"\n{Color.BOLD}Domain Competency Breakdown:{Color.RESET}")
    print(f"  {'Domain':<45} {'Score':<12} {'Pct':<8} {'Status'}")
    print(f"  {'-' * 70}")

    for dom, stats in sorted(domain_stats.items()):
        d_pct = (stats['correct'] / stats['total'] * 100) if stats['total'] > 0 else 0
        status_tag = f"{Color.GREEN}Proficient{Color.RESET}" if d_pct >= 80 else (f"{Color.YELLOW}Review{Color.RESET}" if d_pct >= 65 else f"{Color.RED}Critical{Color.RESET}")
        print(f"  {dom:<45} {stats['correct']}/{stats['total']:<9} {d_pct:>5.1f}%   {status_tag}")

    print(f"  {'-' * 70}\n")

    # Update history store
    hist = load_history()
    hist_record = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "exam": exam_title,
        "score": scaled_score,
        "passed": is_passed,
        "raw": f"{correct_count}/{total}",
        "pct": f"{pct:.1f}%"
    }
    hist["history"].append(hist_record)
    new_missed_ids = [q['id'] for q, _ in missed_list if 'id' in q]
    all_missed = set(hist.get("missed", []) + new_missed_ids)
    hist["missed"] = list(all_missed)
    save_history(hist)

    if missed_list:
        print(f"{Color.YELLOW}You missed {len(missed_list)} question(s).{Color.RESET}")
        rev = input(f"Would you like to review explanations for missed questions now? (y/n): ").strip().lower()
        if rev == 'y':
            for idx, (q, user_ans) in enumerate(missed_list):
                print(f"\n{Color.BOLD}{Color.RED}[Missed Question {idx + 1}]{Color.RESET} {q['question']}")
                correct_letter = letters[q['answer']]
                user_letter = letters[user_ans] if user_ans is not None else "Skipped"
                print(f"  {Color.RED}Your Answer:    {user_letter}) {q['options'][user_ans] if user_ans is not None else ''}{Color.RESET}")
                print(f"  {Color.GREEN}Correct Answer: {correct_letter}) {q['options'][q['answer']]}{Color.RESET}")
                print(f"\n  {Color.CYAN}Senior Technician Explanation:{Color.RESET}")
                print(f"  {q['explanation']}\n")
                input("Press Enter for next missed question...")

def main_menu():
    db = load_exam_data()
    core1_qs = db.get("core1", [])
    core2_qs = db.get("core2", [])

    while True:
        hist = load_history()
        missed_count = len(hist.get("missed", []))

        print_header("CompTIA A+ (Core 1 & Core 2) Master Practice Exam Engine")
        print("Select an option:")
        print(f"  {Color.CYAN}1.{Color.RESET} CompTIA A+ Core 1 Full Exam Simulation (90 Questions, 90 Mins, Pass: 675)")
        print(f"  {Color.CYAN}2.{Color.RESET} CompTIA A+ Core 2 Full Exam Simulation (90 Questions, 90 Mins, Pass: 700)")
        print(f"  {Color.CYAN}3.{Color.RESET} Combined Mega Certification Simulation (90 Mixed Questions, 90 Mins)")
        print(f"  {Color.CYAN}4.{Color.RESET} Quick High-Yield Drill (30 Questions, 30 Mins)")
        print(f"  {Color.CYAN}5.{Color.RESET} Domain Mastery Drill (Select Specific Domain, Untimed)")
        print(f"  {Color.CYAN}6.{Color.RESET} Drill Missed Questions ({missed_count} saved)")
        print(f"  {Color.CYAN}7.{Color.RESET} View Past Exam Scores & Statistics")
        print(f"  {Color.CYAN}8.{Color.RESET} Launch Interactive Web Simulator in Browser")
        print(f"  {Color.CYAN}9.{Color.RESET} Exit")
        print()

        choice = input(f"{Color.BOLD}Enter choice (1-9): {Color.RESET}").strip()

        if choice == "1":
            run_exam_session(list(core1_qs), 90, "CompTIA A+ Core 1 (220-1101/1201) Full Exam", passing_score=675)
        elif choice == "2":
            run_exam_session(list(core2_qs), 90, "CompTIA A+ Core 2 (220-1102/1202) Full Exam", passing_score=700)
        elif choice == "3":
            combined = list(core1_qs) + list(core2_qs)
            run_exam_session(combined[:90], 90, "CompTIA A+ Combined Mega Exam", passing_score=675)
        elif choice == "4":
            c_type = input("Choose Core 1 or Core 2 for quick drill (1 or 2): ").strip()
            pool = list(core1_qs) if c_type == "1" else list(core2_qs)
            p_score = 675 if c_type == "1" else 700
            run_exam_session(pool[:30], 30, f"Quick Drill Core {c_type}", passing_score=p_score)
        elif choice == "5":
            print("\nDomains available:")
            all_domains = sorted(list(set([q.get('domain', 'General') for q in core1_qs + core2_qs])))
            for d_idx, d in enumerate(all_domains):
                print(f"  {d_idx + 1}. {d}")
            d_choice = input(f"Select domain number (1-{len(all_domains)}): ").strip()
            try:
                sel_dom = all_domains[int(d_choice) - 1]
                dom_qs = [q for q in core1_qs + core2_qs if q.get('domain') == sel_dom]
                run_exam_session(dom_qs, 0, f"Domain Drill: {sel_dom}", passing_score=675)
            except Exception:
                print("Invalid selection.")
        elif choice == "6":
            if missed_count == 0:
                print(f"\n{Color.GREEN}No missed questions currently stored! Take an exam first.{Color.RESET}\n")
            else:
                all_qs = core1_qs + core2_qs
                missed_pool = [q for q in all_qs if q.get('id') in hist.get('missed', [])]
                run_exam_session(missed_pool, 0, "Missed Questions Targeted Drill", passing_score=675)
        elif choice == "7":
            print_header("Exam Attempt History")
            h_list = hist.get("history", [])
            if not h_list:
                print("No attempts recorded yet.")
            else:
                for r in h_list[-10:]:
                    stat_col = Color.GREEN if r.get('passed') else Color.RED
                    print(f"• {r.get('timestamp')} | {r.get('exam')} | Score: {r.get('score')}/900 | Accuracy: {r.get('pct')} | {stat_col}{'PASSED' if r.get('passed') else 'FAILED'}{Color.RESET}")
            print()
            input("Press Enter to continue...")
        elif choice == "8":
            html_path = os.path.abspath("A_Plus_Exam_Simulator.html")
            print(f"Opening {html_path} in default browser...")
            if sys.platform == "win32":
                os.system(f'start "" "{html_path}"')
            elif sys.platform == "darwin":
                os.system(f'open "{html_path}"')
            else:
                os.system(f'xdg-open "{html_path}"')
        elif choice == "9":
            print("\nGood luck with your CompTIA A+ certification!")
            break
        else:
            print("Invalid option.")

if __name__ == "__main__":
    main_menu()
