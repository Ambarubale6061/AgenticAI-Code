<div align="center">

<img src="./src/assets/ai.png" width="200" height="200" alt="AgenticAI Studio Logo" />

# 🚀 AgenticAI Studio

### Autonomous AI Coding Workspace

A full-stack, browser-based AI coding workspace where a coordinated pipeline of agents — **planner**, **coder**, and **debugger** — collaborate to take a user prompt from idea to running code.

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-Visit_Site-blue?style=for-the-badge)](https://futurecart-e-commerce.vercel.app/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)

</div>

---

## 🖼️ Preview

### 🔥 Hero Section

![Hero](src/assets/ho.png)

### 💻 IDE Workspace

![IDE](src/assets/IDE.png)

---

## 📚 Table of Contents

- Overview
- Live Demo
- Tech Stack
- Architecture
- Features
- Project Structure
- Getting Started
- Environment Variables
- Supabase Setup
- Edge Functions
- Agent Pipeline
- Execution Engine
- Agent Memory System
- Version Control
- Workspace UI
- Authentication & Routing
- Testing
- Deployment

---

## 🧠 Overview

**AgenticAI Studio** is a next-gen AI-powered IDE where multiple intelligent agents collaborate to build, run, and debug code automatically.

👉 You just write a prompt
👉 AI plans → codes → executes → debugs
👉 You get working code in real-time

### 🤖 Agents:

- Planner Agent → breaks idea into steps
- Coder Agent → generates full code
- Debugger Agent → fixes errors automatically

---

## 🌐 Live Demo

👉 `/workspace/demo`

- No signup required
- 1 free run per session

### 🚀 Deployed App

👉 [https://agentic-ai-studio-iota.vercel.app/](https://agentic-ai-studio-iota.vercel.app/)

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

```
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
```

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

```
src/
 ├── components/
 │   ├── workspace/
 │   │   ├── ChatPanel.tsx
 │   │   ├── CodePanel.tsx
 │   │   ├── ConsolePanel.tsx
 │   │   ├── PlanPanel.tsx
 │   │   ├── PreviewPanel.tsx
 │   │   └── VersionPanel.tsx
 │
 ├── hooks/
 │   ├── useAgentPipeline.ts
 │   ├── useAuth.tsx
 │   └── useProjects.ts
 │
 ├── lib/
 │   ├── agentMemory.ts
 │   ├── agentStream.ts
 │   ├── browserExecutor.ts
 │   └── versionControl.ts
 │
 ├── pages/
 │   ├── Dashboard.tsx
 │   ├── Workspace.tsx
 │   ├── Login.tsx
 │   └── Signup.tsx
```

---

## ⚙️ Getting Started

### 📦 Install

```bash
git clone https://github.com/your-org/agenticai-studio.git
cd agenticai-studio
npm install
```

### ▶️ Run

```bash
npm run dev
```

👉 [http://localhost:8080](http://localhost:8080)

---

## 🔑 Environment Variables

```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=
```

---

## 🗄️ Supabase Setup

### Run migrations:

```bash
supabase db push
```

### Enable RLS:

```sql
auth.uid() = user_id
```

---

## ⚡ Edge Functions

- agent-planner
- agent-coder
- agent-debugger
- code-executor

Deploy:

```bash
supabase functions deploy agent-planner
```

---

## 🔄 Agent Pipeline

```
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
```

---

## 🧪 Testing

```bash
npm run test
npx playwright test
```

---

## 🚀 Deployment

### Frontend

```bash
npm run build
```

Deploy to:

- Vercel
- Netlify

### Backend

```bash
supabase functions deploy
```

---

## 🔐 Authentication

- Supabase Auth
- Protected routes
- Demo mode (no login)

---

## 📱 UI Features

- Responsive design
- Mobile tabs (Chat / Code / Preview)
- Resizable panels
- VS Code style layout

---

## 📜 License

Private — All rights reserved.

---

## 👨‍💻 Developed By

**Ambar Ubale 🚀**
