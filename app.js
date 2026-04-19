const start = document.getElementById("start");
const pause = document.getElementById("pause");
const reset = document.getElementById("reset");
const timer = document.getElementById("timer");
const timerLabel = document.getElementById("timer-label");
const timerStatus = document.getElementById("timer-status");
const completionNote = document.getElementById("completion-note");
const completionNoteBody = document.getElementById("completion-note-body");
const themeToggle = document.getElementById("theme-toggle");
const modeSelector = document.getElementById("mode-selector");
const taskInput = document.getElementById("task-input");
const taskSelect = document.getElementById("task-select");
const historyList = document.getElementById("history-list");
const historyEmpty = document.getElementById("history-empty");
const viewTimerBtn = document.getElementById("view-timer-btn");
const viewPlannerBtn = document.getElementById("view-planner-btn");
const timerStage = document.getElementById("timer-stage");
const plannerStage = document.getElementById("planner-stage");
const plannerForm = document.getElementById("planner-form");
const plannerTaskTitle = document.getElementById("planner-task-title");
const plannerTaskEstimate = document.getElementById("planner-task-estimate");
const plannerTaskList = document.getElementById("planner-task-list");
const plannerEmpty = document.getElementById("planner-empty");
const showArchivedToggle = document.getElementById("show-archived");

// ─── Session preset system ────────────────────────────────────────────────────
const DEFAULT_SESSIONS = [
    { id: "work",        label: "Work",         duration: 1500 },
    { id: "short-break", label: "Short Break",   duration: 300  },
    { id: "long-break",  label: "Long Break",    duration: 900  },
];

const SESSIONS_KEY = "pomodoroSessions";
const ACTIVE_SESSION_KEY = "pomodoroActiveSession";
const SESSION_LOG_KEY = "pomodoroSessionLog";
const TASKS_KEY = "pomodoroTasks";
const ACTIVE_VIEW_KEY = "pomodoroActiveView";
const SESSION_LOG_LIMIT = 60;

const loadSessions = () => {
    try {
        const stored = localStorage.getItem(SESSIONS_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
        }
    } catch (_) {}
    return DEFAULT_SESSIONS.map(s => ({ ...s }));
};

const saveSessions = (sessions) => {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
};

const loadSessionLog = () => {
    try {
        const stored = localStorage.getItem(SESSION_LOG_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                return parsed;
            }
        }
    } catch (_) {}
    return [];
};

const normalizeSessionEntry = (entry) => {
    const taskName = typeof entry?.taskName === "string" && entry.taskName.trim().length > 0
        ? entry.taskName.trim()
        : "Untitled session";
    const modeId = typeof entry?.modeId === "string" ? entry.modeId : "work";
    const modeLabel = typeof entry?.modeLabel === "string" && entry.modeLabel.trim().length > 0
        ? entry.modeLabel
        : modeId === "short-break"
            ? "Short Break"
            : modeId === "long-break"
                ? "Long Break"
                : "Work";
    const duration = Number.isFinite(entry?.duration) ? entry.duration : 1500;
    const completedAt = typeof entry?.completedAt === "string" ? entry.completedAt : new Date().toISOString();

    return {
        id: typeof entry?.id === "string" ? entry.id : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        taskName,
        taskId: typeof entry?.taskId === "string" ? entry.taskId : null,
        modeId,
        modeLabel,
        duration,
        completedAt,
    };
};

