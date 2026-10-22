// ==========================================================================
// 🛡️ FARAZ STORE - OFFICIAL AI SUPPORT AGENT & TOAST SYSTEM
// Dual Floating Separation: Left-aligned Support AI, Right-aligned Socials
// ==========================================================================

const SUPPORT_RULES = {
    agentName: "Faraz Store Support Agent",
    storeName: "Faraz Store",
    version: "2.6.0-PRO",
    status: "Active 24/7",
    
    pricing: {
        "100": "₹80",
        "310": "₹240",
        "520": "₹400",
        "1060": "₹800",
        "2180": "₹1600",
        "5600": "₹4000"
    },
    primePlans: {
        "Weekly Pass": "₹159 (450 Diamonds + Daily Claim)",
        "Monthly Pass": "₹599 (2600 Diamonds + 10% Extra Top-Up Bonus + VIP Badge)"
    },
    topProducts: [
        "Evo M1014 Green Flame Draco (Max Lv. 7)",
        "AK47 Blue Flame Draco (Max Lv. 7)",
        "MP40 Predatory Cobra (Lv. 7)",
        "SCAR Megalodon Alpha"
    ]
};

// ==========================================================================
// 🌟 GLOBAL ANIMATED TOAST SYSTEM ("CHOOSTA SA ANIMATED POPUP")
// ==========================================================================
function ensureToastContainer() {
    let container = document.getElementById("farazToastContainer");
    if (!container) {
        container = document.createElement("div");
        container.id = "farazToastContainer";
        container.className = "faraz-toast-container";
        document.body.appendChild(container);
    }
    return container;
}

