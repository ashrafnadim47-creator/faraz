# ARCHITECTURE & SYSTEM DESIGN
## FARAZ STORE & PROJECT NOVA SUPER APP

---

### 1. System Topology Overview

```
                      +---------------------------------------+
                      |               CLIENT BROWSER          |
                      |   (Desktop, Tablet, iOS/Android Web)  |
                      +-------------------+-------------------+
                                          |
                +-------------------------+-------------------------+
                | HTTP / REST (Vercel CDN)|                         | WebSocket (Port 4000)
                v                         v                         v
+-------------------------------+ +--------------------+ +---------------------------+
| Vercel Edge Serverless Engine | | Firebase Platform  | | Standalone NOVA Daemon    |
| - File: /api/index.js         | | - Firestore DB     | | - File: /nova/server.js   |
| - Rewrite: /api/(.*)          | | - Authentication   | | - WebSocket Protocol (ws:)|
| - JSON REST Endpoints         | | - Storage Buckets  | | - SQLite: nova.db         |
+-------------------------------+ +--------------------+ +---------------------------+
```

---

### 2. Component Layers

#### 2.1 Presentation Layer (Frontend)
- **Framework**: Modern Vanilla JavaScript (ES2022+), CSS3 with CSS Custom Properties, semantic HTML5.
- **Client State**: Encapsulated in the global `window.NOVA` state machine:
  * `NOVA.user`: Authenticated profile session (`id`, `username`, `display_name`, `avatar`, `role`).
  * `NOVA.chats`: Active chat threads, direct messages, groups, and channels.
  * `NOVA.activeTab`: Current sidebar and stage tab (`chats`, `channels`, `feed`, `calls`, `profile`, `settings`).
  * `NOVA.activeChatId`: Current active message thread.
  * `NOVA.socket`: WebSocket connection to live message broker.
  * `NOVA.studio`: State for the status story creator canvas.
- **Resilient Fetch Interceptor**: Global wrapper on `window.fetch` that intercepts non-JSON and 404 HTML responses from edge CDNs, returning structured fallback objects to prevent `Unexpected token 'T'` parse exceptions.

#### 2.2 Serverless API Layer (`api/index.js`)
- Deployed on Vercel Node.js Serverless Functions.
- All requests matching `/api/(.*)` route directly to `api/index.js` via `vercel.json` rewrites.
- **Key Modules**:
  * `/api/health`: Operational health and uptime check.
  * `/api/auth/*`: Registration, login, session validation, and atomic handle reservations.
  * `/api/users/*`: Profile retrieval, directory search, handle availability, follow/unfollow operations.
  * `/api/chats/*`: Chat thread listing, direct chat initiation, community group creation, message dispatch, participant management (`/api/chats/:id/members`).
  * `/api/channels/*`: Telegram-style channels, public discovery, subscribe/unsubscribe, broadcast publishing.
  * `/api/posts/*`: Social super feed, image/video uploads, like counters, threaded comments.
  * `/api/stories/*`: 24-hour status stories with gradient backgrounds, font choices, and music track metadata.
  * `/api/calls/*`: WebRTC audio/video call signaling logs.
  * `/api/admin/*`: Platform metrics, reports resolution, and broadcast administration.

#### 2.3 Standalone Realtime Engine (`nova/server.js`)
- Express + `ws` WebSocket Gateway running on Node.js port 4000 for local development and self-hosted environments.
- **Persistence**: SQLite database (`nova/database/nova.db`) managed via parameterized queries.
- **File Uploads**: Stored in `nova/uploads/` with public static hosting at `/uploads/`.
- **WebRTC Signaling**: Broadcasts `CALL_OFFER`, `CALL_ANSWER`, `ICE_CANDIDATE`, and `CALL_HANGUP` frames between peer sockets.

#### 2.4 Cloud Data & Auth Layer (Firebase)
- **Firestore Collections**:
  * `/products/{productId}`: Public store catalog.
  * `/vouchers/{voucherId}`: Store promotional discount vouchers.
  * `/usernames/{username}`: Atomic reservations mapping handle to `uid`.
  * `/users/{userId}`: Public user profiles and private subcollections (`/cart`, `/wishlist`, `/orders`, `/notifications`, `/friends`, `/friend_requests`, `/invites`).
  * `/squads/{squadId}`: Live multiplayer lobby matchmaking.

---

### 3. Vercel Edge Configuration (`vercel.json`)
```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index.js" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Permissions-Policy", "value": "camera=*, microphone=*, geolocation=()" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "SAMEORIGIN" }
      ]
    }
  ]
}
```