const loadTasks = () => {
    try {
        const stored = localStorage.getItem(TASKS_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                return parsed
                    .map((task) => {
                        const title = typeof task?.title === "string" ? task.title.trim() : "";
                        if (!title) {
                            return null;
                        }

                        const estimatedRaw = Number.parseInt(task?.estimatedSessions, 10);
                        const completedRaw = Number.parseInt(task?.completedSessions, 10);
                        const estimatedSessions = Number.isFinite(estimatedRaw) && estimatedRaw > 0 ? estimatedRaw : 1;
                        const completedSessions = Number.isFinite(completedRaw) && completedRaw >= 0
                            ? Math.min(completedRaw, estimatedSessions)
                            : 0;
                        const status = task?.status === "done" || task?.status === "archived"
                            ? task.status
                            : "active";

                        return {
                            id: typeof task?.id === "string"
                                ? task.id
                                : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                            title,
                            estimatedSessions,
                            completedSessions,
                            status,
                            createdAt: typeof task?.createdAt === "string" ? task.createdAt : new Date().toISOString(),
                        };
                    })
                    .filter(Boolean);
            }
        }
    } catch (_) {}

    return [];
};

const saveTasks = (entries) => {
    localStorage.setItem(TASKS_KEY, JSON.stringify(entries));
};

const saveSessionLog = (entries) => {
    localStorage.setItem(SESSION_LOG_KEY, JSON.stringify(entries));
};

let sessions = loadSessions();
let activeSessionId = localStorage.getItem(ACTIVE_SESSION_KEY) || sessions[0].id;
let sessionLog = loadSessionLog().map(normalizeSessionEntry);
let tasks = loadTasks();
let activeView = localStorage.getItem(ACTIVE_VIEW_KEY) || "timer";

saveSessionLog(sessionLog);

const findTaskById = (taskId) => tasks.find((task) => task.id === taskId) || null;

const saveTasksAndRender = () => {
    saveTasks(tasks);
    renderTaskSelect();
    renderPlannerTasks();
};

const getActiveSession = () =>
    sessions.find(s => s.id === activeSessionId) || sessions[0];

const getTaskName = () => {
    if (!taskInput) {
        return "Untitled";
    }

    const value = taskInput.value.trim();
    return value.length > 0 ? value : "Untitled session";
};

const getSelectedTaskId = () => {
    if (!taskSelect || !taskSelect.value) {
        return null;
    }

    const selectedTask = findTaskById(taskSelect.value);
    if (!selectedTask || selectedTask.status !== "active") {
        return null;
    }

    return selectedTask.id;
};

const resolveSessionTask = () => {
    const selectedTaskId = getSelectedTaskId();
    if (selectedTaskId) {
        const selectedTask = findTaskById(selectedTaskId);
        return {
            taskId: selectedTask.id,
            taskName: selectedTask.title,
        };
    }

    const inputTaskName = getTaskName();
    if (inputTaskName !== "Untitled session") {
        const titleMatch = tasks.find((task) =>
            task.status === "active" && task.title.toLowerCase() === inputTaskName.toLowerCase()
        );

        if (titleMatch) {
            return {
                taskId: titleMatch.id,
                taskName: titleMatch.title,
            };
        }
    }

    return {
        taskId: null,
        taskName: inputTaskName,
    };
};

const formatHistoryStamp = (isoDate) => {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) {
        return "Unknown time";
    }

    const localDate = date.toLocaleDateString([], { month: "short", day: "numeric" });
    const localTime = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return `${localDate} · ${localTime}`;
};

const renderSessionHistory = () => {
    if (!historyList || !historyEmpty) {
        return;
    }

    historyList.innerHTML = "";

    if (sessionLog.length === 0) {
        historyEmpty.hidden = false;
        return;
    }

    historyEmpty.hidden = true;

    sessionLog.slice(0, 5).forEach((entry) => {
        const item = document.createElement("li");
        item.className = "history-item";

        const task = document.createElement("p");
        task.className = "history-task";
        task.textContent = entry.taskName || "Untitled session";

        const meta = document.createElement("p");
        meta.className = "history-meta";
        meta.textContent = `${entry.modeLabel} · ${formatHistoryStamp(entry.completedAt)}`;

        item.appendChild(task);
        item.appendChild(meta);
        historyList.appendChild(item);
    });
};

