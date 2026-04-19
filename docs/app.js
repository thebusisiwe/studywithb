const start = document.getElementById("start");
const pause = document.getElementById("pause");
const reset = document.getElementById("reset");
const timer = document.getElementById("timer");
const timerStatus = document.getElementById("timer-status");
const completionNote = document.getElementById("completion-note");
const completionNoteBody = document.getElementById("completion-note-body");
const themeToggle = document.getElementById("theme-toggle");

const defaultTime = 1500; // 25 mins
let timeleft = defaultTime; // 25 minutes in seconds
let timerInterval;
let timerState = "ready";

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

const updateTimer = () => {
    timer.textContent = formatTime(timeleft);
    updateTitle();
};

const startTimer = () => {
    if (timerInterval) {
        return;
    }

    hideNotification();
    applyTimerState("running");

    timerInterval = setInterval(() => {
        timeleft--;
        updateTimer();

        if (timeleft <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            timeleft = defaultTime;
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
    timeleft = defaultTime;
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