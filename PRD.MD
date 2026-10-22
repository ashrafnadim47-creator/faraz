# PRODUCT REQUIREMENTS DOCUMENT (PRD)
## FARAZ STORE & NOVA COMMUNICATIONS ECOSYSTEM

**Version:** 3.0.0-PROD  
**Deployment Target:** Vercel (`https://faraz-eta.vercel.app/`)  
**Repository Branch:** `main`  
**Last Updated:** October 2026

---

### 1. Executive Summary & Vision
Faraz Store & NOVA is a hybrid digital commerce and real-time social platform combining:
1. **Next-Generation Gaming E-Commerce**: Seamless Free Fire diamond top-ups by Player UID, Evo Gun tokens, digital vouchers, dynamic shopping cart, persistent wishlist, and order fulfillment.
2. **NOVA Super App**: Unified messaging, community clans, Telegram-style broadcast channels, Instagram/Facebook-inspired super feeds with rich media and hashtag discovery, 24-hour status stories with gradient studios, and 1-on-1 WebRTC audio/video calls.
3. **FORGE Creative Studio**: Browser-based video editor with multi-track timeline, canvas preview, and direct export.
4. **Autonomous AI Support**: Embedded 24/7 support agent located strictly in `contact.html` for instant customer guidance without intrusive global screen overlays.

---

### 2. Core User Personas
- **Gamer / Shopper ("Arjun")**: Wants instant Free Fire diamond top-ups, Evo Gun upgrades, order tracking, and zero friction in cart and checkout.
- **Social Content Creator ("Priya")**: Posts high-definition gameplay videos and status stories, monitors follower and like metrics, and interacts with fans.
- **Clan / Community Leader ("Faraz")**: Manages group chats and broadcast channels, pins important alerts, creates polls, and invites team members.
- **Platform Moderator / Admin ("Admin Nadim")**: Resolves user-reported content, monitors platform health, broadcasts announcements, and oversees product inventory.

---

### 3. Functional Requirements

#### 3.1 Next-Gen Gaming Store
- **Instant UID Diamond Checkout**: Direct Player UID validation with instant price calculation.
- **Product Catalog & Fallback**: Renders official items from Firestore; seamlessly falls back to local data if unauthenticated or offline.
- **Wishlist & Cart**: Real-time sync with local storage and authenticated user subcollections (`/users/{uid}/cart`, `/users/{uid}/wishlist`).
- **Clean Action Header**: Dedicated circular icon buttons (Home, Products, Cart, Wishlist, Orders, Profile) without redundant text navbars.

#### 3.2 NOVA Messaging & Real-Time Engine
- **Direct 1-on-1 Chats**: End-to-end messaging, read receipts (blue ticks), reactions, message editing, and deletion.
- **Community Groups**: Multi-participant group chats, participant lists, admin badges, and interactive "+ Add Member" modal with user directory search.
- **Broadcast Channels**: Dedicated Telegram-style channel tab (`#viewTabChannels`), single-creator broadcast permission, and subscriber feeds.
- **Social Wall & Super Feed**: Post creation with image/video attachments, comments, likes count, profile inspection pills, and hashtag filtering (`#tech`, `#nova`, `#gaming`, `#music`, `#viral`).
- **Status Story Studio**: 24-hour disappearing stories with background gradients, music stickers, text overlays, and font selection.
- **WebRTC Calls**: 1-on-1 audio and video calling with SDP signaling and real-time call states (Ringing, Answered, Ended).
- **Directory & Handle System**: Unique `@username` registration, debounced availability check, and user directory search.

#### 3.3 Security & Administration
- **Atomic Username Reservation**: `/usernames/{username}` creates uniquely reserved documents preventing impersonation.
- **Granular Security Rules**: Private access to user cart, orders, wishlist, invites, and friend requests; public discovery for user profiles.
- **Admin Dashboard (`/admin.html`)**: Real-time metrics (users, messages, chats, stories, active sockets), moderation report resolution, and channel management.
- **Support AI Desk**: Clean dual-tab support desk in `contact.html` (AI Support Agent + Manual Admin Ticket Submission).

---

### 4. Non-Functional Requirements
- **Zero Mock Success**: All endpoints connect to real serverless routes (`api/index.js`) or local server (`nova/server.js`).
- **No 'Unexpected token T' Errors**: Safe client-side fetch guards validate `content-type` before JSON parsing.
- **Mobile Touch Optimization**: Viewport width fixed at `100vw`, zero horizontal scroll leak, modals at `z-index: 100000`, minimum 44px tap targets.
- **Sub-Second Performance**: Static assets cached on Vercel CDN; serverless API cold starts under 400ms.
- **Secret Hygiene**: Zero exposed credentials or API keys in client-side bundles or git history.
