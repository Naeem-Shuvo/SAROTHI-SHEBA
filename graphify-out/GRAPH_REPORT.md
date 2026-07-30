# Graph Report - .  (2026-07-28)

## Corpus Check
- Corpus is ~24,024 words - fits in a single context window. You may not need a graph.

## Summary
- 278 nodes · 506 edges · 26 communities (18 shown, 8 thin omitted)
- Extraction: 89% EXTRACTED · 10% INFERRED · 1% AMBIGUOUS · INFERRED: 53 edges (avg confidence: 0.58)
- Token cost: 89,784 input · 0 output

## Community Hubs (Navigation)
- React App Pages & Contexts
- Backend NPM Dependencies
- Frontend NPM Dependencies
- Auth, Login & Token Blacklist
- Express API Route Table
- ESLint & Vite Tooling
- HTML Shells & Vite Template Docs
- Registration & Driver Approval
- Server Startup & Socket.IO Bootstrap
- SVG Icon Sprite Sheet
- SSLCommerz Payment Flow
- Ride Requests & Postgres Pool
- Favicon Brand Mark
- Admin User Management
- In-Ride Messaging
- Root Postgres Dependency
- Admin Dashboard Stats
- Admin Ride Listing
- Available Rides Lookup
- Driver Dashboard
- Passenger Dashboard
- Ride Rating
- Ride Acceptance
- Ride Status Updates

## God Nodes (most connected - your core abstractions)
1. `query()` - 52 edges
2. `useAuth()` - 31 edges
3. `api()` - 27 edges
4. `Icons SVG Sprite Sheet` - 7 edges
5. `dashboardPage()` - 5 edges
6. `testConnection()` - 5 edges
7. `scripts` - 5 edges
8. `ActiveRidePage()` - 5 edges
9. `React + Vite Template Setup` - 5 edges
10. `SAROTHI SHEBA SPA HTML Shell` - 5 edges

## Surprising Connections (you probably didn't know these)
- `Legacy Static Login Page` --semantically_similar_to--> `SAROTHI SHEBA SPA HTML Shell`  [INFERRED] [semantically similar]
  public/index.html → frontend/index.html
- `startServer()` --calls--> `testConnection()`  [EXTRACTED]
  backend/startPoint.js → database/db.js
- `getAdminDashboard()` --calls--> `query()`  [EXTRACTED]
  backend/controller/adminDashboard.js → database/db.js
- `getAdminRides()` --calls--> `query()`  [EXTRACTED]
  backend/controller/adminRides.js → database/db.js
- `getAdminUsers()` --calls--> `query()`  [EXTRACTED]
  backend/controller/adminUsers.js → database/db.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Vite React SPA Bootstrap Chain** — frontend_index_sarothi_sheba_shell, frontend_index_root_mount, frontend_index_main_jsx_entry, frontend_readme_react_vite_template [INFERRED 0.85]
- **Legacy Client-Side Auth/Data Prototype** — public_index_legacy_static_page, public_index_loginform, public_index_get_btn [EXTRACTED 1.00]
- **Social Platform Brand Mark Icon Set** — frontend_public_icons_bluesky_icon, frontend_public_icons_discord_icon, frontend_public_icons_github_icon, frontend_public_icons_x_icon [INFERRED 0.95]
- **Purple Outline UI Icon Family** — frontend_public_icons_documentation_icon, frontend_public_icons_social_icon, frontend_public_icons_purple_stroke_style [INFERRED 0.85]
- **Symbols Participating in the Single-File SVG Sprite** — frontend_public_icons, frontend_public_icons_bluesky_icon, frontend_public_icons_discord_icon, frontend_public_icons_documentation_icon, frontend_public_icons_github_icon, frontend_public_icons_social_icon, frontend_public_icons_x_icon, frontend_public_icons_sprite_symbol_pattern [EXTRACTED 1.00]

## Communities (26 total, 8 thin omitted)

### Community 0 - "React App Pages & Contexts"
Cohesion: 0.13
Nodes (25): App(), ProtectedRoute(), AuthContext, AuthProvider(), useAuth(), SocketContext, SocketProvider(), useSocket() (+17 more)

### Community 1 - "Backend NPM Dependencies"
Cohesion: 0.07
Nodes (26): author, dependencies, cors, dotenv, express, jsonwebtoken, nodemon, socket.io (+18 more)

### Community 2 - "Frontend NPM Dependencies"
Cohesion: 0.07
Nodes (26): dependencies, leaflet, lucide-react, react, react-dom, react-hot-toast, react-leaflet, react-router-dom (+18 more)

### Community 3 - "Auth, Login & Token Blacklist"
Cohesion: 0.12
Nodes (20): dashboardPage(), { query }, { requireAdmin, requireDriver, requirePassenger }, { blacklistToken }, crypto, dbHealth(), jwt, loginPage() (+12 more)

### Community 4 - "Express API Route Table"
Cohesion: 0.10
Nodes (19): { acceptRide }, { authMiddleware }, { dashboardPage }, express, { getAdminDashboard }, { getAdminRides }, { getAdminUsers, deactivateUser }, { getAvailableRides } (+11 more)

