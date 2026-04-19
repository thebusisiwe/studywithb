const start = document.getElementById("start");
const pause = document.getElementById("pause");
const reset = document.getElementById("reset");
const timer = document.getElementById("timer");

let timeleft = 1500; // 25 minutes in seconds
let timerInterval;

const updateTimer = () => {
  const minutes = Math.floor(timeleft / 60);
  const seconds = timeleft % 60;

    timer.innerHTML = `${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;

};

const startTimer = () => {
    if (timerInterval) {
        return;
    }

    timerInterval = setInterval(() => {
        timeleft--;
        updateTimer();

        if (timeleft === 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            alert("Time's up!");
            timeleft = 1500;
            updateTimer();
        }
    }, 1000);
};

const pauseTimer = () => {
    clearInterval(timerInterval);
    timerInterval = null;
};

const resetTimer = () => {
    clearInterval(timerInterval);
    timerInterval = null;
    timeleft = 1500;
    updateTimer();
};

start.addEventListener("click", startTimer);
pause.addEventListener("click", pauseTimer);
reset.addEventListener("click", resetTimer);
updateTimer();