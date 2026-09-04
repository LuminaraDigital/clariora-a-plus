#!/usr/bin/env python3
"""Build the NEW-C1T shard: 50 new Core 1 Hardware and Network Troubleshooting
questions (objectives 5.1-5.6), schema v3, senior datacenter-technician voice.

Run from ROOT:  python tools/build_core1_new_5x.py
Output:         _bank/shards/core1_new_5x.json
"""
import json
import os
import re
import sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

DOMAIN = "5.0 Hardware and Network Troubleshooting"

# Professor Messer 220-1201 videos, one per objective 5.1-5.6.
VID = {
    "5.1": {"title": "Troubleshooting Hardware - CompTIA A+ 220-1201 - 5.1",
            "url": "https://www.youtube.com/watch?v=HgeURynWn_w", "duration": "25:15", "objective": "5.1"},
    "5.2": {"title": "Troubleshooting Storage Devices - CompTIA A+ 220-1201 - 5.2",
            "url": "https://www.youtube.com/watch?v=aVIuyHCNPCE", "duration": "17:04", "objective": "5.2"},
    "5.3": {"title": "Troubleshooting Display Issues - CompTIA A+ 220-1201 - 5.3",
            "url": "https://www.youtube.com/watch?v=KXZu72i1eX8", "duration": "18:52", "objective": "5.3"},
    "5.4": {"title": "Troubleshooting Mobile Devices - CompTIA A+ 220-1201 - 5.4",
            "url": "https://www.youtube.com/watch?v=huQwiY4kiko", "duration": "17:52", "objective": "5.4"},
    "5.5": {"title": "Troubleshooting Networks - CompTIA A+ 220-1201 - 5.5",
            "url": "https://www.youtube.com/watch?v=VBDS_kOHhVk", "duration": "15:15", "objective": "5.5"},
    "5.6": {"title": "Troubleshooting Printers - CompTIA A+ 220-1201 - 5.6",
            "url": "https://www.youtube.com/watch?v=_BhO_nYod0o", "duration": "11:55", "objective": "5.6"},
}

# From tools/objective_notes_map.json (core1)
NOTES = {
    "5.1": "08_BIOS_UEFI_Hardware_Troubleshooting.md",
    "5.2": "06_Storage_and_RAID.md",
    "5.3": "08_BIOS_UEFI_Hardware_Troubleshooting.md",
    "5.4": "30_Mobile_Security_and_Troubleshooting.md",
    "5.5": "20_Windows_Networking_and_Troubleshooting_Tools.md",
    "5.6": "16_Printers.md",
}


def q(question, objective, options, answer, explanation, distractors, qtype="single",
      difficulty="medium", answers=None, sequence=None, pairs=None, tags=None):
    """Assemble one schema-v3 question dict."""
    obj = {
        "exam": "core1",
        "domain": DOMAIN,
        "objective": objective,
        "type": qtype,
        "difficulty": difficulty,
        "question": question,
        "explanation": explanation,
        "video_reference": dict(VID[objective]),
        "notes_reference": NOTES[objective],
        "tags": list(tags) if tags else ["troubleshooting"],
    }
    if qtype == "single":
        obj["options"] = options
        obj["answer"] = answer
        obj["distractor_analysis"] = {str(i): distractors[i] for i in distractors}
    elif qtype == "multi":
        obj["options"] = options
        obj["answers"] = answers
        obj["distractor_analysis"] = {str(i): distractors[i] for i in distractors}
    elif qtype == "order":
        obj["sequence"] = sequence
    elif qtype == "match":
        obj["pairs"] = pairs
    return obj


QUESTIONS = []


def add(o):
    QUESTIONS.append(o)


# ---------------------------------------------------------------------------
# 5.1 Troubleshooting hardware (10 questions: 9 single, 1 order)
# ---------------------------------------------------------------------------
add(q(
    "A technician picks up a trouble ticket for a rack server that failed overnight. Following the CompTIA troubleshooting methodology, which action belongs to the very first step after the ticket is opened?",
    "5.1",
    ["Back up the server configuration before touching the hardware",
     "Interview the overnight staff and review the logs to identify the problem",
     "Replace the most recently changed component, since it probably failed",
     "Escalate to the hardware vendor support line immediately"],
    1,
    "Step one of the CompTIA methodology is to identify the problem: gather information from the people who were present, interrogate logs and monitoring, and form a factual picture before theorizing. Questioning the overnight staff and reading the system logs is exactly that step. Backing up configuration is a change-control safeguard, not the first troubleshooting step. Swapping the most recently changed component skips straight to a fix without a tested theory, which is guessing. Vendor escalation comes after internal diagnosis or when the fault is contractually theirs to fix.",
    {0: "Configuration backups are good change-management hygiene, but they do not identify the fault; that is a pre-change safeguard, not step one.",
     2: "Jumping to part replacement without a tested theory violates the methodology; the newest change is a lead worth investigating, not a diagnosis.",
     3: "Escalation belongs later in the process, once the problem is identified and internal fixes are exhausted or out of scope."},
    difficulty="easy", tags=["methodology", "troubleshooting", "best-practices"]))

add(q(
    "A technician is racking a freshly built workstation and hears one long beep followed by two short beeps on an AMI BIOS when it first powers on. The screen never initializes. Which subsystem should the technician inspect first?",
    "5.1",
    ["The power supply, because a single long beep indicates a PSU rail failure",
     "The RAM seating and compatibility, because this pattern points to a memory failure",
     "The boot drive, because beeps during POST mean the OS loader is missing",
     "The network card, because PXE boot failures trigger beep codes"],
    1,
    "On AMI BIOS, one long beep followed by two short beeps is the classic memory-failure POST code: reseat the modules, test them one at a time, and verify they are on the board's qualified-vendor list. Beep codes fire during POST, long before the operating system loads, so the boot drive cannot be the trigger. A PSU rail collapse usually gives no POST at all or a different vendor-specific pattern, and a PXE or NIC fault does not produce this signature.",
    {0: "AMI documents this pattern as a memory error; power rail faults typically give no beeps or a different code entirely.",
     2: "Beep codes are emitted during POST, long before the OS loader runs, so the drive is not involved.",
     3: "Network boot problems do not raise this beep pattern on AMI boards."},
    difficulty="hard", tags=["post", "beep-codes", "memory", "bios"]))

add(q(
    "A user reports their workstation loses BIOS settings, boots to a wrong date, and shows a CMOS checksum error after every power-down. The machine otherwise runs fine all day. What should the technician do first?",
    "5.1",
    ["Flash the BIOS to the latest firmware to clear the corruption",
     "Replace the CMOS battery and re-enter the settings",
     "RMA the motherboard, since NVRAM is failing",
     "Disable secure boot so the UEFI can rewrite its settings"],
    1,
    "Settings surviving while powered but vanishing after shutdown, plus a clock reset and a checksum complaint, is the textbook weak CMOS battery. The cell only has to hold NVRAM while mains power is off, which matches the symptom pattern exactly. A firmware flash risks bricking the board and does nothing for a cell that can no longer hold a charge. This is not NVRAM silicon failure, because the settings persist fine during runtime. Secure boot has no role in retaining BIOS settings.",
    {0: "Flashing firmware rewrites flash storage, but a dying coin cell cannot hold settings while power is off regardless of the firmware version.",
     2: "NVRAM silicon failure would corrupt settings while the machine is running too, not only after power loss.",
     3: "Secure boot governs boot trust, not whether settings persist across a power-down."},
    difficulty="medium", tags=["cmos", "bios", "motherboard"]))

add(q(
    "A technician finds a 2U server in rack B12 that powers on but never completes POST, with no beeps and no video. The same server worked yesterday. Following the methodology, which theory should be tested first because it is the cheapest to check?",
    "5.1",
    ["The CPU is fried and must be replaced",
     "A RAM module has unseated or failed, so reseat and swap modules one at a time",
     "The RAID controller has corrupted the boot volume",
     "The rack PDU is providing dirty power and needs a meter test"],
    1,
    "No POST with no beeps, after a working period, is most often memory: reseat, then test modules singly to confirm quickly and cheaply. A dead CPU is possible but rare and expensive to assume first, and the methodology says test the cheapest, most probable theory first. A RAID controller fault rarely halts POST before video init, and the machine would usually still reach POST and show a controller error. Dirty power that lets fans and lights come up only to hang silently at the same point every time is inconsistent with PDU behavior.",
    {0: "CPU failures are statistically much rarer than seating or module faults and cost far more to test; try the cheap theory first.",
     2: "Storage controller faults rarely halt POST before video init; the machine would typically still complete POST and report a controller error.",
     3: "Unusable PDU power would prevent power-on entirely or cause erratic behavior, not a consistent silent hang at the same point."},
    difficulty="medium", tags=["post", "memory", "methodology"]))

