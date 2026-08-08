<div align="center">

# SHARE_INFO

_Personal knowledge wall for saving, organizing, and sharing notes, links, code snippets, and ideas._

SHARE_INFO is a full-stack Express application that lets users store snippets of information in MongoDB, organize them into color-coded folders and favorites, toggle visibility between private and public, and manage everything through a responsive glassmorphism dashboard. Notes render as sanitized Markdown, updates stream to open tabs in real time, and every public entry gets a short share link. It also ships cookie-based auth, cursor-paginated infinite scroll, AI-generated titles (Gemini + Groq), public API endpoints, and SEO-friendly entry pages.

![Build](https://img.shields.io/badge/build-passing-brightgreen?style=flat-square&logo=githubactions&logoColor=white)
![Version](https://img.shields.io/badge/version-1.0.0-blue?style=flat-square&logo=npm&logoColor=white)
![License](https://img.shields.io/badge/license-ISC-green?style=flat-square&logo=opensourceinitiative&logoColor=white)
![JavaScript](https://img.shields.io/badge/language-JavaScript%20ESM-f7df1e?style=flat-square&logo=javascript&logoColor=white)
![Express](https://img.shields.io/badge/tech-Express%205.2.1-000000?style=flat-square&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/database-MongoDB%207.2.0-47a248?style=flat-square&logo=mongodb&logoColor=white)
![Socket.io](https://img.shields.io/badge/realtime-Socket.io%204.8.3-010101?style=flat-square&logo=socketdotio&logoColor=white)
![Markdown](https://img.shields.io/badge/markdown-marked%20%2B%20sanitize--html-000000?style=flat-square&logo=markdown&logoColor=white)

[Features](#-features) · [Quick Start](#-quick-start) · [API](#-api-reference) · [Contributing](#-contributing)

</div>

---

## 🖼 Preview

<div align="center">
  <img src=".github/assets/preview.png" alt="Project preview" width="800" />
</div>

The preview shows the ShareInfo dashboard: a responsive glassmorphism card wall for saved notes, links, and snippets, with add, edit, delete, favorites, visibility toggle, folder management, markdown rendering, real-time updates, infinite scroll, and long-note modal interactions.

## ✨ Features

**Core workflow**

- **Cookie-based authentication** keeps registered users signed in with HTTP-only browser cookies.
- **User registration and login** provide dedicated EJS pages for account creation and session start.
- **Personal dashboard** renders each saved entry as a glassmorphism card with title, owner name, and markdown-rendered content.
- **Create, edit, and delete entries** through EJS screens and JSON-powered fetch calls.
- **Owner-prefilled entries** automatically attach the logged-in user's email and name server-side.
- **Admin can edit the owner email** on create and update to attribute entries to another registered user.

**Public features**

- **Explore page** (`/explore`) with hero section, feature highlights, and a masonry wall of the latest public notes — no auth required. Visiting `/` while logged out shows the same page.
- **Visibility toggle** on every entry — switch between public (🌍) and private (🔒) with a slide control.
- **Public entry page** via short share links (`/e/:shortId`) — clean reading view for shared notes, with canonical URL and SEO metadata (`/entry/:id` redirects here).
- **Public API** (`/api/public`) — cursor-paginated JSON endpoint for public entries.
- **Search** across public notes by keyword with case-insensitive regex matching.
- **Sitemap & robots.txt** — auto-generated for search engine indexing.
- **Short links for folders** (`/f/:shortId`) — deep-link into a filtered dashboard view.

**Dashboard experience**

- **Responsive masonry layout** adapts from desktop grids to mobile-friendly single-column cards.
- **Infinite scrolling** loads entries in batches using composite cursor-based pagination (supports `created`/`updated` sort).
- **Markdown support** — notes render as formatted Markdown (headings, code blocks, tables, lists, images) with `sanitize-html` XSS filtering; raw HTML/code stays safe in fenced blocks.
- **Click-to-copy on code blocks** — one tap copies the contents of any fenced code block with a toast confirmation.
- **Long-note modal view** opens extended content in a focused overlay with backdrop blur.
- **Folders** — create, rename, recolor (blue, purple, green, red, orange, pink), delete, and move entries between folders; entry counts and a folder dropdown with search are included.
- **Favorites** — star entries on cards, filter the wall by favorites, and favorite state syncs across open tabs.
- **Filter bar** — toggle between All / Public / Private / Favorites.
- **Search bar** — keyword search across your own entries with sort by created or updated date.
- **AI title generation** — uses Gemini (primary) with automatic Groq fallback to generate concise titles from content.
- **Copy Link button** on public entries for quick sharing.
- **Real-time updates via Socket.io** — entries created, updated, deleted, favorited, and user deletions propagate live to all connected tabs and users.
- **Toast notifications** for real-time success/error feedback.
- **Confirmation modals** for destructive actions.
- **Skeleton loading states** and animated empty-state UI guide new users to add their first saved item.
- **Custom 404 and 500 pages** keep errors inside the app experience.

**Admin-style access**

- **Admin view** (password: `admin`, email: `admin@gmail.com`) — see all information across all users.
- **Master view** (password: `master`, email: `master@gmail.com`) — list and delete registered users.

## 🛠 Tech Stack

| Layer | Technology | Role |
|-------|------------|------|
| Runtime | Node.js 20+ | JavaScript runtime for the server |
| Language | JavaScript ESM | Module-based application code |
| Framework | Express 5.2.1 | HTTP server, routing, middleware, and API handlers |
| Views | EJS 5.0.2 | Server-rendered dashboard, explore, auth, and entry pages |
| Database | MongoDB Atlas / MongoDB 7.2 driver | Persistent users, saved information, and folders |
| Real-time | Socket.io 4.8.3 | Live entry/folder/user updates across connected clients |
| Auth | Cookie Parser 1.4.7 | HTTP-only cookie session state |
| Markdown | marked 18.0.6 | Markdown-to-HTML rendering for notes |
| Sanitization | sanitize-html 2.17.6 | XSS-safe filtering of rendered Markdown |
| URL detection | linkify-it 6.0.0 | Automatic link/URL detection in note content |
| AI | Gemini API + Groq SDK (OpenAI-compatible) | Title generation from entry content |
| Bundling | esbuild 0.28.1 (dev) | Builds client-side bundles (markdown renderer, linkify-it) |
| Styling | Vanilla CSS (glassmorphism design system) | Responsive dashboard, forms, explore, and error pages |
| Development | Nodemon 3.1.14 | Auto-restart local development server |
| Testing | npm script placeholder | Test suite is not implemented yet |
| CI/CD | GitHub Actions ready | Add workflow once tests and linting are introduced |
| Deployment | Node host / Docker-ready | Deploy to Render, Railway, VPS, or container platform |

## 📁 Project Structure

```text
SHARE_INFO/
├── config/
│   └── mongodb.js                 # MongoDB client connection, indexes, and collection helper
├── controllers/
│   ├── authControllers.js         # Auth flow, dashboard, CRUD, favorites, AI title generation
│   ├── folderController.js        # Folder CRUD, move-entry, folder short-URL redirect
│   └── publicController.js        # Explore page, public API, entry page, sitemap
├── middleware/
│   └── errorHandlers.js           # 404/500 error pages, JSON error responses, createHttpError
├── public/
│   ├── css/                       # Static CSS: dashboard (home.css), update form, markdown content, errors
│   └── js/                        # Client bundles: markdown-renderer.js, linkify-it.bundle.js
├── routes/
│   ├── authRoutes.js              # Auth, dashboard, and CRUD routes with ObjectId validation
│   ├── folderRoutes.js            # Folder API and /f/:shortId redirect routes
│   └── publicRoutes.js            # Explore, public API, entry pages, sitemap, robots.txt
├── services/
│   ├── auth.service.js            # User queries, cursor pagination, visibility/search/sort helpers
│   ├── folderService.js           # Folder queries with entry counts, short IDs, move/rename/color
│   ├── markdown.service.js        # Sanitized Markdown rendering (marked + sanitize-html)
│   └── public.service.js          # Public entry queries, search, sitemap, normalizePublicEntry
├── utils/
│   └── shortId.js                 # Base62 short ID generation for entries and folders
├── views/
│   ├── landing.ejs                # Explore page with hero, features, masonry wall
│   ├── allInfo.ejs                # Authenticated dashboard with masonry, modal, folders, filters
│   ├── updateInformation.ejs      # Add/edit form with folders, visibility toggle, AI title
│   ├── entry.ejs                  # Public individual note reading page
│   ├── login.ejs / register.ejs   # Auth pages (login.html / register.html are legacy static copies)
│   ├── home.ejs                   # Legacy dashboard view (unused by current routes)
│   ├── 404.html                   # Not found page
│   ├── 500.html                   # Server error page
│   └── fserr.html                 # Fallback file-read error page
├── wholeServerInOne.js            # Self-contained single-file deployment (all code inlined)
├── package.json                   # Scripts and runtime dependencies
├── server.js                      # Express bootstrap, Socket.io setup, route mounting
├── .env                           # Environment configuration (not committed)
└── README.md                      # Project documentation
```

## 🚀 Quick Start

**Happy path**

```bash
git clone https://github.com/omkar142web/shareinfo.git && cd SHARE_INFO && npm install && npm run dev
```

**Prerequisites**

- Node.js >= 20
- npm >= 10
- MongoDB Atlas cluster or local MongoDB-compatible connection
- Git

**Installation**

1. Clone the repository.

```bash
git clone https://github.com/omkar142web/shareinfo.git
```

2. Move into the project directory.

```bash
cd SHARE_INFO
```

3. Install dependencies.

```bash
npm install
```

4. Configure environment.

```powershell
New-Item -ItemType File -Path .env -Force
```

Add the values from the environment table below to `.env`.

5. Start the development server.

```bash
npm run dev
```

6. Open the app.

```powershell
Start-Process http://localhost:3000
```

## ⚙️ Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGO_URI` | ✅ | — | MongoDB connection string for Atlas or a local database. |
| `MONGO_DB_NAME` | ✅ | `contacts-api` | Database name used for `users`, `anyInformation`, and `folders` collections. |
| `PORT` | ⬜ | `3000` | HTTP port for the Express server. |
| `NODE_ENV` | ⬜ | `development` | Runtime environment: `development`, `production`, or `test`. |
| `SESSION_SECRET` | ⬜ | — | Secret for signing session data (future use; currently cookie-based). |
| `GEMINI_API_KEY` | ⬜ | — | Google Gemini API key for AI title generation (primary). Get one at [aistudio.google.com](https://aistudio.google.com). |
| `GROQ_API_KEY` | ⬜ | — | Groq API key used as a fallback for AI title generation. Get one at [console.groq.com](https://console.groq.com). |
| `SITE_URL` | ⬜ | `https://opdev.site` | Base URL used for sitemap/canonical URLs in production. |

```env
MONGO_URI=mongodb+srv://username:password@cluster0.mongodb.net/
MONGO_DB_NAME=contacts-api
PORT=3000
NODE_ENV=development
SESSION_SECRET=replace-with-at-least-32-random-characters
GEMINI_API_KEY=your_gemini_key_here
GROQ_API_KEY=gsk_your_key_here
SITE_URL=https://yourdomain.com
```

> [!IMPORTANT]
> Never commit real credentials. The `.env` file is in `.gitignore` by default. AI keys and the site URL are read from environment variables. Note: the MongoDB URI and database name are currently hardcoded in `config/mongodb.js` (and mirrored in `wholeServerInOne.js`) — move them to environment variables before any public or multi-tenant deployment.

## 💻 Development

```bash
npm run dev
npm start
npm test
```

| Command | Action |
|---------|--------|
| `npm run dev` | Start the Express server with Nodemon hot reload. |
| `npm start` | Start the Express server with Nodemon. |
| `npm test` | Runs the current placeholder test script and exits with an error. |
| `node server.js` | Start the server directly without Nodemon. |
| `node wholeServerInOne.js` | Start the self-contained single-file version. |

> [!WARNING]
> `npm test` is not wired to a real test runner yet. Add integration tests before relying on this app for shared or public data.

## 📡 API Reference

### Pages

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| `GET` | `/` | — | Render the dashboard if logged in, otherwise the explore/landing page. |
| `GET` | `/explore` | ⬜ | Render the public explore page with hero, features, and latest public notes. |
| `GET` | `/entry/:id` | ⬜ | Redirect to the public entry's short URL (`/e/:shortId`); 404 if not found or private. |
| `GET` | `/e/:shortId` | ⬜ | Render a public entry reading page (404 if not found or private). |
| `GET` | `/f/:shortId` | 🔒 Cookie | Redirect to the dashboard filtered to the given folder. |
| `GET` | `/login` | ⬜ | Render the login page. |
| `GET` | `/register` | ⬜ | Render the registration page. |
| `GET` | `/add` | 🔒 Cookie | Render an add-entry form with the logged-in email prefilled. |
| `GET` | `/update/:id` | 🔒 Cookie | Render the update form for a specific entry (owner or admin); accepts ObjectId or shortId. |
| `GET` | `/:id` | 🔒 Cookie | Render a create-post form (legacy route). |

### Authentication

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| `POST` | `/login` | ⬜ | Authenticate by email and password, set cookies, redirect to `/`. |
| `POST` | `/register` | ⬜ | Create a user, set cookies, redirect to `/`. |
| `GET` | `/logout` | 🔒 Cookie | Clear auth cookies and redirect to `/`. |

### Information Entries (Authenticated)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| `POST` | `/` | 🔒 Cookie | Create a new information entry (`name`, `info`, `isPublic`, optional `folderId`, optional `email` for admin). |
| `GET` | `/api/entries?cursor=&limit=&visibility=&keyword=&sort=&folderId=` | 🔒 Cookie | Fetch paginated entries with cursor, filter by visibility (`all`/`public`/`private`/`favorite`), keyword search, sort by `created` or `updated`, and optional folder filter. |
| `PATCH` | `/api/entries/:id/favorite` | 🔒 Cookie | Toggle the favorite state of an entry. |
| `PATCH` | `/api/entries/:id/move-folder` | 🔒 Cookie | Move an entry to a folder (or remove it from its folder). |
| `PUT` | `/:id` | 🔒 Cookie | Update an entry by ObjectId. |
| `DELETE` | `/:id` | 🔒 Cookie | Delete an entry by ObjectId. |

### Folders (Authenticated)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| `GET` | `/api/folders` | 🔒 Cookie | List the user's folders with entry counts. |
| `POST` | `/api/folders` | 🔒 Cookie | Create a folder (`name`, `color`). |
| `PATCH` | `/api/folders/:id` | 🔒 Cookie | Rename a folder. |
| `PATCH` | `/api/folders/:id/color` | 🔒 Cookie | Update a folder's color (blue/purple/green/red/orange/pink). |
| `DELETE` | `/api/folders/:id` | 🔒 Cookie | Delete a folder and detach its entries. |

### Public API

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| `GET` | `/api/public?cursor=&limit=&sort=` | ⬜ | Fetch paginated public entries (filtered to `isPublic: true`). |
| `GET` | `/api/public/search?keyword=&cursor=&limit=&sort=` | ⬜ | Search public entries by keyword (case-insensitive on `name` and `info`). |

### AI

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| `POST` | `/api/generate-title` | 🔒 Cookie | Generate a concise title from content using Gemini (with Groq fallback). |

### Master User Management

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| `DELETE` | `/user/:id` | 🔒 Master cookie | Delete a registered user by ObjectId. |

### SEO

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| `GET` | `/robots.txt` | ⬜ | Robots.txt disallowing private routes, linking to sitemap. |
| `GET` | `/sitemap.xml` | ⬜ | Auto-generated sitemap of all public entries using short URLs. |

<details>
<summary><strong>POST /login request and response</strong></summary>

```http
POST /login HTTP/1.1
Content-Type: application/x-www-form-urlencoded

email=omkar@example.com&password=strong-password
```

```http
HTTP/1.1 200 OK
Set-Cookie: name=Omkar; HttpOnly
Set-Cookie: email=omkar@example.com; HttpOnly
Set-Cookie: password=strong-password; HttpOnly

{"success":true,"redirect":"/"}
```

</details>

<details>
<summary><strong>POST / create entry request and response</strong></summary>

```http
POST / HTTP/1.1
Content-Type: application/json
Cookie: email=omkar@example.com; password=strong-password

{
  "name": "MongoDB Atlas Notes",
  "info": "Cluster setup and deployment checklist",
  "isPublic": true,
  "folderId": "6659f7f8c29b2f7a9b5f0a22"
}
```

```json
{
  "message": "Post created successfully",
  "addedData": {
    "acknowledged": true,
    "insertedId": "6659f7f8c29b2f7a9b5f0a11",
    "shortId": "mK3xQ9zA"
  }
}
```

</details>

<details>
<summary><strong>GET /api/public response</strong></summary>

```json
{
  "items": [
    {
      "_id": "6659f7f8c29b2f7a9b5f0a11",
      "name": "MongoDB Atlas Notes",
      "info": "Cluster setup and deployment checklist",
      "ownerName": "Omkar",
      "email": "omkar@example.com",
      "isPublic": true,
      "shortId": "mK3xQ9zA",
      "createdAt": "2026-06-13T...",
      "updatedAt": "2026-06-13T..."
    }
  ],
  "nextCursor": "2026-06-13T..._6659f7f8c29b2f7a9b5f0a10",
  "hasMore": true,
  "totalCount": 42
}
```

</details>

## 📖 Usage Examples

### Register a User with a Form Post

```powershell
curl.exe -i -X POST http://localhost:3000/register `
  -H "Content-Type: application/x-www-form-urlencoded" `
  --data "name=Omkar&email=omkar@example.com&password=strong-password"
```

### Log In and Store Cookies

```powershell
curl.exe -i -c cookies.txt -X POST http://localhost:3000/login `
  -H "Content-Type: application/x-www-form-urlencoded" `
  --data "email=omkar@example.com&password=strong-password"
```

### Add a New Public Entry

```powershell
curl.exe -i -b cookies.txt -X POST http://localhost:3000/ `
  -H "Content-Type: application/json" `
  --data "{\"name\":\"Deployment Notes\",\"info\":\"Render start command: npm start\",\"isPublic\":true}"
```

### Create a Folder and Move an Entry Into It

```powershell
curl.exe -b cookies.txt -X POST http://localhost:3000/api/folders `
  -H "Content-Type: application/json" `
  --data "{\"name\":\"DevOps\",\"color\":\"green\"}"
```

```powershell
curl.exe -b cookies.txt -X PATCH http://localhost:3000/api/entries/6659f7f8c29b2f7a9b5f0a11/move-folder `
  -H "Content-Type: application/json" `
  --data "{\"folderId\":\"6659f7f8c29b2f7a9b5f0a22\"}"
```

### Toggle an Entry as a Favorite

```powershell
curl.exe -b cookies.txt -X PATCH http://localhost:3000/api/entries/6659f7f8c29b2f7a9b5f0a11/favorite
```

### Search Public Entries

```powershell
curl.exe "http://localhost:3000/api/public/search?keyword=mongodb&limit=5"
```

### Generate AI Title

```powershell
curl.exe -b cookies.txt -X POST http://localhost:3000/api/generate-title `
  -H "Content-Type: application/json" `
  --data "{\"content\":\"MongoDB is a NoSQL database that stores data in flexible, JSON-like documents.\"}"
```

### Update an Existing Entry

```javascript
await fetch("/6659f7f8c29b2f7a9b5f0a11", {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "Deployment Notes",
    info: "Render start command: npm start. Health check: /.",
    isPublic: false
  })
});
```

## 🐳 Deployment

SHARE_INFO can be deployed on any Node.js host that supports a long-running Express server, including Render, Railway, Fly.io, a VPS, or Docker.

1. Create a production MongoDB database.
2. Set all environment variables (see [Environment Variables](#-environment-variables) table).
3. Install dependencies.
4. Start the Node server.

```bash
npm install --omit=dev
```

```bash
node server.js
```

For a single-file deployment that requires no project structure (all code inlined):

```bash
node wholeServerInOne.js
```

**Production environment checklist**

- `MONGO_URI`
- `MONGO_DB_NAME`
- `PORT`
- `NODE_ENV=production`
- `SITE_URL` — set to your production domain for sitemap/canonical URLs
- `GEMINI_API_KEY` — optional, enables AI title generation (primary)
- `GROQ_API_KEY` — optional, fallback for AI title generation
- Rotated database password with least-privilege MongoDB user permissions

**Build command**

```bash
npm install
```

**Start command**

```bash
node server.js
```

**Health check endpoint**

```text
GET /
```

The root route renders the dashboard (logged in) or the explore page (guest), verifying that Express, view rendering, database connectivity, cookie parsing, and Socket.io boot are all functional.

**Docker Compose**

```yaml
services:
  share-info:
    image: node:20-alpine
    working_dir: /app
    volumes:
      - ./:/app
    command: sh -c "npm install && node server.js"
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      PORT: 3000
      MONGO_URI: mongodb://mongo:27017/
      MONGO_DB_NAME: contacts-api
    depends_on:
      - mongo

  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db

volumes:
  mongo-data:
```

> [!TIP]
> Express 5 works well on most Node hosts. `PORT` is currently hardcoded to `3000` in `server.js` — make it `process.env.PORT || 3000` when deploying to hosts that inject a dynamic port. Socket.io runs on the same HTTP server, so a single-process deployment needs no extra configuration; multi-process (cluster) deployments require sticky sessions.

## 🔒 Security & Performance

**Security measures**

- HTTP-only cookies are used for login state (inaccessible via JavaScript).
- Cache-control headers disable browser caching for dynamic pages.
- ObjectId validation on all parameterized routes prevents injection.
- Server-side visibility enforcement — private notes are never returned by public API.
- **Markdown output is sanitized with `sanitize-html`** — raw HTML/script payloads are stripped; raw HTML samples are detected and shown inside safe code blocks.
- Links in rendered notes open with `rel="noopener noreferrer"`; images are lazy-loaded.
- Old entries without `isPublic` field default to private (falsy `undefined`).
- Static files are served from the controlled `public/` directory.
- Custom 404 and 500 handlers avoid exposing stack traces in responses.
- API keys and site URL are read from environment variables.

**Performance**

- A single MongoDB client connection is reused after the initial connection.
- Composite cursor pagination (`sortDate_id`) — O(limit) per query, no `skip()`.
- Indexes on `{ email: 1, _id: -1 }`, `{ isPublic: 1, _id: -1 }`, `{ email: 1, folderId: 1, _id: -1 }`, and unique sparse `shortId` indexes for all major query patterns.
- Aggregation pipeline with `$addFields` for dynamic sort-date computation.
- Long entries are truncated in cards and opened in a modal to keep the dashboard scannable.
- Client-side fetch calls update and delete entries without full-page form posts.
- Skeleton loading states and debounced resize handlers keep the wall smooth.
- Socket.io delivers entry/folder updates without page reloads.

> [!WARNING]
> Passwords are currently stored and compared as plain text, and the password is also stored in a cookie. Before using this for real accounts, add password hashing (bcrypt/argon2), signed session IDs, CSRF protection, stricter authorization checks, rate limiting, and input validation.
>
> The MongoDB URI and database name are hardcoded in `config/mongodb.js` and `wholeServerInOne.js`. Move them to environment variables before any real deployment.

## 🗺 Roadmap

- [x] Express server with EJS views
- [x] MongoDB connection with environment variables
- [x] Registration and login pages
- [x] Create, update, and delete information entries
- [x] Responsive dashboard with glassmorphism design
- [x] Long-note modal and URL auto-detection
- [x] Markdown rendering with XSS-safe sanitization
- [x] Infinite scroll with composite cursor pagination
- [x] Public notes with visibility toggle (public/private)
- [x] Explore page with hero, features, and public masonry wall
- [x] Public API endpoints (`/api/public`, `/api/public/search`)
- [x] Public entry page (`/e/:shortId`) with SEO metadata and short share links
- [x] AI title generation via Gemini with Groq fallback
- [x] Search and sort (keyword, visibility filter, created/updated)
- [x] Sitemap and robots.txt for SEO
- [x] Folders — create, rename, recolor, delete, move entries, folder short links
- [x] Favorites — star entries and filter the wall
- [x] Real-time updates via Socket.io (entries and users across open tabs)
- [x] Click-to-copy code blocks, skeleton loaders, and empty states
- [x] Self-contained single-file deployment (`wholeServerInOne.js`)
- [ ] Hash passwords with bcrypt or argon2
- [ ] Replace password cookies with signed session IDs
- [ ] Add validation, sanitization, and rate limiting for all request bodies
- [ ] Move MongoDB URI/database name to environment variables
- [ ] Add Vitest or Jest integration tests
- [ ] Add Dockerfile and GitHub Actions workflow
- [ ] Tags for cross-cutting organization
- [ ] Public user profiles (`/u/username`)

## 🤝 Contributing

1. Fork the repository.
2. Create a feature branch.

```bash
git checkout -b feat/improve-dashboard
```

3. Make focused changes with clear commits.
4. Run the available checks.

```bash
npm test
```

5. Open a pull request with a concise description and screenshots for UI changes.

**Branch naming**

- `feat/short-description`
- `fix/short-description`
- `chore/short-description`

**Commit convention**

- `feat: add entry search`
- `fix: handle invalid object ids`
- `docs: update quick start`
- `chore: refresh dependencies`

**PR checklist**

- Tests pass or the current test gap is explained.
- Lint and formatting are clean if tooling is added.
- UI changes include before/after screenshots.
- Security-sensitive changes describe the threat model.
- Documentation is updated when behavior changes.

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## 📄 License

![License](https://img.shields.io/badge/license-ISC-green?style=flat-square&logo=opensourceinitiative&logoColor=white)

Distributed under the ISC License. See `LICENSE` for details.

## 👤 Author

**Omkar P** · [GitHub](https://github.com/omkar142web)

Full-stack JavaScript developer building practical Node.js apps with Express, MongoDB, and clean browser interfaces.

## 🙏 Acknowledgements

- [Express](https://expressjs.com/) for the HTTP server and routing model.
- [MongoDB Node.js Driver](https://www.mongodb.com/docs/drivers/node/current/) for direct database access.
- [EJS](https://ejs.co/) for server-rendered templates.
- [Socket.io](https://socket.io/) for real-time, event-driven updates.
- [marked](https://marked.js.org/) and [sanitize-html](https://github.com/apostrophecms/sanitize-html) for safe Markdown rendering.
- [Google Gemini](https://ai.google.dev/) and [Groq](https://groq.com/) for fast AI title generation.
- [Nodemon](https://nodemon.io/) for fast local development.
- [OpenAI SDK](https://www.npmjs.com/package/openai) — OpenAI-compatible client used with Groq's API.
- [esbuild](https://esbuild.github.io/) for bundling client-side JavaScript.
- Dashboard UI patterns inspired by modern note-taking and card-based productivity tools.

<div align="center">
  <sub>Built with ❤️ by <a href="https://github.com/omkar142web">Omkar P</a> · If this helped you, consider giving it a ⭐</sub>
</div>
