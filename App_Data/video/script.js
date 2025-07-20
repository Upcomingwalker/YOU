const API_KEY = "AIzaSyCkcfNoufQph8I4MbrXW9kCYdlZCJklZWA";
const MAX_RESULTS = 9;

const cbseSubjects = {
  "1": ["English", "Hindi", "Mathematics", "Environmental Studies", "General Knowledge", "Arts & Craft"],
  "2": ["English", "Hindi", "Mathematics", "Environmental Studies", "General Knowledge", "Arts & Craft"],
  "3": ["English", "Hindi", "Mathematics", "Environmental Studies", "General Knowledge", "Arts & Craft"],
  "4": ["English", "Hindi", "Mathematics", "Environmental Studies", "General Knowledge", "Arts & Craft"],
  "5": ["English", "Hindi", "Mathematics", "Environmental Studies", "General Knowledge", "Arts & Craft"],
  "6": ["English", "Hindi", "Mathematics", "Science", "Social Science", "Computer Science", "Arts Education"],
  "7": ["English", "Hindi", "Mathematics", "Science", "Social Science", "Computer Science", "Arts Education"],
  "8": ["English", "Hindi", "Mathematics", "Science", "Social Science", "Computer Science", "Arts Education"],
  "9": ["English", "Hindi", "Mathematics", "Science", "Social Science", "Computer Applications", "Home Science", "Physical Education"],
  "10": ["English", "Hindi", "Mathematics", "Science", "Social Science", "Computer Applications", "Home Science", "Physical Education"],
  "11": ["English", "Hindi", "Mathematics", "Physics", "Chemistry", "Biology", "History", "Geography", "Political Science", "Economics", "Business Studies", "Accountancy", "Psychology", "Sociology", "Computer Science", "Informatics Practices", "Physical Education", "Home Science", "Fine Arts"],
  "12": ["English", "Hindi", "Mathematics", "Physics", "Chemistry", "Biology", "History", "Geography", "Political Science", "Economics", "Business Studies", "Accountancy", "Psychology", "Sociology", "Computer Science", "Informatics Practices", "Physical Education", "Home Science", "Fine Arts"]
};

let classSelect, subjectSelect, chapterSelect, searchBtn, resultsGrid, loadingDiv, errorDiv, overlay, overlayClose, playerFrame, dashboardBtn;

function initializeElements() {
  classSelect = document.getElementById("class-select");
  subjectSelect = document.getElementById("subject-select");
  chapterSelect = document.getElementById("chapter-select");
  searchBtn = document.getElementById("search-btn");
  resultsGrid = document.getElementById("results");
  loadingDiv = document.getElementById("loading");
  errorDiv = document.getElementById("error");
  overlay = document.getElementById("overlay");
  overlayClose = document.getElementById("close-overlay");
  playerFrame = document.getElementById("player");
  dashboardBtn = document.getElementById("dashboard-btn");
}

function populateClasses() {
  if (!classSelect) return;
  
  classSelect.innerHTML = '<option value="" disabled selected>Select Class</option>';
  
  for (let i = 1; i <= 12; i++) {
    const option = document.createElement("option");
    option.value = i.toString();
    option.textContent = `Class ${i}`;
    classSelect.appendChild(option);
  }
}

function populateChapters() {
  if (!chapterSelect) return;
  
  chapterSelect.innerHTML = '<option value="" disabled selected>Select Chapter</option>';
  
  for (let i = 1; i <= 30; i++) {
    const option = document.createElement("option");
    option.value = i.toString();
    option.textContent = `Chapter ${i}`;
    chapterSelect.appendChild(option);
  }
}