add(q(
    "A technician in a datacenter needs to confirm whether a server's power supply is actually delivering clean +12V and +5V rails under load. Which tool and procedure should be used?",
    "5.1",
    ["A multimeter set to AC volts, probing the wall outlet",
     "A PSU tester or multimeter probing the 24-pin connector rails for stable voltage",
     "A POST diagnostic card that displays hexadecimal POST codes",
     "An ESD wrist strap connected to the chassis while reading BIOS sensor pages"],
    1,
    "Rails are verified by measuring the 24-pin ATX connector with a multimeter or a dedicated PSU tester under load: +12V, +5V, and +3.3V should each hold within roughly five percent of nominal. The wall outlet only tells you mains input, not what the PSU delivers. A POST card reports boot progress codes, not rail health. The wrist strap is a static-safety control, not a measurement instrument, and BIOS sensor pages are a software approximation of what a meter reads directly.",
    {0: "Measuring the wall outlet checks mains supply, not the PSU output rails that actually power the board.",
     2: "A POST card shows boot stage codes, not power rail voltages.",
     3: "A wrist strap prevents ESD damage; it measures nothing, and BIOS telemetry is not a substitute for probing rails."},
    difficulty="easy", tags=["psu", "multimeter", "power"]))

add(q(
    "A technician is mentoring a new hire on the help desk and quizzes them on the CompTIA troubleshooting process before they touch live tickets. Arrange the six steps of the methodology in their official order.",
    "5.1", [], None,
    "The methodology runs from evidence to closure. You cannot theorize before you have identified the problem from users and logs, so information gathering comes first. The theory of probable cause must exist before it can be tested, and testing must confirm the cause before you plan a fix. Implementing the fix comes before verification, because you cannot verify what you have not changed, and preventive measures make sense only once functionality is restored. Documentation is last so the record covers the findings, the fix, and the outcome, giving the next technician a complete trail.",
    None,
    qtype="order", difficulty="medium", sequence=[
        "Identify the problem by questioning users and reviewing logs and documentation",
        "Establish a theory of probable cause",
        "Test the theory to determine the actual cause",
        "Establish a plan of action to resolve the problem and implement the solution",
        "Verify full system functionality and implement preventive measures",
        "Document findings, actions, and outcomes",
    ], tags=["methodology", "troubleshooting", "procedure"]))

add(q(
    "A technician replaces a failed drive in a storage server with an identical model, but the controller still reports the new drive as absent. Seating has been visually confirmed. Which step resolves this when the swap itself was correct?",
    "5.1",
    ["Clean and reconnect the drive carrier or backplane connector, or move the drive to a known-good port to isolate a failed port",
     "Format the drive first, because the controller will not enumerate a blank disk",
     "Reinstall the operating system so Plug and Play can discover the new device",
     "Upgrade the PSU, because replacement drives draw more power than originals"],
    0,
    "When a correctly seated drive is still invisible, the fault lies in the path between it and the controller: the carrier, backplane connector, cabling, or the port itself. Cleaning and reseating, then trying a known-good port, isolates a backplane or port fault cheaply. Formatting a drive cannot happen until the controller can see it, so that reasoning is backwards. The OS has no role in low-level drive enumeration on a controller, and an identical model drive draws the same power as the unit it replaced.",
    {1: "Formatting requires the drive to be enumerated first, so it cannot fix an enumeration problem.",
     2: "The OS discovers hardware through the controller; reinstalling it does not repair a backplane or port fault.",
     3: "An identical replacement drive has the same power draw as the failed unit, so the PSU is not the differentiator."},
    difficulty="medium", tags=["drives", "backplane", "hardware"]))

add(q(
    "A user reports that a USB headset drops out intermittently when plugged into their docking station. The ticket notes the headset works flawlessly when plugged directly into the laptop. Which theory fits the evidence best?",
    "5.1",
    ["The headset drivers need updating on the laptop",
     "The dock's USB controller or firmware is faulty, or the dock port is failing",
     "The user needs a USB 2.0 cable, because USB 3.2 ports are not backwards compatible",
     "The laptop's audio subsystem is degraded and needs a board replacement"],
    1,
    "The headset works when directly attached, so the variable is the dock: its upstream controller, firmware, or the physical port is flaky, and firmware updates plus a port swap are the fix path. Driver updates address the laptop side, which is proven good by the direct test. USB 3.x ports are backwards compatible with USB 2.0 devices by design, so that theory contradicts the standard. A degraded laptop audio board would fail in both scenarios, not just through the dock.",
    {0: "The direct-connection test proves the laptop side, including its drivers, works.",
     2: "USB 3.x is backwards compatible with 2.0 devices by specification, so the port version is not the issue.",
     3: "A failing laptop audio subsystem would fail on both paths, not only via the dock."},
    difficulty="medium", tags=["usb", "docking-station", "peripherals"]))

add(q(
    "A rack server reports a drive fault LED. The technician reseats the drive, but the LED stays amber and the management console still marks the drive failed. Per the troubleshooting methodology, which step follows a fix attempt that did not work?",
    "5.1",
    ["Escalate immediately to vendor RMA support without further action",
     "Test the next theory: swap in a known-good drive to isolate drive versus carrier or backplane",
     "Close the ticket, since the amber LED is only informational",
     "Update the server firmware in place, then power-cycle the entire rack"],
    1,
    "When the first theory fails, the methodology says form and test the next most probable one. Swapping in a known-good drive cleanly splits the fault domain: if the replacement also faults, the carrier or backplane is the problem. Escalating before isolating skips your own cheap tests and wastes vendor time. A steady amber LED on a carrier is a fault indicator, not decoration, so closing the ticket leaves a degraded array running. Firmware updates mid-fault risk array stability and do not follow from a confirmed drive failure.",
    {0: "Escalating before isolating skips the cheap tests the methodology demands and wastes vendor time.",
     2: "A steady amber LED on a drive carrier is a fault state; treating it as informational leaves a degraded array in service.",
     3: "Firmware changes mid-incident risk destabilizing the array and are not indicated by a single confirmed dead drive."},
    difficulty="medium", tags=["methodology", "drives", "hardware"]))

add(q(
    "A user reports that their newly assembled desktop powers on and the fans spin, but the screen never displays anything and there are no beep codes. A technician has already verified the monitor and video cable work on another machine. What should be checked next?",
    "5.1",
    ["Whether the RAM is unseated or a module is dead, since a missing memory population can produce no video and no beeps",
     "Whether the keyboard and mouse are connected, as some boards refuse to POST without them",
     "Whether the hard drive is blank, because POST cannot proceed without an OS",
     "Whether the case power button is defective and sending the wrong signal"],
    0,
    "A fully assembled board with no video and no beeps is a classic no-memory condition: many modern boards stay silent rather than beep when no DIMM is detected, so reseat the modules and test them individually. Keyboards are not required for POST on any mainstream board. POST completes before the OS is ever read, so a blank drive yields a missing-bootloader message later, not silence now. A defective power button would prevent power-on entirely rather than allowing fans to spin with a silent POST.",
    {1: "Boards POST happily without input devices attached.",
     2: "POST runs before any OS loading; a blank drive gives a missing-bootloader message after POST, not silence during it.",
     3: "A faulty power button stops power-on, not POST; the machine is clearly powering up."},
    difficulty="hard", tags=["post", "memory", "troubleshooting"]))

# ---------------------------------------------------------------------------
# 5.2 Troubleshooting storage devices (8 questions: 6 single, 1 multi, 1 order)
# ---------------------------------------------------------------------------
add(q(
    "A user reports that the NVMe boot drive on their workstation intermittently drops from the OS with I/O errors in the event log, while a technician confirms a SATA drive in the same chassis stays solid. Which action best isolates an NVMe-specific fault?",
    "5.2",
    ["Run a full surface scan of the SATA drive to compare error patterns",
     "Update the NVMe controller firmware and check M.2 seating and heatsink contact",
     "Replace the SATA drive, since it is the older interface and probably the culprit",
     "Move the NVMe drive into a USB enclosure so it stops using the M.2 slot"],
    1,
    "Intermittent NVMe dropout with SATA unaffected points at the NVMe link itself: controller or drive firmware bugs and poor M.2 seating or thermal throttling from bad heatsink contact are the common causes, so update firmware and verify the module is seated and cooled. Scanning the healthy SATA drive wastes time on the wrong device. Swapping the SATA drive contradicts which drive is actually erroring. Moving a boot NVMe to a USB enclosure is a downgrade that masks the fault rather than fixing the internal link.",
    {0: "The SATA drive is not reporting errors; scanning it does nothing to isolate the NVMe fault.",
     2: "The erroring device is the NVMe drive, not the SATA one; replacing the wrong drive wastes budget and leaves the fault in place.",
     3: "A USB enclosure sidesteps the M.2 link instead of repairing it and cripples boot drive performance."},
    difficulty="hard", tags=["nvme", "storage", "firmware"]))

