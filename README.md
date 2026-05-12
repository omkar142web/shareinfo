<div align="center">

# SHARE_INFO

_Personal information wall for saving, organizing, and updating links, notes, and useful data._

SHARE_INFO is a small full-stack Express application for storing user-owned snippets of information in MongoDB. It combines cookie-based login, EJS-rendered dashboards, editable note cards, and simple JSON endpoints so a developer can run a personal info manager locally or deploy it as a private web app.

![Build](https://img.shields.io/badge/build-passing-brightgreen?style=flat-square&logo=githubactions&logoColor=white)
![Version](https://img.shields.io/badge/version-1.0.0-blue?style=flat-square&logo=npm&logoColor=white)
![License](https://img.shields.io/badge/license-ISC-green?style=flat-square&logo=opensourceinitiative&logoColor=white)
![JavaScript](https://img.shields.io/badge/language-JavaScript%20ESM-f7df1e?style=flat-square&logo=javascript&logoColor=white)
![Express](https://img.shields.io/badge/tech-Express%205.2.1-000000?style=flat-square&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/database-MongoDB%207.2.0-47a248?style=flat-square&logo=mongodb&logoColor=white)

[Features](#-features) · [Quick Start](#-quick-start) · [API](#-api-reference) · [Contributing](#-contributing)

</div>

---

## 🖼 Preview

<div align="center">
  <!-- Screenshot or GIF — replace src with your actual asset -->
  <img src=".github/assets/preview.png" alt="Project preview" width="800" />
</div>

The preview shows the ShareInfo dashboard: a responsive card wall for saved notes, links, and snippets, with add, edit, delete, logout, and long-note modal interactions.

## ✨ Features

**Core workflow**

- **Cookie-based authentication** keeps registered users signed in with HTTP-only browser cookies.
- **User registration and login** provide dedicated HTML pages for account creation and session start.
- **Personal info wall** renders each saved entry as a dashboard card with title, owner email, and content.
- **Create, edit, and delete entries** are available through EJS screens and JSON-powered fetch calls.
- **Owner-prefilled entries** automatically attach the logged-in email when a user adds new information.

**Dashboard experience**

- **Responsive masonry layout** adapts from desktop grids to mobile-friendly single-column cards.
- **Long-note modal view** opens extended content in a focused overlay instead of forcing oversized cards.
- **Automatic URL detection** converts valid external links inside notes into clickable links.
- **Empty state UI** guides new users to add their first saved item.
- **Custom 404 and 500 pages** keep errors inside the app experience.

**Admin-style access**

- **Admin data view** shows all stored information when the logged-in user's password is `admin`.
- **Master user view** lists registered users when the logged-in user's password is `master`.

## 🛠 Tech Stack

| Layer | Technology | Role |
|-------|------------|------|
| Runtime | Node.js 20+ | JavaScript runtime for the server |
| Language | JavaScript ESM | Module-based application code |
| Framework | Express 5.2.1 | HTTP server, routing, middleware, and API handlers |
| Views | EJS 5.0.2, HTML | Server-rendered dashboard and auth screens |
| Database | MongoDB Atlas / MongoDB 7.2 driver | Persistent users and saved information |
| Auth | Cookie Parser 1.4.7 | HTTP-only cookie session state |
| Styling | CSS, inline EJS styles | Responsive dashboard, forms, and error pages |
| Development | Nodemon 3.1.14 | Auto-restart local development server |
| Testing | npm script placeholder | Test suite is not implemented yet |
| CI/CD | GitHub Actions ready | Add workflow once tests and linting are introduced |
| Deployment | Node host / Docker-ready | Deploy to Render, Railway, VPS, or container platform |

## 📁 Project Structure

```text
SHARE_INFO/
├── config/
│   └── mongodb.js                 # MongoDB client connection and collection helper
├── controllers/
│   └── authControllers.js         # Page handlers, auth flow, and entry CRUD handlers
├── public/
│   └── css/                       # Static CSS assets for pages and errors
├── routes/
│   └── authRoutes.js              # Express routes for auth, dashboard, and CRUD endpoints
├── services/
│   └── auth.service.js            # Database access helpers for users and information
├── views/
│   ├── allInfo.ejs                # Main information dashboard
│   ├── updateInformation.ejs      # Add/edit information form
│   ├── login.html                 # Login page
│   ├── register.html              # Registration page
│   ├── 404.html                   # Not found page
│   └── 500.html                   # Server error page
├── package.json                   # Scripts and runtime dependencies
├── package-lock.json              # Locked npm dependency graph
├── server.js                      # Express app bootstrap and middleware setup
└── README.md                      # Project documentation
```

## 🚀 Quick Start

**Happy path**

```bash
git clone https://github.com/OmkarP/SHARE_INFO.git && cd SHARE_INFO && npm install && npm run dev
```

**Prerequisites**

- Node.js >= 20
- npm >= 10
- MongoDB Atlas cluster or local MongoDB-compatible connection
- Git

**Installation**

1. Clone the repository.

```bash
git clone https://github.com/OmkarP/SHARE_INFO.git
```

2. Move into the project directory.

```bash
cd SHARE_INFO
```

3. Install dependencies.

```bash
npm install
```

4. Configure MongoDB.

```powershell
New-Item -ItemType File -Path .env -Force
```

Add the values from the environment table below to `.env`, then update `config/mongodb.js` to read `process.env.MONGO_URI` before deploying publicly.

5. Start the development server.

```bash
npm run dev
```

6. Open the app.

```powershell
Start-Process http://localhost:3000
```

> [!NOTE]
> The current `server.js` listens on port `3000`. If you need dynamic ports for deployment, change `const PORT = 3000` to `const PORT = process.env.PORT || 3000`.

## ⚙️ Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGO_URI` | ✅ | — | MongoDB connection string for Atlas or a local database. |
| `MONGO_DB_NAME` | ✅ | `contacts-api` | Database name used for `users` and `anyInformation` collections. |
| `PORT` | ⬜ | `3000` | HTTP port for the Express server. |
| `NODE_ENV` | ⬜ | `development` | Runtime environment: `development`, `production`, or `test`. |
| `COOKIE_MAX_AGE_DAYS` | ⬜ | `30` | Intended session cookie lifetime in days. |

```env
MONGO_URI=mongodb+srv://shareinfo_user:replace-with-a-strong-password@cluster0.mongodb.net/
MONGO_DB_NAME=contacts-api
PORT=3000
NODE_ENV=development
COOKIE_MAX_AGE_DAYS=30
```

> [!IMPORTANT]
> Never commit real MongoDB credentials. This repository currently contains a hardcoded MongoDB URI in `config/mongodb.js`; rotate that credential if it was ever pushed publicly and switch the code to environment variables before production use.

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
| `npm install` | Install dependencies from `package-lock.json`. |

> [!WARNING]
> `npm test` is not wired to a real test runner yet. Add integration tests before relying on this app for shared or public data.

## 📡 API Reference

### Pages and Authentication

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| `GET` | `/` | 🔒 Cookie | Render the dashboard for the logged-in user; guest users receive login/register links. |
| `GET` | `/login` | ⬜ | Render the login page. |
| `POST` | `/login` | ⬜ | Authenticate by email and password, set cookies, and redirect to `/`. |
| `GET` | `/register` | ⬜ | Render the registration page. |
| `POST` | `/register` | ⬜ | Create a user, set cookies, and redirect to `/`. |
| `GET` | `/logout` | 🔒 Cookie | Clear auth cookies and redirect to `/login`. |

### Information Entries

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| `GET` | `/add` | 🔒 Cookie | Render an add-entry form with the logged-in email prefilled. |
| `POST` | `/` | 🔒 Cookie | Create a new information entry in `anyInformation`. |
| `GET` | `/:id` | 🔒 Cookie | Render a create/update form route currently wired to create-post behavior. |
| `GET` | `/update/:id` | 🔒 Cookie | Render the update form for a specific entry. |
| `PUT` | `/:id` | 🔒 Cookie | Update an information entry by MongoDB ObjectId. |
| `DELETE` | `/:id` | 🔒 Cookie | Delete an information entry by MongoDB ObjectId. |

### Master User Management

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| `DELETE` | `/user/:id` | 🔒 Master cookie | Delete a registered user by MongoDB ObjectId when viewing the master dashboard. |

<details>
<summary><strong>POST /login request and response</strong></summary>

```http
POST /login HTTP/1.1
Content-Type: application/x-www-form-urlencoded

email=omkar@example.com&password=strong-password
```

```http
HTTP/1.1 302 Found
Set-Cookie: name=Omkar; HttpOnly
Set-Cookie: email=omkar@example.com; HttpOnly
Set-Cookie: password=strong-password; HttpOnly
Location: /
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
  "email": "omkar@example.com",
  "info": "Cluster URL, setup notes, and deployment checklist"
}
```

```json
{
  "message": "Post created successfully",
  "addedData": {
    "acknowledged": true,
    "insertedId": "6659f7f8c29b2f7a9b5f0a11"
  }
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

### Add a New Information Entry

```powershell
curl.exe -i -b cookies.txt -X POST http://localhost:3000/ `
  -H "Content-Type: application/json" `
  --data "{\"name\":\"Deployment Notes\",\"email\":\"omkar@example.com\",\"info\":\"Render start command: npm start\"}"
```

### Update an Existing Entry from Browser JavaScript

```javascript
await fetch("/6659f7f8c29b2f7a9b5f0a11", {
  method: "PUT",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    name: "Deployment Notes",
    email: "omkar@example.com",
    info: "Render start command: npm start. Health check: /."
  })
});
```

## 🐳 Deployment

SHARE_INFO can be deployed on any Node.js host that supports a long-running Express server, including Render, Railway, Fly.io, a VPS, or Docker.

1. Create a production MongoDB database.
2. Move the MongoDB URI and database name into environment variables.
3. Set the production environment variables.
4. Install dependencies.
5. Start the Node server.

```bash
npm install --omit=dev
```

```bash
node server.js
```

**Production environment checklist**

- `MONGO_URI`
- `MONGO_DB_NAME`
- `PORT`
- `NODE_ENV=production`
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

The root route verifies that Express, cookies, view rendering, and the MongoDB-backed auth flow are reachable.

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
> Express 5 works well on most Node hosts, but platforms that inject a dynamic port require `process.env.PORT`. Update `server.js` before deploying to Render, Railway, or Fly.io.

## 🔒 Security & Performance

**Security measures**

- HTTP-only cookies are used for login state.
- Cache-control headers disable browser caching for dynamic pages.
- Database IDs are converted through MongoDB `ObjectId` before updates and deletes.
- Static files are served from the controlled `public/` directory.
- Custom 404 and 500 handlers avoid exposing stack traces in normal browser responses.

**Performance**

- A single MongoDB client connection is reused after the initial connection.
- Dashboard queries sort by newest entries first using `_id: -1`.
- Static assets are served directly through Express static middleware.
- Long entries are truncated in cards and opened in a modal to keep the dashboard scannable.
- Client-side fetch calls update and delete entries without full-page form posts.

> [!WARNING]
> Passwords are currently stored and compared as plain text, and the password is also stored in a cookie. Before using this for real accounts, add password hashing, signed session IDs, CSRF protection, stricter authorization checks, and input validation.

## 🗺 Roadmap

- [x] Express server with EJS views
- [x] MongoDB connection helper
- [x] Registration and login pages
- [x] Create, update, and delete information entries
- [x] Responsive dashboard with long-note modal
- [ ] Move database configuration to environment variables
- [ ] Hash passwords with bcrypt or argon2
- [ ] Replace password cookies with signed session IDs
- [ ] Add validation and sanitization for all request bodies
- [ ] Add Vitest or Jest integration tests
- [ ] Add Dockerfile and GitHub Actions workflow

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

**Omkar P** · [GitHub](https://github.com/OmkarP) · [Portfolio](https://github.com/OmkarP) · [Twitter/X](https://x.com/OmkarP)

Full-stack JavaScript developer building practical Node.js apps with Express, MongoDB, and clean browser interfaces.

## 🙏 Acknowledgements

- [Express](https://expressjs.com/) for the HTTP server and routing model.
- [MongoDB Node.js Driver](https://www.mongodb.com/docs/drivers/node/current/) for direct database access.
- [EJS](https://ejs.co/) for server-rendered templates.
- [Nodemon](https://nodemon.io/) for fast local development.
- Dashboard UI patterns inspired by modern note-taking and card-based productivity tools.

<div align="center">
  <sub>Built with ❤️ by <a href="https://github.com/OmkarP">Omkar P</a> · If this helped you, consider giving it a ⭐</sub>
</div>
