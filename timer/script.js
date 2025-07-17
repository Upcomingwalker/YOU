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
}

function startTimer() {
    if (timer.totalSeconds <= 0) return;
    
    timer.isRunning = true;
    timer.isPaused = false;
    
    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('pauseBtn').style.display = 'inline-block';
    
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
    
    document.getElementById('startBtn').style.display = 'inline-block';
    document.getElementById('pauseBtn').style.display = 'none';
    document.getElementById('startBtn').textContent = '▶️ Resume';
}

function resetTimer() {
    timer.isRunning = false;
    timer.isPaused = false;
    clearInterval(timer.intervalId);
    
    timer.totalSeconds = timer.originalTime;
    updateDisplay();
    
    document.getElementById('startBtn').style.display = 'inline-block';
    document.getElementById('pauseBtn').style.display = 'none';
    document.getElementById('startBtn').textContent = '🌱 Start Growing';
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
    
    document.getElementById('startBtn').style.display = 'inline-block';
    document.getElementById('pauseBtn').style.display = 'none';
    document.getElementById('startBtn').textContent = '🌱 Start Growing';
    
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
    
    const hue = Math.random() * 60 + 90;
    tree.style.background = `rgba(${Math.floor(Math.random() * 50 + 100)}, ${Math.floor(Math.random() * 50 + 150)}, ${Math.floor(Math.random() * 50 + 100)}, 0.3)`;
    
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
}

function returnToDashboard() {
    window.location.href = 'index.html';
}

updateDisplay();
updateStatsDisplay();
updateQuote();

setInterval(updateQuote, 30000);

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