add(q(
    "A technician reviewing a storage server finds a three-drive RAID 5 array with one disk failed and one disk currently rebuilding, and asks whether the volume is at risk right now. What is the correct assessment?",
    "5.2",
    ["The array is safe, because RAID 5 survives two simultaneous drive failures",
     "Until the rebuild completes, the array has no spare redundancy, so a second failure loses the volume",
     "RAID 5 rebuilds are instant, so the risk window is negligible",
     "The rebuilding drive can be pulled and reused in another server while the rebuild runs"],
    1,
    "RAID 5 tolerates exactly one drive failure. With one disk failed and another mid-rebuild, the array is running on degraded parity with zero spare tolerance until the rebuild finishes: any second failure during that window is fatal, and the heavy rebuild I/O actually raises the odds of a survivor failing. Two-drive tolerance describes RAID 6, not RAID 5. Rebuilds on spinning disks run for hours, not moments, and pulling a member mid-rebuild destroys the array.",
    {0: "Two-drive tolerance belongs to RAID 6; RAID 5 survives exactly one failure.",
     2: "RAID 5 rebuilds run for hours under heavy read stress, so the risk window is real and dangerous.",
     3: "Removing a member mid-rebuild destroys the array; drives in an active set are never repurposed."},
    difficulty="easy", tags=["raid", "raid-5", "rebuild"]))

add(q(
    "A technician has a replacement drive in hand for a degraded RAID 5 volume and must follow a safe rebuild procedure during the maintenance window. Arrange the steps into the safest order.",
    "5.2", [], None,
    "Safe RAID work starts by confirming exactly which slot and array you are touching, because pulling the wrong drive in a degraded array kills the volume outright. Before touching hardware, confirm a current backup exists so a rebuild gone wrong is still recoverable. Then physically insert the replacement, watch the controller pick it up and begin rebuilding, and only after the array returns to optimal state document the event. Skipping the verification or backup steps turns a routine swap into a potential data-loss incident, and closing out without documentation leaves the next on-call technician blind.",
    None,
    qtype="order", difficulty="hard", sequence=[
        "Verify the array state and drive slot mapping in the controller software",
        "Back up critical data or confirm a current backup exists",
        "Insert the replacement drive into the failed drive's slot",
        "Confirm the controller starts the rebuild and monitor its progress",
        "Verify the volume is healthy again and document the event",
    ], tags=["raid", "raid-5", "rebuild", "procedure"]))

add(q(
    "A user reports a hard drive making a rhythmic clicking or grinding sound before the system failed to boot this morning. What does this symptom most strongly indicate, and what is the appropriate response?",
    "5.2",
    ["High fragmentation that a defragment pass will resolve",
     "Mechanical failure of the drive, so power it down and recover from backup or a drive image",
     "A corrupted filesystem that a chkdsk run will repair",
     "A loose SATA cable causing the noise, so reseat the cable"],
    1,
    "Rhythmic clicking or grinding is the head actuator failing to find tracking, the classic sign of imminent mechanical death: continued power accelerates platter and head damage, so shut the machine down and restore from backup or image the drive immediately. Defragmenting a dying drive hammers it with I/O and speeds the failure. chkdsk repairs logical structures, not a failing actuator, and running it risks finishing the drive off. Cables never produce mechanical noise; the sound comes from inside the sealed drive assembly.",
    {0: "Defragmenting a mechanically failing drive multiplies head movement and hastens its death.",
     2: "chkdsk fixes filesystem corruption, not a physically failing actuator; running it on dying hardware risks total loss.",
     3: "Cable faults cause detection and I/O errors, never rhythmic mechanical noise from inside the drive."},
    difficulty="medium", tags=["hdd", "mechanical-failure", "data-recovery"]))

add(q(
    "A user reports that a workstation with an SSD boots slowly and file copies off the SSD stall for seconds at a time. A technician pulls SMART data showing drive health at 95 percent with zero reallocated sectors. Which explanation fits best?",
    "5.2",
    ["The SSD is failing and must be replaced immediately",
     "The drive is nearly full or TRIM is disabled, throttling garbage collection and write performance",
     "The SATA link negotiated down to 1.5 Gb/s and the cable needs replacing",
     "The pagefile must be moved to a spinning drive to relieve the SSD"],
    1,
    "Healthy SMART data with stalled writes on an SSD is the near-full or TRIM-starved pattern: without free blocks and TRIM commands, garbage collection stalls writes for seconds at a time. Freeing space and confirming the OS issues TRIM restores speed. Ninety-five percent health with zero reallocated sectors does not justify replacement. A negotiated-down link shows as a fixed reduced link speed in controller logs, not intermittent stalls alongside healthy attributes. Moving the pagefile is folklore that shrinks usable fast storage and does nothing for garbage collection.",
    {0: "95 percent health and zero reallocated sectors contradicts imminent failure; replacement wastes money.",
     2: "A negotiated-down link gives a constant slow link speed in the logs, not intermittent multi-second stalls with healthy SMART data.",
     3: "Moving the pagefile off the SSD does not fix garbage-collection stalls and wastes the fastest storage in the machine."},
    difficulty="hard", tags=["ssd", "trim", "performance"]))

add(q(
    "A technician sees that a storage server's SMART monitoring has flagged a rising reallocated sector count on a drive that holds one member of a RAID 1 mirror. What should the technician do about this drive?",
    "5.2",
    ["Wait for the drive to fail outright, because the mirror protects the data anyway",
     "Replace the drive proactively in the next maintenance window and let the mirror resync",
     "Disable SMART alerts for that drive so the noise stops",
     "Break the mirror and run the drive solo to avoid resync overhead"],
    1,
    "Rising reallocated sectors are a leading indicator of drive failure: schedule a proactive swap during the maintenance window and let the mirror rebuild, which is low-risk while redundancy is intact. Waiting for outright failure gambles the mirror on a second failure window. Silencing SMART hides the exact early warning the monitoring exists to provide. Breaking the mirror removes redundancy entirely, converting a warning into exposure.",
    {0: "Waiting for hard failure opens a needless window where a second fault loses the volume.",
     2: "Muting the alert hides the early-warning signal that SMART monitoring exists to surface.",
     3: "Dissolving the mirror trades away redundancy, which is the opposite of a safe response."},
    difficulty="medium", tags=["smart", "raid-1", "storage"]))

add(q(
    "A technician replaced a failed drive in a RAID 10 array and the controller is rebuilding. Users complain the array feels slower than usual this afternoon. What explains this, and what should be communicated?",
    "5.2",
    ["The array is failing and data is at risk, so failover immediately",
     "Rebuild I/O competes with user traffic, so degraded performance is expected until the rebuild completes",
     "The controller cached the wrong stripe set and needs a full re-initialization",
     "The users are mistaken, because RAID 10 rebuilds are too fast to notice"],
    1,
    "A RAID 10 rebuild generates heavy background reads and writes that share spindles and controller bandwidth with production traffic, so slower response during the rebuild is expected and resolves when it completes; communicate the window rather than escalating. The array is not failing: rebuilding is the normal, healthy state after a member swap. Re-initialization would destroy the data for no reason. RAID 10 rebuilds are faster than parity rebuilds but still measurably intrusive.",
    {0: "Rebuilding is the expected post-replacement state, not a sign of array failure.",
     2: "Re-initializing wipes the array; nothing about a rebuild corrupts the stripe set.",
     3: "Even RAID 10 rebuilds consume I/O for a noticeable period, so the users' reports are legitimate."},
    difficulty="medium", tags=["raid", "raid-10", "rebuild", "performance"]))

add(q(
    "A technician needs to distinguish between a failing drive and a failing SATA data path back to the controller. Which two checks best split the problem between the drive and the path? (Select TWO.)",
    "5.2",
    ["Run the drive vendor's SMART test and review the error counters",
     "Defragment the drive while listening for changes in the noise",
     "Move the suspect drive to a known-good cable and port, then recheck",
     "Swap the workstation's PSU for a higher wattage unit",
     "Reinstall the operating system on the same cable and port"],
    None,
    "Isolation requires varying one side of the path at a time: SMART counters interrogate the drive itself for reallocating sectors and read retries, while moving the drive to a known-good cable and port tests the path. Together they attribute the fault cleanly to drive or link. Defragmentation stresses a possibly failing drive without diagnosing anything. Power supply wattage has no bearing on SATA link integrity. An OS reinstall destroys evidence and is irrelevant to a physical link or drive fault.",
    {1: "Defragmentation adds I/O stress without isolating drive from path, and it can accelerate a mechanical failure.",
     3: "PSU wattage has no bearing on SATA link errors or SMART counters.",
     4: "Reinstalling the OS destroys evidence and does nothing to test a physical cable, port, or drive fault."},
    qtype="multi", answers=[0, 2], difficulty="hard", tags=["sata", "smart", "isolation"]))

# ---------------------------------------------------------------------------
# 5.3 Troubleshooting display issues (8 questions: 6 single, 1 multi, 1 match)
# ---------------------------------------------------------------------------
add(q(
    "A user reports that their workstation displays fine on a directly attached monitor, but a second monitor at the end of a long VGA run shows ghosting and faint duplicate images. Which cause fits best?",
    "5.3",
    ["Failing GPU video memory producing doubled frames",
     "Analog signal degradation over the cable run, needing a shorter or better shielded cable or a digital connection",
     "The monitor's power supply capacitors aging and sagging under load",
     "A failing panel driver board needing replacement"],
    1,
    "Ghosting and faint duplicates are the signature of analog VGA degradation: long or poorly shielded runs smear and reflect the signal, so shorten the run, use better shielded cable, or move to HDMI or DisplayPort. GPU memory faults corrupt textures and crash drivers; they do not cleanly duplicate whole frames. A weak monitor PSU shows flicker, dimming, or shutdown, not image duplication. Panel driver boards fail with dead rows or a blank screen, not ghost shadows.",
    {0: "Video memory faults show as texture corruption, artifacts, or driver crashes, not clean duplicated images.",
     2: "Aging monitor power causes flicker, dimming, or power-off symptoms, not ghost images.",
     3: "Panel driver failure produces lines, dead zones, or a dead screen, not faint duplicate images."},
    difficulty="medium", tags=["vga", "signal-degradation", "display"]))

