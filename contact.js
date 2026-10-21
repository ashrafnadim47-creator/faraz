// ==========================================
// 🎧 FARAZ STORE - SUPPORT MESSAGING SYSTEM
// Saves tickets locally and queues notification replies
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
        status: "Received"
    };

    // 1. Save in local storage support messages
    let supportList = [];
    try {
        supportList = JSON.parse(localStorage.getItem("faraz_support_messages") || "[]");
    } catch (e) {
        supportList = [];
    }
    supportList.unshift(newTicket);
    localStorage.setItem("faraz_support_messages", JSON.stringify(supportList));

    // 2. Queue live notification into faraz_notifications
    let notifList = [];
    try {
        notifList = JSON.parse(localStorage.getItem("faraz_notifications") || "[]");
    } catch (e) {
        notifList = [];
    }

    // A. Submission acknowledgment notification
    notifList.unshift({
        id: "notif-" + Date.now(),
        ticketId: ticketId,
        title: `🎫 Support Ticket #${ticketId} Acknowledged`,
        message: `Namaste ${name}, aapka sandesh receive ho gaya hai: "${message.substring(0, 60)}${message.length > 60 ? '...' : ''}". Hamari team ispar action le rahi hai.`,
        time: formattedDate,
        type: "support_ack"
    });

    // B. Direct Support Agent Reply notification
    setTimeout(() => {
        let currentNotifs = [];
        try {
            currentNotifs = JSON.parse(localStorage.getItem("faraz_notifications") || "[]");
        } catch (e) { currentNotifs = []; }

        currentNotifs.unshift({
            id: "reply-" + Date.now(),
            ticketId: ticketId,
            title: `💬 Support Team Reply • Ticket #${ticketId}`,
            message: `Hello ${name}! Faraz Store Official Support ne aapki query check kar li hai. Hamara agent jald hi aapke email (${email}) par rabta karega. Dhanyawad!`,
            time: "Just now",
            type: "support_reply"
        });
        localStorage.setItem("faraz_notifications", JSON.stringify(currentNotifs));
    }, 1200);

    localStorage.setItem("faraz_notifications", JSON.stringify(notifList));

    // 3. Clear inputs and show success
    nameInput.value = "";
    emailInput.value = "";
    messageInput.value = "";

    showAlert(`✅ Shukriya ${name}! Ticket #${ticketId} generate ho gaya hai. Reply aapko Notifications page par mil jayega!`, "#10b981", "#064e3b");

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
