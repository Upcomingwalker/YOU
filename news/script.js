const API_KEY = 'pub_344da34dda66428baeba18626914e979';
const BASE_URL = 'https://newsdata.io/api/1';

let allArticles = [];
let bookmarkedArticles = [];
let currentCategory = 'all';
let searchQuery = '';
let isBookmarkView = false;

const breakingStories = document.getElementById('breakingStories');
const featuredSection = document.getElementById('featuredSection');
const newsGrid = document.getElementById('newsGrid');
const searchInput = document.getElementById('searchInput');
const modalOverlay = document.getElementById('modalOverlay');
const modalClose = document.getElementById('modalClose');
const modalBody = document.getElementById('modalBody');
const bookmarkCount = document.getElementById('bookmarkCount');
const navItems = document.querySelectorAll('.nav-item');
const homeBtn = document.querySelector('.home-btn');
const bookmarksBtn = document.querySelector('.bookmarks-btn');
const profileBtn = document.querySelector('.profile-btn');
const loadingIndicator = document.getElementById('loadingIndicator');

document.addEventListener('DOMContentLoaded', function() {
    loadBookmarksFromStorage();
    fetchNews();
    initializeEventListeners();
    updateBookmarkCount();
});

function initializeEventListeners() {
    modalClose.addEventListener('click', closeArticleModal);
    modalOverlay.addEventListener('click', function(e) {
        if (e.target === modalOverlay) {
            closeArticleModal();
        }
    });
    
    searchInput.addEventListener('keyup', handleSearch);
    searchInput.addEventListener('input', handleSearch);
}

function cleanContent(content) {
    if (!content) return 'No content available';
    
    // Remove promotional text and common API limitations
    const cleanedContent = content
        .replace(/ONLY AVAILABLE IN PAID PLANS/gi, '')
        .replace(/This content is only available to paid subscribers/gi, '')
        .replace(/Subscribe to read full article/gi, '')
        .replace(/\[.*?\]/g, '') // Remove square brackets with text
        .replace(/\(.*?paid.*?\)/gi, '') // Remove parentheses mentioning paid
        .replace(/upgrade.*?plan/gi, '') // Remove upgrade plan mentions
        .replace(/premium.*?content/gi, '') // Remove premium content mentions
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .trim();
    
    // If content is too short after cleaning, provide a fallback
    if (cleanedContent.length < 50) {
        return 'Full article content available at the source. Click "Read Full Article" to continue reading.';
    }
    
    return cleanedContent;
}

