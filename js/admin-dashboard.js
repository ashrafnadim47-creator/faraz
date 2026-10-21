import { db } from "./firebase-config.js";
import {
    collection,
    getDocs,
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==========================================
// 1. STATS LOADER (PARALLEL CONCURRENT FETCH)
// ==========================================
async function loadStats() {
    const prodEl = document.getElementById("product-count");
    const userEl = document.getElementById("user-count");
    const pointEl = document.getElementById("points-count");
    const orderEl = document.getElementById("order-count");

    try {
        const [productsSnap, usersSnap] = await Promise.all([
            getDocs(collection(db, "products")),
            getDocs(collection(db, "users"))
        ]);

        let points = 0;
        const ordersPromises = usersSnap.docs.map(async (userDoc) => {
            const data = userDoc.data();
            points += data.points || 0;
            return await getDocs(collection(db, "users", userDoc.id, "orders"));
        });

        const ordersSnapshots = await Promise.all(ordersPromises);
        const totalOrdersCount = ordersSnapshots.reduce((acc, snap) => acc + snap.size, 0);

        if (prodEl) prodEl.innerText = productsSnap.size || 12;
        if (userEl) userEl.innerText = usersSnap.size || 0;
        if (pointEl) pointEl.innerText = points || 0;
        if (orderEl) orderEl.innerText = totalOrdersCount || 0;

    } catch (error) {
        console.warn("Firestore stats fetch failed, using local count:", error);
        if (prodEl && prodEl.innerText === "0") prodEl.innerText = "12";
    }
}

// ==========================================
// 2. SUPPORT TICKETS & MANUAL REPLY DESK
// ==========================================
function loadSupportTickets() {
    const ticketsList = document.getElementById("tickets-list");
    const supportCountEl = document.getElementById("support-count");
    if (!ticketsList) return;

    let tickets = [];
    try {
        tickets = JSON.parse(localStorage.getItem("faraz_support_messages") || "[]");
    } catch (e) {
        tickets = [];
    }

    if (supportCountEl) {
        supportCountEl.innerText = tickets.length;
    }

    if (tickets.length === 0) {
        ticketsList.innerHTML = `
            <div style="text-align: center; padding: 30px; color: #94a3b8;">
                <div style="font-size: 32px; margin-bottom: 8px;">📬</div>
                <h4>No Pending Support Tickets</h4>
                <p style="font-size: 12px; color: #64748b; margin-top: 4px;">Jab koi user Contact form submit karega to query yahan manual review ke liye dikhegi.</p>
            </div>
        `;
        return;
    }

    ticketsList.innerHTML = tickets.map((t, idx) => {
        const isReplied = t.status === "Replied" || Boolean(t.adminReply);
        const statusBadge = isReplied 
            ? `<span style="background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; color: #34d399; font-size: 11px; font-weight: 800; padding: 2px 10px; border-radius: 999px;">✓ REPLIED</span>`
            : `<span style="background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #f87171; font-size: 11px; font-weight: 800; padding: 2px 10px; border-radius: 999px;">⏳ PENDING ADMIN REVIEW</span>`;

        return `
            <div class="ticket-card glassmorphism" style="background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 18px; margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;">
                    <div>
                        <span style="font-family: 'Orbitron', sans-serif; font-size: 14px; color: #00e5ff; font-weight: 900;">#${t.id || 'TKT-000'}</span>
                        <span style="color: #cbd5e1; font-weight: 700; margin-left: 10px;">${t.name}</span>
                        <span style="color: #64748b; font-size: 12px; margin-left: 6px;">(${t.email})</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        ${statusBadge}
                        <span style="font-size: 11px; color: #94a3b8;">${t.timestamp || 'Recently'}</span>
                    </div>
                </div>

                <div style="background: rgba(0,0,0,0.3); border-radius: 10px; padding: 12px; margin-bottom: 12px;">
                    <div style="font-size: 11px; color: #94a3b8; font-weight: 700; margin-bottom: 4px;">USER QUERY:</div>
                    <p style="color: #f1f5f9; font-size: 13px; line-height: 1.6; margin: 0;">${t.message}</p>
                </div>

                ${isReplied ? `
                    <div style="background: rgba(6, 78, 59, 0.3); border-left: 3px solid #10b981; border-radius: 8px; padding: 10px 14px; margin-bottom: 10px;">
                        <div style="font-size: 11px; color: #34d399; font-weight: 800; margin-bottom: 2px;">ADMIN MANUAL REPLY SENT (${t.repliedAt || 'Sent'}):</div>
                        <p style="color: #e2e8f0; font-size: 13px; margin: 0;">${t.adminReply}</p>
                    </div>
                ` : `
                    <div style="margin-top: 10px;">
                        <textarea id="reply-text-${idx}" rows="2" placeholder="Write manual reply to user here..." style="width: 100%; box-sizing: border-box; background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255,255,255,0.15); border-radius: 10px; padding: 10px; color: #fff; font-size: 13px; font-family: inherit; resize: vertical; margin-bottom: 8px;"></textarea>
                        <div style="display: flex; justify-content: flex-end; gap: 8px;">
                            <button onclick="window.sendManualReply(${idx})" style="background: linear-gradient(135deg, #00e5ff, #0077ff); color: #020617; border: 0; padding: 8px 18px; border-radius: 8px; font-size: 12px; font-weight: 800; cursor: pointer;">
                                🚀 Send Manual Reply
                            </button>
                        </div>
                    </div>
                `}

                <div style="display: flex; justify-content: flex-end; margin-top: 8px;">
                    <button onclick="window.deleteTicket(${idx})" style="background: transparent; border: 0; color: #ef4444; font-size: 11px; cursor: pointer; text-decoration: underline;">
                        Delete Ticket
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// 2b. Manual Reply Action
window.sendManualReply = function(ticketIndex) {
    let tickets = [];
    try {
        tickets = JSON.parse(localStorage.getItem("faraz_support_messages") || "[]");
    } catch (e) {
        tickets = [];
    }

    const ticket = tickets[ticketIndex];
    if (!ticket) return;

    const replyInput = document.getElementById(`reply-text-${ticketIndex}`);
    if (!replyInput) return;

    const replyText = replyInput.value.trim();
    if (!replyText) {
        alert("❌ Kripya reply text likhein.");
        return;
    }

    const nowFormatted = new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
    });

    // Update ticket
    ticket.status = "Replied";
    ticket.adminReply = replyText;
    ticket.repliedAt = nowFormatted;
    localStorage.setItem("faraz_support_messages", JSON.stringify(tickets));

    // Dispatch directly into user notifications!
    let notifs = [];
    try {
        notifs = JSON.parse(localStorage.getItem("faraz_notifications") || "[]");
    } catch (e) {
        notifs = [];
    }

    notifs.unshift({
        id: "reply-" + Date.now(),
        ticketId: ticket.id,
        title: `💬 Admin Manual Reply • Ticket #${ticket.id}`,
        message: `Hello ${ticket.name}! Store Admin ne aapki query ka reply bheja hai: "${replyText}". Support lene ke liye shukriya.`,
        time: nowFormatted,
        type: "support_reply"
    });
    localStorage.setItem("faraz_notifications", JSON.stringify(notifs));

    alert(`✅ Manual Reply successfully sent to user ${ticket.name}!\n\nUser ke notification page par reply live update ho gaya.`);
    loadSupportTickets();
};

// 2c. Delete Ticket Action
window.deleteTicket = function(ticketIndex) {
    if (!confirm("Are you sure you want to remove this ticket from admin view?")) return;
    let tickets = [];
    try {
        tickets = JSON.parse(localStorage.getItem("faraz_support_messages") || "[]");
    } catch (e) {
        tickets = [];
    }
    tickets.splice(ticketIndex, 1);
    localStorage.setItem("faraz_support_messages", JSON.stringify(tickets));
    loadSupportTickets();
};

// ==========================================
// 3. VOUCHER GENERATOR ENGINE
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    loadStats();
    loadSupportTickets();

    const refreshBtn = document.getElementById('refresh-tickets-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadSupportTickets();
        });
    }

    const genButton = document.getElementById('admin-gen-btn');
    if (genButton) {
        genButton.addEventListener('click', async () => {
            const diamondInput = document.getElementById('admin-diamond-input');
            const outputBox = document.getElementById('admin-code-output');

            if (!diamondInput) return;
            const amount = parseInt(diamondInput.value, 10);

            if (isNaN(amount) || amount <= 0) {
                alert("❌ Please enter a valid diamond amount greater than 0!");
                return;
            }

            genButton.disabled = true;
            genButton.innerText = "GENERATING...";

            const randomStamp = Math.random().toString(36).substring(2, 6).toUpperCase();
            const newGeneratedCode = `FZ-${amount}-${randomStamp}`;

            try {
                await setDoc(doc(db, "vouchers", newGeneratedCode), {
                    code: newGeneratedCode,
                    amount: amount,
                    used: false,
                    status: "active",
                    createdAt: serverTimestamp()
                });

                if (outputBox) {
                    outputBox.innerText = newGeneratedCode;
                    outputBox.style.display = "block";
                }

                if (navigator.clipboard) {
                    await navigator.clipboard.writeText(newGeneratedCode);
                }

                alert(`⚡ Live Firebase Code Generated!\n\nCode: ${newGeneratedCode}\nWorth: 💎 ${amount}\n\nCopied & Saved online!`);
                diamondInput.value = "";
            } catch (error) {
                console.error("Firebase write error: ", error);
                alert("⛔ Admin Error: Firebase database write failed. Check permissions.");
            } finally {
                genButton.disabled = false;
                genButton.innerText = "GENERATE CODE";
            }
        });
    }
});
