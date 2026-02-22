const API_BASE = "https://pipedapi.kavin.rocks";
let currentFocus = null;

// রিমোট কন্ট্রোল ফোকাস লজিক
function setFocus(el) {
    if (currentFocus) currentFocus.classList.remove('focused');
    currentFocus = el;
    if (currentFocus) {
        currentFocus.classList.add('focused');
        // স্ক্রিনে যাতে সবসময় ফোকাস করা আইটেম দেখা যায়
        currentFocus.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }
}

// 2D Spatial Navigation (Up, Down, Left, Right)
function navigate(direction) {
    const focusables = Array.from(document.querySelectorAll('.focusable:not(.hidden)'))
                            .filter(el => el.offsetWidth > 0 && el.offsetHeight > 0);
                            
    if (!currentFocus || !focusables.includes(currentFocus)) {
        if (focusables.length > 0) setFocus(focusables[0]);
        return;
    }

    const currRect = currentFocus.getBoundingClientRect();
    const currCenter = { x: currRect.left + currRect.width / 2, y: currRect.top + currRect.height / 2 };

    let bestMatch = null;
    let minDistance = Infinity;

    focusables.forEach(el => {
        if (el === currentFocus) return;
        const rect = el.getBoundingClientRect();
        const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };

        let isDirectionMatch = false;
        if (direction === 'ArrowUp' && center.y < currCenter.y) isDirectionMatch = true;
        if (direction === 'ArrowDown' && center.y > currCenter.y) isDirectionMatch = true;
        if (direction === 'ArrowLeft' && center.x < currCenter.x) isDirectionMatch = true;
        if (direction === 'ArrowRight' && center.x > currCenter.x) isDirectionMatch = true;

        if (isDirectionMatch) {
            const dx = center.x - currCenter.x;
            const dy = center.y - currCenter.y;
            
            // দিক অনুযায়ী দূরত্ব হিসাব করা (Weighting)
            let distance;
            if (direction === 'ArrowLeft' || direction === 'ArrowRight') {
                distance = Math.abs(dx) + Math.abs(dy) * 5; 
            } else {
                distance = Math.abs(dy) + Math.abs(dx) * 5; 
            }

            if (distance < minDistance) {
                minDistance = distance;
                bestMatch = el;
            }
        }
    });

    if (bestMatch) setFocus(bestMatch);
}

// কীবোর্ড/রিমোট ইভেন্ট লিসেনার
document.addEventListener('keydown', (e) => {
    const playerModal = document.getElementById('player-modal');
    
    // ভিডিও প্লেয়ার ওপেন থাকলে Back বা Esc দিয়ে বন্ধ করা
    if (!playerModal.classList.contains('hidden')) {
        if (e.key === 'Backspace' || e.key === 'Escape') {
            closePlayer();
        }
        return;
    }

    // Input ফিল্ডে টেক্সট এডিট করার জন্য বাম/ডান অ্যারো স্বাভাবিক রাখা
    if (currentFocus && currentFocus.tagName === 'INPUT') {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') return;
    }

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        navigate(e.key);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (currentFocus) {
            currentFocus.click();
            if (currentFocus.tagName === 'INPUT') {
                currentFocus.focus(); // টিভির কীবোর্ড ওপেন করতে
            }
        }
    }
});

// API থেকে ডেটা আনা
async function loadTrending() {
    const grid = document.getElementById('video-grid');
    grid.innerHTML = '<h3 style="margin-left:20px;">ভিডিও লোড হচ্ছে...</h3>';
    try {
        const res = await fetch(`${API_BASE}/trending?region=US`);
        const data = await res.json();
        renderVideos(data);
    } catch (err) {
        grid.innerHTML = '<h3 style="margin-left:20px;">ভিডিও লোড করতে সমস্যা হয়েছে!</h3>';
    }
}

async function fetchSearch(query) {
    const grid = document.getElementById('video-grid');
    grid.innerHTML = '<h3 style="margin-left:20px;">খোঁজা হচ্ছে...</h3>';
    try {
        const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}&filter=videos`);
        const data = await res.json();
        renderVideos(data.items);
    } catch (err) {
        grid.innerHTML = '<h3 style="margin-left:20px;">কিছু পাওয়া যায়নি!</h3>';
    }
}

// ভিডিও কার্ড তৈরি করা
function renderVideos(videos) {
    const grid = document.getElementById('video-grid');
    grid.innerHTML = '';
    
    let isFirst = true;

    videos.forEach(video => {
        if (!video.url.startsWith('/watch')) return;
        
        const videoId = video.url.split('v=')[1];
        const card = document.createElement('div');
        card.className = 'video-card focusable';
        card.dataset.id = videoId;
        
        card.innerHTML = `
            <div class="thumbnail-container">
                <img src="${video.thumbnail}" alt="${video.title}">
                <div class="duration">${formatTime(video.duration)}</div>
            </div>
            <div class="video-info">
                <h3>${video.title}</h3>
                <p>${video.uploaderName} • ${video.views || 0} views</p>
            </div>
        `;
        
        card.addEventListener('click', () => openPlayer(videoId));
        grid.appendChild(card);
        
        // গ্রিড লোড হওয়ার পর প্রথম ভিডিওতে ফোকাস করা
        if (isFirst && document.getElementById('search-container').classList.contains('hidden')) {
            setFocus(card);
            isFirst = false;
        }
    });
}

// সেকেন্ড থেকে মিনিট:সেকেন্ড ফরম্যাট
function formatTime(seconds) {
    if (typeof seconds === 'string') return seconds;
    if (!seconds) return '';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// সাইডবার অ্যাকশন
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        const action = item.dataset.action;
        const searchContainer = document.getElementById('search-container');
        const pageTitle = document.getElementById('page-title');
        
        if (action === 'home' || action === 'trending') {
            searchContainer.classList.add('hidden');
            pageTitle.innerText = '🔥 Trending Videos';
            loadTrending();
        } else if (action === 'music') {
            searchContainer.classList.add('hidden');
            pageTitle.innerText = '🎵 Trending Music';
            fetchSearch('Music'); 
        } else if (action === 'search') {
            searchContainer.classList.remove('hidden');
            pageTitle.innerText = '🔍 Search Videos';
            document.getElementById('video-grid').innerHTML = '';
            setFocus(document.getElementById('search-input'));
        }
    });
});

// সার্চ বাটন অ্যাকশন
document.getElementById('search-btn').addEventListener('click', () => {
    const query = document.getElementById('search-input').value.trim();
    if (query) fetchSearch(query);
});

// ভিডিও প্লেয়ার
function openPlayer(videoId) {
    const modal = document.getElementById('player-modal');
    const iframe = document.getElementById('video-player');
    // Piped এর নিজস্ব এম্বেড প্লেয়ার ব্যবহার করা হচ্ছে
    iframe.src = `https://piped.video/embed/${videoId}?autoplay=1`;
    modal.classList.remove('hidden');
}

function closePlayer() {
    const modal = document.getElementById('player-modal');
    const iframe = document.getElementById('video-player');
    iframe.src = '';
    modal.classList.add('hidden');
}

// অ্যাপ চালু হলে শুরুতে ডিফল্টভাবে Trending লোড করা
window.onload = () => {
    loadTrending();
    // প্রাথমিকভাবে Home বাটনে ফোকাস রাখা
    setFocus(document.querySelector('[data-action="home"]'));
};