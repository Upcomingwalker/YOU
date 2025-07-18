const API_KEY = 'AIzaSyCkcfNoufQph8I4MbrXW9kCYdlZCJklZWA';
const BASE_URL = 'https://www.googleapis.com/youtube/v3';

const verifiedEducationalChannels = [
    'UC2C_jShtL725hvbm1arSV9w',
    'UCEWpbFLzoYGPfuWUMFPSaoA',
    'UCsooa4yRKGN_zEE8iknghZA',
    'UCBa659QWEk1AI4Tg--mrJ2A',
    'UCJ0-OtVpF0wOKEqT2Z1HEtA',
    'UCRXuOXLW3LcQLWQoUWn4PaQ',
    'UCiEHVhv0SBMpP75JbzJShqw',
    'UCX6OQ3DkcsbYNE6H8uQQuVA'
];

const classSelect = document.getElementById('classSelect');
const subjectSelect = document.getElementById('subjectSelect');
const searchBtn = document.getElementById('searchBtn');
const loadingContainer = document.getElementById('loadingContainer');
const videoGrid = document.getElementById('videoGrid');
const videoModal = document.getElementById('videoModal');
const closeModal = document.getElementById('closeModal');
const videoPlayer = document.getElementById('videoPlayer');
const videoTitle = document.getElementById('videoTitle');
const videoDescription = document.getElementById('videoDescription');
const videoChannel = document.getElementById('videoChannel');
const videoDuration = document.getElementById('videoDuration');

searchBtn.addEventListener('click', searchVideos);
closeModal.addEventListener('click', closeVideoModal);
window.addEventListener('click', (e) => {
    if (e.target === videoModal) {
        closeVideoModal();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeVideoModal();
    }
});

async function searchVideos() {
    const selectedClass = classSelect.value;
    const selectedSubject = subjectSelect.value;
    
    if (!selectedClass || !selectedSubject) {
        alert('Please select both class and subject');
        return;
    }
    
    showLoading();
    
    try {
        const videos = await fetchEducationalVideos(selectedClass, selectedSubject);
        displayVideos(videos);
    } catch (error) {
        console.error('Error fetching videos:', error);
        showError('Failed to fetch videos. Please try again.');
    } finally {
        hideLoading();
    }
}

async function fetchEducationalVideos(className, subject) {
    const searchQuery = `${className} ${subject} education tutorial lesson explained`;
    
    const searchParams = new URLSearchParams({
        part: 'snippet',
        type: 'video',
        videoDuration: 'long',
        maxResults: 50,
        order: 'relevance',
        q: searchQuery,
        key: API_KEY
    });
    
    const searchResponse = await fetch(`${BASE_URL}/search?${searchParams}`);
    const searchData = await searchResponse.json();
    
    if (!searchData.items || searchData.items.length === 0) {
        return [];
    }
    
    const videoIds = searchData.items.map(item => item.id.videoId).join(',');
    
    const videoParams = new URLSearchParams({
        part: 'snippet,contentDetails,statistics',
        id: videoIds,
        key: API_KEY
    });
    
    const videoResponse = await fetch(`${BASE_URL}/videos?${videoParams}`);
    const videoData = await videoResponse.json();
    
    return filterAndProcessVideos(videoData.items);
}

function filterAndProcessVideos(videos) {
    return videos.filter(video => {
        const duration = parseDuration(video.contentDetails.duration);
        const hasDescription = video.snippet.description && video.snippet.description.length > 50;
        const notShort = duration >= 1200;
        const isEducational = isEducationalContent(video.snippet.title, video.snippet.description);
        
        return hasDescription && notShort && isEducational;
    }).map(video => ({
        id: video.id,
        title: video.snippet.title,
        description: video.snippet.description,
        thumbnail: video.snippet.thumbnails.medium.url,
        channelTitle: video.snippet.channelTitle,
        channelId: video.snippet.channelId,
        publishedAt: video.snippet.publishedAt,
        duration: formatDuration(video.contentDetails.duration),
        viewCount: video.statistics.viewCount,
        isVerified: verifiedEducationalChannels.includes(video.snippet.channelId)
    }));
}

function isEducationalContent(title, description) {
    const educationalKeywords = [
        'tutorial', 'lesson', 'learn', 'education', 'explained', 'guide',
        'course', 'lecture', 'class', 'study', 'teach', 'instruction',
        'concept', 'theory', 'practice', 'example', 'solution', 'problem'
    ];
    
    const content = (title + ' ' + description).toLowerCase();
    return educationalKeywords.some(keyword => content.includes(keyword));
}

function parseDuration(duration) {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    const seconds = parseInt(match[3]) || 0;
    return hours * 3600 + minutes * 60 + seconds;
}

function formatDuration(duration) {
    const totalSeconds = parseDuration(duration);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}

function displayVideos(videos) {
    videoGrid.innerHTML = '';
    
    if (videos.length === 0) {
        videoGrid.innerHTML = '<div class="no-results">No educational videos found. Try different search terms.</div>';
        return;
    }
    
    videos.forEach(video => {
        const videoCard = createVideoCard(video);
        videoGrid.appendChild(videoCard);
    });
}

function createVideoCard(video) {
    const card = document.createElement('div');
    card.className = 'video-card';
    card.onclick = () => openVideoModal(video);
    
    card.innerHTML = `
        <img src="${video.thumbnail}" alt="${video.title}" class="video-thumbnail">
        <div class="video-details">
            <h3 class="video-title">${truncateText(video.title, 80)}</h3>
            <p class="video-channel">${video.channelTitle}</p>
            <p class="video-description">${truncateText(video.description, 120)}</p>
            <div class="video-meta">
                <span class="duration-badge">${video.duration}</span>
                ${video.isVerified ? '<span class="verified-badge">Verified</span>' : ''}
            </div>
        </div>
    `;
    
    return card;
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function openVideoModal(video) {
    videoPlayer.src = `https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0&modestbranding=1`;
    videoTitle.textContent = video.title;
    videoDescription.textContent = video.description;
    videoChannel.textContent = `Channel: ${video.channelTitle}`;
    videoDuration.textContent = `Duration: ${video.duration}`;
    
    videoModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeVideoModal() {
    videoModal.style.display = 'none';
    videoPlayer.src = '';
    document.body.style.overflow = 'auto';
}

function showLoading() {
    loadingContainer.style.display = 'flex';
    videoGrid.style.display = 'none';
}

function hideLoading() {
    loadingContainer.style.display = 'none';
    videoGrid.style.display = 'grid';
}

function showError(message) {
    videoGrid.innerHTML = `<div class="error-message" style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #ff6b6b; font-size: 1.2rem;">${message}</div>`;
}

classSelect.addEventListener('change', () => {
    if (classSelect.value && subjectSelect.value) {
        searchBtn.style.transform = 'scale(1.05)';
        setTimeout(() => {
            searchBtn.style.transform = 'scale(1)';
        }, 200);
    }
});

subjectSelect.addEventListener('change', () => {
    if (classSelect.value && subjectSelect.value) {
        searchBtn.style.transform = 'scale(1.05)';
        setTimeout(() => {
            searchBtn.style.transform = 'scale(1)';
        }, 200);
    }
});
