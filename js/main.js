// ==========================================
// 🔥 FARAZ STORE v2.0 - MAIN GLOBAL CONTROLLER
// ==========================================

console.log("🔥 Faraz Store v2.0 Started");

document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ Website Assets & DOM Loaded Successfully");

    // Global Button Ripple & Logging Event Listeners
    attachGlobalButtonInteractions();
});

function attachGlobalButtonInteractions() {
    const buttons = document.querySelectorAll("button");

    buttons.forEach((button) => {
        button.addEventListener("click", () => {
            const btnText = button.innerText.trim() || "Action Button";
            console.log(`⚡ Interaction Executed: [${btnText}]`);
        });
    });
}

// ==========================================
// 🔍 SMART OVERLAY / DIRECT SEARCH ROUTER
// ==========================================
window.openSearch = function () {
    const query = prompt("🔍 Search Faraz Store (e.g. Keyboard, Headset, Mouse):");

    if (query !== null && query.trim() !== "") {
        const cleanQuery = encodeURIComponent(query.trim());
        location.href = `product.html?search=${cleanQuery}`;
    }
};