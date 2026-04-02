# 🚀 AgenticAI Studio

> A full-stack, browser-based AI coding workspace where a coordinated pipeline of agents — planner, coder, and debugger — collaborate to take a user prompt from idea to running code.

---

## 🖼️ Preview

### 🔥 Hero Section

![Hero](src/assets/home.jpg)

### 📊 Dashboard

![Dashboard](src/assets/dash.jpg)

### 💻 IDE Workspace

![IDE](src/assets/ide.jpg)

---

## 📚 Table of Contents

- [Overview](#overview)
- [Live Demo](#live-demo)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Supabase Setup](#supabase-setup)
- [Edge Functions](#edge-functions)
- [Agent Pipeline](#agent-pipeline)
- [Execution Engine](#execution-engine)
- [Agent Memory System](#agent-memory-system)
- [Version Control](#version-control)
- [Workspace UI](#workspace-ui)
- [Authentication & Routing](#authentication--routing)
- [Testing](#testing)
- [Deployment](#deployment)

---

## 🧠 Overview

**AgenticAI Studio** is a next-gen AI-powered IDE where multiple intelligent agents collaborate to build, run, and debug code automatically.

👉 You just write a prompt  
👉 AI plans → codes → executes → debugs  
👉 You get working code in real-time

### 🤖 Agents:

- **Planner Agent** → breaks idea into steps
- **Coder Agent** → generates full code
- **Debugger Agent** → fixes errors automatically

---

## 🌐 Live Demo

👉 `/workspace/demo`

- No signup required
- 1 free run per session

---

## 🛠️ Tech Stack

### Frontend

- React 18 + TypeScript
- Vite 5
- Tailwind CSS
- Radix UI + shadcn/ui
- Monaco Editor
- Framer Motion

### Backend

- Supabase (DB + Auth + Storage)
- Deno Edge Functions
- Groq API (LLM)

### Testing

- Vitest
- Playwright
- React Testing Library

---

## 🏗️ Architecture

React App (Frontend)
│
▼
Supabase Edge Functions
(planner | coder | debugger | executor)
│
▼
Groq LLM API
│
▼
Supabase DB (Projects + Messages)

---

## ✨ Features

### 🤖 Multi-Agent System

- Automatic planning → coding → debugging
- Real-time streaming (SSE)
- Retry mechanism (max 3)

### ⚡ Hybrid Code Execution

- Browser execution (JS/HTML/CSS)
- AI simulation (Python, Bash)

### 💻 IDE Experience

- VS Code–like UI
- Monaco Editor
- Live preview
- Console logs
- File manager

### 📁 Project System

- Create / Delete / Duplicate projects
- Save history
- Export code

### 🧠 Smart Memory

- Stores past errors & fixes
- Improves debugging over time

### 🕓 Version Control

- Snapshots (v1, v2…)
- Restore anytime

---

## 📂 Project Structure

src/
├── components/
│ ├── workspace/
│ │ ├── ChatPanel.tsx
│ │ ├── CodePanel.tsx
│ │ ├── ConsolePanel.tsx
│ │ ├── PlanPanel.tsx
│ │ ├── PreviewPanel.tsx
│ │ └── VersionPanel.tsx
│
├── hooks/
│ ├── useAgentPipeline.ts
│ ├── useAuth.tsx
│ └── useProjects.ts
│
├── lib/
│ ├── agentMemory.ts
│ ├── agentStream.ts
│ ├── browserExecutor.ts
│ └── versionControl.ts
│
├── pages/
│ ├── Dashboard.tsx
│ ├── Workspace.tsx
│ ├── Login.tsx
│ └── Signup.tsx

---

## ⚙️ Getting Started

### 📦 Install

```bash
git clone https://github.com/your-org/agenticai-studio.git
cd agenticai-studio
npm install
▶️ Run
npm run dev

👉 http://localhost:8080

🔑 Environment Variables
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=
🗄️ Supabase Setup
Run migrations:
supabase db push
Enable RLS:
auth.uid() = user_id
⚡ Edge Functions
agent-planner
agent-coder
agent-debugger
code-executor

Deploy:

supabase functions deploy agent-planner
🔄 Agent Pipeline
Prompt
  ↓
Planner
  ↓
Coder
  ↓
Execute
  ↓
Debugger (if error)
  ↓
Success ✅
🧪 Testing
npm run test
npx playwright test
🚀 Deployment
Frontend
npm run build

Deploy to:

Vercel
Netlify
Backend
supabase functions deploy
🔐 Authentication
Supabase Auth
Protected routes
Demo mode (no login)
📱 UI Features
Responsive design
Mobile tabs (Chat / Code / Preview)
Resizable panels
VS Code style layout
📜 License

Private — All rights reserved.
```
