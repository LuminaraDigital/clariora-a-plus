# 02 · The CompTIA Troubleshooting Methodology (Module 01)

Module 1 covers no specific exam objective by itself, but this methodology is referenced in nearly every other module and appears on **both** exams as an ordering question and as the frame for scenario questions. Learn it word-perfect.

## The six steps - exact wording

1. **Identify the problem**
2. **Establish a theory of probable cause** (question the obvious)
3. **Test the theory to determine the cause**
4. **Establish a plan of action to resolve the problem and implement the solution**
5. **Verify full system functionality and, if applicable, implement preventive measures**
6. **Document the findings, actions, and outcomes**

Mnemonic: **I**dentify · **E**stablish theory · **T**est · **E**stablish plan · **V**erify · **D**ocument → "**I ETVD**" or "**In Every Test, Everyone Verifies Documentation**".

## Step 1 - Identify the problem

What the course says to do:
- **Gather information from the user.** The four questions the deck lists:
  - What are the exact error messages (on screen or from the speaker/beeps)?
  - Is anyone else experiencing the same problem?
  - How long has the problem been occurring?
  - What changes have been made recently - by the user, or via another support request?
- **Perform backups** before doing anything. If the user is responsible for the system, verify *they* have done so.
- Inquire about environmental or infrastructure changes.

> **Exam trap:** "What is the FIRST thing a technician should do?" - the answer is almost always identify the problem / question the user / back up data. Never "reboot" or "reinstall".

## Step 2 - Establish a theory of probable cause

- **Question the obvious.** Is it plugged in, is it turned on, is the monitor input right. The deck stresses never overlooking a simple solution.
- Decide: hardware or software? Physical or logical?
- **Conduct research** - physically inspect, reproduce the problem, check system documentation, ask other technicians (including whoever worked on it last), read vendor docs, search online.
- If needed, consider multiple approaches: top-down / bottom-up / divide-and-conquer through the layers.

## Step 3 - Test the theory

- **Test each theory individually** to isolate the cause.
- If the theory is confirmed → move to step 4.
- If **not** confirmed → establish a **new theory**, or **escalate**.

### When to escalate (course wording)
Escalate if the issue is:
- Beyond your **skill** level
- Beyond your **knowledge** level
- **Out of scope** per company policy or warranty documentation

Escalation can be internal (another tech or department) or external (vendor / manufacturer). See file 17 for the tier model.

## Step 4 - Establish a plan of action and implement

- Options: **repair, replace, or workaround**.
- Determine whether repair is **cost-effective** - sometimes replacement is cheaper.
- Not every issue must be fully resolved; a workaround may be acceptable, but ensure it actually works.
- Refer to vendor instructions where applicable.

## Step 5 - Verify full system functionality

- Confirm the fix resolves the issue **and** the system is fully functional (not just the one symptom gone).
- **Implement preventive measures** to stop recurrence - patches, user training, monitoring.

## Step 6 - Document

The deck lists exactly what to record:
- **Parts used** - cost and point of purchase
- **Steps taken** - as thorough as possible; more detail is better
- **Tools used** - software or physical
- **Lessons learned**

Documentation feeds the ticket, the knowledge base, and future after-action reports (file 17).

## Priority and severity

- Address **critical systems** and the **most severe issues** first.
- Determine cause, symptoms, and consequences before choosing what to fix.

## Skills of an IT specialist (Lesson 1.1)

The exam won't test this directly, but it frames "professionalism" questions in Core 2:
- **Problem solving** - use a consistent process (this methodology).
- **Communication** - written and oral, effective.
- **Organisation** - clean workspace = easier to find tools/parts; organise thoughts before communicating to stakeholders.
- **Technical knowledge** - hardware, software (OS + apps), networking, cloud, security.

## Applying the methodology - worked examples

| Symptom reported | Step 1 questions | Likely theory | Test | Fix |
|---|---|---|---|---|
| "My PC won't turn on" | Any lights/fans? Recent move? Power strip? | Power path: outlet → cable → PSU → board | Try known-good outlet, PSU tester | Replace PSU / cable |
| "Internet is down" | Just you? Wired or Wi-Fi? Any recent change? | IP config / DHCP / gateway | `ipconfig`, ping loopback → own IP → gateway → 8.8.8.8 | Renew lease, fix cable, restart router |
| "Print comes out smudged" | Which printer? All jobs? | Fuser not fusing | Rub the page - toner comes off | Replace fuser |
| "Laptop battery swollen" | - | Battery failure | Visual | Stop using immediately, remove, dispose properly |

## Self-test (answer aloud before looking back)
1. Name all six steps in order.
2. What four questions does the course say to ask the user in step 1?
3. What must you do before making any change to a system?
4. Give the three conditions under which you escalate.
5. In step 4, what three kinds of resolution are possible?
6. What four things should the documentation record?
7. A user reports a problem. What is the FIRST thing you do?