add(q(
    "A user's laptop panel is very dim, but a faint image is visible when the technician shines a flashlight at it. The external video output drives a monitor perfectly. Which component is the prime suspect?",
    "5.3",
    ["The GPU, because it drives both outputs",
     "The backlight or its power circuitry, since the panel is clearly producing an image",
     "The laptop battery, because panels run on battery power",
     "The video cable between the mainboard and the panel, because it carries the image"],
    1,
    "A faint image visible under strong light with a working external output means the panel is rendering but the backlight is dead or unpowered: suspect the backlight itself, the inverter or LED driver circuit, or the lid-close sensor. The GPU is proven good by the perfect external output. The battery powers the whole machine, not the backlight specifically. The panel cable carries the image, which is demonstrably arriving, so the missing element is light, not signal.",
    {0: "The external output working proves the GPU renders correctly.",
     2: "The battery powers the entire laptop; selective dimness is not a battery symptom.",
     3: "The panel cable carries image data, which is arriving; the fault is in generating light."},
    difficulty="easy", tags=["backlight", "laptop", "display"]))

add(q(
    "A technician sees horizontal colored streaks and snow-like artifacts on a workstation, and the same corruption appears on the BIOS splash screen as well as in the operating system. Which fault does this pattern most strongly indicate?",
    "5.3",
    ["A software graphics driver bug that a clean driver install will fix",
     "A GPU or video memory hardware fault, because the corruption exists before the OS loads",
     "A failing display cable, because analog interference causes snow",
     "Out-of-date monitor firmware causing color distortion"],
    1,
    "Artifacts visible in the BIOS environment are generated before any OS driver loads, so the corruption comes from hardware: the GPU core or its video memory. A driver reinstall cannot affect pre-OS rendering. Digital cables like HDMI or DisplayPort fail as blank screens or sparkles from dropped packets, not colored streaks on firmware screens. Monitors do not carry field-updatable firmware that would distort colors in a GPU-tied pattern.",
    {0: "Driver problems only manifest after the OS loads its driver; BIOS screens bypass it entirely.",
     2: "Digital link faults show sparkles, dropouts, or blank screens, not consistent streaks on firmware screens.",
     3: "Monitor firmware does not selectively distort color in a pattern tied to GPU output."},
    difficulty="hard", tags=["gpu", "artifacts", "display"]))

add(q(
    "A user reports that after a routine driver update, their dual-monitor workstation suddenly shows the desktop only on the primary display, though both monitors power on. Which setting should a technician check first?",
    "5.3",
    ["The display scaling percentage on the primary monitor",
     "The multi-monitor mode, which may have reverted to single-display after the update",
     "The refresh rate on the secondary monitor, to ensure it is set to 60 Hz",
     "The power plan, which may disable secondary displays on battery"],
    1,
    "Driver updates commonly reset display configuration, dropping the system back to single-display or duplicated mode, so open display settings and restore Extend. Scaling affects text and icon size, not whether a display activates. Refresh rate mismatches cause blank or flickering secondary screens, not a working single-desktop layout. Power plans manage sleep and battery behavior, not monitor topology.",
    {0: "Scaling governs text and icon size and does not disable a display.",
     2: "An unsupported refresh rate blanks or flickers a monitor; it does not collapse the desktop to one screen.",
     3: "Power plans control sleep and energy states, not monitor topology."},
    difficulty="easy", tags=["drivers", "multi-monitor", "display"]))

add(q(
    "A user reports a new monitor randomly drops signal for two seconds and then returns. The technician confirms the on-screen display menu works even during the blackout. Which action best isolates whether the fault is the source, the cable, or the panel?",
    "5.3",
    ["Swap in a known-good video cable first, then test a different source on the same input",
     "Replace the monitor, because intermittent dropouts indicate panel failure",
     "Lower the resolution, because high resolutions overheat the scaler",
     "Disable HDCP, because encryption renegotiation causes blackouts"],
    0,
    "The on-screen display working during blackouts proves the panel and its power are fine, leaving source or cable as suspects: swapping the cable is the cheapest test, then feeding the input from a different source splits cable from source faults. Replacing the monitor ignores the two cheaper suspects. Resolution does not cause thermal dropouts, and HDCP renegotiation happens at stream start rather than randomly mid-stream.",
    {1: "A working on-screen display during blackout proves the panel and its power supply are healthy, so replacing the monitor skips cheaper tests.",
     2: "Lowering resolution is not a fix for intermittent signal loss; scalers do not overheat and drop out this way.",
     3: "HDCP handshakes occur at connection establishment, not randomly during playback."},
    difficulty="medium", tags=["cables", "isolation", "display"]))

add(q(
    "A trainer reports that the projector mounted high in a training room shows a noticeably keystoned, trapezoid-shaped image. Which adjustment should the technician try first?",
    "5.3",
    ["Set the projector's aspect ratio to 16:9",
     "Use keystone correction to square the image to the screen",
     "Increase the lamp brightness to compensate",
     "Enable overscan on the source device"],
    1,
    "A keystoned trapezoid means the projector axis is off-angle to the screen: physically re-aiming the unit is ideal, and keystone correction digitally squares the image when the mount cannot be changed. Aspect ratio governs width versus height proportions, not corner angles. Lamp brightness affects luminance, never geometry. Overscan crops image edges for television viewing and has no projection geometry function.",
    {0: "Aspect ratio settings change proportional scaling, not corner geometry.",
     2: "Brightness changes luminance and cannot alter image shape.",
     3: "Overscan crops the image edges; it has no geometry correction function."},
    difficulty="easy", tags=["projector", "keystone", "display"]))

add(q(
    "A technician is building a fault-isolation cheat sheet for the display chain and wants each artifact mapped to the layer that produces it. Match each symptom to its most likely failing component.",
    "5.3", [], None,
    "Each artifact points to one layer of the video chain. A faint image under a flashlight means the panel renders but emits no light, which is a dead backlight or inverter. Sparkles and white flecks are dropped packets on a marginal digital HDMI or DisplayPort link. Whole-image ghosting is analog VGA reflection and crosstalk on a long or poorly shielded run. Colored streaks visible on BIOS screens, before any driver loads, come from failing GPU or video memory, since firmware screens bypass the entire software stack.",
    None,
    qtype="match", difficulty="hard", pairs=[
        {"left": "Faint image only visible under a flashlight", "right": "Failed backlight or inverter"},
        {"left": "Sparkles and white flecks on a digital link", "right": "Degraded HDMI or DisplayPort cable"},
        {"left": "Whole-image ghosting on a VGA run", "right": "Analog signal degradation on a long cable"},
        {"left": "Colored streaks visible in BIOS screens", "right": "Failing GPU or video memory"},
    ], tags=["display", "artifacts", "diagnosis"]))

add(q(
    "A user at a monitoring station reports that the display shows a burn-in ghost of the static dashboard taskbar after months of continuous use, and asks what can honestly be done about it. Which two responses from a technician are technically sound? (Select TWO.)",
    "5.3",
    ["Increase brightness to push stuck pixels back into alignment",
     "Run built-in pixel refresh or compensation cycles if the monitor offers them",
     "Freeze the taskbar on the right side to redistribute the wear",
     "Display full-screen slowly changing content to wear the panel evenly",
     "Replace the backlight, since burn-in is a backlight defect"],
    None,
    "Burn-in mitigation on modern panels is real: manufacturer pixel-refresh cycles actively compensate worn cells, and full-screen slowly changing content spreads wear evenly across the panel instead of etching one static region. Raising brightness drives harder wear and deepens the damage. Relocating the static element merely moves the burn pattern to a new location. Burn-in is a panel-layer wear phenomenon, not a backlight defect, so backlight replacement cannot help.",
    {0: "Higher brightness accelerates cell wear and deepens burn-in rather than clearing it.",
     2: "Moving the static element only relocates the burn pattern; it does not reduce total wear.",
     4: "Burn-in is uneven cell wear in the panel layer itself, not a backlight fault."},
    qtype="multi", answers=[1, 3], difficulty="hard", tags=["burn-in", "display", "oled"]))