export function showToast(message, type = "success", customIcon = null) {
    const container = ensureToastContainer();
    const toast = document.createElement("div");
    toast.className = `faraz-toast ${type}`;

    let iconHtml = "";
    if (customIcon) {
        iconHtml = `<div class="toast-icon-wrap">${customIcon}</div>`;
    } else if (type === "success") {
        iconHtml = `<div class="toast-icon-wrap" style="color: #10b981;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
        </div>`;
    } else if (type === "error") {
        iconHtml = `<div class="toast-icon-wrap" style="color: #ef4444;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
        </div>`;
    } else {
        iconHtml = `<div class="toast-icon-wrap" style="color: #00f2fe;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
        </div>`;
    }

    toast.innerHTML = `${iconHtml}<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(-15px) scale(0.9)";
        setTimeout(() => toast.remove(), 300);
    }, 2800);
}

// Make accessible globally
window.showToast = showToast;

// ==========================================================================
// 🛡️ INTELLIGENT RULE MATCHING FUNCTION
// ==========================================================================
export function processSupportQuery(rawQuery) {
    const query = rawQuery.toLowerCase().trim();

    // 1. STRICT CONFIDENTIALITY & SECURITY FILTER
    if (
        query.includes("password") ||
        query.includes("admin pass") ||
        query.includes("secret") ||
        query.includes("firebase key") ||
        query.includes("token") ||
        query.includes("hack") ||
        query.includes("database leak")
    ) {
        return {
            type: "security_alert",
            text: "⚠️ <strong>Security Notice:</strong> Faraz Store ke security rules ke tahat credentials, system passwords, ya developer keys share karna strictly prohibited hai. Agar aapko apna password reset karna hai, toh kripya Login page par 'Forgot Password' use karein."
        };
    }

    // 2. ESCALATION TO ADMIN (PAYMENT FAILURE / REFUND / DISPUTE / HUMAN ADMIN REQUEST)
    if (
        query.includes("refund") ||
        query.includes("paisa kat gaya") ||
        query.includes("paise kat gaye") ||
        query.includes("payment fail") ||
        query.includes("payment stuck") ||
        query.includes("diamond nahi mila") ||
        query.includes("diamonds not received") ||
        query.includes("admin se baat") ||
        query.includes("talk to admin") ||
        query.includes("human support") ||
        query.includes("complaint") ||
        query.includes("shikayat")
    ) {
        const ticketId = "TKT-ADM-" + Math.floor(100000 + Math.random() * 900000);
        autoEscalateToAdmin(ticketId, rawQuery);
        showToast(`Ticket #${ticketId} registered with Admin Desk!`, "success");
        return {
            type: "escalation",
            text: `🚨 <strong>Admin Desk Escalation Registered!</strong><br><br>Aapka case hamare <strong>Store Admin Desk</strong> ko direct forward kar diya gaya hai.<br><br>📌 <strong>Ticket ID:</strong> <code>${ticketId}</code><br>🕒 <strong>Status:</strong> Pending Manual Admin Review<br><br>Hamare Store Admin aapka case personally verify karke aapke <a href="notifications.html" style="color: #00f2fe; font-weight: 800; text-decoration: underline;">Notifications Page</a> par manual reply bhejenge.`
        };
    }

    // 3. DIAMONDS TOP-UP & PRICING
    if (query.includes("diamond") || query.includes("topup") || query.includes("top-up") || query.includes("rate") || query.includes("price") || query.includes("price list")) {
        return {
            type: "info",
            text: `💎 <strong>Free Fire Diamonds Rate List:</strong><br>
            • 100 💎 = ₹80<br>
            • 310 💎 = ₹240<br>
            • 520 💎 = ₹400<br>
            • 1060 💎 = ₹800<br>
            • 2180 💎 = ₹1,600<br>
            • 5600 💎 = ₹4,000<br><br>
            ⚡ <strong>Instant Delivery:</strong> Delivery aapke Free Fire Player ID par 60 seconds ke andar ho jati hai.<br>
            👉 <a href="topup.html" style="color: #00f2fe; font-weight: 800; text-decoration: underline;">Open Diamond Top-Up Hub</a>`
        };
    }

    // 4. ORDER TRACKING & STATUS
    if (query.includes("order") || query.includes("track") || query.includes("delivery") || query.includes("status") || query.includes("kahan hai")) {
        return {
            type: "info",
            text: `<strong>Order Tracking Info:</strong><br>
            Aap apne kisi bhi order ki live location aur status aasani se track kar sakte hain:<br><br>
            1️⃣ Apne sabhi past orders dekhne ke liye: <a href="orders.html" style="color: #00f2fe; font-weight: 800; text-decoration: underline;">My Orders Page</a> par jayein.<br>
            2️⃣ Agar aapke paas Order ID hai, toh direct <a href="tracking.html" style="color: #00e5ff; font-weight: 800; text-decoration: underline;">Tracking Desk</a> par jakar ID daalein aur instant status dekhein!`
        };
    }

    // 5. PRIME MEMBERSHIP
    if (query.includes("prime") || query.includes("membership") || query.includes("vip") || query.includes("pass")) {
        return {
            type: "info",
            text: `👑 <strong>Faraz Store Prime Membership:</strong><br>
            • <strong>Weekly Pass (₹159):</strong> 450 Diamonds + Daily Login Claim + Priority Delivery.<br>
            • <strong>Monthly VIP Pass (₹599):</strong> 2600 Diamonds + 10% Extra Bonus on all future top-ups + Exclusive Gold VIP Badge.<br><br>
            👉 <a href="prime-membership.html" style="color: #ffcc00; font-weight: 800; text-decoration: underline;">Upgrade to Prime Membership</a>`
        };
    }

    // 6. EVO GUNS & SKINS
    if (query.includes("evo") || query.includes("m1014") || query.includes("draco") || query.includes("ak47") || query.includes("cobra") || query.includes("gun")) {
        return {
            type: "info",
            text: `<strong>Evo Guns Catalog:</strong><br>
            Hamare paas Max Level Evo Guns available hain:<br>
            • <strong>Evo M1014 Green Flame Draco (Max Lv. 7)</strong> - ₹2,499<br>
            • <strong>AK47 Blue Flame Draco (Max Lv. 7)</strong> - ₹2,499<br>
            • <strong>MP40 Predatory Cobra (Lv. 7)</strong> - ₹1,999<br>
            • <strong>SCAR Megalodon Alpha</strong> - ₹1,799<br><br>
            👉 <a href="product.html" style="color: #00f2fe; font-weight: 800; text-decoration: underline;">Explore Products Catalog</a>`
        };
    }

    // 7. LUCK ROYALE / SPINS
    if (query.includes("luck") || query.includes("spin") || query.includes("royale") || query.includes("wheel") || query.includes("faded")) {
        return {
            type: "info",
            text: `🎰 <strong>Luck Royale & Wheel:</strong><br>
            Aap 10 Diamonds ya Faraz Store Points se Luck Royale me spin karke rare bundles, Free Fire characters aur bonus diamonds jeet sakte hain.<br><br>
            👉 <a href="luck-royale.html" style="color: #ff0055; font-weight: 800; text-decoration: underline;">Play Luck Royale Spin</a>`
        };
    }

    // 8. PAYMENT OPTIONS & SAFETY
    if (query.includes("payment") || query.includes("upi") || query.includes("paytm") || query.includes("phonepe") || query.includes("gpay") || query.includes("qr")) {
        return {
            type: "info",
            text: `💳 <strong>Payment Options:</strong><br>
            Faraz Store 100% Secure Encrypted Payments accept karta hai:<br>
            • UPI (PhonePe, Google Pay, Paytm, BHIM)<br>
            • Debit / Credit Cards (Visa, MasterCard, RuPay)<br>
            • Net Banking across all major banks<br>
            • Instant QR Code scanner at checkout`
        };
    }

    // 9. FORGE VIDEO EDITOR & CREATORVERSE
    if (query.includes("forge") || query.includes("creatorverse") || query.includes("video") || query.includes("editor") || query.includes("app") || query.includes("download")) {
        return {
            type: "info",
            text: `<strong>FORGE Video Editor & CreatorVerse:</strong><br>
            • <strong>FORGE Video Editor:</strong> Aapka personalized real video editor software PC ke liye available hai. Download karne ke liye <a href="updates/index.html" style="color: #00f2fe; font-weight: 800; text-decoration: underline;">Download PC App</a> par jayein.<br>
            • <strong>CreatorVerse AI:</strong> Hamara autonomous 2D animation and media studio jald live hoga (Private Beta Coming Soon).`
        };
    }

    // 10. STRICT DOMAIN FALLBACK (OUT-OF-SCOPE REFUSAL)
    return {
        type: "fallback",
        text: `<strong>Faraz Store Support Agent Notice:</strong><br>
        Main Faraz Store ka official Support Agent hoon aur strict store guidelines ke sath kaam karta hoon.<br><br>
        Main sirf <strong>Faraz Store products, Free Fire diamonds, orders, payments, Prime membership,</strong> aur <strong>FORGE editor</strong> ke sawalon ka jawab de sakta hoon.<br><br>
        Agar aapko koi customized problem hai ya Store Admin se baat karni hai, toh 'Admin se baat karni hai' likhein ya direct Ticket submit karein.`
    };
}