const renderTaskSelect = () => {
    if (!taskSelect) {
        return;
    }

    const previousValue = taskSelect.value;
    taskSelect.innerHTML = "";

    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = "No linked planned task";
    taskSelect.appendChild(emptyOption);

    const activeTasks = tasks.filter((task) => task.status === "active");
    activeTasks.forEach((task) => {
        const remaining = Math.max(task.estimatedSessions - task.completedSessions, 0);
        const option = document.createElement("option");
        option.value = task.id;
        option.textContent = `${task.title} (${remaining} left)`;
        taskSelect.appendChild(option);
    });

    const stillExists = activeTasks.some((task) => task.id === previousValue);
    taskSelect.value = stillExists ? previousValue : "";
};

const renderPlannerTasks = () => {
    if (!plannerTaskList || !plannerEmpty) {
        return;
    }

    plannerTaskList.innerHTML = "";

    const visibleTasks = tasks
        .filter((task) => (showArchivedToggle?.checked ? true : task.status !== "archived"))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (visibleTasks.length === 0) {
        plannerEmpty.hidden = false;
        return;
    }

    plannerEmpty.hidden = true;

    visibleTasks.forEach((task) => {
        const remaining = Math.max(task.estimatedSessions - task.completedSessions, 0);
        const item = document.createElement("li");
        item.className = `planner-item planner-item-${task.status}`;
        item.dataset.taskId = task.id;

        const details = document.createElement("div");
        details.className = "planner-item-details";

        const title = document.createElement("p");
        title.className = "planner-item-title";
        title.textContent = task.title;

        const meta = document.createElement("p");
        meta.className = "planner-item-meta";
        meta.textContent = `${task.completedSessions}/${task.estimatedSessions} sessions completed · ${task.status}`;

        if (remaining === 0 && task.status === "active") {
            meta.textContent = `${meta.textContent} · target met`;
        }

        details.appendChild(title);
        details.appendChild(meta);

        const actions = document.createElement("div");
        actions.className = "planner-item-actions";

        if (task.status === "active") {
            const doneButton = document.createElement("button");
            doneButton.type = "button";
            doneButton.className = "planner-action";
            doneButton.dataset.action = "done";
            doneButton.dataset.taskId = task.id;
            doneButton.textContent = "Mark done";
            actions.appendChild(doneButton);
        } else if (task.status === "done") {
            const reopenButton = document.createElement("button");
            reopenButton.type = "button";
            reopenButton.className = "planner-action";
            reopenButton.dataset.action = "active";
            reopenButton.dataset.taskId = task.id;
            reopenButton.textContent = "Reopen";

            const archiveButton = document.createElement("button");
            archiveButton.type = "button";
            archiveButton.className = "planner-action";
            archiveButton.dataset.action = "archived";
            archiveButton.dataset.taskId = task.id;
            archiveButton.textContent = "Archive";

            actions.appendChild(reopenButton);
            actions.appendChild(archiveButton);
        } else {
            const restoreButton = document.createElement("button");
            restoreButton.type = "button";
            restoreButton.className = "planner-action";
            restoreButton.dataset.action = "active";
            restoreButton.dataset.taskId = task.id;
            restoreButton.textContent = "Restore";
            actions.appendChild(restoreButton);
        }

        item.appendChild(details);
        item.appendChild(actions);
        plannerTaskList.appendChild(item);
    });
};

const createTask = (title, estimatedSessions) => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
        return;
    }

    const estimate = Number.parseInt(estimatedSessions, 10);
    const normalizedEstimate = Number.isFinite(estimate) && estimate > 0 ? estimate : 1;

    const newTask = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: cleanTitle,
        estimatedSessions: normalizedEstimate,
        completedSessions: 0,
        status: "active",
        createdAt: new Date().toISOString(),
    };

    tasks = [newTask, ...tasks];
    saveTasksAndRender();

    if (taskSelect) {
        taskSelect.value = newTask.id;
    }
};