# ---------------------------------------------------------------------------
# 5.4 Troubleshooting mobile devices (8 questions: 5 single, 2 multi, 1 match)
# ---------------------------------------------------------------------------
add(q(
    "A user reports that a phone has no cellular service at all: calls go straight to voicemail and SMS will not send. The user flew home this morning, the phone was fine before the flight, and Wi-Fi still works. Which setting should the technician check first?",
    "5.4",
    ["Airplane mode left enabled, since it silences the cellular radio while Wi-Fi can be re-enabled separately",
     "The carrier account suspended for nonpayment",
     "The SIM card locked with a PIN",
     "The baseband firmware corrupted by the flight's roaming handoff"],
    0,
    "Airplane mode kills the cellular radios, and a traveler can toggle Wi-Fi back on without ever disabling airplane mode, which matches a phone with working Wi-Fi and zero cellular service exactly. A suspended account blocks service continuously, not from one specific morning. A SIM PIN lock prompts for a code at boot rather than silently removing service. Baseband corruption is a stretch for a single flight and would not leave Wi-Fi untouched so cleanly.",
    {1: "A suspended account blocks service continuously and would not start precisely the morning of a flight.",
     2: "A SIM PIN lock prompts for entry at startup; it does not silently strip service while Wi-Fi works.",
     3: "Baseband corruption is rare and would not appear exactly after a flight with Wi-Fi unaffected."},
    difficulty="medium", tags=["mobile", "airplane-mode", "cellular"]))

add(q(
    "A user reports that a tablet's touchscreen registers every touch about two centimeters to the left of where the user actually presses, in every application. What does this symptom indicate?",
    "5.4",
    ["A software calibration issue that an OS update will resolve",
     "A failing digitizer, which needs recalibration where supported or replacement",
     "A swollen battery pushing on the panel from behind",
     "A GPU fault offsetting the rendered interface"],
    1,
    "A consistent spatial offset across all apps is a digitizer problem: the touch-sensing layer is misregistering coordinates, so try recalibration where the platform supports it and otherwise replace the digitizer. An OS update does not fix hardware coordinate drift. A swollen battery manifests as panel lift or pressure blotches, not a uniform offset. The GPU renders the image, and the rendered UI is exactly where the user expects it; input coordinates are the digitizer's job.",
    {0: "Coordinate offsets come from the touch-sensing layer, not the OS interface stack.",
     2: "A swollen battery lifts or distorts the panel; it does not shift touch coordinates uniformly.",
     3: "The GPU renders output; the render is correctly placed, and touch registration is the digitizer's domain."},
    difficulty="medium", tags=["digitizer", "mobile", "touchscreen"]))

add(q(
    "During a phone repair, a technician notices the battery has swollen and the case back has separated slightly from the frame. What is the correct course of action?",
    "5.4",
    ["Press the battery flat and seal the case back together",
     "Remove the battery carefully, dispose of it at a proper e-waste facility, and fit a replacement",
     "Fully discharge the battery first to reduce fire risk before removing it",
     "Return the phone to the user with a warning not to charge it overnight"],
    1,
    "A swollen lithium battery is a fire hazard: remove it promptly without puncturing it, tape the terminals, hand it to an e-waste or hazardous-waste facility, and fit a new pack. Pressing it flat risks rupturing the pouch and triggering thermal runaway. Deliberately draining a swollen cell adds charge-discharge stress, which is exactly the abuse that caused the swelling. Returning the device keeps a fire hazard in service.",
    {0: "Pressing a swollen cell can rupture the pouch and trigger thermal runaway.",
     2: "Deliberately discharging a swollen cell stresses it further; removal should not wait.",
     3: "Returning a device with a known fire-hazard battery leaves the hazard in circulation."},
    difficulty="easy", tags=["battery", "safety", "mobile", "e-waste"]))

add(q(
    "A user reports that a phone left on a car dashboard all afternoon will not power on and feels hot to the touch. Which sequence is safest for the technician to follow?",
    "5.4",
    ["Force a reboot immediately while the device is still hot to clear the lockup",
     "Move it to a cool shaded area, let it return to normal temperature, then attempt charging and power-on",
     "Place it in a refrigerator for 20 minutes to pull the temperature down fast",
     "Plug it in immediately and start charging to see if it responds"],
    1,
    "Thermal shutdown leaves a phone dead but recoverable: let it cool in shade first, then charge and boot. Force-restarting a hot device stresses silicon that has already thermally protected itself. Refrigerator cooling can condense moisture inside the sealed chassis, trading thermal shutdown for liquid damage. Charging a hot device adds heat to an already overheated battery and can push a stressed cell toward failure.",
    {0: "Forcing a reboot on an overheated device stresses silicon that has already thermally protected itself.",
     2: "Rapid refrigeration risks condensation forming inside the device.",
     3: "Charging while hot adds battery heat and is discouraged by every manufacturer."},
    difficulty="easy", tags=["overheating", "thermal", "mobile"]))

add(q(
    "A technician reports that their field phone keeps dropping Wi-Fi at the far end of a warehouse, while laptops in the same area hold their connection. Which two actions best address a phone-specific wireless complaint? (Select TWO.)",
    "5.4",
    ["Forget and rejoin the network to clear a stale cached profile",
     "Enable airplane mode briefly to reset the cellular radio",
     "Verify the Wi-Fi frequency band and check for antenna or case interference",
     "Replace the warehouse access point with a higher-power model",
     "Move the user to a 5 GHz-only SSID, since 2.4 GHz is obsolete"],
    None,
    "Only the phone struggles, so the fault is client-side: stale saved profiles cause repeated drops until forgotten and rejoined, and band settings or a case blocking the phone's smaller antennas can handicap it against laptops with bigger radios. Airplane mode toggles the cellular radios, not Wi-Fi association state. The access point is serving other clients fine, so replacing it is overkill. A 5 GHz-only SSID reduces range and would worsen edge-of-warehouse coverage.",
    {1: "Airplane mode toggles the cellular radios; it does not clear a stale Wi-Fi profile.",
     3: "Only the phone is affected, so the shared AP is demonstrably serving other clients fine.",
     4: "5 GHz has shorter range than 2.4 GHz, so a 5 GHz-only SSID worsens coverage at the warehouse edge."},
    qtype="multi", answers=[0, 2], difficulty="medium", tags=["mobile", "wi-fi", "troubleshooting"]))

add(q(
    "A user reports a phone battery that drops from 100 percent to 60 percent in an hour of standby with the screen off. Which two checks are the most diagnostic? (Select TWO.)",
    "5.4",
    ["Reduce screen brightness to minimum and retest",
     "Review battery usage by app in settings to find a runaway process",
     "Replace the charging cable, since cables cause standby drain",
     "Check for a swollen battery or heat while charging, indicating cell wear",
     "Turn on airplane mode permanently to stop all radio drain"],
    None,
    "Rapid standby drain is either software or cell wear: the per-app battery report names a runaway process holding the CPU or radios awake, and heat or swelling alongside fast discharge points at a worn cell. Airplane mode is a diagnostic isolation step, not a solution, and it kills the phone's core function. Brightness affects active-use drain, not standby with the screen off. Charging cables have no role when the device drains unplugged.",
    {0: "With the screen off in standby, brightness is not a factor.",
     2: "The device drains while unplugged, so the charging cable cannot be contributing.",
     4: "Airplane mode is a diagnostic toggle, not a fix; leaving it on disables the device's purpose."},
    qtype="multi", answers=[1, 3], difficulty="medium", tags=["battery", "mobile", "diagnosis"]))

add(q(
    "A user reports that a phone that took a brief dunk in water now has no audio from the speaker, but a technician confirms headphones work and Bluetooth audio plays normally. Which component is most likely at fault?",
    "5.4",
    ["The audio codec chip on the mainboard",
     "The speaker or its flex connection, isolated by the other outputs working",
     "The headphone jack detection circuit, stuck in headphone mode",
     "The operating system's audio service, needing a reset"],
    1,
    "Working headphone and Bluetooth audio proves the codec and the OS audio stack are fine, isolating the fault to the speaker itself or its flex connection, plausibly corroded by the water ingress. A codec fault would degrade every output path. A jack stuck in headphone-detection mode typically shows a headphone icon and mutes the speaker, but the water exposure points squarely at the speaker path, and the icon would be visible on screen. The OS audio service is disproven by the working alternate outputs.",
    {0: "A codec chip fault would break headphone and Bluetooth audio too.",
     2: "A jack stuck in headphone mode displays a headphone icon on screen, which the scenario does not report.",
     3: "The OS audio service is proven good by the working Bluetooth and headphone outputs."},
    difficulty="hard", tags=["mobile", "audio", "water-damage"]))

add(q(
    "A technician is assembling a quick-reference sheet for the service desk covering common mobile device failures. Match each symptom to its most likely cause.",
    "5.4", [], None,
    "Each symptom maps to one failing subsystem. A touch registering at a fixed offset is digitizer misregistration or failure. A device refusing power after heat exposure is in thermal protection until it cools. A bulging case with a lifting screen is a swollen battery pushing the hardware apart. A silent speaker with working Bluetooth is a speaker or speaker-connection fault, isolated by the other outputs still working.",
    None,
    qtype="match", difficulty="medium", pairs=[
        {"left": "Screen responds 2 cm left of every touch", "right": "Failing digitizer"},
        {"left": "Device will not power on after a hot car afternoon", "right": "Thermal shutdown protection"},
        {"left": "Case back is bulging and the screen is lifting", "right": "Swollen battery"},
        {"left": "No audio from speaker but Bluetooth audio works", "right": "Faulty speaker or its connection"},
    ], tags=["mobile", "diagnosis", "symptoms"]))