// AUTOMATIC ESCALATION TO ADMIN STORAGE
function autoEscalateToAdmin(ticketId, userQuery) {
    const now = new Date();
    const formattedDate = now.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });

    const newTicket = {
        id: ticketId,
        name: "Support Chat User",
        email: "support-chat@farazstore.in",
        message: `[AI Escalation] ${userQuery}`,
        timestamp: formattedDate,
        status: "Pending Admin Review",
        priority: "HIGH",
        adminReply: null,
        repliedAt: null
    };

    let supportList = [];
    try {
        supportList = JSON.parse(localStorage.getItem("faraz_support_messages") || "[]");
    } catch (e) {
        supportList = [];
    }
    supportList.unshift(newTicket);
    localStorage.setItem("faraz_support_messages", JSON.stringify(supportList));

    let notifList = [];
    try {
        notifList = JSON.parse(localStorage.getItem("faraz_notifications") || "[]");
    } catch (e) {
        notifList = [];
    }
    notifList.unshift({
        id: "esc-" + Date.now(),
        ticketId: ticketId,
        title: `Ticket #${ticketId} Escalated to Admin`,
        message: `Aapki query Faraz Store Admin Desk ko urgently escalate kar di gayi hai. Admin review karke notifications me reply karenge.`,
        time: formattedDate,
        type: "support_escalation"
    });
    localStorage.setItem("faraz_notifications", JSON.stringify(notifList));
}

// ==========================================================================
// 💬 IN-PAGE SUPPORT ENGINE (INSIDE HELP / CONTACT SECTION ONLY)
// Permanently floating widgets removed to avoid obstructing mobile & desktop views.
// ==========================================================================
export function initInPageSupport() {
    const container = document.getElementById("inPageChatMessages");
    if (!container) return;
    console.log("✅ Faraz Support AI active in Help section.");
}

window.sendInPageMessage = function() {
    const input = document.getElementById("inPageAgentInput");
    const messages = document.getElementById("inPageChatMessages");
    if (!input || !messages) return;

    const userText = input.value.trim();
    if (!userText) return;

    const userBubble = document.createElement("div");
    userBubble.className = "agent-bubble user";
    userBubble.innerText = userText;
    messages.appendChild(userBubble);
    input.value = "";
    messages.scrollTop = messages.scrollHeight;

    const typingBubble = document.createElement("div");
    typingBubble.className = "agent-bubble bot typing-indicator";
    typingBubble.innerHTML = "<em>Support AI verifying store rules...</em>";
    messages.appendChild(typingBubble);
    messages.scrollTop = messages.scrollHeight;

    setTimeout(() => {
        typingBubble.remove();
        const response = processSupportQuery(userText);
        const botBubble = document.createElement("div");
        botBubble.className = "agent-bubble bot";
        botBubble.innerHTML = response.text;
        messages.appendChild(botBubble);
        messages.scrollTop = messages.scrollHeight;
    }, 350);
};

window.askInPage = function(query) {
    const input = document.getElementById("inPageAgentInput");
    if (input) {
        input.value = query;
        window.sendInPageMessage();
    }
};

window.processSupportQuery = processSupportQuery;
window.initInPageSupport = initInPageSupport;
