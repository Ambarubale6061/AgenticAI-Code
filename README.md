<div align="center">

<img src="frontend/src/assets/ai.png" alt="AgenticAI Studio" width="100" />

# AgenticAI Studio

### A VS Code-inspired, multi-agent AI coding environment — in the browser.

Describe what you want to build in plain English. A pipeline of specialized AI agents plans, codes, debugs, and runs your project — live, in a browser preview.

<br/>

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-Vercel-000000?style=for-the-badge&logo=vercel)](https://agentic-ai-studio-chi.vercel.app/)
[![Backend API](https://img.shields.io/badge/🖥️_Backend_API-Render-46E3B7?style=for-the-badge&logo=render)](https://agenticai-studio.onrender.com)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](./LICENSE)

<br/>

[![React](https://img.shields.io/badge/React_18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![Groq](https://img.shields.io/badge/Groq-F55036?style=flat-square&logo=groq&logoColor=white)](https://groq.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

</div>

---

## Overview

**AgenticAI Studio** is a full-stack, browser-native coding environment that replaces the traditional edit-compile-run loop with a conversational AI pipeline. Instead of writing boilerplate, you describe your intent — the agents handle the rest.

The workspace is modelled after VS Code: resizable panels, a file explorer with context menus, a command palette (`Ctrl+P`), a built-in terminal, syntax-highlighted editor via Monaco, and a live preview iframe. Under the hood, three specialized AI agents collaborate in sequence, each with a distinct role, producing runnable code that is immediately executed and displayed — with automatic retry/debug loops on failure.

---

## 🖼️ Preview

### 🔥 Hero Section

![Hero](frontend/src/assets/ho.png)

### 💻 IDE Workspace

![IDE](frontend/src/assets/IDE.png)

---

## Live Deployments

| Service         | URL                                                                           | Platform |
| --------------- | ----------------------------------------------------------------------------- | -------- |
| **Frontend**    | [agentic-ai-studio-chi.vercel.app](https://agentic-ai-studio-chi.vercel.app/) | Vercel   |
| **Backend API** | [agenticai-studio.onrender.com](https://agenticai-studio.onrender.com)        | Render   |

> Try it without signing up — visit the demo and click **Try Demo** for one free generation.

---

## How the Agent Pipeline Works

Every chat message triggers a 4-stage automated pipeline:

```
User Prompt
     │
     ▼
┌─────────────┐      JSON Plan
│  🗺️ Planner  │ ──────────────────►  Structured 3-7 step plan
│   Agent     │                       + language detection
└─────────────┘                       + project type (static/react/node)
     │
     ▼
┌─────────────┐    Streaming SSE
│  💻 Coder   │ ──────────────────►  Complete, runnable files
│   Agent     │                       Multi-file JSON payload
└─────────────┘                       (React, HTML/CSS/JS, Python, etc.)
     │
     ▼
┌──────────────────┐
│  🖥️ Browser       │  Web langs → executes inside a sandboxed iframe
│  Executor /      │  Backend langs → simulated via LLM (Groq)
│  Remote Executor │
└──────────────────┘
     │
     ├──── exitCode 0 → ✅ Pipeline complete, preview rendered
     │
     └──── exitCode 1 → up to 3 automatic retries via:
                ▼
          ┌──────────────┐    Streaming SSE
          │  🐛 Debugger  │ ──► Diagnosis + full corrected files
          │   Agent      │     Confidence rating (high/medium/low)
          └──────────────┘
                │
                └── Re-execute → repeat until success or max retries
```

The pipeline supports **abort at any point** (sends an `AbortController` signal through the chain), and the entire conversation history is persisted to MongoDB via the backend API.

---

## Features

### AI Agents

- **Planner** — Breaks prompts into structured 3–7 step plans with language and project type detection.
- **Coder** — Generates complete, multi-file projects using Llama 3.3 70B via Groq. Streams output as SSE.
- **Debugger** — Analyzes runtime errors, rewrites affected files, and rates fix confidence (high / medium / low). Caches successful fix patterns to avoid repeating mistakes.
- **Auto-retry** — Up to 3 debug cycles with zero user intervention.

### Browser Execution Engine

- **React** — Bundled with React 18 + Babel Standalone in a sandboxed iframe. A global shim exposes all hooks so stripped imports never cause runtime errors.
- **HTML / CSS / JS** — Multi-file projects are inlined and bridged via `postMessage` for console capture.
- **TypeScript** — Transpiled via Babel Standalone in the iframe.
- **Python / Java / Node.js** — Simulated via a dedicated LLM executor (Groq `llama-3.1-8b-instant`).
- **Smart language detection** — Correctly routes React code inside `.js`/`.ts` files to the React builder.

### VS Code-Inspired Workspace

- Resizable panels (editor, preview, console) with sizes persisted to `localStorage`.
- File Explorer with tree view, expand/collapse folders, and right-click context menus.
- Monaco Editor with syntax highlighting for all supported languages.
- Command Palette (`Ctrl+P`) for file navigation and commands.
- Built-in terminal, VS Code-style menu bar, and full keyboard shortcut support.
- Status bar showing branch, project ID, cursor position, and live agent state.

### Project Management

- **Auth via Supabase** — Email/password and OAuth. The backend verifies JWTs via JWKS (RS256) with HS256 fallback.
- **Demo mode** — One free generation at `/workspace/demo`, no signup required.
- **Project CRUD** — Create, rename, duplicate, export, and delete. All data in MongoDB.
- **Message history** — Chat messages persist across sessions, hydrated on mount.
- **Version snapshots** — Restore previous file states from the versions panel.

---

## Tech Stack

### Frontend

| Layer         | Technology               |
| ------------- | ------------------------ |
| Framework     | React 18 + TypeScript    |
| Build Tool    | Vite 5                   |
| Styling       | Tailwind CSS + shadcn/ui |
| Editor        | Monaco Editor            |
| Routing       | React Router v6          |
| Data Fetching | TanStack Query v5        |
| Auth Client   | Supabase JS (auth only)  |

### Backend

| Layer             | Technology                                                   |
| ----------------- | ------------------------------------------------------------ |
| Runtime           | Node.js (ESM)                                                |
| Framework         | Express 4                                                    |
| Database          | MongoDB via Mongoose 8                                       |
| Auth Verification | JWT — RS256/ES256 via JWKS, HS256 fallback                   |
| AI Gateway        | Groq API (`llama-3.3-70b-versatile`, `llama-3.1-8b-instant`) |
| Streaming         | Node.js HTTP streams → SSE                                   |

---

## Project Structure

```
AgenticAI Code/
├── backend/
│   ├── config/
│   │   ├── db.js                   # MongoDB connection
│   │   └── env.js                  # Env validation — exits on missing vars
│   ├── controllers/
│   │   ├── agentController.js      # Planner, Coder, Debugger, Executor
│   │   ├── projectController.js    # Project CRUD
│   │   ├── userController.js       # User profiles
│   │   └── versionController.js    # Snapshot save/restore
│   ├── middleware/
│   │   ├── authMiddleware.js       # JWT verification (RS256 JWKS + HS256)
│   │   └── errorMiddleware.js      # Global error handler
│   ├── models/
│   │   ├── AgentMemory.js          # Error→fix pattern store
│   │   ├── Message.js              # Chat message persistence
│   │   ├── Project.js              # Project metadata + generated code
│   │   ├── User.js                 # Auth-linked user record
│   │   └── Version.js              # File snapshot model
│   ├── services/
│   │   └── groqService.js          # SSE streaming helper for Groq
│   └── server.js                   # Express entry point
│
└── frontend/
    └── src/
        ├── components/workspace/
        │   ├── AgentStatus.tsx      # Live pipeline state indicator
        │   ├── ChatPanel.tsx        # Conversation UI
        │   ├── CodePanel.tsx        # Monaco editor wrapper
        │   ├── ConsolePanel.tsx     # Stdout/stderr viewer
        │   ├── PreviewPanel.tsx     # Sandboxed iframe renderer
        │   ├── PlanPanel.tsx        # Step-by-step plan progress
        │   └── VersionPanel.tsx     # Snapshot history browser
        ├── hooks/
        │   ├── useAgentPipeline.ts  # ★ Core pipeline orchestration
        │   ├── useAuth.tsx          # Auth context (Supabase)
        │   └── useProjects.ts       # TanStack Query wrappers
        ├── lib/
        │   ├── agentMemory.ts       # Local error→fix pattern cache
        │   ├── agentStream.ts       # ★ SSE streaming + JSON parsing
        │   └── browserExecutor.ts   # ★ iframe bundler & execution engine
        └── pages/
            ├── Workspace.tsx        # Full IDE layout
            ├── Dashboard.tsx        # Project list + CRUD
            └── Index.tsx            # Landing page
```

---

## Getting Started

### Prerequisites

- **Node.js** v18+
- **MongoDB** — local or [Atlas](https://www.mongodb.com/cloud/atlas)
- **Supabase** project — [supabase.com](https://supabase.com) (auth only)
- **Groq API key** — [console.groq.com](https://console.groq.com)

### Environment Variables

**`backend/.env`**

```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/agenticai
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_JWT_SECRET=your-supabase-jwt-secret   # HS256 tokens only
GROQ_API_KEY=gsk_...
FRONTEND_URL=http://localhost:5173
```

**`frontend/.env.local`**

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_BASE_URL=http://localhost:5000
```

### Running Locally

```bash
# 1. Clone
git clone https://github.com/your-username/AgenticAI.git && cd AgenticAI

# 2. Backend
cd backend && npm install && npm run dev

# 3. Frontend (new terminal)
cd frontend && npm install && npm run dev
```

App runs at **http://localhost:5173**.

---

## Architecture

### Request Flow

```
Browser
  │  1. User sends message
  ▼
useAgentPipeline.ts
  │  2. POST /api/agent/planner  → JSON plan
  │  3. POST /api/agent/coder    → SSE stream → parsed files
  │  4. browserExecutor          → iframe (web) or /api/agent/execute (backend langs)
  │  5. exitCode 1               → POST /api/agent/debugger → fixed files → re-execute
  ▼
MongoDB ← project state + messages persisted after each run
```

### Authentication Flow

```
Supabase (email / OAuth)
  │  Issues JWT
  ▼
Frontend: Authorization: Bearer <token>
  │
  ▼
authMiddleware.js
  ├── RS256 / ES256 → verified via JWKS endpoint
  └── HS256         → verified with SUPABASE_JWT_SECRET
```

### MongoDB Collections

| Collection      | Key Fields                                                             |
| --------------- | ---------------------------------------------------------------------- |
| `projects`      | `user_id`, `title`, `language`, `status`, `plan[]`, `generated_code[]` |
| `messages`      | `project_id`, `user_id`, `role`, `agent`, `content`                    |
| `agentmemories` | `errorPattern`, `fix`, `language`, `confidence`                        |
| `users`         | `supabase_id`, `email`, `name`, `avatar_url`                           |

---

## API Reference

All endpoints require `Authorization: Bearer <token>`.

### Agent

| Method | Path                  | Body                                  | Response                                      |
| ------ | --------------------- | ------------------------------------- | --------------------------------------------- |
| `POST` | `/api/agent/planner`  | `{ prompt }`                          | `{ steps, language, projectType, summary }`   |
| `POST` | `/api/agent/coder`    | `{ plan, prompt, language }`          | SSE → `{ files, explanation }`                |
| `POST` | `/api/agent/debugger` | `{ code, error, prompt, retryCount }` | SSE → `{ diagnosis, fixes, confidence }`      |
| `POST` | `/api/agent/execute`  | `{ files, language }`                 | `{ stdout, stderr, exitCode, executionTime }` |

### Projects

| Method   | Path                         | Description          |
| -------- | ---------------------------- | -------------------- |
| `GET`    | `/api/projects`              | List user's projects |
| `POST`   | `/api/projects`              | Create a project     |
| `PUT`    | `/api/projects/:id`          | Update project       |
| `DELETE` | `/api/projects/:id`          | Delete project       |
| `GET`    | `/api/projects/:id/messages` | Get chat history     |
| `POST`   | `/api/projects/:id/messages` | Save a message       |
| `GET`    | `/health`                    | Health check         |

---

## Contributing

1. Fork and branch: `git checkout -b feat/your-feature`
2. Make changes and verify tests pass: `npm test`
3. Commit: `git commit -m "feat: add X"`
4. Open a Pull Request.

**Key files:**

- `useAgentPipeline.ts` — pipeline orchestration
- `browserExecutor.ts` — iframe bundling and execution
- `agentStream.ts` — SSE streaming and JSON parsing
- `agentController.js` — backend agent handlers

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