const setTaskStatus = (taskId, nextStatus) => {
    let didChange = false;

    tasks = tasks.map((task) => {
        if (task.id !== taskId) {
            return task;
        }

        didChange = true;
        return {
            ...task,
            status: nextStatus,
        };
    });

    if (didChange) {
        saveTasksAndRender();
    }
};

const incrementTaskProgress = (taskId) => {
    let didChange = false;

    tasks = tasks.map((task) => {
        if (task.id !== taskId) {
            return task;
        }

        if (task.status !== "active") {
            return task;
        }

        const completedSessions = Math.min(task.completedSessions + 1, task.estimatedSessions);
        didChange = true;

        return {
            ...task,
            completedSessions,
        };
    });

    if (didChange) {
        saveTasksAndRender();
    }
};

const switchView = (view) => {
    activeView = view === "planner" ? "planner" : "timer";

    if (timerStage) {
        timerStage.hidden = activeView !== "timer";
    }

    if (plannerStage) {
        plannerStage.hidden = activeView !== "planner";
    }

    if (viewTimerBtn) {
        viewTimerBtn.setAttribute("aria-pressed", activeView === "timer" ? "true" : "false");
    }

    if (viewPlannerBtn) {
        viewPlannerBtn.setAttribute("aria-pressed", activeView === "planner" ? "true" : "false");
    }

    localStorage.setItem(ACTIVE_VIEW_KEY, activeView);
};

const recordSessionCompletion = () => {
    const activeSession = getActiveSession();
    const resolvedTask = resolveSessionTask();
    const entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        taskName: resolvedTask.taskName,
        taskId: resolvedTask.taskId,
        modeId: activeSession.id,
        modeLabel: activeSession.label,
        duration: activeSession.duration,
        completedAt: new Date().toISOString(),
    };

    sessionLog = [entry, ...sessionLog].slice(0, SESSION_LOG_LIMIT);
    saveSessionLog(sessionLog);

    if (activeSession.id === "work" && resolvedTask.taskId) {
        incrementTaskProgress(resolvedTask.taskId);
    }

    renderSessionHistory();
};

let timeleft = getActiveSession().duration;
let timerInterval;
let timerState = "ready";
let audioContext;

const getAudioContext = () => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
        return null;
    }

    if (!audioContext) {
        audioContext = new AudioContextClass();
    }

    return audioContext;
};

const unlockAudio = () => {
    const context = getAudioContext();

    if (!context || context.state !== "suspended") {
        return;
    }

    context.resume().catch(() => {
        // Ignore resume failures; user interaction may still be required.
    });
};

const scheduleTone = ({ frequency, startTime, duration, peakGain, pan = 0, type = "sine" }) => {
    const context = getAudioContext();
    if (!context) {
        return;
    }

    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    const hasStereoPan = typeof context.createStereoPanner === "function";
    const panNode = hasStereoPan ? context.createStereoPanner() : null;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startTime);
    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    oscillator.connect(gainNode);
    if (panNode) {
        panNode.pan.setValueAtTime(pan, startTime);
        gainNode.connect(panNode);
        panNode.connect(context.destination);
    } else {
        gainNode.connect(context.destination);
    }

    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.04);
};

const playStartWindChimes = () => {
    unlockAudio();
    const context = getAudioContext();
    if (!context) {
        return;
    }

    const now = context.currentTime;
    const notes = [523.25, 659.25, 783.99, 987.77];

    notes.forEach((note, index) => {
        const at = now + (index * 0.17);
        const pan = index % 2 === 0 ? -0.25 : 0.25;
        scheduleTone({
            frequency: note,
            startTime: at,
            duration: 1.25,
            peakGain: 0.025,
            pan,
            type: "sine",
        });
        scheduleTone({
            frequency: note * 2,
            startTime: at + 0.01,
            duration: 0.9,
            peakGain: 0.008,
            pan,
            type: "triangle",
        });
    });
};