### Community 5 - "ESLint & Vite Tooling"
Cohesion: 0.11
Nodes (19): eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, devDependencies, eslint, @eslint/js, eslint-plugin-react-hooks (+11 more)

### Community 6 - "HTML Shells & Vite Template Docs"
Cohesion: 0.19
Nodes (13): Leaflet 1.9.4 CSS via unpkg CDN (SRI-pinned), /src/main.jsx Module Entry Script, Ride Sharing Platform for Bangladesh, #root React Mount Point, SAROTHI SHEBA SPA HTML Shell, ESLint / TypeScript Type-Aware Lint Expansion, React Compiler (disabled), React + Vite Template Setup (+5 more)

### Community 7 - "Registration & Driver Approval"
Cohesion: 0.27
Nodes (11): adminApproveDriver(), adminRejectDriver(), crypto, jwt, { query }, registerAsAdmin(), registerAsDriver(), registerAsPassenger() (+3 more)

### Community 8 - "Server Startup & Socket.IO Bootstrap"
Cohesion: 0.18
Nodes (11): app, cors, express, http, io, router, { Server }, shutdown() (+3 more)

### Community 9 - "SVG Icon Sprite Sheet"
Cohesion: 0.33
Nodes (11): Icons SVG Sprite Sheet, bluesky-clip (clipPath def used by bluesky-icon), bluesky-icon (Bluesky butterfly logo glyph), Solid Brand Fill Style (#08060d), discord-icon (Discord game-controller-face logo glyph), documentation-icon (document page with code brackets, purple outline), github-icon (GitHub Octocat mark), Purple Outline Stroke Style (#aa3bff, 1.35 width, round caps) (+3 more)

### Community 10 - "SSLCommerz Payment Flow"
Cohesion: 0.27
Nodes (9): cashPayment(), getPaymentStatus(), initPayment(), paymentCancel(), paymentFail(), paymentIPN(), paymentSuccess(), { query } (+1 more)

### Community 11 - "Ride Requests & Postgres Pool"
Cohesion: 0.25
Nodes (6): getRideHistory(), { query }, { query }, requestRide(), { Pool }, testConnection()

### Community 12 - "Favicon Brand Mark"
Cohesion: 0.48
Nodes (7): Favicon SVG (Sarothi Sheba brand mark), Alpha mask clipping decorative layers to the bolt, Lightning-bolt / zigzag arrow logo silhouette, Brand palette: violet #863bff / #7e14ff, lilac #ede6ff, cyan #47bfff, Browser tab / app icon identity asset, Wide-gamut fallback: hex fill plus color(display-p3 ...) duplicate, Blurred ellipse glow layers (Gaussian-blur filters b-p)

### Community 13 - "Admin User Management"
Cohesion: 0.50
Nodes (3): deactivateUser(), getAdminUsers(), { query }

### Community 14 - "In-Ride Messaging"
Cohesion: 0.50
Nodes (3): getMessages(), { query }, sendMessage()

### Community 15 - "Root Postgres Dependency"
Cohesion: 0.50
Nodes (3): dependencies, pg, pg

## Ambiguous Edges - Review These
- `loginForm (username/password form)` → `get-btn Fetch Data Button`  [AMBIGUOUS]
  public/index.html · relation: shares_data_with
- `Lightning-bolt / zigzag arrow logo silhouette` → `Browser tab / app icon identity asset`  [AMBIGUOUS]
  frontend/public/favicon.svg · relation: semantically_similar_to
- `bluesky-icon (Bluesky butterfly logo glyph)` → `social-icon (person silhouette with star, purple outline)`  [AMBIGUOUS]
  frontend/public/icons.svg · relation: conceptually_related_to

## Knowledge Gaps
- **102 isolated node(s):** `{ query }`, `{ query }`, `{ query }`, `{ query }`, `{ query }` (+97 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `loginForm (username/password form)` and `get-btn Fetch Data Button`?**
  _Edge tagged AMBIGUOUS (relation: shares_data_with) - confidence is low._
- **What is the exact relationship between `Lightning-bolt / zigzag arrow logo silhouette` and `Browser tab / app icon identity asset`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **What is the exact relationship between `bluesky-icon (Bluesky butterfly logo glyph)` and `social-icon (person silhouette with star, purple outline)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `query()` connect `Registration & Driver Approval` to `Auth, Login & Token Blacklist`, `SSLCommerz Payment Flow`, `Ride Requests & Postgres Pool`, `Admin User Management`, `In-Ride Messaging`, `Admin Dashboard Stats`, `Admin Ride Listing`, `Available Rides Lookup`, `Driver Dashboard`, `Passenger Dashboard`, `Ride Rating`, `Ride Acceptance`, `Ride Status Updates`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `ESLint & Vite Tooling` to `Frontend NPM Dependencies`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **What connects `{ query }`, `{ query }`, `{ query }` to the rest of the system?**
  _102 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `React App Pages & Contexts` be split into smaller, more focused modules?**
  _Cohesion score 0.12755102040816327 - nodes in this community are weakly interconnected._