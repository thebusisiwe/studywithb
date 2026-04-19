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

// ─── Session preset system ────────────────────────────────────────────────────
const DEFAULT_SESSIONS = [
    { id: "work",        label: "Work",         duration: 1500 },
    { id: "short-break", label: "Short Break",   duration: 300  },
    { id: "long-break",  label: "Long Break",    duration: 900  },
];

const SESSIONS_KEY = "pomodoroSessions";
const ACTIVE_SESSION_KEY = "pomodoroActiveSession";

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

let sessions = loadSessions();
let activeSessionId = localStorage.getItem(ACTIVE_SESSION_KEY) || sessions[0].id;

const getActiveSession = () =>
    sessions.find(s => s.id === activeSessionId) || sessions[0];

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
if (timerLabel) timerLabel.textContent = getActiveSession().label;