// src/hooks/useAgentPipeline.ts
import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { ChatMessage } from "@/components/workspace/ChatPanel";
import type { PlanStep } from "@/components/workspace/PlanPanel";
import type { CodeFile } from "@/components/workspace/CodePanel";
import type { ConsoleLine } from "@/components/workspace/ConsolePanel";
import type { AgentState } from "@/components/workspace/AgentStatus";
import {
  callPlannerAgent,
  streamAgentResponse,
  parseCoderResponse,
  parseDebuggerResponse,
} from "@/lib/agentStream";
import {
  canExecuteLocally,
  executeInBrowser,
  bundleWebFiles,
  WEB_LANGUAGES,
  BACKEND_LANGUAGES,
} from "@/lib/browserExecutor";
import { addMemoryEntry, getMemoryContext } from "@/lib/agentMemory";
import {
  useUpdateProject,
  useSaveMessage,
  useProjectMessages,
} from "@/hooks/useProjects";
import { useAuth } from "@/hooks/useAuth";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

// ─── Types ────────────────────────────────────────────────────────────────────
type ExecutionResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime?: string;
  isReal?: boolean;
  language?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function consoleLine(
  type: ConsoleLine["type"],
  content: string,
  agent?: ConsoleLine["agent"]
): ConsoleLine {
  return {
    id: Date.now().toString() + Math.random(),
    type,
    content,
    agent,
    timestamp: new Date(),
  };
}

