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
// 💬 INTERACTIVE CHAT UI INJECTION & CONTROLLERS (LEFT-ALIGNED)
// ==========================================================================
function initSupportChatWidget() {
    // Only inject floating launcher if not on contact.html
    if (window.location.pathname.includes("contact.html")) return;

    if (!document.getElementById("supportLauncherPill")) {
        const pill = document.createElement("div");
        pill.id = "supportLauncherPill";
        pill.className = "support-launcher-pill";
        pill.onclick = toggleSupportChat;
        pill.innerHTML = `
            <div class="support-launcher-avatar">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a8 8 0 0 0-8 8c0 3.36 2.07 6.24 5 7.42V20a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-2.58c2.93-1.18 5-4.06 5-7.42a8 8 0 0 0-8-8z"/><path d="M9 10h.01"/><path d="M15 10h.01"/></svg>
            </div>
            <span>Support AI</span>
            <span class="support-online-badge"></span>
        `;
        document.body.appendChild(pill);
    }

    if (!document.getElementById("supportChatModal")) {
        const modal = document.createElement("div");
        modal.id = "supportChatModal";
        modal.className = "support-chat-modal";
        modal.innerHTML = `
            <div class="support-chat-header">
                <div class="support-header-info">
                    <div class="support-avatar-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a8 8 0 0 0-8 8c0 3.36 2.07 6.24 5 7.42V20a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-2.58c2.93-1.18 5-4.06 5-7.42a8 8 0 0 0-8-8z"/><path d="M9 10h.01"/><path d="M15 10h.01"/></svg>
                    </div>
                    <div class="support-title-box">
                        <h4>Faraz Support AI</h4>
                        <p>● Strict Store Assistant (Online)</p>
                    </div>
                </div>
                <button class="support-close-btn" onclick="toggleSupportChat()" title="Close Support">✕</button>
            </div>
            <div class="support-chat-body" id="supportChatBody">
                <div class="chat-msg agent">
                    Namaste! Main hoon <strong>Faraz Store Support Agent</strong>.<br><br>
                    Main aapki Diamond top-ups, Orders tracking, Prime membership aur gaming gear me live madad kar sakta hoon.<br><br>
                    <em>Aap kya poochna chahte hain? Neeche quick options chun sakte hain ya likhein:</em>
                    <div class="support-chips">
                        <button class="support-chip" onclick="sendSupportPreset('Diamond Top-Up rates kya hain?')">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12l4 6-10 12L2 9z"/></svg>
                            Diamond Rates
                        </button>
                        <button class="support-chip" onclick="sendSupportPreset('Mera order kaise track hoga?')">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
                            Track Order
                        </button>
                        <button class="support-chip" onclick="sendSupportPreset('Prime Membership ke benefits?')">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.269a4 4 0 0 1-3.83 2.942H8.684a4 4 0 0 1-3.829-2.942L2.02 6.019a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"/></svg>
                            Prime VIP
                        </button>
                        <button class="support-chip" onclick="sendSupportPreset('Evo M1014 Gun ke baare me batao')">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
                            Evo Guns
                        </button>
                        <button class="support-chip" onclick="sendSupportPreset('Mujhe Admin se baat karni hai')">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                            Talk to Admin
                        </button>
                    </div>
                </div>
            </div>
            <div class="support-chat-footer">
                <input type="text" id="supportChatInput" class="support-chat-input" placeholder="Faraz Store se related sawal poochein..." onkeydown="handleSupportKey(event)">
                <button class="support-chat-send" onclick="sendSupportMessage()" title="Send">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                </button>
            </div>
        `;
        document.body.appendChild(modal);
    }
}

function toggleSupportChat() {
    initSupportChatWidget();
    const modal = document.getElementById("supportChatModal");
    if (!modal) return;
    modal.classList.toggle("active");
    if (modal.classList.contains("active")) {
        const input = document.getElementById("supportChatInput");
        if (input) setTimeout(() => input.focus(), 100);
    }
}

function handleSupportKey(e) {
    if (e.key === "Enter") {
        sendSupportMessage();
    }
}

function sendSupportPreset(text) {
    const input = document.getElementById("supportChatInput");
    if (input) {
        input.value = text;
        sendSupportMessage();
    }
}

function sendSupportMessage() {
    const input = document.getElementById("supportChatInput");
    const body = document.getElementById("supportChatBody");
    if (!input || !body) return;

    const userText = input.value.trim();
    if (!userText) return;

    // Append user message
    const userMsg = document.createElement("div");
    userMsg.className = "chat-msg user";
    userMsg.innerText = userText;
    body.appendChild(userMsg);
    input.value = "";
    body.scrollTop = body.scrollHeight;

    // Simulate smart thinking delay
    const typingIndicator = document.createElement("div");
    typingIndicator.className = "chat-msg agent";
    typingIndicator.id = "typingIndicator";
    typingIndicator.innerHTML = "<em>Support Agent verifying with strict store rules...</em>";
    body.appendChild(typingIndicator);
    body.scrollTop = body.scrollHeight;

    setTimeout(() => {
        const ind = document.getElementById("typingIndicator");
        if (ind) ind.remove();

        const response = processSupportQuery(userText);
        const agentMsg = document.createElement("div");
        agentMsg.className = "chat-msg agent";
        agentMsg.innerHTML = response.text;
        body.appendChild(agentMsg);
        body.scrollTop = body.scrollHeight;
    }, 400);
}

// Auto-initialize when DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSupportChatWidget);
} else {
    initSupportChatWidget();
}

// Expose globally
window.toggleSupportChat = toggleSupportChat;
window.sendSupportPreset = sendSupportPreset;
window.sendSupportMessage = sendSupportMessage;
window.handleSupportKey = handleSupportKey;
window.processSupportQuery = processSupportQuery;
