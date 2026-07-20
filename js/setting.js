// ==========================================
// 🎨 UNIFIED STORE THEME MANAGER
// ==========================================

window.darkMode = function () {
    document.body.classList.add("dark");
    document.body.classList.add("dark-mode");
    localStorage.setItem("theme", "dark");
};

window.lightMode = function () {
    document.body.classList.remove("dark");
    document.body.classList.remove("dark-mode");
    localStorage.setItem("theme", "light");
};

// Initialize Saved Theme Preference on Load
(function applySavedTheme() {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
        document.body.classList.add("dark");
        document.body.classList.add("dark-mode");
    } else if (savedTheme === "light") {
        document.body.classList.remove("dark");
        document.body.classList.remove("dark-mode");
    }
})();