// ─── Panel size persistence ───────────────────────────────────────────────────
const PANEL_SIZES_KEY = "codeagent_panel_sizes";
export function loadPanelSizes(): number[] | null {
  try {
    const raw = localStorage.getItem(PANEL_SIZES_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
export function savePanelSizes(sizes: number[]) {
  localStorage.setItem(PANEL_SIZES_KEY, JSON.stringify(sizes));
}

// ─── Language routing ─────────────────────────────────────────────────────────
function isWebLanguage(lang: string): boolean {
  return WEB_LANGUAGES.includes(lang.toLowerCase());
}
function isBackendLanguage(lang: string): boolean {
  return BACKEND_LANGUAGES.includes(lang.toLowerCase());
}

// ─── Remote execution via backend ─────────────────────────────────────────────
async function executeCodeRemote(
  files: Array<{ filename: string; language: string; code: string }>,
  language: string
): Promise<ExecutionResult> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const resp = await fetch(`${API_BASE}/agent/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ files, language }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: "Execution failed" }));
    throw new Error(err.error || "Execution failed");
  }
  const result = await resp.json();
  return { ...result, language };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAgentPipeline(projectId?: string) {
  const [agentState, setAgentState] = useState<AgentState>("idle");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [steps, setSteps] = useState<PlanStep[]>([]);
  const [activeStepId, setActiveStepId] = useState<string | undefined>();
  const [files, setFiles] = useState<CodeFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string>("1");
  const [consoleLines, setConsoleLines] = useState<ConsoleLine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastExecutionResult, setLastExecutionResult] = useState<ExecutionResult | null>(null);

  const retryCountRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const updateProject = useUpdateProject();
  const saveMessage = useSaveMessage();
  const { user } = useAuth();
  const { data: savedMessages } = useProjectMessages(projectId);

  useEffect(() => {
    if (savedMessages && savedMessages.length > 0 && messages.length === 0) {
      setMessages(
        savedMessages.map((m: any) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          agent: m.agent as ChatMessage["agent"],
          content: m.content,
          timestamp: new Date(m.createdAt),
        }))
      );
    }
  }, [savedMessages]);

  const addConsole = useCallback(
    (type: ConsoleLine["type"], content: string, agent?: ConsoleLine["agent"]) => {
      setConsoleLines((prev) => [...prev, consoleLine(type, content, agent)]);
    },
    []
  );

  const persistMessage = useCallback(
    (role: string, content: string, agent?: string) => {
      if (projectId && projectId !== "new" && projectId !== "demo" && user) {
        saveMessage.mutate({ project_id: projectId, role, agent, content });
      }
    },
    [projectId, user, saveMessage]
  );

  // ─── File management with full path support ─────────────────────────────────
  const detectLanguage = (filename: string): string => {
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    const map: Record<string, string> = {
      js: "javascript", jsx: "react", ts: "typescript", tsx: "react",
      py: "python", html: "html", css: "css", json: "json",
      sh: "bash", java: "java", rb: "ruby", go: "go", rs: "rust",
      kt: "kotlin", swift: "swift", scala: "scala", php: "php", r: "r",
      cpp: "cpp", c: "c",
    };
    return map[ext] || "text";
  };

  const handleCreateFile = useCallback((fullPath: string) => {
    const parts = fullPath.split("/");
    const filename = parts[parts.length - 1];
    if (!filename) return;
    const language = detectLanguage(filename);
    const id = Date.now().toString();
    setFiles((prev) => [...prev, { id, filename: fullPath, language, code: "" }]);
    setActiveFileId(id);
  }, []);

  const handleCreateFolder = useCallback((folderPath: string) => {
    const id = `folder-${Date.now()}`;
    setFiles((prev) => [...prev, { id, filename: `${folderPath}/.folder`, language: "folder", code: "" }]);
  }, []);

  const handleFileChange = useCallback((fileId: string, code: string) => {
    setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, code } : f)));
  }, []);

  const handleRenameFile = useCallback((fileId: string, newName: string) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId
          ? { ...f, filename: newName, language: detectLanguage(newName) }
          : f
      )
    );
  }, []);

  const handleDeleteFile = useCallback(
    (fileId: string) => {
      setFiles((prev) => {
        const next = prev.filter((f) => f.id !== fileId);
        if (activeFileId === fileId && next.length > 0) setActiveFileId(next[0].id);
        return next;
      });
    },
    [activeFileId]
  );

  const handleRestoreSnapshot = useCallback(
    (snapshotFiles: CodeFile[]) => {
      setFiles(snapshotFiles);
      if (snapshotFiles.length > 0) setActiveFileId(snapshotFiles[0].id);
      addConsole("info", `▸ Restored snapshot (${snapshotFiles.length} files)`);
      toast.success("Snapshot restored");
    },
    [addConsole]
  );

  // ─── Execution router ──────────────────────────────────────────────────────
  function detectEffectiveLanguage(
    rawLang: string,
    codeFiles: Array<{ filename: string; language: string; code: string }>
  ): string {
    const lang = rawLang.toLowerCase();
    if (BACKEND_LANGUAGES.includes(lang)) return lang;
    if (lang === "react" || lang === "jsx" || lang === "tsx") return "react";
    if (lang === "javascript" || lang === "typescript") {
      const hasJsx = codeFiles.some(
        (f) => /\breact\b/i.test(f.code) && /<[A-Z][A-Za-z]*[\s/>]/.test(f.code)
      );
      if (hasJsx) return "react";
    }
    const mainFile = codeFiles[0];
    if (mainFile?.filename.endsWith(".tsx") || mainFile?.filename.endsWith(".jsx"))
      return "react";
    return lang;
  }

  const executeCode = useCallback(
    async (
      codeFiles: Array<{ filename: string; language: string; code: string }>,
      language: string
    ): Promise<ExecutionResult> => {
      const effectiveLang = detectEffectiveLanguage(language, codeFiles);

      if (isWebLanguage(effectiveLang)) {
        addConsole("info", `▸ Executing in browser sandbox (${effectiveLang})…`);
        let codeToRun: string;
        let execLang = effectiveLang;

        if (effectiveLang === "react") {
          const mainFile =
            codeFiles.find(
              (f) =>
                f.filename.endsWith(".tsx") ||
                f.filename.endsWith(".jsx") ||
                f.language === "react"
            ) ?? codeFiles[0];
          codeToRun = mainFile.code;
        } else if (effectiveLang === "html" && codeFiles.length > 1) {
          codeToRun = bundleWebFiles(codeFiles);
          execLang = "html";
        } else {
          const mainFile =
            codeFiles.find((f) => f.language === effectiveLang) ?? codeFiles[0];
          codeToRun = mainFile.code;
        }

        try {
          const result = await executeInBrowser(codeToRun, execLang);
          addConsole("info", `⚡ Browser execution complete (${result.executionTime})`);
          return { ...result, language: effectiveLang };
        } catch (e) {
          return {
            stdout: "",
            stderr: e instanceof Error ? e.message : "Execution failed",
            exitCode: 1,
            language: effectiveLang,
          };
        }
      }

      addConsole("info", `▸ Sending to remote executor (${effectiveLang})…`);
      try {
        const result = await executeCodeRemote(codeFiles, effectiveLang);
        addConsole("info", `⚡ Execution complete`);
        return result;
      } catch (e) {
        return {
          stdout: "",
          stderr: e instanceof Error ? e.message : "Remote execution failed",
          exitCode: 1,
          language: effectiveLang,
        };
      }
    },
    [addConsole]
  );

  const handleRunCode = useCallback(async () => {
    if (files.length === 0) return;
    const lang = files[0]?.language ?? "javascript";
    const codeFiles = files.map((f) => ({
      filename: f.filename,
      language: f.language,
      code: f.code,
    }));

    addConsole("info", "▸ Running code…");
    try {
      const result = await executeCode(codeFiles, lang);
      setLastExecutionResult(result);
      addConsole(
        result.exitCode === 0 ? "stdout" : "stderr",
        result.exitCode === 0
          ? result.stdout || "✓ Execution successful"
          : result.stderr || "Unknown error"
      );
    } catch (e) {
      addConsole("stderr", `Execution error: ${e instanceof Error ? e.message : "Unknown"}`);
    }
  }, [files, executeCode, addConsole]);

  // ─── Coder agent ───────────────────────────────────────────────────────────
  const runCoderAgent = useCallback(
    async (
      prompt: string,
      plan: { steps: Array<{ title: string; description?: string }>; language: string },
      signal?: AbortSignal
    ): Promise<{
      files: Array<{ filename: string; language: string; code: string }>;
      explanation: string;
    } | null> => {
      setAgentState("coding");
      addConsole("agent", "Starting code generation…", "coder");

      return new Promise((resolve) => {
        streamAgentResponse({
          functionName: "coder",
          body: { prompt, plan, language: plan.language },
          onDelta: () => {},
          onDone: (text) => {
            const parsed = parseCoderResponse(text);
            addConsole("stdout", `✓ Generated ${parsed.files.length} file(s)`, "coder");

            const codeFiles: CodeFile[] = parsed.files.map((f, i) => ({
              id: (i + 1).toString(),
              filename: f.filename,
              language: f.language,
              code: f.code,
            }));
            setFiles(codeFiles);
            if (codeFiles.length > 0) setActiveFileId("1");

            const msg = parsed.explanation || "Code generated successfully.";
            setMessages((prev) => [
              ...prev,
              {
                id: Date.now().toString(),
                role: "assistant",
                agent: "coder",
                content: msg,
                timestamp: new Date(),
              },
            ]);
            persistMessage("assistant", msg, "coder");
            resolve(parsed);
          },
          onError: (err) => {
            addConsole("stderr", `Coder error: ${err}`, "coder");
            toast.error(`Coder agent failed: ${err}`);
            resolve(null);
          },
          signal,
        });
      });
    },
    [addConsole, persistMessage]
  );

  const runDebuggerAgent = useCallback(
    async (
      prompt: string,
      code: Array<{ filename: string; language: string; code: string }>,
      errorMsg: string,
      retry: number,
      language: string,
      signal?: AbortSignal
    ) => {
      setAgentState("debugging");
      addConsole("agent", `Debugging attempt ${retry}/3…`, "debugger");

      const memoryContext = getMemoryContext(errorMsg, language);
      if (memoryContext) {
        addConsole("info", "▸ Found similar past fixes in agent memory", "debugger");
      }

      return new Promise<{
        fixes: Array<{ filename: string; language: string; code: string }>;
        explanation: string;
        confidence: string;
        diagnosis: string;
      } | null>((resolve) => {
        streamAgentResponse({
          functionName: "debugger",
          body: {
            prompt,
            code,
            error: errorMsg + memoryContext,
            retryCount: retry,
          },
          onDelta: () => {},
          onDone: (text) => {
            const parsed = parseDebuggerResponse(text);
            addConsole("agent", `Diagnosis: ${parsed.diagnosis}`, "debugger");

            let msg = "";
            if (parsed.fixes.length > 0) {
              addMemoryEntry({
                errorPattern: errorMsg.substring(0, 300),
                fix: parsed.explanation.substring(0, 500),
                language,
                confidence: parsed.confidence,
              });

              const codeFiles: CodeFile[] = parsed.fixes.map((f, i) => ({
                id: (i + 1).toString(),
                filename: f.filename,
                language: f.language,
                code: f.code,
              }));
              setFiles(codeFiles);

              msg = `**Fix applied** (confidence: ${parsed.confidence})\n\n${parsed.explanation}`;
            } else {
              msg = `**Diagnosis**: ${parsed.diagnosis}\n\n**Explanation**: ${parsed.explanation}\n\n*No automatic fix available.*`;
            }

            setMessages((prev) => [
              ...prev,
              {
                id: Date.now().toString(),
                role: "assistant",
                agent: "debugger",
                content: msg,
                timestamp: new Date(),
              },
            ]);
            persistMessage("assistant", msg, "debugger");

            resolve(parsed);
          },
          onError: (err) => {
            addConsole("stderr", `Debugger error: ${err}`, "debugger");
            resolve(null);
          },
          signal,
        });
      });
    },
    [addConsole, persistMessage]
  );

  // ─── Main pipeline ─────────────────────────────────────────────────────────
  const handleSendMessage = useCallback(
    async (content: string) => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const { signal } = controller;

      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      persistMessage("user", content);
      setIsLoading(true);
      retryCountRef.current = 0;
      setLastExecutionResult(null);

      try {
        setAgentState("planning");
        addConsole("info", "▸ Starting agent pipeline…");
        addConsole("agent", `Analyzing: "${content.substring(0, 80)}"`, "planner");

        const plan = await callPlannerAgent(content, signal);

        const planSteps: PlanStep[] = plan.steps.map((s, i) => ({
          id: (i + 1).toString(),
          title: s.title,
          description: s.description,
          status: "pending" as const,
        }));
        setSteps(planSteps);
        setActiveStepId("1");

        addConsole("agent", `Generated ${plan.steps.length}-step plan (${plan.language})`, "planner");
         
        

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "assistant",
            agent: "planner",
            content: planMsg,
            timestamp: new Date(),
          },
        ]);
        persistMessage("assistant", planMsg, "planner");
        setSteps((prev) =>
          prev.map((s, i) => (i === 0 ? { ...s, status: "in-progress" as const } : s))
        );

        const coderResult = await runCoderAgent(content, plan, signal);
        if (!coderResult) {
          setAgentState("error");
          setIsLoading(false);
          return;
        }
        setSteps((prev) => prev.map((s) => ({ ...s, status: "done" as const })));

        addConsole("info", "▸ Executing generated code…");
        setAgentState("coding");

        let currentFiles = coderResult.files;
        let execResult: ExecutionResult;

        try {
          execResult = await executeCode(currentFiles, plan.language);
        } catch (err) {
          addConsole("stderr", `Execution error: ${err instanceof Error ? err.message : "Unknown error"}`);
          setAgentState("error");
          setIsLoading(false);
          return;
        }

        addConsole(
          execResult.exitCode === 0 ? "stdout" : "stderr",
          execResult.exitCode === 0
            ? execResult.stdout || "No output"
            : execResult.stderr || "Unknown error"
        );

        setLastExecutionResult({ ...execResult, language: plan.language });

        const effectiveLang = plan.language.toLowerCase();
        const isWeb = isWebLanguage(effectiveLang);

        while (execResult.exitCode !== 0 && retryCountRef.current < 3) {
          if (isWeb && (execResult.stderr ?? "").toLowerCase().includes("timeout")) {
            addConsole("info", "▸ Timeout on visual page — treating as rendered successfully.");
            execResult = { ...execResult, exitCode: 0 };
            setLastExecutionResult({ ...execResult, exitCode: 0, language: plan.language });
            break;
          }

          retryCountRef.current++;
          addConsole("info", `▸ Error detected — auto-debug attempt ${retryCountRef.current}/3…`);

          const debugResult = await runDebuggerAgent(
            content,
            currentFiles,
            execResult.stderr ?? "Unknown error",
            retryCountRef.current,
            plan.language,
            signal
          );

          if (!debugResult) {
            addConsole("stderr", "Debugger failed to respond.");
            break;
          }
          if (debugResult.fixes.length === 0) {
            addConsole("stderr", "Debugger could not produce a fix.");
            break;
          }

          currentFiles = debugResult.fixes;
          addConsole("info", "▸ Re-executing fixed code…");

          try {
            execResult = await executeCode(currentFiles, plan.language);
          } catch (err) {
            addConsole("stderr", `Re-execution error: ${err instanceof Error ? err.message : "Unknown"}`);
            break;
          }

          setLastExecutionResult({ ...execResult, language: plan.language });

          addConsole(
            execResult.exitCode === 0 ? "stdout" : "stderr",
            execResult.exitCode === 0
              ? execResult.stdout || "No output"
              : execResult.stderr || "Unknown error"
          );
        }

        if (execResult.exitCode === 0) {
          setAgentState("complete");
          addConsole("info", "▸ Pipeline complete ✓");
        } else {
          setAgentState("error");
          addConsole("stderr", "▸ Max retries reached — manual intervention needed.");
        }

        if (projectId && projectId !== "new" && projectId !== "demo" && user) {
          updateProject.mutate({
            id: projectId,
            title: content.substring(0, 60),
            description: content.substring(0, 200),
            language: plan.language,
            plan: plan.steps as unknown[],
            generated_code: currentFiles as unknown[],
          });
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") {
          addConsole("info", "▸ Pipeline cancelled.");
          setAgentState("idle");
          return;
        }

        const errMsg = e instanceof Error ? e.message : "Unknown error";
        setAgentState("error");
        addConsole("stderr", `Pipeline error: ${errMsg}`);
        toast.error(errMsg);

        if (
          errMsg.includes("Authentication required") ||
          errMsg.includes("Not authorized") ||
          errMsg.includes("no token")
        ) {
          toast.error("Your session has expired. Please log in again.");
          window.location.href = "/login";
          return;
        }

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "assistant",
            content: `❌ An error occurred: ${errMsg}`,
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [
      addConsole,
      runCoderAgent,
      runDebuggerAgent,
      persistMessage,
      projectId,
      user,
      updateProject,
      executeCode,
    ]
  );

  const clearConsole = useCallback(() => setConsoleLines([]), []);

  return {
    agentState,
    messages,
    steps,
    activeStepId,
    files,
    setFiles,
    activeFileId,
    setActiveFileId,
    consoleLines,
    isLoading,
    lastExecutionResult,
    handleSendMessage,
    handleFileChange,
    handleCreateFile,
    handleCreateFolder,
    handleRenameFile,
    handleDeleteFile,
    handleRestoreSnapshot,
    handleRunCode,
    clearConsole,
  };
}