function populateSubjects(selectedClass) {
  if (!subjectSelect) return;
  
  subjectSelect.innerHTML = '<option value="" disabled selected>Select Subject</option>';
  
  if (!selectedClass || !cbseSubjects[selectedClass]) {
    subjectSelect.disabled = true;
    return;
  }
  
  const subjects = cbseSubjects[selectedClass];
  subjectSelect.disabled = false;
  
  subjects.forEach((subject) => {
    const option = document.createElement("option");
    option.value = subject;
    option.textContent = subject;
    subjectSelect.appendChild(option);
  });
}

function showLoading(show) {
  if (!loadingDiv) return;
  if (show) {
    loadingDiv.classList.remove("hidden");
  } else {
    loadingDiv.classList.add("hidden");
  }
}

function showError(message) {
  if (!errorDiv) return;
  if (message) {
    errorDiv.textContent = message;
    errorDiv.classList.remove("hidden");
  } else {
    errorDiv.classList.add("hidden");
  }
}

function clearResults() {
  if (resultsGrid) {
    resultsGrid.innerHTML = "";
  }
}

async function fetchVideos(query) {
  
  const url = `https://www.googleapis.com/youtube/v3/search?key=${API_KEY}&part=snippet&q=${encodeURIComponent(query)}&maxResults=${MAX_RESULTS}&type=video&videoDuration=long&safeSearch=strict`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} - ${response.statusText}`);
    }
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error("Fetch error:", error);
    throw new Error("Failed to fetch videos. Please check your internet connection.");
  }
}

function renderVideos(videos) {
  clearResults();
  
  if (!videos.length) {
    showError("No videos found. Try different search terms.");
    return;
  }
  
  videos.forEach((video, index) => {
    const videoId = video.id.videoId;
    const title = video.snippet.title;
    const thumbnail = video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default.url;
    
    const card = document.createElement("div");
    card.className = "video-card";
    card.style.animationDelay = `${index * 0.1}s`;
    card.setAttribute("data-video-id", videoId);
    
    card.innerHTML = `
      <img src="${thumbnail}" alt="${title}" class="video-thumbnail">
      <div class="video-info">
        <p class="video-title">${title}</p>
      </div>
    `;
    
    card.addEventListener("click", () => {
      openPlayer(videoId);
    });
    
    resultsGrid.appendChild(card);
  });
}

function openPlayer(videoId) {
  if (!overlay || !playerFrame) return;
  
  playerFrame.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
  overlay.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closePlayer() {
  if (!overlay || !playerFrame) return;
  
  overlay.classList.add("hidden");
  playerFrame.src = "";
  document.body.style.overflow = "auto";
}

async function handleSearch() {
  
  const selectedClass = classSelect?.value;
  const selectedSubject = subjectSelect?.value;
  const selectedChapter = chapterSelect?.value;
  
  if (!selectedClass || !selectedSubject || !selectedChapter) {
    showError("Please select class, subject, and chapter.");
    return;
  }
  
  const query = `Class ${selectedClass} ${selectedSubject} Chapter ${selectedChapter} NCERT`;
  
  showError("");
  showLoading(true);
  clearResults();
  
  try {
    const videos = await fetchVideos(query);
    renderVideos(videos);
  } catch (error) {
    console.error("Search error:", error);
    showError(error.message);
  } finally {
    showLoading(false);
  }
}

function setupEventListeners() {
  
  if (classSelect) {
    classSelect.addEventListener("change", (e) => {
      populateSubjects(e.target.value);
    });
  }
  
  if (searchBtn) {
    searchBtn.addEventListener("click", (e) => {
      e.preventDefault();
      handleSearch();
    });
  }

  if (dashboardBtn) {
    dashboardBtn.addEventListener("click", () => {
      window.location.href = "index.html";
    });
  }
  
  if (overlayClose) {
    overlayClose.addEventListener("click", closePlayer);
  }
  
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        closePlayer();
      }
    });
  }
  
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay && !overlay.classList.contains("hidden")) {
      closePlayer();
    }
  });
}

function init() {
  
  initializeElements();
  populateClasses();
  populateChapters();
  populateSubjects("");
  setupEventListeners();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