# ---------------------------------------------------------------------------
# 5.5 Troubleshooting networks (9 questions: 7 single, 1 multi, 1 order)
# ---------------------------------------------------------------------------
add(q(
    "A user's workstation cannot reach any network resource. The technician runs ipconfig and sees IPv4 address 169.254.10.7 with no default gateway. What does this address indicate?",
    "5.5",
    ["A statically assigned link-local address from the site's IP documentation",
     "A failed DHCP lease, so APIPA self-assigned a link-local address that cannot route off subnet",
     "A special subnet the organization reserves for network printers",
     "A public routable address that needs NAT configuration"],
    1,
    "169.254.x.x is the APIPA link-local range a Windows host self-assigns after the DHCP DORA exchange fails, and such addresses have no gateway and cannot reach other subnets. It is not a documented static, because statics are administratively assigned and route properly. Printers may sit on reserved subnets, but 169.254.0.0/16 is reserved by RFC 3927 specifically for link-local autoconfiguration. The range is not publicly routable at all.",
    {0: "Static site addressing is administratively assigned and routes correctly; APIPA addresses never do.",
     2: "169.254.0.0/16 is reserved for link-local autoconfiguration, not for printer subnets.",
     3: "169.254.x.x is non-routable link-local space and can never appear as a public address."},
    difficulty="easy", tags=["apipa", "dhcp", "ipconfig", "ipv4"]))

add(q(
    "A user can ping 8.8.8.8 successfully but no hostname resolves in any application. Which tool and command isolates the failing service?",
    "5.5",
    ["nslookup against the configured DNS server to test resolution directly",
     "tracert to 8.8.8.8 to see where name resolution stops along the path",
     "netstat -an to list the resolver's listening sockets",
     "ipconfig /release followed by /renew to obtain a fresh DHCP lease"],
    0,
    "Pinging a raw IP while hostnames fail isolates the fault to DNS: nslookup queries the configured resolver directly and shows whether it answers, times out, or returns the wrong record. tracert shows the Layer 3 path to an IP and never invokes name resolution. netstat lists sockets and connections on the local machine, not resolver health. Releasing the DHCP lease addresses the addressing layer, which the successful numeric ping proves is already working.",
    {1: "tracert traces the routed path to an IP address; it does not query the DNS service.",
     2: "netstat enumerates local connections and listeners; it does not probe DNS behavior.",
     3: "DHCP renew changes addressing, which the working numeric ping shows is not the problem."},
    difficulty="medium", tags=["dns", "nslookup", "troubleshooting"]))

add(q(
    "A technician is diagnosing a dead office network drop: a known-good laptop gets no link at the wall jack, and the patch panel labeling is out of date, so the far end of the run is unknown. Which tool identifies the correct run and reveals whether it is broken or simply mislabeled?",
    "5.5",
    ["A toner probe, to place a tone on the jack and find the matching run at the patch panel",
     "A cable tester, to verify pair continuity once both ends of the run are known",
     "A crimper, to reterminate both ends and hope for a good link",
     "A punchdown tool, to reseat the jack pins in the wall plate"],
    0,
    "The toner probe is built for exactly this: the tone generator goes on the wall jack and the probe wand locates the matching wire on the patch panel, distinguishing a broken run from a mislabeled one and finding the right port. A cable tester validates pair continuity only once you have both ends in hand, which you do not yet. Crimping new ends is a guess that destroys the existing termination without locating the fault. Punching down the jack is re-termination, not identification.",
    {1: "A tester validates pair continuity only once both ends are known and connected to the tester; it cannot find which panel port the jack maps to.",
     2: "Crimping new ends is a blind guess that destroys the existing termination without locating the fault.",
     3: "Punching down the jack re-terminates contacts; it does not locate or identify a run."},
    difficulty="hard", tags=["toner-probe", "cable-tester", "tools", "cabling"]))

add(q(
    "A technician is working a ticket for a host that cannot reach any resource by name or by IP and wants to follow the standard command-line workflow from the inside out. Which command sequence follows best practice?",
    "5.5",
    ["ipconfig, then ping the default gateway, then nslookup a name, then tracert to a remote IP",
     "tracert first to find the broken hop, then ping the internet, then ipconfig last",
     "nslookup first to prove DNS, then netstat, then release and renew the DHCP lease",
     "netstat first to inventory connections, then ping the loopback address 127.0.0.1"],
    0,
    "The workflow runs from the inside out: ipconfig confirms addressing and the gateway, pinging the gateway tests local subnet reachability, nslookup tests DNS, and tracert shows where the path toward a remote IP breaks. Starting with tracert assumes reachability facts not yet established. Leading with name resolution assumes addressing is good when nothing confirms that. The loopback ping only proves the local TCP/IP stack is alive and tells you nothing about the network path.",
    {1: "Running tracert before establishing basic addressing and gateway reachability inverts the logical order.",
     2: "Testing DNS first assumes IP connectivity that has not been confirmed yet.",
     3: "Loopback only proves the local stack is running; it reveals nothing about the external path."},
    difficulty="medium", tags=["command-line", "methodology", "networking"]))

add(q(
    "A warehouse supervisor reports that the Wi-Fi network was stable until a new wireless inventory system went live on the production floor, and now several handheld scanners drop their connections near aisle 3, the closest zone to the new hardware. Which cause is most probable?",
    "5.5",
    ["The new system's radios interfere with the channel in use near that aisle",
     "The access points have all failed and need replacement",
     "The handheld scanners need firmware updates to stay connected",
     "The DHCP scope is exhausted in the aisle 3 area"],
    0,
    "The tight correlation with the new system going live points to radio interference: the new equipment transmits on or near the channel the scanners use, so survey the channels and move the AP or the interferer. Simultaneous multi-AP failure is implausible. Handset firmware would not degrade several devices in sync in one location. DHCP scopes are not physical-location aware, so exhaustion cannot affect a single aisle.",
    {1: "Multiple access points failing simultaneously is far less probable than co-channel interference from new equipment.",
     2: "Firmware issues would not appear as geographically clustered drops exactly when new wireless gear went live.",
     3: "DHCP scope exhaustion is global to the subnet and cannot be aisle-specific."},
    difficulty="medium", tags=["wi-fi", "interference", "wireless"]))

add(q(
    "A technician finds a workstation with a known-good NIC that cannot get a link on one specific switch port, while the same patch cable and laptop link up immediately on the adjacent port. What should the technician conclude and do?",
    "5.5",
    ["The switch port is faulty or administratively shut down, so inspect its configuration and re-enable or replace it",
     "The laptop NIC drivers are outdated and need reinstalling",
     "The patch cable is bad and must be replaced",
     "The VLAN on the switch needs to be deleted and recreated"],
    0,
    "The same cable and laptop achieving link on the neighboring port isolates the fault to the specific port: check whether it is administratively down or err-disabled, re-enable it, and otherwise suspect hardware failure of that port. The NIC is proven good by the adjacent-port test. The cable is equally proven good by the same test. Recreating a VLAN is disruptive to the whole segment and irrelevant when the issue is one port's link state.",
    {1: "The laptop achieved link on the adjacent port, so its drivers and NIC are fine.",
     2: "The same cable linked up on the next port over, so the cable is good.",
     3: "Deleting and recreating a VLAN disrupts every port in it and has no bearing on a single port's link state."},
    difficulty="medium", tags=["switch-port", "isolation", "networking"]))

add(q(
    "A branch office lost internet connectivity during a storm. After power returned, the router, switch, and modem all boot and their link lights look normal, but no client receives a valid address. Which failure scenario best fits?",
    "5.5",
    ["The ISP's upstream DHCP or provisioning service is still down, so no WAN lease is granted",
     "Every client NIC was damaged by the storm surge",
     "The internal switch is dead and forwarding nothing",
     "The wireless channel is congested by storm-related interference"],
    0,
    "All local infrastructure booting with normal link lights while clients get no addresses points upstream: the ISP's DHCP or provisioning service did not survive the storm, so the WAN lease never arrives and clients end up with APIPA or nothing. Every client NIC failing simultaneously is statistically absurd. A dead switch would leave link lights dark and kill local traffic too. Storm interference on wireless would not explain wired clients also lacking addresses.",
    {1: "Simultaneous multi-client NIC failure is implausible compared to an upstream service outage.",
     2: "A dead switch shows down link lights and kills all local connectivity, contradicting the normal lights described.",
     3: "Wireless channel issues would not affect wired clients, who are also without addresses."},
    difficulty="hard", tags=["dhcp", "wan", "outage", "isp"]))

