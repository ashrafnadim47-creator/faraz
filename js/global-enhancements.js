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

    // Floating Contact Button
    if (!document.getElementById("floatingContactBtn") && !window.location.pathname.includes("contact.html")) {
        const floatBtn = document.createElement("a");
        floatBtn.id = "floatingContactBtn";
        floatBtn.className = "floating-contact-btn";
        floatBtn.href = "contact.html";
        floatBtn.title = "Contact Support";
        floatBtn.innerHTML = "💬";
        document.body.appendChild(floatBtn);
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
// C. DARK / LIGHT THEME TOGGLE
// ==========================================
function initThemeToggle() {
    const savedTheme = localStorage.getItem("faraz_theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);

    const toggleBtns = document.querySelectorAll(".theme-toggle-btn");
    toggleBtns.forEach(btn => {
        btn.innerText = savedTheme === "light" ? "🌙 Dark" : "☀️ Light";
        btn.addEventListener("click", () => {
            const current = document.documentElement.getAttribute("data-theme");
            const next = current === "light" ? "dark" : "light";
            document.documentElement.setAttribute("data-theme", next);
            localStorage.setItem("faraz_theme", next);
            btn.innerText = next === "light" ? "🌙 Dark" : "☀️ Light";
        });
    });
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
