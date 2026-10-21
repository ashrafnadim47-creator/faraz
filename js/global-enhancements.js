// ==========================================================================
// 🚀 FARAZ STORE - GLOBAL UI/UX ENHANCEMENTS SUITE
// Handles Dark/Light Mode, Scroll Progress, Cookie Banner, Back to Top,
// UTM Tracking, Password Toggle, Copy to Clipboard & Expandable FAQ
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {

    // 1. INJECT DOM ELEMENTS IF NOT PRESENT
    injectGlobalElements();

    // 2. SCROLL PROGRESS BAR & BACK TO TOP BUTTON
    const progressBar = document.getElementById("scrollProgressBar");
    const backToTopBtn = document.getElementById("backToTopBtn");

    window.addEventListener("scroll", () => {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }

        if (backToTopBtn) {
            if (scrollTop > 350) {
                backToTopBtn.classList.add("visible");
            } else {
                backToTopBtn.classList.remove("visible");
            }
        }
    });

    if (backToTopBtn) {
        backToTopBtn.addEventListener("click", () => {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }

    // 3. COOKIE BANNER LOGIC
    initCookieBanner();

    // 4. DARK / LIGHT MODE LOGIC
    initThemeToggle();

    // 5. UTM TRACKING
    initUTMTracking();

    // 6. PASSWORD VISIBILITY TOGGLE
    initPasswordToggles();

    // 7. COPY BUTTONS
    initCopyButtons();

    // 8. EXPANDABLE FAQ ACCORDIONS
    initFAQAccordions();

    // 9. DYNAMIC LAST UPDATED DATE IN FOOTER
    initLastUpdated();
});

// ==========================================
// A. INJECT GLOBAL UI ELEMENTS
// ==========================================
function injectGlobalElements() {
    // Scroll progress bar
    if (!document.getElementById("scrollProgressBar")) {
        const bar = document.createElement("div");
        bar.id = "scrollProgressBar";
        document.body.appendChild(bar);
    }

    // Back to top button
    if (!document.getElementById("backToTopBtn")) {
        const btt = document.createElement("button");
        btt.id = "backToTopBtn";
        btt.className = "back-to-top-btn";
        btt.title = "Scroll to top";
        btt.innerHTML = "↑";
        document.body.appendChild(btt);
    }
}

// ==========================================
// 🌟 GLOBAL ANIMATED TOAST SYSTEM ("CHOOSTA SA ANIMATED POPUP")
// ==========================================
window.showToast = function(message, type = "success", customIcon = null) {
    let container = document.getElementById("farazToastContainer");
    if (!container) {
        container = document.createElement("div");
        container.id = "farazToastContainer";
        container.className = "faraz-toast-container";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `faraz-toast ${type}`;

    let iconSvg = "";
    if (customIcon) {
        iconSvg = `<div class="toast-icon-wrap">${customIcon}</div>`;
    } else if (type === "success") {
        iconSvg = `<div class="toast-icon-wrap" style="color: #10b981;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
        </div>`;
    } else if (type === "error") {
        iconSvg = `<div class="toast-icon-wrap" style="color: #ef4444;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
        </div>`;
    } else {
        iconSvg = `<div class="toast-icon-wrap" style="color: #00f2fe;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
        </div>`;
    }

    toast.innerHTML = `${iconSvg}<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(-15px) scale(0.9)";
        setTimeout(() => toast.remove(), 300);
    }, 2800);
};

// ==========================================
// B. COOKIE BANNER
// ==========================================
function initCookieBanner() {
    const consent = localStorage.getItem("faraz_cookie_consent");
    if (!consent) {
        const banner = document.createElement("div");
        banner.id = "cookieBanner";
        banner.className = "cookie-banner";
        banner.innerHTML = `
            <p>🍪 <strong>Faraz Store Privacy & Cookies</strong>: Ham aapke shopping experience ko smooth aur fast banane ke liye local session cookies use karte hain.</p>
            <div class="cookie-buttons">
                <button class="cookie-accept-btn" onclick="acceptCookies()">Accept & Continue</button>
                <button class="cookie-decline-btn" onclick="declineCookies()">Decline</button>
            </div>
        `;
        document.body.appendChild(banner);
    }
}

window.acceptCookies = function() {
    localStorage.setItem("faraz_cookie_consent", "accepted");
    const banner = document.getElementById("cookieBanner");
    if (banner) banner.remove();
};

window.declineCookies = function() {
    localStorage.setItem("faraz_cookie_consent", "declined");
    const banner = document.getElementById("cookieBanner");
    if (banner) banner.remove();
};

// ==========================================
// C. SIGNATURE DARK THEME (LOCKED FOR ULTRA LUXURY CONTRAST)
// ==========================================
function initThemeToggle() {
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem("faraz_theme", "dark");
    document.querySelectorAll(".theme-toggle-btn").forEach(btn => btn.remove());
}

// ==========================================
// D. UTM TRACKING
// ==========================================
function initUTMTracking() {
    const params = new URLSearchParams(window.location.search);
    const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
    const utmData = {};

    utmKeys.forEach(key => {
        if (params.has(key)) {
            utmData[key] = params.get(key);
        }
    });

    if (Object.keys(utmData).length > 0) {
        sessionStorage.setItem("faraz_utm_tracking", JSON.stringify(utmData));
        console.log("📊 UTM Tracking captured:", utmData);
    }
}

// ==========================================
// E. PASSWORD VISIBILITY TOGGLE
// ==========================================
function initPasswordToggles() {
    document.querySelectorAll(".password-toggle-trigger").forEach(btn => {
        btn.addEventListener("click", () => {
            const inputId = btn.getAttribute("data-target");
            const input = document.getElementById(inputId);
            if (input) {
                const isPassword = input.getAttribute("type") === "password";
                input.setAttribute("type", isPassword ? "text" : "password");
                btn.innerText = isPassword ? "🙈" : "👁️";
            }
        });
    });
}

// ==========================================
// F. COPY TO CLIPBOARD BUTTONS
// ==========================================
function initCopyButtons() {
    document.querySelectorAll(".copy-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            const textToCopy = btn.getAttribute("data-copy-text") || btn.innerText;
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(textToCopy);
                const originalText = btn.innerText;
                btn.innerText = "✓ Copied!";
                setTimeout(() => { btn.innerText = originalText; }, 2000);
            }
        });
    });
}

// ==========================================
// G. EXPANDABLE FAQ ACCORDIONS
// ==========================================
function initFAQAccordions() {
    document.querySelectorAll(".faq-question").forEach(q => {
        q.addEventListener("click", () => {
            const parent = q.closest(".faq-item");
            if (parent) {
                parent.classList.toggle("active");
            }
        });
    });
}

// ==========================================
// H. LAST UPDATED FOOTER
// ==========================================
function initLastUpdated() {
    const el = document.getElementById("lastUpdatedDate");
    if (el) {
        el.innerText = new Date().toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    }
}
