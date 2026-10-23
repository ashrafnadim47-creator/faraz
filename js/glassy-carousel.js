// ==============================================================================
// GLASSY 3D CAROUSEL & SPOTIFY SOUNDTRACK PLAYER ENGINE
// All window.* functions defined at TOP LEVEL (outside IIFE) for guaranteed access
// ==============================================================================

// ── SHARED STATE (top-level so all functions share same reference) ──
var _carouselIndex = 0;
var _carouselPlaying = false;
var _carouselAudio = null;
var _TRACKS = [
    { id:'dune', title:'Dune: Part Two', year:'2024', genre:'Epic Sci-Fi', rating:'8.8', director:'Denis Villeneuve', poster:'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&fit=crop', audioUrl:'audio/soundtrack_1.mp3', soundtrackName:'Paul Atreides War Horn • Hans Zimmer', trailerUrl:'media/trailer_4k.mp4' },
    { id:'oppenheimer', title:'Oppenheimer', year:'2023', genre:'Drama / History', rating:'8.9', director:'Christopher Nolan', poster:'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=600&fit=crop', audioUrl:'audio/soundtrack_1.mp3', soundtrackName:'Can You Hear The Music • Ludwig Göransson', trailerUrl:'media/trailer_4k.mp4' },
    { id:'interstellar', title:'Interstellar', year:'2014', genre:'Sci-Fi / Adventure', rating:'8.7', director:'Christopher Nolan', poster:'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=600&fit=crop', audioUrl:'audio/soundtrack_1.mp3', soundtrackName:'Cornfield Chase (4K Organ) • Hans Zimmer', trailerUrl:'media/trailer_4k.mp4' },
    { id:'bladerunner', title:'Blade Runner 2049', year:'2017', genre:'Neo-Noir / Cyberpunk', rating:'8.0', director:'Denis Villeneuve', poster:'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&fit=crop', audioUrl:'audio/soundtrack_1.mp3', soundtrackName:'Tears in the Rain (Synthwave) • Vangelis', trailerUrl:'media/trailer_4k.mp4' },
    { id:'spiderverse', title:'Across the Spider-Verse', year:'2023', genre:'Animation / Action', rating:'8.6', director:'Kemp Powers', poster:'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&fit=crop', audioUrl:'audio/soundtrack_1.mp3', soundtrackName:'Mona Lisa (Spider-Verse OST) • Metro Boomin', trailerUrl:'media/trailer_4k.mp4' },
    { id:'freefire', title:'Free Fire: Draco Flame', year:'2026', genre:'Gaming Anthem', rating:'9.5', director:'Faraz Official', poster:'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&fit=crop', audioUrl:'audio/soundtrack_1.mp3', soundtrackName:'Green Flame Draco Max Level 7 Anthem', trailerUrl:'media/trailer_4k.mp4' }
];

function _getAudio() {
    if (!_carouselAudio) {
        try { _carouselAudio = new Audio(); _carouselAudio.preload = 'metadata'; }
        catch(e) { _carouselAudio = { src:'', volume:0.8, paused:true, play:function(){ return Promise.resolve(); }, pause:function(){}, addEventListener:function(){} }; }
    }
    return _carouselAudio;
}

// ── ALL PUBLIC FUNCTIONS — defined at top level, no IIFE wrapping ──

window.toggleSpotifyPlay = function() {
    var audio = _getAudio();
    var playBtn = document.getElementById('spPlayBtn');
    var wave = document.getElementById('spSoundWave');
    var pauseIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
    var playIcon  = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
    if (audio.paused) {
        audio.play().then(function() {
            _carouselPlaying = true;
            if (playBtn) playBtn.innerHTML = pauseIcon;
            if (wave) wave.classList.add('playing');
        }).catch(function() {
            _carouselPlaying = true;
            if (playBtn) playBtn.innerHTML = pauseIcon;
            if (wave) wave.classList.add('playing');
        });
    } else {
        audio.pause();
        _carouselPlaying = false;
        if (playBtn) playBtn.innerHTML = playIcon;
        if (wave) wave.classList.remove('playing');
    }
};

window.setSpotifyVolume = function(val) {
    var audio = _getAudio();
    var v = parseFloat(val);
    if (!isNaN(v)) audio.volume = Math.max(0, Math.min(1, v));
};

window.carouselNext = function() {
    _carouselIndex = (_carouselIndex + 1) % _TRACKS.length;
    _updateCardsPosition();
    _loadTrack(_carouselIndex);
    if (_carouselPlaying) _getAudio().play().catch(function(){});
};

window.carouselPrev = function() {
    _carouselIndex = (_carouselIndex - 1 + _TRACKS.length) % _TRACKS.length;
    _updateCardsPosition();
    _loadTrack(_carouselIndex);
    if (_carouselPlaying) _getAudio().play().catch(function(){});
};

