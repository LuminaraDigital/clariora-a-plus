# Local agent training (research only)

Status: reference doc for workstation experiments.  
**Not** part of the Clariora learner product, `dist_web`, Electron packages, or Cloudflare Worker runtime.

Clariora production AI stays on the edge: Ghost Coach (CAR), Workers AI, Vectorize, D1 memories. See `docs/BIG_DATA_IMPLEMENTATION_PLAN.md` §6 / §11 and `docs/AGENT_WORKFLOW_IMPLEMENTATION_PLAN.md`.

---

## Hard rules

1. Do **not** vendor OpenManus, Hugging Face `datasets`, LoRA/SFT trainers, or model weights into this repo’s shipped trees (`js/`, `workers/`, `dist_web/`, desktop `resources/app/`).
2. Clone research repos under `%TEMP%\clariora-agent-research\` (Windows) or `/tmp/clariora-agent-research/` (Unix). Never commit parquet, JSONL dumps, or checkpoints.
3. Never fine-tune on CompTIA / vendor exam stems. Never paste bank shards into training sets.
4. Check each dataset license before commercial use. Mixed cards often include **CC-BY-NC** upstream sources.

---

## Suggested research clones

```text
%TEMP%\clariora-agent-research\OpenManus-RL
```

```powershell
New-Item -ItemType Directory -Force "$env:TEMP\clariora-agent-research" | Out-Null
git clone --depth 1 https://github.com/OpenManus/OpenManus-RL "$env:TEMP\clariora-agent-research\OpenManus-RL"
```

Code license for that repo is Apache-2.0. Dataset licensing is separate (below).

---

## Priority Hugging Face datasets (agent / tools / coding)

Convert everything to **one** chat+tool schema before mixing. Prefer verified / preference-filtered subsets.

### Agent and tool use

| Dataset | Role | Link |
| --- | --- | --- |
| OpenManus-RL | ReAct trajectories (~48.9k), env feedback, error recovery | https://huggingface.co/datasets/CharlieDreemur/OpenManus-RL |
| Nemotron-Agentic-v1 | Multi-turn tool use; commercial-friendly card (CC BY 4.0) | https://huggingface.co/datasets/nvidia/Nemotron-Agentic-v1 |
| Hermes Function Calling v1 | Cleaned multi-turn / single-turn function calling | https://huggingface.co/datasets/NousResearch/hermes-function-calling-v1 |
| xLAM Function Calling 60k | Broad API function-calling | https://huggingface.co/datasets/Salesforce/xlam-function-calling-60k |
| XLAM-Atropos | Function calling for RL / agent envs | https://huggingface.co/datasets/NousResearch/XLAM-Atropos |

**OpenManus-RL license warning:** dataset card lists mixed sources, including AgentInstruct (**CC-BY-NC-4.0**) and Agent-FLAN (Apache-2.0). Do not ship NC-derived weights or redistributed dumps inside Clariora.

### Coding agents

| Dataset | Role | Link |
| --- | --- | --- |
| SWE-Lego Real Data Verified | Gold-patch-validated GitHub issue trajectories | https://huggingface.co/datasets/PrimeIntellect/SWE-Lego-Real-Data-Verified |
| SWE-rebench OpenHands trajectories | Issue-solving agent rollouts | https://huggingface.co/datasets/nebius/SWE-rebench-openhands-trajectories |
| OpenHands CodeScout rollouts | Repo exploration / tool reasoning | https://huggingface.co/datasets/AmanPriyanshu/tool-reasoning-sft-RESEARCH-OpenHands-CodeScout_Training_Rollouts |

### Reasoning / chat / preference (supporting)

| Dataset | Role | Link |
| --- | --- | --- |
| OpenR1 Mixture-of-Thoughts | Verified reasoning traces | https://huggingface.co/datasets/open-r1/Mixture-of-Thoughts |
| OpenAssistant OASST1 | Human-rated conversations | https://huggingface.co/datasets/OpenAssistant/oasst1 |
| UltraFeedback / HelpSteer2 | Preference / DPO-style pairs | Search on Hugging Face for current cards |

---

## Target message schema (normalize before SFT)

```json
{
  "messages": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "tool_calls": [{"name": "...", "arguments": {}}]},
    {"role": "tool", "name": "...", "content": "..."},
    {"role": "assistant", "content": "..."}
  ]
}
```

Map OpenManus `conversations` / Hermes `from`+`value` / xLAM tool formats into this shape. Drop trajectories with fake tool results, prompt leakage, or unverified answers when possible.

---

## Compact mixture (local general agent)

```text
25%  SWE-Lego / OpenHands coding trajectories
20%  Nemotron-Agentic-v1
15%  Hermes + xLAM function calling
15%  OpenR1 reasoning
10%  OpenManus-RL (exclude NC-encumbered rows if commercial)
10%  OASST1 or UltraChat
5%   high-quality preference pairs
```

Stages: strong open instruct/coder base → LoRA/QLoRA SFT → DPO/ORPO → verifiable RL (unit tests, JSON schema, SWE-bench harness). This will **not** reproduce a frontier model by itself.

---

## How this relates to Clariora production

| Clariora production | Local training experiments |
| --- | --- |
| Workers AI Llama + BGE, Vectorize, coach tools | Your GPU / cloud training job |
| `tools/coach_eval_harness.js` for routing regressions | Separate eval suite on held-out agent tasks |
| Bank content authored and validated in `_bank/` | Never train on CompTIA copyrighted stems |

If a local experiment yields a useful **prompt or tool pattern**, port it as a reviewed Worker change. Do not ship the fine-tuned weights in the PWA.

---

## Explicit non-goals for this product repo

- Client-side 1B+ parameter models
- Hugging Face runtimes in Electron for every learner
- Auto-publishing LLM-generated exam shards
- Treating OpenManus-RL as a Ghost Coach model upgrade path