async function fetchNews(category = '') {
    showLoading(true);
    
    try {
        let url = `${BASE_URL}/news?apikey=${API_KEY}&country=in&language=en`;
        
        if (category && category !== 'all') {
            const categoryMap = {
                'breaking': 'top',
                'business': 'business',
                'technology': 'technology',
                'sports': 'sports',
                'health': 'health',
                'entertainment': 'entertainment'
            };
            url += `&category=${categoryMap[category] || 'top'}`;
        }
        
        console.log('Fetching from:', url);
        
        const response = await fetch(url);
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('API Response:', data);
        
        if (data.status === 'error') {
            throw new Error(`API Error: ${data.message}`);
        }
        
        if (!data.results || data.results.length === 0) {
            throw new Error('No articles found');
        }
        
        allArticles = data.results.map(article => ({
            id: Math.random().toString(36).substr(2, 9),
            title: article.title,
            summary: cleanContent(article.description) || 'No description available',
            content: cleanContent(article.content) || cleanContent(article.description) || 'No content available',
            category: category || 'General',
            time: formatTime(article.pubDate),
            image: article.image_url || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&h=250&fit=crop',
            source: article.source_id || 'Unknown Source',
            url: article.link,
            publishedAt: article.pubDate
        }));
        
        renderBreakingNews();
        renderFeaturedArticle();
        renderNewsGrid();
        
    } catch (error) {
        console.error('Detailed error:', error);
        showError(`Failed to load news: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

function formatTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
        return 'Just now';
    } else if (diffInHours < 24) {
        return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    } else {
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
    }
}

function showLoading(show) {
    if (loadingIndicator) {
        loadingIndicator.style.display = show ? 'block' : 'none';
    }
}

function showError(message) {
    newsGrid.innerHTML = `
        <div class="error-message" style="
            text-align: center;
            padding: 40px;
            background: rgba(255, 107, 107, 0.1);
            border-radius: 15px;
            color: #ff6b6b;
        ">
            <h3>Error</h3>
            <p>${message}</p>
            <button onclick="fetchNews()" class="btn btn--primary" style="
                background: #667eea;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 10px;
                cursor: pointer;
                margin-top: 10px;
            ">Try Again</button>
        </div>
    `;
}

function renderBreakingNews() {
    if (!breakingStories) return;
    
    const breakingNews = allArticles.slice(0, 3);
    breakingStories.innerHTML = '';
    
    breakingNews.forEach(article => {
        const storyElement = document.createElement('div');
        storyElement.className = 'breaking-story';
        storyElement.innerHTML = `
            <h3>${article.title}</h3>
            <div class="meta">${article.source} • ${article.time}</div>
        `;
        storyElement.onclick = () => openArticleModal(article);
        breakingStories.appendChild(storyElement);
    });
}

function renderFeaturedArticle() {
    if (allArticles.length === 0 || !document.getElementById('featuredArticle')) return;
    
    const featuredArticle = allArticles[0];
    document.getElementById('featuredArticle').innerHTML = `
        <img src="${featuredArticle.image}" alt="${featuredArticle.title}" class="featured-image">
        <div class="featured-content">
            <h2 class="featured-title">${featuredArticle.title}</h2>
            <p class="featured-summary">${featuredArticle.summary}</p>
            <div class="featured-meta">
                <span class="category-tag">${featuredArticle.category}</span>
                <span class="article-source">${featuredArticle.source}</span>
                <span>${featuredArticle.time}</span>
            </div>
        </div>
    `;
    
    document.getElementById('featuredArticle').onclick = () => openArticleModal(featuredArticle);
}

function renderNewsGrid() {
    if (!newsGrid) return;
    
    let articlesToShow = [];
    
    if (isBookmarkView) {
        articlesToShow = bookmarkedArticles;
    } else {
        articlesToShow = allArticles;
        
        if (currentCategory !== 'all') {
            articlesToShow = articlesToShow.filter(article => 
                article.category.toLowerCase() === currentCategory.toLowerCase()
            );
        }
        
        if (searchQuery) {
            articlesToShow = articlesToShow.filter(article =>
                article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                article.summary.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
    }
    
    newsGrid.innerHTML = '';
    
    if (articlesToShow.length === 0) {
        const emptyMessage = isBookmarkView 
            ? '<div class="empty-state" style="text-align: center; padding: 40px; color: #666;"><h3>No bookmarked articles</h3><p>Bookmark articles to read them later!</p></div>'
            : '<div class="empty-state" style="text-align: center; padding: 40px; color: #666;"><h3>No articles found</h3><p>Try adjusting your search or category filter.</p></div>';
        newsGrid.innerHTML = emptyMessage;
        return;
    }
    
    const startIndex = isBookmarkView ? 0 : 1;
    const displayArticles = articlesToShow.slice(startIndex);
    
    displayArticles.forEach(article => {
        const articleElement = document.createElement('div');
        articleElement.className = 'article-card';
        
        const isBookmarked = bookmarkedArticles.some(b => b.id === article.id);
        
        articleElement.innerHTML = `
            <img src="${article.image}" alt="${article.title}" class="article-image">
            <div class="article-content">
                <h3 class="article-title">${article.title}</h3>
                <p class="article-summary">${article.summary}</p>
                <div class="article-meta">
                    <span class="article-source">${article.source}</span>
                    <span>${article.time}</span>
                    <button class="bookmark-btn ${isBookmarked ? 'bookmarked' : ''}" onclick="event.stopPropagation(); toggleBookmark(${JSON.stringify(article).replace(/"/g, '&quot;')}, this)">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
        
        articleElement.onclick = () => openArticleModal(article);
        newsGrid.appendChild(articleElement);
    });
}

