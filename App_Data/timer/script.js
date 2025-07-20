let timer = {
    minutes: 25,
    seconds: 0,
    isRunning: false,
    isPaused: false,
    totalSeconds: 25 * 60,
    originalTime: 25 * 60,
    intervalId: null
};

let stats = {
    trees: 0,
    totalMinutes: 0,
    streak: 0
};

let currentSessionType = 'focus';

const quotes = [
    "Welcome to Focus Labs - where concentration meets innovation! 🧪🌳",
    "Your focus is your superpower in the lab of learning! 🔬",
    "Every experiment begins with focused attention. 🧪",
    "In Focus Labs, dedication grows into achievement! 🌱",
    "Science requires focus - your forest proves your commitment! 🌲",
    "Focus is the catalyst for all great discoveries! ⚗️",
    "Your concentration is the foundation of excellence! 🏆",
    "In the laboratory of life, focus is your most important tool! 🔬"
];

const treeEmojis = ['🌲', '🌳', '🌴', '🌿', '🌱', '🍃', '🌾', '🌵'];

function updateDisplay() {
    const display = document.getElementById('timerDisplay');
    const minutes = Math.floor(timer.totalSeconds / 60);
    const seconds = timer.totalSeconds % 60;
    display.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    const progress = ((timer.originalTime - timer.totalSeconds) / timer.originalTime) * 100;
    document.getElementById('progressFill').style.width = `${progress}%`;
}

function setTimer(minutes) {
    if (timer.isRunning) return;

    timer.minutes = minutes;
    timer.seconds = 0;
    timer.totalSeconds = minutes * 60;
    timer.originalTime = minutes * 60;
    updateDisplay();

    document.getElementById('progressFill').style.width = '0%';

    document.getElementById('customMinutes').value = minutes;
}

function setCustomTimer() {
    if (timer.isRunning) return;

    const customInput = document.getElementById('customMinutes');
    const minutes = parseInt(customInput.value);

    if (isNaN(minutes) || minutes < 1 || minutes > 180) {
        showNotification('⚠️ Please enter a valid time between 1-180 minutes');
        customInput.focus();
        return;
    }

    setTimer(minutes);
    showNotification(`✅ Custom timer set to ${minutes} minutes`);
}

function startTimer() {
    if (timer.totalSeconds <= 0) return;

    timer.isRunning = true;
    timer.isPaused = false;

    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('pauseBtn').style.display = 'inline-flex';

    timer.intervalId = setInterval(() => {
        timer.totalSeconds--;
        updateDisplay();

        if (timer.totalSeconds <= 0) {
            completeSession();
        }
    }, 1000);
}

function pauseTimer() {
    timer.isRunning = false;
    timer.isPaused = true;
    clearInterval(timer.intervalId);

    document.getElementById('startBtn').style.display = 'inline-flex';
    document.getElementById('pauseBtn').style.display = 'none';
    document.getElementById('startBtn').innerHTML = '▶️ Resume';
}

function resetTimer() {
    timer.isRunning = false;
    timer.isPaused = false;
    clearInterval(timer.intervalId);

    timer.totalSeconds = timer.originalTime;
    updateDisplay();

    document.getElementById('startBtn').style.display = 'inline-flex';
    document.getElementById('pauseBtn').style.display = 'none';
    document.getElementById('startBtn').innerHTML = '🌱 Start Growing';
    document.getElementById('progressFill').style.width = '0%';
}

function completeSession() {
    timer.isRunning = false;
    clearInterval(timer.intervalId);

    addTreeToForest();

    stats.trees++;
    stats.totalMinutes += timer.originalTime / 60;
    stats.streak++;
    updateStatsDisplay();

    showNotification('🎉 Session Complete! Your forest grows!');

    playCompletionSound();

    document.getElementById('startBtn').style.display = 'inline-flex';
    document.getElementById('pauseBtn').style.display = 'none';
    document.getElementById('startBtn').innerHTML = '🌱 Start Growing';

    updateQuote();

    timer.totalSeconds = timer.originalTime;
    updateDisplay();
    document.getElementById('progressFill').style.width = '0%';
}

function addTreeToForest() {
    const forestGrid = document.getElementById('forestGrid');
    const tree = document.createElement('div');
    tree.className = 'tree';
    tree.textContent = treeEmojis[Math.floor(Math.random() * treeEmojis.length)];

    const colors = [
        'rgba(168, 197, 255, 0.2)',
        'rgba(103, 126, 234, 0.2)',
        'rgba(118, 75, 162, 0.2)',
        'rgba(72, 187, 120, 0.2)',
        'rgba(104, 211, 145, 0.2)'
    ];

    tree.style.background = colors[Math.floor(Math.random() * colors.length)];

    forestGrid.appendChild(tree);
}

function updateStatsDisplay() {
    document.getElementById('treesCount').textContent = stats.trees;

    const hours = Math.floor(stats.totalMinutes / 60);
    const minutes = Math.floor(stats.totalMinutes % 60);
    document.getElementById('totalTime').textContent = `${hours}h ${minutes}m`;

    document.getElementById('streakCount').textContent = stats.streak;
}

function updateQuote() {
    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    document.getElementById('quote').textContent = quote;
}

function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function playCompletionSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.2);
        oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.4);

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.8);
    } catch (error) {
        console.log('Audio not supported');
    }
}

function returnToDashboard() {
    window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', () => {
    updateDisplay();
    updateStatsDisplay();
    updateQuote();

    setInterval(updateQuote, 30000);

    const customInput = document.getElementById('customMinutes');
    customInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            setCustomTimer();
        }
    });

    customInput.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        if (value > 180) {
            e.target.value = 180;
        } else if (value < 1 && e.target.value !== '') {
            e.target.value = 1;
        }
    });
});

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        if (timer.isRunning) {
            pauseTimer();
        } else {
            startTimer();
        }
    } else if (e.code === 'Escape') {
        resetTimer();
    }
});

document.addEventListener('visibilitychange', () => {
    if (document.hidden && timer.isRunning) {
        showNotification('⚠️ Stay focused! Don\'t let your tree wither!');
    }
});