const dateTime = document.getElementById("dateTime");
const appPanel = document.getElementById("appPanel");
const scrollLeft = document.getElementById("scrollLeft");
const scrollRight = document.getElementById("scrollRight");
const audio = document.getElementById('bgMusic');
const musicButton = document.getElementById('musicButton');
const mainContent = document.getElementById('mainContent');
const welcomeVideoOverlay = document.getElementById('welcomeVideoOverlay');
const welcomeVideo = document.getElementById('welcomeVideo');
const appVideoOverlay = document.getElementById('appVideoOverlay');
const appLoadingVideo = document.getElementById('appLoadingVideo');

let isPlaying = false;
let hasPlayedWelcomeVideo = false;

function playWelcomeVideo() {
  hasPlayedWelcomeVideo = true;
  welcomeVideoOverlay.style.display = 'flex';
  
  welcomeVideo.muted = false;
  welcomeVideo.volume = 0.8;
  
  welcomeVideo.play().catch(e => {
    setTimeout(showMainContent, 2000);
  });
  
  welcomeVideo.addEventListener('ended', showMainContent);
  
  setTimeout(showMainContent, 20000);
}

function showMainContent() {
  welcomeVideoOverlay.style.display = 'none';
  mainContent.classList.add('visible');
  
  setTimeout(() => {
    mainContent.classList.add('fade-in');
  }, 100);
  
  initializeApp();
}

window.addEventListener('load', () => {
  if (!hasPlayedWelcomeVideo) {
    playWelcomeVideo();
  } else {
    showMainContent();
  }
});

function initializeApp() {
  updateDateTime();
  setInterval(updateDateTime, 1000);
  setupMusic();
  setupScrolling();
  updateStreak();
}

function updateDateTime() {
  const now = new Date();
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  dateTime.textContent = now.toLocaleDateString('en-US', options);
}

function setupMusic() {
  audio.volume = 0.5;
  
  if (mainContent.classList.contains('fade-in')) {
    audio.play().catch(e => {
      isPlaying = false;
      updateMusicButton();
    });
    isPlaying = true;
    updateMusicButton();
  }
}

function toggleMusic() {
  if (isPlaying) {
    audio.pause();
    isPlaying = false;
  } else {
    audio.play().catch(e => {
      isPlaying = false;
    });
    isPlaying = true;
  }
  updateMusicButton();
}

function updateMusicButton() {
  musicButton.textContent = isPlaying ? '🔊' : '🔇';
}

function setupScrolling() {
  updateScrollButtons();
  
  scrollLeft.addEventListener('click', () => {
    appPanel.scrollBy({ left: -340, behavior: 'smooth' });
    setTimeout(updateScrollButtons, 300);
  });
  
  scrollRight.addEventListener('click', () => {
    appPanel.scrollBy({ left: 340, behavior: 'smooth' });
    setTimeout(updateScrollButtons, 300);
  });
  
  appPanel.addEventListener('scroll', updateScrollButtons);
}

function updateScrollButtons() {
  const { scrollLeft: left, scrollWidth, clientWidth } = appPanel;
  
  scrollLeft.classList.toggle('disabled', left <= 0);
  scrollRight.classList.toggle('disabled', left >= scrollWidth - clientWidth);
}

function openApp(url, videoSrc) {
  appVideoOverlay.style.display = 'flex';
  appLoadingVideo.src = videoSrc;
  
  if (isPlaying) {
    audio.pause();
  }
  
  appLoadingVideo.play().catch(e => {
    window.location.href = url;
  });
  
  let redirected = false;
  
  appLoadingVideo.addEventListener('ended', () => {
    if (!redirected) {
      redirected = true;
      window.location.href = url;
    }
  });
  
  setTimeout(() => {
    if (!redirected) {
      redirected = true;
      window.location.href = url;
    }
  }, 5000);
}

welcomeVideo.addEventListener('error', () => {
  setTimeout(showMainContent, 1000);
});

appLoadingVideo.addEventListener('error', () => {
  appVideoOverlay.style.display = 'none';
  if (isPlaying) {
    audio.play();
  }
});

let touchStartX = 0;
let touchEndX = 0;

appPanel.addEventListener('touchstart', (e) => {
  touchStartX = e.changedTouches[0].screenX;
});

appPanel.addEventListener('touchend', (e) => {
  touchEndX = e.changedTouches[0].screenX;
  handleSwipe();
});

function handleSwipe() {
  const swipeThreshold = 50;
  const diff = touchStartX - touchEndX;
  
  if (Math.abs(diff) > swipeThreshold) {
    if (diff > 0) {
      appPanel.scrollBy({ left: 340, behavior: 'smooth' });
    } else {
      appPanel.scrollBy({ left: -340, behavior: 'smooth' });
    }
    setTimeout(updateScrollButtons, 300);
  }
}

document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});

function updateStreak() {
  const streakElement = document.querySelector('.streak');
  const streak = localStorage.getItem('dailyStreak') || 0;
  streakElement.textContent = `🔥 ${streak} Days`;
}

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    document.querySelector(this.getAttribute('href')).scrollIntoView({
      behavior: 'smooth'
    });
  });
});

function handleResize() {
  if (window.innerWidth <= 768) {
    updateScrollButtons();
  }
}

window.addEventListener('resize', handleResize);

handleResize();