function openArticleModal(article) {
    if (!modalBody) return;
    
    modalBody.innerHTML = `
        <img src="${article.image}" alt="${article.title}" class="modal-image">
        <h2 class="modal-title">${article.title}</h2>
        <div class="modal-meta">
            <span class="category-tag">${article.category}</span>
            <span>${article.source}</span>
            <span>${article.time}</span>
        </div>
        <div class="modal-summary">
            <p>${article.content}</p>
            <br>
            <a href="${article.url}" target="_blank" class="btn btn--primary" style="
                background: #667eea;
                color: white;
                padding: 12px 24px;
                border-radius: 10px;
                text-decoration: none;
                display: inline-block;
                margin-top: 15px;
                font-weight: 600;
            ">Read Full Article</a>
        </div>
    `;
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeArticleModal() {
    modalOverlay.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function toggleBookmark(article, button) {
    const isBookmarked = bookmarkedArticles.some(b => b.id === article.id);
    
    if (isBookmarked) {
        bookmarkedArticles = bookmarkedArticles.filter(b => b.id !== article.id);
        button.classList.remove('bookmarked');
    } else {
        bookmarkedArticles.push(article);
        button.classList.add('bookmarked');
    }
    
    updateBookmarkCount();
    saveBookmarksToStorage();
    
    if (isBookmarkView && !isBookmarked) {
        setTimeout(() => {
            renderNewsGrid();
        }, 100);
    }
}

function updateBookmarkCount() {
    if (bookmarkCount) {
        bookmarkCount.textContent = bookmarkedArticles.length;
        bookmarkCount.style.display = bookmarkedArticles.length > 0 ? 'block' : 'none';
    }
}

function setActiveCategory(category) {
    currentCategory = category;
    isBookmarkView = false;
    
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.category === category) {
            item.classList.add('active');
        }
    });
    
    if (category === 'breaking') {
        if (document.getElementById('breakingBanner')) {
            document.getElementById('breakingBanner').style.display = 'block';
        }
        if (featuredSection) {
            featuredSection.style.display = 'none';
        }
    } else {
        if (document.getElementById('breakingBanner')) {
            document.getElementById('breakingBanner').style.display = category === 'all' ? 'block' : 'none';
        }
        if (featuredSection) {
            featuredSection.style.display = category === 'all' ? 'block' : 'none';
        }
    }
    
    fetchNews(category);
}

function handleSearch() {
    searchQuery = searchInput.value.trim();
    renderNewsGrid();
}

function showBookmarkedArticles() {
    isBookmarkView = true;
    if (featuredSection) {
        featuredSection.style.display = 'none';
    }
    if (document.getElementById('breakingBanner')) {
        document.getElementById('breakingBanner').style.display = 'none';
    }
    
    navItems.forEach(item => item.classList.remove('active'));
    
    renderNewsGrid();
}

function toggleTheme() {
    const currentScheme = document.documentElement.getAttribute('data-color-scheme');
    const newScheme = currentScheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-color-scheme', newScheme);
    localStorage.setItem('color-scheme', newScheme);
}

function saveBookmarksToStorage() {
    localStorage.setItem('bookmarked-articles', JSON.stringify(bookmarkedArticles));
}

function loadBookmarksFromStorage() {
    const saved = localStorage.getItem('bookmarked-articles');
    if (saved) {
        bookmarkedArticles = JSON.parse(saved);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const savedScheme = localStorage.getItem('color-scheme');
    if (savedScheme) {
        document.documentElement.setAttribute('data-color-scheme', savedScheme);
    }
});