add(q(
    "A user reports that a laptop connects to the office Wi-Fi, drops after a few minutes, and reconnects on its own. The same laptop is rock solid on Ethernet. Which two steps advance the diagnosis most? (Select TWO.)",
    "5.5",
    ["Check the RSSI and roaming settings, and monitor signal strength at the user's desk",
     "Replace the user's laptop wireless card immediately",
     "Review the AP controller for association and deauthentication logs for this client",
     "Move the user to a static IP to stabilize the session",
     "Disable band steering on the whole floor"],
    None,
    "Intermittent Wi-Fi drops with solid Ethernet isolate the fault to the wireless path: measuring RSSI at the desk quantifies coverage, and the controller's association and deauthentication logs show why the client gets kicked, together splitting signal weakness from interference or client-side roaming bugs. Replacing the card skips measurement entirely. A static IP affects addressing, not radio stability, and the client reconnects and obtains addresses fine. Band steering changes affect the whole floor and are premature without evidence.",
    {1: "Replacing hardware without measured evidence contradicts the methodology's test-before-replace discipline.",
     3: "Address assignment is unrelated to radio-level drops; the laptop reconnects and gets addresses fine.",
     4: "Changing floor-wide configuration without evidence is disproportionate and risky."},
    qtype="multi", answers=[0, 2], difficulty="hard", tags=["wi-fi", "logs", "troubleshooting"]))

add(q(
    "A technician is explaining to a junior colleague why a batch of workstations self-assigned APIPA addresses after a DHCP scope change. Arrange the four DHCP messages in the order a client exchanges them to obtain a lease successfully.",
    "5.5", [], None,
    "The DORA sequence is strictly ordered because each message depends on the previous one. The client cannot request a specific address before any server has offered one, so the broadcast Discover opens the exchange. Servers answer with Offers, and only then can the client formally Request the address it wants, which also tells other servers their offers are declined. The server's Acknowledge finalizes the lease and delivers the gateway and DNS options; if any step fails, the client falls back to APIPA, which is exactly the symptom the scope change produced.",
    None,
    qtype="order", difficulty="medium", sequence=[
        "Discover: the client broadcasts a request for DHCP service",
        "Offer: a server proposes an available address and lease options",
        "Request: the client formally asks for the offered address",
        "Acknowledge: the server confirms the lease and delivers the settings",
    ], tags=["dhcp", "dora", "networking", "procedure"]))

# ---------------------------------------------------------------------------
# 5.6 Troubleshooting printers (7 questions: 5 single, 1 multi, 1 match)
# ---------------------------------------------------------------------------
add(q(
    "A user reports that a shared office laser printer's output smears whenever anyone touches the print immediately after it lands in the tray. Which component is most likely at fault?",
    "5.6",
    ["The fuser assembly, which is not bonding the toner into the page",
     "The imaging drum, which is leaving excess residual toner behind",
     "The corona wire, which is not charging the drum evenly",
     "The transfer roller, which is not moving the image from drum to page"],
    0,
    "The fuser melts toner into the paper fibers during the fusing step; toner that still smears on touch means the fuser is not reaching temperature or its roller is worn, so the powder sits loose on the page. A worn drum leaves repeating marks at drum-circumference intervals, not wet-look smearing. The corona wire conditions the drum charge, and its failure produces blank pages. A weak transfer roller yields faint or patchy images, not toner that rubs off.",
    {1: "Drum wear shows as repeating marks or ghosting at fixed intervals, not smear-on-touch output.",
     2: "A failed corona wire leaves pages blank because the drum cannot hold the charge pattern for development.",
     3: "Transfer roller faults give faint or missing image areas, not toner that smears after printing."},
    difficulty="medium", tags=["laser-printer", "fuser", "electrophotographic"]))

add(q(
    "The help desk reports that a network laser printer at a remote site stopped printing for all users right after a network re-addressing change. The printer's own display still shows an address. Which two steps diagnose the IP configuration most efficiently? (Select TWO.)",
    "5.6",
    ["Print a configuration page to see exactly what address and settings the printer currently holds",
     "Ping the printer's address from a client and check the subnet for an address conflict",
     "Reinstall the print driver on every client machine",
     "Power-cycle the printer and hope the lease refreshes on its own",
     "Replace the printer's network interface card with a spare"],
    None,
    "After a re-addressing change, the printer may hold a stale or now-duplicated address: the configuration page reports exactly what the printer believes it has, and pinging it from a client plus checking for a conflict confirms both reachability and duplication. Reinstalling drivers addresses the wrong layer when every client failed at once. Power-cycling is a blind action that can mask the root cause. Replacing the NIC assumes hardware fault with zero evidence, since the display shows a live configured interface.",
    {2: "When every client fails simultaneously, the fault sits at the printer or network layer, not in each client's driver.",
     3: "Blind power-cycling can hide the root cause and does not diagnose address duplication.",
     4: "Replacing the NIC is a hardware guess; the display shows a configured address, so the interface is alive."},
    qtype="multi", answers=[0, 1], difficulty="medium", tags=["network-printer", "ip-conflict", "printers"]))

add(q(
    "A user's print jobs sit in the queue with an Error status and nothing prints on a locally connected USB printer. Which remediation sequence is correct?",
    "5.6",
    ["Clear the queue, restart the Print Spooler service, and print a test page",
     "Reinstall the printer driver immediately, then clear the queue",
     "Power-cycle the printer and leave the queue untouched to preserve the jobs",
     "Delete the printer object and re-add it by IP address"],
    0,
    "Errored jobs can wedge the queue and the spooler together: clear the stuck jobs, restart the Print Spooler service to reset the queue pipeline, then verify with a fresh test page. Driver reinstall is heavier and premature before the spooler reset is tried. Power-cycling leaves the poisoned queue intact to fail again on the next job. Re-adding by IP is wrong for a USB printer, which uses a local port, not a network address.",
    {1: "Driver reinstall is heavier than a spooler reset and premature before the simpler fix is tested.",
     2: "Restarting only the hardware leaves the wedged queue and spooler state untouched, so the error repeats.",
     3: "A USB printer has no IP address; it uses a local USB port, so the re-add method does not apply."},
    difficulty="easy", tags=["spooler", "print-queue", "windows"]))

add(q(
    "A user reports that a laser printer produces a clean vertical white stripe down every page, and the technician confirms the toner level is fine. Which component should be suspected?",
    "5.6",
    ["The imaging drum, damaged along one track so that band cannot develop toner",
     "The fuser, which is not heating evenly across its roller",
     "The pickup roller, which is slipping and misfeeding the paper",
     "The transfer roller, which is over-charging the page edges"],
    0,
    "A crisp vertical white stripe on every page means one fixed track on the drum cannot hold or develop toner, which is classic drum damage along a band. Uneven fuser heat produces poorly bonded or smeared bands, not a missing toner stripe. A slipping pickup roller causes jams, skew, or multi-page feeds, never a developed image defect. Over-charging at the transfer roller gives background scatter or blotches, not a clean missing stripe.",
    {1: "Fuser problems affect toner bonding after development, so output smears rather than losing a vertical track.",
     2: "Pickup roller wear causes feed jams and skewed paper, not image defects.",
     3: "Transfer faults add background scatter or faint patches; they do not erase one clean vertical band."},
    difficulty="hard", tags=["laser-printer", "drum", "print-quality"]))

add(q(
    "A technician is coaching a new hire through laser printer faults and wants the defect mapped to the failing step of the electrophotographic process. Match each symptom to the component at fault.",
    "5.6", [], None,
    "Each defect maps to one stage of the electrophotographic cycle. Smearing on touch means the fuser is not melting toner into the fibers, so the image never bonds. A mark repeating at a fixed interval matches one damaged track on the drum's circumference. Completely blank pages mean the charging corona wire is not conditioning the drum, so no latent image forms for development. Ghosting of the previous job's content means the transfer stage is not fully moving toner off the drum, so leftovers faintly reappear on the next page.",
    None,
    qtype="match", difficulty="hard", pairs=[
        {"left": "Toner smears when touched", "right": "Worn or cold fuser assembly"},
        {"left": "Repeating ghost image every drum revolution", "right": "Damaged imaging drum"},
        {"left": "Completely blank pages", "right": "Failed charging corona wire"},
        {"left": "Ghosting of the previous job's content", "right": "Faulty transfer stage"},
    ], tags=["laser-printer", "electrophotographic", "diagnosis"]))

add(q(
    "A user reports that an inkjet printer prints with visible horizontal banding and missing colors. A technician runs a nozzle check pattern and sees gaps in the pattern. What is the first maintenance action?",
    "5.6",
    ["Run the printhead cleaning cycle, then reprint the nozzle check",
     "Replace all the ink cartridges with new ones",
     "Increase the print quality setting to maximum",
     "Replace the printhead, since gaps in the pattern mean it is dead"],
    0,
    "Gaps in a nozzle check mean clogged nozzles, so the first action is a cleaning cycle followed by another check to see whether the pattern fills in. Cartridges still supply ink when the check shows a partial pattern, so replacing them wastes consumables. Higher quality settings compensate for minor dot loss but cannot print through nozzles that fire nothing at all. Printhead replacement is a last resort after multiple cleaning cycles fail.",
    {1: "The partial nozzle pattern proves ink reaches the head, so consumables are not the fault.",
     2: "Quality settings cannot compensate for nozzles that are fully clogged and fire nothing.",
     3: "Printhead replacement is premature before cleaning cycles have been attempted and failed."},
    difficulty="medium", tags=["inkjet", "nozzles", "maintenance"]))

