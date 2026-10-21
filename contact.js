// ==========================================
// 🎧 FARAZ STORE - SUPPORT MESSAGING SYSTEM (ADMIN-DRIVEN)
// Saves tickets for Admin Review & dispatches Admin notification
// ==========================================

function sendMessage() {
    const nameInput = document.getElementById("name");
    const emailInput = document.getElementById("email");
    const messageInput = document.getElementById("message");
    const alertBox = document.getElementById("statusAlert");
    const sendBtn = document.getElementById("sendBtn");

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const message = messageInput.value.trim();

    if (!name || !email || !message) {
        showAlert("❌ Kripya sabhi fields (Name, Email, Message) bharein.", "#ef4444", "#450a0a");
        return;
    }

    sendBtn.disabled = true;
    sendBtn.innerText = "⏳ Bheja ja raha hai...";

    const ticketId = "TKT-" + Math.floor(100000 + Math.random() * 900000);
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
        name: name,
        email: email,
        message: message,
        timestamp: formattedDate,
        status: "Pending Admin Review",
        adminReply: null,
        repliedAt: null
    };

    // 1. Save in local storage support messages for Admin Panel
    let supportList = [];
    try {
        supportList = JSON.parse(localStorage.getItem("faraz_support_messages") || "[]");
    } catch (e) {
        supportList = [];
    }
    supportList.unshift(newTicket);
    localStorage.setItem("faraz_support_messages", JSON.stringify(supportList));

    // 2. Queue live user notification acknowledging ticket submission
    let notifList = [];
    try {
        notifList = JSON.parse(localStorage.getItem("faraz_notifications") || "[]");
    } catch (e) {
        notifList = [];
    }

    notifList.unshift({
        id: "ack-" + Date.now(),
        ticketId: ticketId,
        title: `🎫 Ticket #${ticketId} Sent to Admin`,
        message: `Namaste ${name}, aapka sandesh Faraz Store Admin ko safely receive ho gaya hai: "${message.substring(0, 60)}${message.length > 60 ? '...' : ''}". Hamare Admin isko manually check karke notifications me reply karenge.`,
        time: formattedDate,
        type: "support_ack"
    });
    localStorage.setItem("faraz_notifications", JSON.stringify(notifList));

    // 3. Clear inputs and show success
    nameInput.value = "";
    emailInput.value = "";
    messageInput.value = "";

    showAlert(`✅ Shukriya ${name}! Ticket #${ticketId} Admin Desk ko bhej diya gaya hai. Admin ka manual reply aapko Notifications page par milega!`, "#10b981", "#064e3b");
    if (window.showToast) {
        window.showToast(`Ticket #${ticketId} submitted to Admin Desk! 🚀`, "success");
    }

    sendBtn.disabled = false;
    sendBtn.innerText = "🚀 Send Another Message";
}

function showAlert(msg, color, bg) {
    const alertBox = document.getElementById("statusAlert");
    if (!alertBox) return;
    alertBox.style.display = "block";
    alertBox.style.color = color;
    alertBox.style.backgroundColor = bg;
    alertBox.style.border = `1px solid ${color}`;
    alertBox.innerText = msg;
}
