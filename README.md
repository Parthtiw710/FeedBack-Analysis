# FeedSense — AI-Powered Feedback Analytics Dashboard

FeedSense is a full-stack SaaS dashboard that collects, processes, and visualizes customer feedback using AI. Built with TanStack Start (SSR + server functions), PostgreSQL, and Gemini AI.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | [TanStack Start](https://tanstack.com/start) (React + Vite + Nitro) |
| Routing | TanStack Router (file-based) |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL (Supabase) |
| Auth | Google OAuth + JWT (cookie-based) |
| AI | Google Gemini |
| Queue | pgmq (PostgreSQL message queue) |
| Runtime | Bun |

---

## Getting Started

```bash
bun install
bun dev
```

App runs at `http://localhost:3000`.

---

## Environment Variables

Create a `.env` file at the root:

```env
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
DATABASE_URL=postgresql://...
GEMINI_API_KEY=your_gemini_api_key
```

---

## Project Structure

```
src/
├── components/          # Shared UI components (charts, dropdowns, tables)
├── pages/               # Page-level components (Dashboard)
├── partials/            # Layout partials (Sidebar, Header)
├── routes/              # TanStack Router file-based routes
├── server/
│   ├── authHelper.server.ts    # JWT auth via getCookie
│   ├── config/                 # DB connection pool
│   ├── functions/              # Server functions (analytics, submissions, keys, login, deleteAccount)
│   ├── services/               # Queue worker, AI processing
│   └── utils/                  # Shared server utilities
└── utils/               # Client-side utilities
```

---

## Auth Flow

- User signs in via **Google OAuth** (client-side token flow)
- Server function `loginGoogleFn` verifies the email, issues a JWT, and sets a **`token` cookie** via `setCookie` (H3/Nitro)
- Every subsequent server function call reads the cookie via `getCookie('token')` in `authHelper.server.ts`
- Unauthenticated users fall back to the **Test Client** (ID = 1) — a read-only demo environment

---

## API Keys

Each user profile has a set of API keys stored in the `profiles` table. External services use these keys (via `x-api-key` header) to submit feedback:

```bash
POST /server-submit/:formType
x-api-key: your_api_key

{ "score": 9, "comment": "Great product!" }
```

---

## Build & Deploy

```bash
# Production build
bun run build

# Start production server
bun start
```

The build output is a self-contained Bun server in `.output/`. Deploy to any Bun-compatible host or container platform.

---

## Docker Deployment

You can build and run the application in a lightweight container using the provided multi-stage `Dockerfile`:

```bash
# Build the image
docker build -t feedsense .

# Run the container
docker run -p 8080:8080 --env-file .env feedsense
```


---

## Scripts

```bash
bun dev          # Start dev server on :3000
bun run build    # Production build
bun start        # Start production server
bun run lint     # ESLint
bun run format   # Prettier + ESLint fix
bun run test     # Vitest
```
