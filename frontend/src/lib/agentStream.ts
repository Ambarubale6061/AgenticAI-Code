// src/lib/agentStream.ts
import { supabase } from "@/integrations/supabase/client";

// ─── Normalize API base URL (strip trailing slashes) ─────────────────────────
// FIX: All URLs were missing /api/ prefix — e.g. hitting /agent/planner instead
// of /api/agent/planner, causing 404 on every single agent call.
const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");

let isRedirecting = false;

async function handle401() {
  if (isRedirecting) return;
  isRedirecting = true;
  await supabase.auth.signOut();
  window.location.href = "/login";
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    console.error("[Auth] No valid session found", error);
    handle401();
    throw new Error("Authentication required. Please log in.");
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${data.session.access_token}`,
  };
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retry = true,
): Promise<Response> {
  const resp = await fetch(url, options);
  if (resp.status === 401 && retry) {
    console.warn("[fetchWithRetry] 401 received, retrying once after 1s...");
    await new Promise((r) => setTimeout(r, 1000));
    return fetchWithRetry(url, options, false);
  }
  if (resp.status === 401) {
    handle401();
    throw new Error("Session expired. Please log in again.");
  }
  return resp;
}

export async function callPlannerAgent(
  prompt: string,
  signal?: AbortSignal,
): Promise<{
  steps: Array<{ title: string; description?: string }>;
  language: string;
  summary: string;
  projectType?: string;
}> {
  let headers;
  try {
    headers = await getAuthHeaders();
  } catch (authError) {
    console.error("[Planner] Auth error:", authError);
    throw new Error("Authentication required. Please log in.");
  }

  // FIX: was `${API_BASE}/agent/planner` — missing /api/ prefix → 404
  const url = `${API_BASE}/api/agent/planner`;
  console.log("[Planner] Calling:", url);

  try {
    const resp = await fetchWithRetry(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ prompt }),
      signal,
    });

    if (!resp.ok) {
      let errorMessage = `Planner failed with status ${resp.status}`;
      try {
        const errData = await resp.json();
        errorMessage = errData.error || errData.message || errorMessage;
        console.error("[Planner] Error response:", errData);
      } catch {
        const text = await resp.text();
        errorMessage = text || errorMessage;
        console.error("[Planner] Error text:", text);
      }
      throw new Error(errorMessage);
    }

    const data = await resp.json();
    console.log("[Planner] Success:", data);
    return data;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Request cancelled");
    }
    console.error("[Planner] Fetch error:", error);
    throw error;
  }
}

export async function streamAgentResponse({
  functionName,
  body,
  onDelta,
  onDone,
  onError,
  signal,
}: {
  functionName: string;
  body: Record<string, unknown>;
  onDelta: (chunk: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: string) => void;
  signal?: AbortSignal;
}) {
  let headers;
  try {
    headers = await getAuthHeaders();
  } catch (authError) {
    onError("Authentication required. Please log in.");
    return;
  }

  // FIX: was `${API_BASE}/agent/${functionName}` — missing /api/ prefix → 404
  const url = `${API_BASE}/api/agent/${functionName}`;
  let resp;
  try {
    resp = await fetchWithRetry(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    onError(e instanceof Error ? e.message : "Request failed");
    return;
  }

  if (!resp.ok) {
    const errorData = await resp.json().catch(() => ({ error: "Request failed" }));
    console.error(`[${functionName}] ${resp.status}:`, errorData);
    onError(errorData.error || `Error ${resp.status}`);
    return;
  }

  const contentType = resp.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data = await resp.json();
    const text = JSON.stringify(data);
    onDelta(text);
    onDone(text);
    return;
  }

  if (!resp.body) {
    onError("No response body");
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);

      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;

      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") break;

      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) {
          fullText += content;
          onDelta(content);
        }
      } catch {
        buffer = line + "\n" + buffer;
        break;
      }
    }
  }

  if (buffer.trim()) {
    for (let raw of buffer.split("\n")) {
      if (!raw) continue;
      if (raw.endsWith("\r")) raw = raw.slice(0, -1);
      if (!raw.startsWith("data: ")) continue;
      const jsonStr = raw.slice(6).trim();
      if (jsonStr === "[DONE]") continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) {
          fullText += content;
          onDelta(content);
        }
      } catch {
        /* ignore */
      }
    }
  }

  onDone(fullText);
}

// ─── Highly Robust JSON Extractor ─────────────────────────────────────────────
function extractJson(raw: string): unknown {
  // 1. Direct parse
  try {
    return JSON.parse(raw.trim());
  } catch {
    /* continue */
  }

  // 2. Remove markdown fences
  try {
    const stripped = raw
      .replace(/^```[a-z]*\s*\n?/gm, "")
      .replace(/^```\s*$/gm, "")
      .trim();
    return JSON.parse(stripped);
  } catch {
    /* continue */
  }

  // 3. Extract from first ```json ... ``` block
  try {
    const fenceMatch = raw.match(/```(?:json)?\s*\n([\s\S]*?)```/);
    if (fenceMatch) {
      return JSON.parse(fenceMatch[1].trim());
    }
  } catch {
    /* continue */
  }

  // 4. Find outermost { ... }
  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start !== -1 && end > start) {
      const jsonStr = raw.slice(start, end + 1);
      return JSON.parse(jsonStr);
    }
  } catch {
    /* continue */
  }

  // 5. Fix common JSON issues (trailing commas, unquoted keys, unescaped newlines)
  try {
    let fixed = raw;
    fixed = fixed.replace(/,(\s*[}\]])/g, "$1");
    fixed = fixed.replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3');
    const jsonStart = fixed.indexOf("{");
    const jsonEnd = fixed.lastIndexOf("}");
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      fixed = fixed.slice(jsonStart, jsonEnd + 1);
    }
    fixed = fixed.replace(/(?<!\\)\n/g, "\\n");
    return JSON.parse(fixed);
  } catch {
    /* continue */
  }

  // 6. Last resort: evaluate as JavaScript object (only if safe-looking)
  try {
    const cleaned = raw.replace(/^[^{[]*/, "").replace(/[^}\]]*$/, "");
    return new Function(`return ${cleaned}`)();
  } catch {
    /* continue */
  }

  throw new Error("Could not extract JSON from LLM response");
}

// Helper to guess file extension from content
function detectLanguageFromText(text: string): string {
  if (text.includes("<!DOCTYPE html") || text.includes("<html")) return "html";
  if (text.includes("import React") || text.includes("React.")) return "tsx";
  if (text.includes("def ") && text.includes("print(")) return "py";
  if (text.includes("function ") || text.includes("const ")) return "js";
  return "txt";
}

export function parseCoderResponse(fullText: string): {
  files: Array<{ filename: string; language: string; code: string }>;
  explanation: string;
} {
  try {
    const parsed = extractJson(fullText) as any;
    if (
      parsed &&
      Array.isArray(parsed.files) &&
      parsed.files.length > 0 &&
      parsed.files.every(
        (f: any) =>
          typeof f.filename === "string" &&
          typeof f.language === "string" &&
          typeof f.code === "string",
      )
    ) {
      const files = parsed.files.map((f: any) => {
        let lang = f.language;
        if (f.filename.endsWith(".jsx") || f.filename.endsWith(".tsx")) {
          lang = "react";
        }
        return { ...f, language: lang };
      });
      return {
        files,
        explanation: parsed.explanation || "Code generated successfully.",
      };
    }
    console.warn("[parseCoderResponse] Unexpected shape:", parsed);
  } catch (e) {
    console.warn("[parseCoderResponse] parse failed:", e);
  }

  // Fallback: treat the raw text as a single code file
  const extension = detectLanguageFromText(fullText);
  return {
    files: [
      {
        filename: `output.${extension}`,
        language: extension === "tsx" ? "react" : extension,
        code: fullText,
      },
    ],
    explanation:
      "Raw output from coder agent — JSON parse failed. Displaying as plain text.",
  };
}

export function parseDebuggerResponse(fullText: string): {
  diagnosis: string;
  fixes: Array<{ filename: string; language: string; code: string }>;
  explanation: string;
  confidence: string;
} {
  try {
    const parsed = extractJson(fullText) as any;
    if (parsed && Array.isArray(parsed.fixes)) {
      return {
        diagnosis: parsed.diagnosis || "See explanation below.",
        fixes: parsed.fixes,
        explanation: parsed.explanation || "Fix applied.",
        confidence: parsed.confidence || "medium",
      };
    }
    console.warn("[parseDebuggerResponse] Unexpected shape:", parsed);
  } catch (e) {
    console.warn("[parseDebuggerResponse] parse failed:", e);
  }
  return {
    diagnosis: fullText.slice(0, 200),
    fixes: [],
    explanation: "Could not parse debugger response.",
    confidence: "low",
  };
}