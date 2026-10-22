# SYSTEM MEMORY & INCIDENT LOGS
## FARAZ STORE & PROJECT NOVA ARCHITECTURAL MEMORY

---

### Incident 1: Vercel Static 404 HTML vs REST JSON
- **Symptom**: `SyntaxError: Unexpected token 'T', "The page c"... is not valid JSON` when loading channels, feeds, calls, or users on Vercel deployment.
- **Root Cause**: Vercel lacked a dynamic backend handler for `/api/*` requests in static deployment, returning Vercel's default 404 HTML page ("The page could not be found"). `res.json()` parsed the leading character `T` and crashed.
- **Resolution**:
  1. Implemented `api/index.js` as a full serverless Node.js request router.
  2. Added rewrite in `vercel.json`: `{ "source": "/api/(.*)", "destination": "/api/index.js" }`.
  3. Added client-side resilient fetch guard in `nova-client.js` that inspects `content-type` before calling `.json()`, returning safe fallbacks on edge anomalies.

---

### Incident 2: Mobile Bottom Nav Occluding Modals
- **Symptom**: On mobile viewports, tapping "New Chat", "Channel Settings", or "Status Creator" opened modals that were obscured or unclickable because `.mobile-bottom-nav` sat at `z-index: 9999` while `.nova-modal-backdrop` was set to `z-index: 90`.
- **Root Cause**: Inconsistent z-index layering rules between legacy CSS and new components.
- **Resolution**:
  1. Elevated `.nova-modal-backdrop` to `z-index: 100000 !important`.
  2. Set `.floating-box` to `z-index: 9980` and `.mobile-bottom-nav` to `z-index: 9999`.
  3. Added active chat suppression: `.nova-app.chat-open .mobile-bottom-nav { display: none !important; }`.

---

### Incident 3: Floating Support AI Polluting All Pages
- **Symptom**: Floating Support AI launcher button `#supportLauncherPill` and modal `#supportChatModal` injected dynamically into every page's DOM, overlapping footer links and cart buttons.
- **Root Cause**: `js/support-agent.js` executed `initSupportChatWidget()` on `DOMContentLoaded` on every page.
- **Resolution**:
  1. Removed `initSupportChatWidget()` global DOM injection.
  2. Retained Support AI strictly within `contact.html` under the `#tabPaneAgent` tab.

---

### Incident 4: Missing Function References in Chat Stage
- **Symptom**:
  * `index.html:1414 Uncaught ReferenceError: openAddGroupMemberModal is not defined`
  * `index.html:248 Uncaught ReferenceError: filterFeedByTag is not defined`
- **Root Cause**: Buttons in `chat/index.html` had inline `onclick` handlers referencing functions that were not yet bound to `window` in `nova-client.js`.
- **Resolution**:
  1. Implemented and exported `window.filterFeedByTag(tag)` with hashtag filtering and tab switching.
  2. Implemented `window.openAddGroupMemberModal()` with directory candidate search, filtering, and `/api/chats/:id/members` integration.

---

### Incident 5: Subcollection Permissions in Firestore
- **Symptom**: `wishlist.js` and `friends.js` reporting `Missing or insufficient permissions` in console.
- **Root Cause**:
  * Subcollection `/users/{userId}/invites` was missing from `firestore.rules`.
  * Unauthenticated or anonymous users attempted Firestore streams before login.
- **Resolution**:
  1. Added `match /invites/{inviteId}` to `firestore.rules`.
  2. Guarded Firestore stream listeners in `friends.js` and `wishlist.js` with `if (!currentUser || currentUser.isAnonymous) return;` and silent local storage fallback.

---

### Incident 6: Header Navigation Clutter on Subpages
- **Symptom**: Subpages (`cart.html`, `wishlist.html`, `orders.html`, etc.) rendered redundant text `<nav class="navbar">` alongside icon buttons, creating visual clutter on mobile.
- **Resolution**:
  1. Removed `<nav class="navbar">` from all subpages.
  2. Standardized circular `.header-buttons` action links across all store headers.
  3. Added CSS rule `.header .navbar { display: none !important; }` for legacy insurance.