const playEndBells = () => {
    unlockAudio();
    const context = getAudioContext();
    if (!context) {
        return;
    }

    const now = context.currentTime;
    const strikes = [0, 0.34];
    const chord = [587.33, 880.0, 1174.66];

    strikes.forEach((offset, strikeIndex) => {
        chord.forEach((note, noteIndex) => {
            const at = now + offset + (noteIndex * 0.015);
            const pan = strikeIndex === 0 ? -0.18 : 0.18;
            scheduleTone({
                frequency: note,
                startTime: at,
                duration: 1.45,
                peakGain: 0.028,
                pan,
                type: "triangle",
            });
            scheduleTone({
                frequency: note * 2,
                startTime: at + 0.01,
                duration: 1.0,
                peakGain: 0.006,
                pan,
                type: "sine",
            });
        });
    });
};

const formatTime = (value) => {
    const minutes = Math.floor(value / 60);
    const seconds = value % 60;

    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

const hideNotification = () => {
    if (!completionNote) {
        return;
    }

    completionNote.hidden = true;
    completionNote.classList.remove("is-visible");
};

const showNotification = (message) => {
    if (!completionNote || !completionNoteBody) {
        return;
    }

    completionNoteBody.textContent = message;
    completionNote.hidden = false;
    completionNote.classList.add("is-visible");
};

const updateTitle = () => {
    document.title = timerState === "running"
        ? `${formatTime(timeleft)} | Pomodoro Timer`
        : "Pomodoro Timer";
};

const applyTimerState = (nextState) => {
    timerState = nextState;
    document.body.dataset.timerState = nextState;

    if (timerStatus) {
        if (nextState === "running") {
            timerStatus.textContent = "In session";
        } else if (nextState === "paused") {
            timerStatus.textContent = "Paused";
        } else if (nextState === "complete") {
            timerStatus.textContent = "Session complete";
        } else {
            timerStatus.textContent = "Ready to begin";
        }
    }

    start.disabled = nextState === "running";
    pause.disabled = nextState !== "running";
    reset.disabled = false;

    updateTitle();
};

const renderModeSelector = () => {
    if (!modeSelector) return;
    modeSelector.innerHTML = "";
    sessions.forEach(session => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "mode-btn";
        btn.textContent = session.label;
        btn.dataset.sessionId = session.id;
        btn.setAttribute("aria-pressed", session.id === activeSessionId ? "true" : "false");
        btn.addEventListener("click", () => setMode(session.id));
        modeSelector.appendChild(btn);
    });
};

const setMode = (sessionId) => {
    activeSessionId = sessionId;
    localStorage.setItem(ACTIVE_SESSION_KEY, sessionId);
    const session = getActiveSession();
    if (timerLabel) timerLabel.textContent = session.label;
    timeleft = session.duration;
    clearInterval(timerInterval);
    timerInterval = null;
    hideNotification();
    applyTimerState("ready");
    updateTimer();
    // update aria-pressed on all mode buttons
    modeSelector.querySelectorAll(".mode-btn").forEach(btn => {
        btn.setAttribute("aria-pressed", btn.dataset.sessionId === sessionId ? "true" : "false");
    });
};



const updateTimer = () => {
    timer.textContent = formatTime(timeleft);
    updateTitle();
};

const startTimer = () => {
    if (timerInterval) {
        return;
    }

    if (timerState !== "paused") {
        playStartWindChimes();
    }

    hideNotification();
    applyTimerState("running");

    timerInterval = setInterval(() => {
        timeleft--;
        updateTimer();

        if (timeleft <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            timeleft = getActiveSession().duration;
            playEndBells();
            recordSessionCompletion();
            showNotification("Your focus block is complete. Take a breath before the next one.");
            applyTimerState("complete");
            updateTimer();
        }
    }, 1000);
};

const pauseTimer = () => {
    clearInterval(timerInterval);
    timerInterval = null;
    applyTimerState("paused");
};

