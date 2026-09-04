/**
 * Study plan engine: exam date + target + hours/week -> weekly plan + daily tasks.
 * Completing tasks can mint small APX via CompTIALedger.recordStudyPlanTask.
 */
(function (global) {
  const STORAGE_KEY = "comptia_study_plan_v1";

  const CORE1_TOPICS = [
    "1.0 Mobile Devices",
    "2.0 Networking",
    "3.0 Hardware",
    "4.0 Virtualization and Cloud Computing",
    "5.0 Hardware and Network Troubleshooting"
  ];
  const CORE2_TOPICS = [
    "1.0 Operating Systems",
    "2.0 Security",
    "3.0 Software Troubleshooting",
    "4.0 Operational Procedures"
  ];

  function storageGet() {
    if (global.CompTIAProfiles && CompTIAProfiles.scopedGet) {
      return CompTIAProfiles.scopedGet(STORAGE_KEY);
    }
    return localStorage.getItem(STORAGE_KEY);
  }

  function storageSet(value) {
    if (global.CompTIAProfiles && CompTIAProfiles.scopedSet) {
      CompTIAProfiles.scopedSet(STORAGE_KEY, value);
      return;
    }
    localStorage.setItem(STORAGE_KEY, value);
  }

  function loadPlan() {
    try {
      const raw = storageGet();
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  function savePlan(plan) {
    storageSet(JSON.stringify(plan));
    return plan;
  }

  function daysUntil(dateStr) {
    const target = new Date(dateStr + "T23:59:59");
    const now = new Date();
    const ms = target.getTime() - now.getTime();
    return Math.max(0, Math.ceil(ms / 86400000));
  }

  function topicsForTarget(target) {
    const t = String(target || "both").toLowerCase();
    if (t === "core1") return CORE1_TOPICS.map((x) => ({ exam: "core1", topic: x }));
    if (t === "core2") return CORE2_TOPICS.map((x) => ({ exam: "core2", topic: x }));
    return [
      ...CORE1_TOPICS.map((x) => ({ exam: "core1", topic: x })),
      ...CORE2_TOPICS.map((x) => ({ exam: "core2", topic: x }))
    ];
  }

  function isoDay(d) {
    return d.toISOString().slice(0, 10);
  }

  function addDays(d, n) {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  }

  /**
   * Generate a plan.
   * settings: { examDate: 'YYYY-MM-DD', target: 'core1'|'core2'|'both', hoursPerWeek: number }
   */
  function generatePlan(settings) {
    const examDate = settings.examDate;
    const target = String(settings.target || "both").toLowerCase();
    const hoursPerWeek = Math.max(1, Math.min(40, Number(settings.hoursPerWeek) || 7));
    const daysLeft = Math.max(1, daysUntil(examDate));
    const weeks = Math.max(1, Math.ceil(daysLeft / 7));
    const sessionsPerWeek = Math.max(3, Math.min(7, Math.round(hoursPerWeek)));
    const topics = topicsForTarget(target);
    const completed = (loadPlan() && loadPlan().completedTaskIds) || {};

    const weeksOut = [];
    const dailyTasks = [];
    let topicIdx = 0;
    const start = new Date();
    start.setHours(12, 0, 0, 0);

    for (let w = 0; w < weeks; w++) {
      const weekStart = addDays(start, w * 7);
      const weekEnd = addDays(weekStart, 6);
      const weekTasks = [];

      for (let s = 0; s < sessionsPerWeek; s++) {
        const dayOffset = Math.min(6, Math.floor((s * 7) / sessionsPerWeek));
        const day = addDays(weekStart, dayOffset);
        if (day > new Date(examDate + "T23:59:59")) break;

        const topic = topics[topicIdx % topics.length];
        topicIdx += 1;
        const dayKey = isoDay(day);

        const kinds = [
          {
            kind: "exam_drill",
            title: "Exam drill: " + topic.topic + " (" + topic.exam + ")",
            actionHint: "Run a domain practice drill for this topic"
          },
          {
            kind: "study_library",
            title: "Study library: " + topic.topic,
            actionHint: "Open Study Library and review notes for this domain"
          },
          {
            kind: "messer_video",
            title: "Professor Messer video: " + topic.topic,
            actionHint: "Watch a mapped Messer lesson for this objective area"
          },
          {
            kind: "pbq",
            title: "PBQ lab practice",
            actionHint: "Complete a Port Matcher or Laser Printer PBQ"
          },
          {
            kind: "missed_drill",
            title: "Spaced missed-question drill",
            actionHint: "Retake missed questions from your personal bank"
          }
        ];
        const kindSpec = kinds[s % kinds.length];
        const id = "w" + w + "_s" + s + "_" + dayKey + "_" + kindSpec.kind;

        const task = {
          id,
          week: w + 1,
          date: dayKey,
          exam: topic.exam,
          topic: topic.topic,
          kind: kindSpec.kind,
          title: kindSpec.title,
          actionHint: kindSpec.actionHint,
          minutes: Math.max(25, Math.round((hoursPerWeek * 60) / sessionsPerWeek)),
          done: !!completed[id]
        };
        weekTasks.push(task);
        dailyTasks.push(task);
      }

      weeksOut.push({
        week: w + 1,
        start: isoDay(weekStart),
        end: isoDay(weekEnd > new Date(examDate + "T23:59:59") ? new Date(examDate + "T12:00:00") : weekEnd),
        taskCount: weekTasks.length,
        tasks: weekTasks
      });
    }

    const plan = {
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      examDate,
      target,
      hoursPerWeek,
      daysLeft,
      weeks,
      sessionsPerWeek,
      weeksOut,
      dailyTasks,
      completedTaskIds: completed
    };
    return savePlan(plan);
  }

  function getPlan() {
    return loadPlan();
  }

  function getTodayTasks() {
    const plan = loadPlan();
    if (!plan) return [];
    const today = isoDay(new Date());
    return (plan.dailyTasks || []).filter((t) => t.date === today);
  }

  async function completeTask(taskId) {
    const plan = loadPlan();
    if (!plan) return { ok: false, error: "No study plan set" };
    const task = (plan.dailyTasks || []).find((t) => t.id === taskId);
    if (!task) return { ok: false, error: "Task not found" };
    if (task.done || (plan.completedTaskIds && plan.completedTaskIds[taskId])) {
      return { ok: true, already: true, plan };
    }

    plan.completedTaskIds = plan.completedTaskIds || {};
    plan.completedTaskIds[taskId] = new Date().toISOString();
    task.done = true;
    (plan.weeksOut || []).forEach((w) => {
      (w.tasks || []).forEach((t) => {
        if (t.id === taskId) t.done = true;
      });
    });
    plan.updatedAt = new Date().toISOString();
    savePlan(plan);

    let reward = null;
    if (global.CompTIALedger && CompTIALedger.recordStudyPlanTask) {
      reward = await CompTIALedger.recordStudyPlanTask(task);
    }
    return { ok: true, plan, task, reward };
  }

  function clearPlan() {
    if (global.CompTIAProfiles && CompTIAProfiles.scopedRemove) {
      CompTIAProfiles.scopedRemove(STORAGE_KEY);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  global.CompTIAStudyPlan = {
    STORAGE_KEY,
    generatePlan,
    getPlan,
    getTodayTasks,
    completeTask,
    clearPlan,
    daysUntil,
    loadPlan,
    savePlan
  };
})(window);