window.selectCarouselCard = function(idx) {
    _carouselIndex = idx;
    _updateCardsPosition();
    _loadTrack(_carouselIndex);
    if (_carouselPlaying) _getAudio().play().catch(function(){});
};

window.openTrailerModal = function(idx) {
    var t = _TRACKS[idx !== undefined ? idx : _carouselIndex] || _TRACKS[0];
    var modal    = document.getElementById('trailerModal');
    var titleEl  = document.getElementById('trailerTitle');
    var descEl   = document.getElementById('trailerDesc');
    var videoEl  = document.getElementById('trailerVideo');
    if (!modal) return;
    if (titleEl) titleEl.innerText = t.title + ' (' + t.year + ')';
    if (descEl)  descEl.innerText  = 'Directed by ' + t.director + ' \u2022 ' + t.genre + ' \u2022 \u2605 ' + t.rating;
    if (videoEl) { videoEl.src = t.trailerUrl; videoEl.play().catch(function(){}); }
    modal.style.display = 'flex';
};

window.closeTrailerModal = function() {
    var modal   = document.getElementById('trailerModal');
    var videoEl = document.getElementById('trailerVideo');
    if (modal)   modal.style.display = 'none';
    if (videoEl) { videoEl.pause(); videoEl.src = ''; }
};

// ── INTERNAL HELPERS ──

function _loadTrack(idx) {
    var t = _TRACKS[idx];
    if (!t) return;
    var audio  = _getAudio();
    var art    = document.getElementById('spTrackArt');
    var name   = document.getElementById('spTrackName');
    var artist = document.getElementById('spTrackArtist');
    if (art)    art.src       = t.poster;
    if (name)   name.innerText   = t.title;
    if (artist) artist.innerText = t.soundtrackName;
    audio.src = t.audioUrl;
}

function _updateCardsPosition() {
    var total  = _TRACKS.length;
    var radius = window.innerWidth < 768 ? 240 : 340;
    _TRACKS.forEach(function(_, idx) {
        var card = document.getElementById('cardItem_' + idx);
        if (!card) return;
        var diff = (idx - _carouselIndex + total) % total;
        if (diff > total / 2) diff -= total;
        var angle   = diff * (360 / total);
        var rad     = (angle * Math.PI) / 180;
        var x       = Math.sin(rad) * radius;
        var z       = Math.cos(rad) * radius - radius;
        var scale   = Math.max(0.72, 1 - Math.abs(diff) * 0.14);
        var opacity = Math.abs(diff) > 2 ? 0 : (1 - Math.abs(diff) * 0.25);
        card.style.transform     = 'translate3d(' + x + 'px, 0, ' + z + 'px) scale(' + scale + ')';
        card.style.opacity       = opacity;
        card.style.zIndex        = Math.round(100 - Math.abs(diff) * 10);
        card.style.pointerEvents = Math.abs(diff) > 2 ? 'none' : 'auto';
        if (diff === 0) {
            card.style.borderColor = 'rgba(249, 115, 22, 0.9)';
            card.style.boxShadow   = '0 25px 60px rgba(249, 115, 22, 0.3), inset 0 1px 1px rgba(255,255,255,0.4)';
        } else {
            card.style.borderColor = 'rgba(255,255,255,0.18)';
            card.style.boxShadow   = '0 20px 40px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.2)';
        }
    });
}

function _initCarousel() {
    var track = document.getElementById('glassyCarouselTrack');
    if (!track) return;
    track.innerHTML = _TRACKS.map(function(t, idx) {
        return '<div class="glassy-card-item" id="cardItem_' + idx + '" onclick="window.selectCarouselCard(' + idx + ')">' +
            '<div class="glassy-card-poster">' +
                '<img src="' + t.poster + '" alt="' + t.title + '" loading="lazy">' +
                '<button class="card-trailer-btn" onclick="event.stopPropagation(); window.openTrailerModal(' + idx + ')">' +
                    '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>' +
                    ' Watch Trailer</button>' +
            '</div>' +
            '<div class="glassy-card-info"><div>' +
                '<div class="glassy-card-title">' + t.title + '</div>' +
                '<div class="glassy-card-meta">' +
                    '<span>' + t.year + ' \u2022 ' + t.genre + '</span>' +
                    '<span class="glassy-card-rating">\u2605 ' + t.rating + '</span>' +
                '</div></div></div>' +
        '</div>';
    }).join('');
    _updateCardsPosition();
    _loadTrack(_carouselIndex);
    _getAudio().addEventListener('ended', function() { window.carouselNext(); });
}

// ── AUTO-INIT ──
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _initCarousel);
} else {
    _initCarousel();
}