const resetTimer = () => {
    clearInterval(timerInterval);
    timerInterval = null;
    timeleft = getActiveSession().duration;
    hideNotification();
    applyTimerState("ready");
    updateTimer();
};

start.addEventListener("click", startTimer);
pause.addEventListener("click", pauseTimer);
reset.addEventListener("click", resetTimer);

if (viewTimerBtn) {
    viewTimerBtn.addEventListener("click", () => switchView("timer"));
}

if (viewPlannerBtn) {
    viewPlannerBtn.addEventListener("click", () => switchView("planner"));
}

if (plannerForm) {
    plannerForm.addEventListener("submit", (event) => {
        event.preventDefault();
        createTask(plannerTaskTitle?.value || "", plannerTaskEstimate?.value || "1");

        if (plannerTaskTitle) {
            plannerTaskTitle.value = "";
        }

        if (plannerTaskEstimate) {
            plannerTaskEstimate.value = "4";
        }
    });
}

if (showArchivedToggle) {
    showArchivedToggle.addEventListener("change", renderPlannerTasks);
}

if (plannerTaskList) {
    plannerTaskList.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLButtonElement)) {
            return;
        }

        const { taskId, action } = target.dataset;
        if (!taskId || !action) {
            return;
        }

        setTaskStatus(taskId, action);
    });
}

const THEMES = ["light", "burgundy-night", "emerald-night"];

const themeLabel = (theme) => {
    if (theme === "light") {
        return "Day mode";
    }

    if (theme === "burgundy-night") {
        return "Burgundy night";
    }

    if (theme === "emerald-night") {
        return "Emerald night";
    }

    return "Day mode";
};

const setTheme = (theme) => {
    const normalizedTheme = theme === "dark"
        ? "burgundy-night"
        : theme === "light-warm" || theme === "light-cool"
            ? "light"
        : THEMES.includes(theme)
            ? theme
            : "light";
    document.body.dataset.theme = normalizedTheme;

    if (themeToggle) {
        themeToggle.textContent = themeLabel(normalizedTheme);
    }
};

const savedTheme = localStorage.getItem("pomodoroTheme") || "light";
setTheme(savedTheme);

if (themeToggle) {
    themeToggle.addEventListener("click", () => {
        const currentTheme = document.body.dataset.theme;
        const currentIndex = THEMES.indexOf(currentTheme);
        const nextTheme = THEMES[(currentIndex + 1) % THEMES.length];
        setTheme(nextTheme);
        localStorage.setItem("pomodoroTheme", nextTheme);
    });
}

updateTimer();
applyTimerState("ready");
renderModeSelector();
renderSessionHistory();
renderTaskSelect();
renderPlannerTasks();
switchView(activeView);
if (timerLabel) timerLabel.textContent = getActiveSession().label;

// ─── PWA install prompt ───────────────────────────────────────────────────────
const installBtn = document.getElementById("install-btn");
const installIos = document.getElementById("install-ios");
let deferredInstallPrompt = null;

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isInStandaloneMode = () =>
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

if (!isInStandaloneMode()) {
    if (isIos() && installIos) {
        installIos.hidden = false;
    }

    window.addEventListener("beforeinstallprompt", (e) => {
        e.preventDefault();
        deferredInstallPrompt = e;
        if (installBtn) {
            installBtn.hidden = false;
        }
    });

    window.addEventListener("appinstalled", () => {
        deferredInstallPrompt = null;
        if (installBtn) installBtn.hidden = true;
        if (installIos) installIos.hidden = true;
    });
}

if (installBtn) {
    installBtn.addEventListener("click", async () => {
        if (!deferredInstallPrompt) return;
        deferredInstallPrompt.prompt();
        const { outcome } = await deferredInstallPrompt.userChoice;
        if (outcome === "accepted") {
            deferredInstallPrompt = null;
            installBtn.hidden = true;
        }
    });
}