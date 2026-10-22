# ENGINEERING & ARCHITECTURAL RULES
## FARAZ STORE & NOVA PLATFORM STANDARDS

**Enforcement Level:** MANDATORY  
**Target Architecture:** Vercel Serverless + Standalone Node.js WebSocket Gateway + Firebase Firestore  

---

### Rule 1: Zero Mock Policy
1. Every API call in `nova-client.js` and client applications must point to a reachable, functioning backend endpoint (`/api/...`).
2. Never stub responses with hardcoded simulated delays or fake success payloads when real services can be invoked.
3. If an endpoint is offline or a service lacks credentials, handle the state transparently with human-readable notifications rather than silently masking failures.

---

### Rule 2: Bulletproof JSON & Network Fetch Guards
1. **Never parse response bodies blindly**: Never write `await res.json()` without verifying `res.ok` and inspecting headers.
2. **Handle Non-JSON Error Responses**: When Vercel or cloud proxies return HTML error pages (`404 Not Found`, `502 Bad Gateway`, `The page could not be found...`), the client interceptor MUST detect text/html and return a graceful fallback `{ ok: false, error: ... }`.
3. Uncaught `SyntaxError: Unexpected token 'T'` in JSON parsing is strictly forbidden in production.

---

### Rule 3: Mobile Viewport & Z-Index Layering Hierarchy
1. **Global Viewport Guard**: `html, body { max-width: 100vw; overflow-x: hidden; }` must be preserved across all pages.
2. **Layering Architecture**:
   - Level 0 (Base Content): `z-index: 1 - 10`
   - Level 1 (Sticky Headers & Navigation Rails): `z-index: 1000`
   - Level 2 (Floating Action Buttons & Social Icons): `z-index: 9980`
   - Level 3 (Mobile Bottom Navigation): `z-index: 9999`
   - Level 4 (Modals, Overlays & Full-Screen Dialogs): `z-index: 100000 !important`
3. **Active Chat Screen Keyboard Rule**: When a chat conversation is actively open (`.nova-app.chat-open`), `.mobile-bottom-nav` MUST be set to `display: none !important` to ensure input bars and virtual keyboards never collide.

---

### Rule 4: Navigation Bar Cleanliness
1. **Index Page Rule**: Root `index.html` retains the full gaming portal navigation bar and search bar.
2. **Subpage Rule**: Store subpages (`cart.html`, `wishlist.html`, `orders.html`, `product.html`, `product-details.html`, `checkout.html`, `contact.html`, `account.html`) MUST NOT render bulky text `<nav class="navbar">` tags.
3. Subpages exclusively utilize the `.header-buttons` container with circular 38px SVG icon buttons (Home, Products, Cart, Wishlist, Orders, Profile).

---

### Rule 5: Unique Identity & Atomic Reservation
1. Usernames must match regex `/^[a-z0-9_]{3,20}$/`.
2. All new registrations must atomically create a claim in `/usernames/{username}`.
3. If the username claim exists, registration must be rejected with HTTP 409 Conflict.
4. User profiles in `/users/{userId}` are publicly readable for discovery and social interactions, but private subcollections (`cart`, `wishlist`, `orders`, `notifications`, `friends`, `friend_requests`, `invites`) are strictly bounded to authenticated owners.

---

### Rule 6: Support AI Confinement
1. Support AI widgets (`#supportLauncherPill`, `#supportChatModal`) MUST NEVER be injected globally into arbitrary web pages.
2. The AI Support Agent is exclusively hosted inside `contact.html` under the designated "AI Support Agent" tab pane.

---

### Rule 7: Secret Hygiene & Git Commits
1. Never commit `.env` files, production API tokens, private keys, or credentials to git.
2. Scan all commits before pushing (`git diff`) to prevent accidental leaks.
