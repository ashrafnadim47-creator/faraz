/* =====================================
   FARAZ STORE v2.0
   MENU & NAVIGATION JS (FIXED)
===================================== */

document.addEventListener("DOMContentLoaded", () => {
    const menuBtn = document.getElementById("menu-btn");
    const sidebar = document.getElementById("sidebar");
    const closeBtn = document.getElementById("close-sidebar");
    const searchBox = document.getElementById("searchBox");
    const searchBtn = document.getElementById("search-icon-btn");

    // 1. OPEN SIDEBAR
    if (menuBtn && sidebar) {
        menuBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            sidebar.classList.add("active");
        });
    }

    // 2. CLOSE SIDEBAR
    if (closeBtn && sidebar) {
        closeBtn.addEventListener("click", () => {
            sidebar.classList.remove("active");
        });
    }

    // 3. SIDEBAR LINK CLICK -> CLOSE SIDEBAR
    document.querySelectorAll("#sidebar a").forEach((link) => {
        link.addEventListener("click", () => {
            if (sidebar) sidebar.classList.remove("active");
        });
    });

    // 4. OUTSIDE CLICK -> CLOSE SIDEBAR
    document.addEventListener("click", (e) => {
        if (
            sidebar &&
            sidebar.classList.contains("active") &&
            !sidebar.contains(e.target) &&
            menuBtn &&
            !menuBtn.contains(e.target)
        ) {
            sidebar.classList.remove("active");
        }
    });

    // 5. SEARCH FUNCTIONALITY (Enter Key + Search Icon Click)
    function performSearch() {
        if (!searchBox) return;
        const value = searchBox.value.trim();
        if (value) {
            localStorage.setItem("search", value);
            window.location.href = "products.html";
        }
    }

    if (searchBox) {
        searchBox.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                performSearch();
            }
        });
    }

    if (searchBtn) {
        searchBtn.addEventListener("click", () => {
            performSearch();
        });
    }

    window.openSearch = function () {
        if (searchBox) searchBox.focus();
    };

    // 6. ACTIVE SIDEBAR LINK HIGHLIGHT
    let currentPage = window.location.pathname.split("/").pop();
    if (!currentPage || currentPage === "") {
        currentPage = "index.html";
    }

    document.querySelectorAll("#sidebar a").forEach((link) => {
        const href = link.getAttribute("href");
        if (href === currentPage) {
            link.classList.add("active");
        }
    });
});