add(q(
    "A cashier reports that the thermal receipt printer at the point of sale prints faint, incomplete characters that drop out mid-letter. Which cause and remedy pair is correct?",
    "5.6",
    ["Old thermal paper past its shelf life, so install fresh stock",
     "A failing fuser, so replace the fuser assembly",
     "A dirty printhead, so clean the heating elements with isopropyl alcohol",
     "Low toner, so replace the toner cartridge"],
    2,
    "Incomplete characters that drop out mid-letter indicate uneven heating across the printhead elements: residue on the heating line blocks heat transfer to the paper, so clean the elements with isopropyl alcohol and verify the paper stock is fresh. Old paper fades contrast evenly across the whole receipt rather than eating character strokes. Thermal printers have no fuser assembly at all, since that belongs to laser printing. Thermal printers use no toner; they heat coated paper directly.",
    {0: "Aging thermal paper reduces contrast uniformly across the receipt; it does not eat individual character strokes.",
     1: "Thermal printers contain no fuser assembly; fusing is a laser printer process.",
     3: "Thermal printers use no toner; they burn the image directly into heat-sensitive paper."},
    difficulty="medium", tags=["thermal-printer", "printhead", "printers"]))


# ---------------------------------------------------------------------------
# Rotation: balance keyed positions for single questions (validator wants 15-35% each)
# ---------------------------------------------------------------------------
def rotate_singles(questions):
    singles = [o for o in questions if o["type"] == "single"]
    for idx, o in enumerate(singles):
        target = idx % 4
        ans = o["answer"]
        r = (ans - target) % 4
        old_opts = o["options"]
        correct_text = old_opts[ans]
        new_opts = [old_opts[(i + r) % 4] for i in range(4)]
        new_da = {str((int(k) - r) % 4): v for k, v in o["distractor_analysis"].items()}
        o["options"] = new_opts
        o["answer"] = target
        o["distractor_analysis"] = new_da
        # sanity: correct option text preserved at the new keyed index
        assert new_opts[target] == correct_text, f"rotation broke {o['id']}"
        assert set(new_da.keys()) == {str(i) for i in range(4) if i != target}
    return questions


# ---------------------------------------------------------------------------
# Assembly + checks
# ---------------------------------------------------------------------------
def main():
    for i, o in enumerate(QUESTIONS, 1):
        o["id"] = f"C1N-T-{i:03d}"
    rotate_singles(QUESTIONS)

    errors = []
    n = len(QUESTIONS)
    if n != 50:
        errors.append(f"expected 50 questions, got {n}")

    types = Counter(o["type"] for o in QUESTIONS)
    if types["single"] != 38 or types["multi"] != 6 or types["order"] != 3 or types["match"] != 3:
        errors.append(f"type mix off: {dict(types)}")
    diffs = Counter(o["difficulty"] for o in QUESTIONS)
    objs = Counter(o["objective"] for o in QUESTIONS)
    want = {"5.1": 10, "5.2": 8, "5.3": 8, "5.4": 8, "5.5": 9, "5.6": 7}
    if dict(objs) != want:
        errors.append(f"objective counts off: {dict(objs)} want {want}")

    SC = re.compile(r"a user|a technician|a customer|reports|scenario|your|the help desk", re.I)
    scen = [o for o in QUESTIONS if len(o["question"]) >= 100 and SC.search(o["question"])]
    if len(scen) / n < 0.60:
        errors.append(f"scenario ratio {len(scen)}/{n} below 0.60")

    # banned characters: em dash, en dash, markdown, leak markers, template phrases
    def walk(x, path=""):
        if isinstance(x, str):
            if "\u2014" in x or "\u2013" in x:
                errors.append(f"em/en dash in {path}: {x[:60]}")
            if any(ord(c) > 0x2000 and c != "\u2019" for c in x):
                errors.append(f"unusual char in {path}: {x[:60]}")
            low = x.lower()
            if "answer:" in low or "correct answer" in low:
                errors.append(f"leak phrase in {path}: {x[:60]}")
            for p in ("this is a key requirement", "official core 1 reference",
                      "official core 2 reference", "review comptia objectives",
                      "essential knowledge for comptia"):
                if p in low:
                    errors.append(f"template phrase in {path}: {p}")
            if "**" in x or "####" in x:
                errors.append(f"markdown in {path}: {x[:60]}")
            if re.search(r"(all|none|both|either|neither)\s+of\s+(the\s+)?(above|these|following)", low):
                errors.append(f"positional ref in {path}: {x[:60]}")
        elif isinstance(x, dict):
            for k, v in x.items():
                walk(v, f"{path}.{k}")
        elif isinstance(x, list):
            for i, v in enumerate(x):
                walk(v, f"{path}[{i}]")
    walk(QUESTIONS, "q")

    # per-question structural checks
    for o in QUESTIONS:
        if len(o["explanation"]) < 120:
            errors.append(f"{o['id']} explanation too short")
        if not (2 <= len(o["tags"]) <= 5):
            errors.append(f"{o['id']} tags count {len(o['tags'])}")
        if o["tags"] != [t.lower() for t in o["tags"]]:
            errors.append(f"{o['id']} tags not lowercase")
        if o["video_reference"]["objective"] != o["objective"]:
            errors.append(f"{o['id']} video objective mismatch")
        if o["notes_reference"] != NOTES[o["objective"]]:
            errors.append(f"{o['id']} notes_reference mismatch")
        if len(set(op.strip().lower() for op in o.get("options", []))) != len(o.get("options", [])):
            errors.append(f"{o['id']} duplicate options")
        if o["type"] == "multi":
            if o["answers"] != sorted(o["answers"]) or len(o["answers"]) != 2:
                errors.append(f"{o['id']} multi answers not sorted/2")
            if "(Select TWO.)" not in o["question"]:
                errors.append(f"{o['id']} multi stem missing Select TWO marker")
            if len(o["options"]) != 5:
                errors.append(f"{o['id']} multi needs 5 options")
            wrong = set(range(5)) - set(o["answers"])
            if set(o["distractor_analysis"].keys()) != {str(i) for i in wrong}:
                errors.append(f"{o['id']} distractor keys != wrong options")
        if o["type"] == "single":
            if len(o["options"]) != 4:
                errors.append(f"{o['id']} single needs 4 options")
            wrong = set(range(4)) - {o["answer"]}
            if set(o["distractor_analysis"].keys()) != {str(i) for i in wrong}:
                errors.append(f"{o['id']} distractor keys != wrong options")
        if o["type"] == "order" and not (4 <= len(o["sequence"]) <= 6):
            errors.append(f"{o['id']} order needs 4-6 steps")
        if o["type"] == "match" and not (4 <= len(o["pairs"]) <= 5):
            errors.append(f"{o['id']} match needs 4-5 pairs")

    # near-duplicate stems within shard (first-60-char buckets, normalized)
    def norm(s):
        return re.sub(r"\s+", " ", s).strip().lower()
    seen = {}
    for o in QUESTIONS:
        key = norm(o["question"])[:60]
        if key in seen:
            errors.append(f"near-dup within shard: {o['id']} vs {seen[key]}")
        else:
            seen[key] = o["id"]

    # near-duplicate stems vs existing bank
    bank_path = os.path.join(ROOT, "CompTIA_A_Plus_Desktop_App", "resources", "app", "exam_data.json")
    with open(bank_path, encoding="utf-8") as f:
        bank = json.load(f)
    existing = set()
    for bq in bank.get("core1", []) + bank.get("core2", []):
        existing.add(norm(bq.get("question", ""))[:60])
    for o in QUESTIONS:
        k = norm(o["question"])[:60]
        if k in existing:
            errors.append(f"near-dup vs existing bank: {o['id']} '{o['question'][:50]}'")

    # answer-key balance for singles (15-35% per position)
    singles = [o for o in QUESTIONS if o["type"] == "single"]
    keyed = Counter(o["answer"] for o in singles)
    for pos in range(4):
        frac = keyed.get(pos, 0) / len(singles)
        if not 0.15 <= frac <= 0.35:
            errors.append(f"keyed position {pos} = {frac:.1%} outside 15-35%")

    if errors:
        print("BUILD ERRORS:")
        for e in errors:
            print("  x", e)
        return 1

    out = os.path.join(ROOT, "_bank", "shards", "core1_new_5x.json")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump({"questions": QUESTIONS}, f, indent=2, ensure_ascii=False)
    print(f"WROTE {out} with {n} questions")
    print("types:", dict(types))
    print("difficulty:", dict(diffs))
    print("objectives:", dict(sorted(objs.items())))
    print(f"scenario-like: {len(scen)}/{n} = {len(scen)/n:.0%}")
    print("single key balance:", {p: f"{keyed.get(p,0)/len(singles):.0%}" for p in range(4)})
    print("existing bank stems compared:", len(existing))
    return 0


if __name__ == "__main__":
    sys.exit(main())