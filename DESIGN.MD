# DESIGN SYSTEM & UI/UX SPECIFICATIONS
## FARAZ STORE & NOVA PLATFORM

---

### 1. Visual Language & Aesthetics
- **Theme**: Luxury Cyber-Gaming & Sleek Glassmorphism.
- **Atmosphere**: Deep Obsidian Void (`#0a0f1d`, `#020617`) accented with intense Neon Cyan (`#00f2fe`), Electric Violet (`#9d4edd`), Emerald Green (`#10b981`), and Amber Gold (`#ffcc00`).
- **Surface Elevation**: Frosted glass panels (`backdrop-filter: blur(20px)`), subtle translucent borders (`rgba(255, 255, 255, 0.08)`), and soft neon glow shadows.

---

### 2. Color Palette & CSS Variables

| Token Name | Hex Value | Primary Purpose |
|---|---|---|
| `--brand-cyan` | `#00f2fe` | Primary action highlights, links, focus rings, store diamonds |
| `--brand-purple` | `#9d4edd` | Gradients, luxury cards, status creator overlays |
| `--brand-green` | `#10b981` | Group chats, online presence indicators, verified checkmarks |
| `--brand-gold` | `#ffcc00` | Prime membership, rewards, leaderboards, admin badges |
| `--brand-crimson` | `#ff2d55` | Likes, wishlist favorites, danger actions, delete buttons |
| `--bg-base` | `#0a0f1d` | App background canvas |
| `--bg-surface` | `rgba(18, 24, 38, 0.75)` | Cards, sidebar, modal boxes, input containers |
| `--text-primary` | `#f8fafc` | Main titles, user names, active labels |
| `--text-muted` | `#94a3b8` | Subtitles, timestamps, placeholders, metadata |

---

### 3. Typography Scale
- **Display Headings**: `'Orbitron', sans-serif`
  * H1: `28px - 34px`, Weight: `900`, Tracking: `1.5px`
  * H2: `20px - 24px`, Weight: `800`, Tracking: `1px`
  * H3: `16px - 18px`, Weight: `700`, Tracking: `0.5px`
- **Body & Chat Text**: `'Plus Jakarta Sans', -apple-system, sans-serif`
  * Body Large: `15px`, Line-Height: `1.5`
  * Message Bubble: `14px`, Line-Height: `1.45`
  * Metadata / Timestamps: `11px - 12px`, Line-Height: `1.3`

---

### 4. Component Patterns

#### 4.1 Header & Navigation Bars
- **Desktop Header**: 76px sticky glass bar with brand logo, centralized search bar, and circular `.icons` / `.header-buttons` action links.
- **Icon-Only Subpages**: Subpages (`cart.html`, `wishlist.html`, `product.html`, `orders.html`, etc.) replace bulky text navigation bars with clean 38px circular action buttons with centered SVGs.
- **NOVA Left Navigation Rail**: 68px vertical desktop rail with SVG tabs (`Chats`, `Channels`, `Feed`, `Calls`, `Profile`, `Settings`).

#### 4.2 Mobile Bottom Navigation (`.mobile-bottom-nav`)
- Height: 64px, anchored to bottom with frosted glass backdrop.
- Fixed `z-index: 9999`.
- **Keyboard Protection**: When entering a chat conversation, `.nova-app.chat-open` suppresses `.mobile-bottom-nav` (`display: none !important`), enabling clean keyboard docking for `.stage-input-bar`.

#### 4.3 Floating Social & Action Buttons (`css/floating.css`)
- Perfectly circular: `48px x 48px` (desktop), `44px x 44px` (mobile).
- Border-radius: `50% !important`.
- Centered SVG icons with luxury gradient backgrounds (Instagram: `linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)`, YouTube: `linear-gradient(135deg, #ff0000, #b91c1c)`).
- Layered at `z-index: 9980` to never overlap modals or active drawers.

#### 4.4 Modals & Full-Screen Dialogs
- Backdrop: `rgba(0, 0, 0, 0.75)` with `backdrop-filter: blur(10px)`.
- Layered at `z-index: 100000 !important` to guarantee visibility above mobile navigation bars.
- Responsive dimensions: `max-width: 480px`, `max-height: calc(100dvh - 36px)`, with smooth scrollbars.
