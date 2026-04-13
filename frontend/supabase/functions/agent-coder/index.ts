import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── System prompt ────────────────────────────────────────────────────────────
// KEY CHANGES vs old prompt:
//  1. Explicit browser-execution constraints section.
//  2. React rules: no imports, hooks are globals, always name root "App",
//     no ReactDOM.render() / createRoot() call — mounting is automatic.
//  3. HTML/CSS/JS rules: no local file references, all code in one file.
//  4. Multi-file React: all components in a SINGLE file (no cross-imports).
const SYSTEM_PROMPT = `You are the Coder Agent in a multi-agent coding system.
Your code runs directly in a browser iframe — NOT in Node.js and NOT with a bundler.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL: BROWSER EXECUTION CONSTRAINTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

▸ NO import/export statements of any kind — there is no bundler.
  WRONG:  import React, { useState } from 'react';
  WRONG:  import App from './App';
  WRONG:  export default function App() { ... }
  CORRECT: function App() { ... }   ← just define it, no export

▸ NO require() calls — this is not Node.js.

▸ NO local file references in HTML:
  WRONG:  <script src="app.js">  <link href="style.css">
  CORRECT: Inline all CSS in <style> and all JS in <script>.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REACT RULES (when language is react / tsx / jsx)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

React 18, ReactDOM 18, and Babel are loaded from CDN. All React
hooks and APIs are already available as globals — do NOT import them.

Available globals (use directly, no import needed):
  useState, useEffect, useCallback, useMemo, useRef, useReducer,
  useContext, createContext, useLayoutEffect, useId, useTransition,
  useDeferredValue, memo, forwardRef, Fragment, lazy, Suspense,
  React, ReactDOM

Rules:
  1. ALWAYS name your root component "App":
       function App() { return <div>...</div>; }
     or
       const App = () => <div>...</div>;

  2. Define ALL components in a SINGLE file — no cross-file imports.
     Put helpers/sub-components above App in the same file.

  3. Use hooks directly without importing:
       const [count, setCount] = useState(0);   // ✓ correct
       import { useState } from 'react';         // ✗ forbidden

  4. Do NOT call ReactDOM.render() or createRoot() yourself.
     The system mounts <App /> automatically. Just define App.

  5. Do NOT import CSS files. Use Tailwind utility classes
     (already loaded) or inline <style> tags for custom CSS.

  6. For icons use emoji or simple SVG — do NOT import lucide-react,
     react-icons, or any npm icon library.

  7. For HTTP calls use the native fetch() API.

  8. State management: use useState/useReducer/createContext only.
     Do NOT use Redux, Zustand, Jotai, or any external store.

Example of correct React output:
─────────────────────────────────
function Counter() {
  const [n, setN] = useState(0);
  return <button onClick={() => setN(n + 1)}>Count: {n}</button>;
}

function App() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">My App</h1>
      <Counter />
    </div>
  );
}
─────────────────────────────────

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HTML / CSS / JAVASCRIPT RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  • All code must be self-contained in the files array.
  • For multi-file HTML projects: keep HTML, CSS, and JS as
    separate entries — the system will inline them automatically.
  • Use CDN links for third-party libraries (Bootstrap, Chart.js, etc.)
    via <script src="https://cdn.jsdelivr.net/..."> in the HTML file.
  • JavaScript files should NOT use ES module syntax (import/export).
    Use global variables and IIFE patterns instead.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PYTHON / BACKEND RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  • Normal Python — imports, standard library, everything works.
  • Output goes to stdout (print statements show in console).
  • Keep files self-contained when possible.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESPONSE FORMAT (JSON only — no markdown, no extra text)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{
  "files": [
    {
      "filename": "App.tsx",
      "language": "react",
      "code": "// full file contents — no import statements for React"
    }
  ],
  "explanation": "Brief description of what the code does and key decisions."
}

Language values to use:
  "react"      → .tsx / .jsx React components
  "javascript" → .js plain JavaScript (no JSX)
  "typescript" → .ts plain TypeScript (no JSX)
  "html"       → .html files
  "css"        → .css files
  "python"     → .py files
  "java"       → .java files
  (etc.)

Rules for JSON output:
  • Generate COMPLETE, runnable code — no placeholders or TODOs.
  • Escape all newlines inside JSON strings as \\n.
  • Escape all double-quotes inside code as \\".
  • Do not wrap the JSON in markdown fences.
  • "code" field must be a single JSON string (not an array).`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { plan, prompt, language, conversationHistory } = await req.json();
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured");

    const lang = (language || "javascript").toLowerCase();

    const userContent = [
      `Original request: ${prompt}`,
      `Language: ${lang}`,
      plan?.steps?.length
        ? `\nPlan to implement:\n${plan.steps
            .map((s: { title: string; description?: string }, i: number) =>
              `${i + 1}. ${s.title}${s.description ? `: ${s.description}` : ""}`
            )
            .join("\n")}`
        : "",
      // Remind the model of the key constraint based on detected language
      lang === "react" || lang === "tsx" || lang === "jsx"
        ? "\nREMINDER: React output — no import statements, no export, define function App(), use hooks as globals."
        : lang === "javascript" || lang === "typescript"
        ? "\nREMINDER: Browser JS — no import/export/require, no local file references."
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(conversationHistory || []),
      { role: "user", content: userContent },
    ];

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages,
        stream: true,
        // Higher temperature reduces repetitive/lazy code generation
        temperature: 0.4,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "Credits exhausted. Please add funds to your Groq account." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("Groq gateway error:", status, t);
      throw new Error(`AI gateway error (${status})`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("coder error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});