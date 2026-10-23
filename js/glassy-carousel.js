// ==============================================================================
// 🎬 GLASSY 3D CAROUSEL & SPOTIFY SOUNDTRACK PLAYER ENGINE
// ==============================================================================

(function() {
    const TRACKS = [
        {
            id: 'dune',
            title: 'Dune: Part Two',
            year: '2024',
            genre: 'Epic Sci-Fi',
            rating: '8.8',
            director: 'Denis Villeneuve',
            poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&fit=crop',
            audioUrl: 'audio/soundtrack_1.mp3',
            soundtrackName: 'Paul Atreides War Horn • Hans Zimmer',
            trailerUrl: 'media/trailer_4k.mp4'
        },
        {
            id: 'oppenheimer',
            title: 'Oppenheimer',
            year: '2023',
            genre: 'Drama / History',
            rating: '8.9',
            director: 'Christopher Nolan',
            poster: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=600&fit=crop',
            audioUrl: 'audio/soundtrack_1.mp3',
            soundtrackName: 'Can You Hear The Music • Ludwig Göransson',
            trailerUrl: 'media/trailer_4k.mp4'
        },
        {
            id: 'interstellar',
            title: 'Interstellar',
            year: '2014',
            genre: 'Sci-Fi / Adventure',
            rating: '8.7',
            director: 'Christopher Nolan',
            poster: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=600&fit=crop',
            audioUrl: 'audio/soundtrack_1.mp3',
            soundtrackName: 'Cornfield Chase (4K Organ) • Hans Zimmer',
            trailerUrl: 'media/trailer_4k.mp4'
        },
        {
            id: 'bladerunner',
            title: 'Blade Runner 2049',
            year: '2017',
            genre: 'Neo-Noir / Cyberpunk',
            rating: '8.0',
            director: 'Denis Villeneuve',
            poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&fit=crop',
            audioUrl: 'audio/soundtrack_1.mp3',
            soundtrackName: 'Tears in the Rain (Synthwave) • Vangelis',
            trailerUrl: 'media/trailer_4k.mp4'
        },
        {
            id: 'spiderverse',
            title: 'Across the Spider-Verse',
            year: '2023',
            genre: 'Animation / Action',
            rating: '8.6',
            director: 'Kemp Powers',
            poster: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&fit=crop',
            audioUrl: 'audio/soundtrack_1.mp3',
            soundtrackName: 'Mona Lisa (Spider-Verse OST) • Metro Boomin',
            trailerUrl: 'media/trailer_4k.mp4'
        },
        {
            id: 'freefire',
            title: 'Free Fire: Draco Flame',
            year: '2026',
            genre: 'Gaming Anthem',
            rating: '9.5',
            director: 'Faraz Official',
            poster: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&fit=crop',
            audioUrl: 'audio/soundtrack_1.mp3',
            soundtrackName: 'Green Flame Draco Max Level 7 Anthem',
            trailerUrl: 'media/trailer_4k.mp4'
        }
    ];

    let currentIndex = 0;
    let isPlaying = false;
    let audioElement;
    try {
        audioElement = new Audio();
        audioElement.preload = 'metadata';
    } catch(e) {
        audioElement = { src: '', volume: 0.8, paused: true, play: () => Promise.resolve(), pause: () => {}, addEventListener: () => {} };
    }

    // ── Define ALL window.* functions UP FRONT so they exist even if initCarousel fails ──
    window.carouselNext = function() {
        currentIndex = (currentIndex + 1) % TRACKS.length;
        updateCardsPosition();
        loadTrack(currentIndex);
        if (isPlaying) audioElement.play().catch(() => {});
    };

    window.carouselPrev = function() {
        currentIndex = (currentIndex - 1 + TRACKS.length) % TRACKS.length;
        updateCardsPosition();
        loadTrack(currentIndex);
        if (isPlaying) audioElement.play().catch(() => {});
    };

    window.selectCarouselCard = function(idx) {
        currentIndex = idx;
        updateCardsPosition();
        loadTrack(currentIndex);
        if (isPlaying) audioElement.play().catch(() => {});
    };

    window.toggleSpotifyPlay = function() {
        const playBtn = document.getElementById('spPlayBtn');
        const wave = document.getElementById('spSoundWave');
        if (audioElement.paused) {
            audioElement.play().then(() => {
                isPlaying = true;
                if (playBtn) playBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
                if (wave) wave.classList.add('playing');
            }).catch(() => {
                isPlaying = true;
                if (playBtn) playBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
                if (wave) wave.classList.add('playing');
            });
        } else {
            audioElement.pause();
            isPlaying = false;
            if (playBtn) playBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
            if (wave) wave.classList.remove('playing');
        }
    };

    window.setSpotifyVolume = function(val) {
        audioElement.volume = Math.max(0, Math.min(1, parseFloat(val)));
    };

    window.openTrailerModal = function(idx) {
        const t = TRACKS[idx !== undefined ? idx : currentIndex] || TRACKS[0];
        const modal = document.getElementById('trailerModal');
        const titleEl = document.getElementById('trailerTitle');
        const descEl = document.getElementById('trailerDesc');
        const videoEl = document.getElementById('trailerVideo');
        if (!modal) return;
        if (titleEl) titleEl.innerText = t.title + ' (' + t.year + ')';
        if (descEl) descEl.innerText = 'Directed by ' + t.director + ' • ' + t.genre + ' • ★ ' + t.rating;
        if (videoEl) { videoEl.src = t.trailerUrl; videoEl.play().catch(() => {}); }
        modal.style.display = 'flex';
    };

    window.closeTrailerModal = function() {
        const modal = document.getElementById('trailerModal');
        const videoEl = document.getElementById('trailerVideo');
        if (modal) modal.style.display = 'none';
        if (videoEl) { videoEl.pause(); videoEl.src = ''; }
    };
    // ── End of up-front window.* definitions ──

    function initCarousel() {
        const track = document.getElementById('glassyCarouselTrack');
        if (!track) return;

        track.innerHTML = TRACKS.map((t, idx) => `
            <div class="glassy-card-item" id="cardItem_${idx}" onclick="window.selectCarouselCard(${idx})">
                <div class="glassy-card-poster">
                    <img src="${t.poster}" alt="${t.title}" loading="lazy">
                    <button class="card-trailer-btn" onclick="event.stopPropagation(); window.openTrailerModal(${idx})">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        Watch Trailer
                    </button>
                </div>
                <div class="glassy-card-info">
                    <div>
                        <div class="glassy-card-title">${t.title}</div>
                        <div class="glassy-card-meta">
                            <span>${t.year} • ${t.genre}</span>
                            <span class="glassy-card-rating">★ ${t.rating}</span>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        updateCardsPosition();
        loadTrack(currentIndex);
    }

    function updateCardsPosition() {
        const total = TRACKS.length;
        const radius = window.innerWidth < 768 ? 240 : 340;

        TRACKS.forEach((_, idx) => {
            const card = document.getElementById(`cardItem_${idx}`);
            if (!card) return;

            let diff = (idx - currentIndex + total) % total;
            if (diff > total / 2) diff -= total;

            const angle = diff * (360 / total);
            const rad = (angle * Math.PI) / 180;
            const x = Math.sin(rad) * radius;
            const z = Math.cos(rad) * radius - radius;
            const scale = Math.max(0.72, 1 - Math.abs(diff) * 0.14);
            const opacity = Math.abs(diff) > 2 ? 0 : (1 - Math.abs(diff) * 0.25);

            card.style.transform = `translate3d(${x}px, 0, ${z}px) scale(${scale})`;
            card.style.opacity = opacity;
            card.style.zIndex = Math.round(100 - Math.abs(diff) * 10);
            card.style.pointerEvents = Math.abs(diff) > 2 ? 'none' : 'auto';

            if (diff === 0) {
                card.style.borderColor = 'rgba(249, 115, 22, 0.9)';
                card.style.boxShadow = '0 25px 60px rgba(249, 115, 22, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.4)';
            } else {
                card.style.borderColor = 'rgba(255, 255, 255, 0.18)';
                card.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.2)';
            }
        });
    }

    function loadTrack(idx) {
        const t = TRACKS[idx];
        if (!t) return;
        const art = document.getElementById('spTrackArt');
        const name = document.getElementById('spTrackName');
        const artist = document.getElementById('spTrackArtist');
        if (art) art.src = t.poster;
        if (name) name.innerText = t.title;
        if (artist) artist.innerText = t.soundtrackName;
        audioElement.src = t.audioUrl;
    }

    audioElement.addEventListener('ended', () => { window.carouselNext(); });

    // Auto-init on DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCarousel);
    } else {
        initCarousel();
    }
})();
