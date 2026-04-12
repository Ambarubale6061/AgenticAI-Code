<div align="center">

<br />

<img src="frontend/src/assets/ai.png" alt="AgenticAI Studio" width="72" />

<h1>AgenticAI Studio</h1>

<p>A browser-based IDE where you describe what to build and a multi-agent AI pipeline plans, codes, executes, and debugs it — automatically.</p>

<br />

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-8-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![Supabase](https://img.shields.io/badge/Supabase-Auth-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![Groq](https://img.shields.io/badge/Groq-LLaMA%203.3%2070B-F55036?style=flat-square)](https://groq.com)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](./LICENSE)

<br />

</div>

---

## Overview

AgenticAI Studio is a full-stack agentic coding assistant built around a VS Code–style interface. You type a plain-English prompt and three specialised AI agents take over — a **Planner** that structures the work, a **Coder** that writes multi-file output, and a **Debugger** that iteratively fixes execution errors without any manual input.

Everything runs in one place: Monaco editor, live preview iframe, console output, file explorer, version snapshots, and an AI chat panel — all in the browser.

---

## 🖼️ Preview

### 🔥 Hero Section

![Hero](frontend\src\assets\ho.png)

### 💻 IDE Workspace

![IDE](frontend/src/assets/IDE.png)

---

## 🌐 Live Demo

> 🔗 [https://agentic-ai-studio-chi.vercel.app/](https://agentic-ai-studio-chi.vercel.app/)

---

## How the Agent Pipeline Works

```
  User Prompt
       │
       ▼
  ┌─────────────────────────────────────────────────────────┐
  │  ①  PLANNER                                             │
  │     Reads the prompt, picks the project type and        │
  │     language, returns a structured step-by-step plan.   │
  └──────────────────────────┬──────────────────────────────┘
                             │
                             ▼
  ┌─────────────────────────────────────────────────────────┐
  │  ②  CODER                                               │
  │     Streams a complete, multi-file codebase from        │
  │     the plan via Server-Sent Events.                    │
  └──────────────────────────┬──────────────────────────────┘
                             │
                             ▼
  ┌─────────────────────────────────────────────────────────┐
  │  ③  EXECUTOR                                            │
  │     Web languages → sandboxed iframe in the browser.   │
  │     Backend languages → remote execution via Express.  │
  └────────┬───────────────────────────────────────────────-┘
           │
           ├──  ✅  Exit code 0 → Pipeline complete
           │
           └──  ❌  Error detected → auto-retry (max 3×)
                          │
                          ▼
                    ④  DEBUGGER
                       Injects agent memory of past fixes,
                       diagnoses the root cause, streams
                       corrected files, then re-executes.
```

| Agent    | Model                     | Streaming | Route                      |
| -------- | ------------------------- | --------- | -------------------------- |
| Planner  | `llama-3.3-70b-versatile` | No        | `POST /api/agent/planner`  |
| Coder    | `llama-3.3-70b-versatile` | Yes (SSE) | `POST /api/agent/coder`    |
| Debugger | `llama-3.3-70b-versatile` | Yes (SSE) | `POST /api/agent/debugger` |
| Executor | `llama-3.1-8b-instant`    | No        | `POST /api/agent/execute`  |

---

## Frontend

Built with **React 18 + TypeScript** and bundled by **Vite (SWC)**. The UI is modelled closely on VS Code with resizable panels, a full activity bar, and a status bar.

### Interface Layout

```
┌─ Activity Bar ─┬─── Sidebar ────┬──────── Editor + Preview ────────┬─── Chat ───┐
│                │                │                                   │            │
│  Explorer      │  File Tree     │  Monaco Editor   │  Live Preview  │  AI Chat   │
│  Search        │  Search        │                  │  (iframe)      │  Panel     │
│  Git           │  Versions      ├──────────────────┴────────────────│            │
│  Run           │                │  Console / Terminal                │            │
│  Extensions    │                │                                   │            │
└────────────────┴────────────────┴───────────────────────────────────┴────────────┘
```

### 🚀 Key Components

| Component            | Role                      | Description                                                                                          |
| -------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Workspace.tsx**    | 🧠 Main IDE Shell         | VS Code–style full IDE layout with menus, panels, shortcuts, and responsive workspace management.    |
| **ChatPanel.tsx**    | 💬 AI Communication Layer | AI chat interface with Markdown support, streaming responses, and agent-based color-coded messaging. |
| **CodePanel.tsx**    | 🧑‍💻 Code Editor Engine     | Monaco-based code editor with multi-file tabs, syntax highlighting, and run/download features.       |
| **PreviewPanel.tsx** | 🌐 Live Output Renderer   | Real-time iframe preview that renders executed HTML, CSS, JS, and React output instantly.            |
| **ConsolePanel.tsx** | 📟 Execution Logger       | Displays structured runtime logs with timestamps, filtering, and multi-level output tracking.        |
| **PlanHeader.tsx**   | 📊 AI Workflow Tracker    | Visual progress tracker showing AI execution steps from pending to completion or error state.        |
| **VersionPanel.tsx** | 🕓 Snapshot Manager       | Manages project versions using localStorage with save, restore, and delete snapshot features.        |
| **AgentStatus.tsx**  | 🔵 AI State Indicator     | Shows real-time AI pipeline status such as idle, planning, coding, debugging, or complete.           |

### 🧠 Core Hooks

| Hook                    | Role                        | Description                                                                                                                                                                                           |
| ----------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **useAgentPipeline.ts** | 🧩 AI Orchestrator Engine   | Central brain of system. Manages full agent pipeline flow (Planner → Coder → Debugger → Executor). Handles file state, console logs, execution flow, retry logic, and UI persistence in localStorage. |
| **useProjects.ts**      | 📦 Project Management Layer | Handles project CRUD operations using React Query. Integrates Supabase JWT authentication, API calls, caching, and automatic session handling with 401 redirect support.                              |
| **useAuth.tsx**         | 🔐 Authentication Layer     | Wrapper around Supabase Auth. Manages user session, login/logout state, and persistent authentication context across application.                                                                     |
| functionality.          |

### Libraries

| Purpose            | Library                              |
| ------------------ | ------------------------------------ |
| UI components      | shadcn/ui (50+ Radix UI primitives)  |
| Styling            | Tailwind CSS + `tailwindcss-animate` |
| Code editor        | `@monaco-editor/react`               |
| Resizable panels   | `react-resizable-panels`             |
| Server state       | TanStack React Query v5              |
| Routing            | React Router v6                      |
| Markdown rendering | `react-markdown`                     |
| Notifications      | Sonner                               |
| Date formatting    | `date-fns`                           |
| Animation          | Framer Motion                        |
| Auth client        | `@supabase/supabase-js`              |

### Code Execution — Browser Sandbox

Web-language files never leave the browser. `browserExecutor.ts` writes a purpose-built HTML document into a hidden `<iframe sandbox="allow-scripts">` and captures output through a `postMessage` bridge.

- **React / JSX / TSX** — Babel Standalone + React 18 UMD loaded from unpkg. Multi-file projects are concatenated and compiled in a single Babel pass. The `App` component is auto-mounted to `#root`.
- **TypeScript** — Babel Standalone with the TypeScript preset; output rendered in a console-style view.
- **JavaScript** — Injected directly into a sandboxed script tag.
- **HTML** — Sanitised to strip local `src=` and module imports, then injected with the console bridge.
- **CSS** — Rendered against a sample DOM (heading, paragraph, button, card) so styles are immediately visible.

Backend languages (Python, Node.js, Go, Rust, Java, Ruby, C, C++, Bash, etc.) are detected by file extension and content patterns then routed to `POST /api/agent/execute` on the Express server.

### Agent Memory

`agentMemory.ts` stores error/fix pairs in `localStorage` (up to 50 entries). Before each debug attempt, the debugger searches for past fixes with a matching error pattern and language, then injects the results into the system prompt — helping the model avoid previously failed approaches.

---

## Backend

A **Node.js (ESM) + Express 4** REST API. All routes require a valid Supabase JWT in the `Authorization` header, verified on every request by `authMiddleware.js`.

### Server Entry — `server.js`

Loads and validates environment variables before importing anything else. Exits immediately with a clear error if any required variable is missing. Connects to MongoDB, mounts routers, and attaches the global error handler.

### Routes

| Method   | Path                         | Description                                     |
| -------- | ---------------------------- | ----------------------------------------------- |
| `POST`   | `/api/agent/planner`         | Returns a structured plan as JSON               |
| `POST`   | `/api/agent/coder`           | Streams generated files via SSE                 |
| `POST`   | `/api/agent/debugger`        | Streams corrected files via SSE                 |
| `POST`   | `/api/agent/execute`         | Simulates code execution, returns stdout/stderr |
| `GET`    | `/api/projects`              | List all projects for the authenticated user    |
| `POST`   | `/api/projects`              | Create a new project                            |
| `GET`    | `/api/projects/:id`          | Fetch a single project                          |
| `PUT`    | `/api/projects/:id`          | Update project title, description, code, plan   |
| `DELETE` | `/api/projects/:id`          | Delete a project                                |
| `GET`    | `/api/projects/:id/messages` | Fetch chat history for a project                |
| `POST`   | `/api/projects/messages`     | Save a new chat message                         |

### Agent Controller — `agentController.js`

Defines system prompts for all four agents and calls the Groq API directly via `node-fetch`. Each prompt enforces a strict JSON output schema. A `repairJson` helper strips markdown fences, fixes trailing commas, quotes unquoted keys, and escapes bare newlines before parsing — handling the most common LLM formatting issues.

- **Planner** — Non-streaming. Returns `{ projectType, steps[], language, summary }`.
- **Coder** — Streaming. Pipes the Groq SSE response directly to the Express response stream via `groqService.js`.
- **Debugger** — Streaming. Same pipe pattern. Accepts the current files, the error output, and a retry count.
- **Executor** — Non-streaming. Uses the faster `llama-3.1-8b-instant` model to simulate execution and return `{ stdout, stderr, exitCode, executionTime }`.

### Groq Service — `groqService.js`

Sets SSE headers (`Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`) and pipes the Node.js readable stream from the Groq API directly to the Express response — zero buffering, zero latency overhead.

### Database Models

| Model         | Key Fields                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| `Project`     | `userId`, `title`, `description`, `language`, `status`, `plan[]`, `generatedCode[]`, `consoleOutput[]` |
| `Message`     | `projectId`, `role`, `agent`, `content`, `createdAt`                                                   |
| `User`        | `supabaseId`, `email`, `fullName`                                                                      |
| `AgentMemory` | `userId`, `errorPattern`, `fix`, `language`, `confidence`                                              |
| `Version`     | `projectId`, `label`, `files[]`, `createdAt`                                                           |

### Auth — `authMiddleware.js`

Verifies the Bearer JWT from Supabase on every protected route. Uses `jwks-rsa` to fetch Supabase's public keys and `jsonwebtoken` to validate the signature and expiry. Attaches the decoded user to `req.user`.

---

## Project Structure

```
agenticai-studio/
│
├── backend/
│   ├── config/
│   │   ├── db.js                    # MongoDB connection via Mongoose
│   │   └── env.js                   # Env validation + named exports
│   ├── controllers/
│   │   ├── agentController.js       # All four agent endpoints
│   │   ├── projectController.js     # Project CRUD
│   │   └── versionController.js     # Version history
│   ├── middleware/
│   │   ├── authMiddleware.js        # Supabase JWT verification
│   │   └── errorMiddleware.js       # Global error handler
│   ├── models/
│   │   ├── AgentMemory.js
│   │   ├── Message.js
│   │   ├── Project.js
│   │   ├── User.js
│   │   └── Version.js
│   ├── routes/
│   │   ├── agentRoutes.js
│   │   ├── projectRoutes.js
│   │   └── versionRoutes.js
│   ├── services/
│   │   └── groqService.js           # SSE stream pipe to Express response
│   ├── utils/
│   │   └── jwt.js
│   └── server.js                    # Entry point
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── ui/                  # 50+ shadcn/ui primitives
    │   │   └── workspace/
    │   │       ├── AgentStatus.tsx
    │   │       ├── ChatPanel.tsx
    │   │       ├── CodePanel.tsx
    │   │       ├── ConsolePanel.tsx
    │   │       ├── FileManager.tsx
    │   │       ├── PanelHeader.tsx
    │   │       ├── PlanHeader.tsx
    │   │       ├── PlanPanel.tsx
    │   │       ├── PreviewPanel.tsx
    │   │       └── VersionPanel.tsx
    │   ├── hooks/
    │   │   ├── useAgentPipeline.ts  # Core pipeline orchestrator
    │   │   ├── useAuth.tsx
    │   │   └── useProjects.ts       # React Query CRUD + messages
    │   ├── lib/
    │   │   ├── agentMemory.ts       # Error/fix memory (localStorage)
    │   │   ├── agentStream.ts       # SSE client + JSON extraction
    │   │   ├── browserExecutor.ts   # iframe sandbox execution
    │   │   ├── supabaseStorage.ts
    │   │   ├── utils.ts
    │   │   └── versionControl.ts    # Snapshot persistence
    │   └── pages/
    │       ├── Dashboard.tsx        # Project list + profile card
    │       ├── Index.tsx            # Landing page
    │       ├── Login.tsx
    │       ├── Signup.tsx
    │       └── Workspace.tsx        # Full IDE
    └── supabase/
        └── migrations/              # Database schema
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB — local or [MongoDB Atlas](https://www.mongodb.com/atlas)
- [Groq API key](https://console.groq.com) (free tier available)
- [Supabase project](https://supabase.com) (used for auth only — free tier available)

### Environment Variables

**`backend/.env`**

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/agenticai
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
SUPABASE_URL=https://<your-project-ref>.supabase.co
```

**`frontend/.env`**

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Install & Run

```bash
# Backend
cd backend
npm install
npm run dev          # nodemon — http://localhost:5000

# Frontend
cd frontend
npm install
npm run dev          # Vite — http://localhost:8080
```

### Supabase Auth Setup

1. Create a Supabase project and copy the URL and anon key into `frontend/.env`.
2. In the Supabase dashboard → **Authentication → URL Configuration**, add `http://localhost:8080` to Allowed Origins.
3. Run the database migration:

```bash
cd frontend
supabase db push
```

---

## Demo Mode

Navigate to `/workspace/demo` — no account required. Demo users get one full agent pipeline run tracked via `localStorage`. Further runs show a signup prompt.

---

## Testing

```bash
cd frontend

npm run test           # Vitest — unit + component tests
npm run test:watch     # watch mode

npx playwright test    # end-to-end tests
```

---

## License

Distributed under the MIT License. See [`LICENSE`](./LICENSE) for details.

---

## 👨‍💻 Author

**Ambar Ubale**

- 💼 Full Stack Developer
- 🌐 Portfolio: https://ambarportfolio.vercel.app/
- 🔗 LinkedIn: https://www.linkedin.com/in/ambar-ubale-137214230

---

<div align="center">
<sub>Built with React, Node.js, and a lot of streaming tokens.</sub>
</div>
