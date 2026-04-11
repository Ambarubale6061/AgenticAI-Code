// src/components/workspace/PreviewPanel.tsx

import { useEffect, useRef, useState, useMemo } from "react";
import { Eye, RefreshCw, AlertTriangle, Server, Terminal, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import PanelHeader from "./PanelHeader";
import type { CodeFile } from "./CodePanel";
import { sanitizeHtml, bundleWebFiles, isServerSideFile } from "@/lib/browserExecutor";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime?: string;
  isReal?: boolean;
  language?: string;
}

interface PreviewPanelProps {
  files: CodeFile[];
  visible?: boolean;
  executionResult?: ExecutionResult | null;
}

type PreviewMode = "html" | "react" | "js" | "ts" | "backend" | "none";

// ─── Language meta (colours + icons for terminal header) ─────────────────────

const LANG_META: Record<string, { color: string; bg: string; border: string; icon: string }> = {
  python:     { color: "#4EC9B0", bg: "#4EC9B015", border: "#4EC9B033", icon: "🐍" },
  java:       { color: "#F0A500", bg: "#F0A50015", border: "#F0A50033", icon: "☕" },
  rust:       { color: "#CE6830", bg: "#CE683015", border: "#CE683033", icon: "🦀" },
  go:         { color: "#00ACD7", bg: "#00ACD715", border: "#00ACD733", icon: "🐹" },
  ruby:       { color: "#CC342D", bg: "#CC342D15", border: "#CC342D33", icon: "💎" },
  kotlin:     { color: "#7F52FF", bg: "#7F52FF15", border: "#7F52FF33", icon: "K" },
  swift:      { color: "#F05138", bg: "#F0513815", border: "#F0513833", icon: "S" },
  scala:      { color: "#DC322F", bg: "#DC322F15", border: "#DC322F33", icon: "S" },
  php:        { color: "#777BB4", bg: "#777BB415", border: "#777BB433", icon: "P" },
  node:       { color: "#68A063", bg: "#68A06315", border: "#68A06333", icon: "⬡" },
  nodejs:     { color: "#68A063", bg: "#68A06315", border: "#68A06333", icon: "⬡" },
  bash:       { color: "#89E051", bg: "#89E05115", border: "#89E05133", icon: "$" },
  shell:      { color: "#89E051", bg: "#89E05115", border: "#89E05133", icon: "$" },
  cpp:        { color: "#F34B7D", bg: "#F34B7D15", border: "#F34B7D33", icon: "C++" },
  c:          { color: "#555555", bg: "#55555515", border: "#55555533", icon: "C" },
  r:          { color: "#198CE7", bg: "#198CE715", border: "#198CE733", icon: "R" },
  javascript: { color: "#F7DF1E", bg: "#F7DF1E15", border: "#F7DF1E33", icon: "JS" },
  typescript: { color: "#3178C6", bg: "#3178C615", border: "#3178C633", icon: "TS" },
};

function getLangMeta(lang: string) {
  return LANG_META[lang.toLowerCase()] ?? {
    color: "#888888", bg: "#88888815", border: "#88888833", icon: "⚙",
  };
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Terminal output page builder ─────────────────────────────────────────────

function buildTerminalPage(result: ExecutionResult, files: CodeFile[]): string {
  const rawLang = (result.language ?? files[0]?.language ?? "unknown").toLowerCase();
  const lang    = rawLang === "nodejs" ? "node" : rawLang;
  const meta    = getLangMeta(lang);
  const fname   = files[0]?.filename ?? "output";
  const success = result.exitCode === 0;

  const stdoutHtml = result.stdout
    ? `<div class="section">
        <div class="section-label">stdout</div>
        <div class="output-block stdout">${escHtml(result.stdout)}</div>
      </div>`
    : "";

  const stderrHtml = result.stderr
    ? `<div class="section" style="margin-top:${result.stdout ? "10px" : "14px"}">
        <div class="section-label">stderr</div>
        <div class="output-block stderr">${escHtml(result.stderr)}</div>
      </div>`
    : "";

  const emptyHtml =
    !result.stdout && !result.stderr
      ? `<div class="section" style="margin-top:14px">
          <div class="output-block empty">No output produced.</div>
        </div>`
      : "";

  const bannerClass = success ? "banner-ok" : "banner-err";
  const bannerText  = success
    ? "✓ Executed successfully"
    : `✗ Exited with code ${result.exitCode}`;

  const execTime = result.executionTime
    ? `<span class="time">⏱ ${escHtml(result.executionTime)}</span>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    :root{color-scheme:dark}
    body{
      background:#0d1117;color:#e6edf3;
      font-family:'SF Mono','JetBrains Mono','Fira Code','Consolas',monospace;
      font-size:13px;line-height:1.65;height:100vh;
      display:flex;flex-direction:column;overflow:hidden
    }
    .header{
      background:#161b22;border-bottom:1px solid #30363d;
      padding:8px 14px;display:flex;align-items:center;gap:10px;flex-shrink:0
    }
    .dots{display:flex;gap:6px}
    .dot{width:12px;height:12px;border-radius:50%}
    .dot-r{background:#ff5f57}.dot-y{background:#febc2e}.dot-g{background:#28c840}
    .lang-badge{
      background:${meta.bg};color:${meta.color};border:1px solid ${meta.border};
      padding:1px 8px;border-radius:4px;font-size:11px;font-weight:700;
      text-transform:uppercase;letter-spacing:.05em;white-space:nowrap
    }
    .fname{color:#8b949e;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px}
    .meta{margin-left:auto;display:flex;align-items:center;gap:8px;flex-shrink:0}
    .time{color:#8b949e;font-size:11px}
    .exit-ok{background:#1a7f3722;border:1px solid #1a7f3744;color:#56d364;padding:1px 8px;border-radius:4px;font-size:11px;font-weight:600}
    .exit-err{background:#8a1a1a22;border:1px solid #8a1a1a44;color:#f78166;padding:1px 8px;border-radius:4px;font-size:11px;font-weight:600}
    .terminal{flex:1;padding:16px;overflow-y:auto;overflow-x:hidden}
    .banner-ok{
      display:flex;align-items:center;gap:8px;margin-bottom:14px;
      background:#1a7f3715;border:1px solid #1a7f3733;border-radius:6px;
      padding:10px 14px;color:#56d364;font-size:13px
    }
    .banner-err{
      display:flex;align-items:center;gap:8px;margin-bottom:14px;
      background:#8a1a1a15;border:1px solid #8a1a1a33;border-radius:6px;
      padding:10px 14px;color:#f78166;font-size:13px
    }
    .section{margin-top:14px}
    .section-label{
      color:#8b949e;font-size:10px;text-transform:uppercase;letter-spacing:.1em;
      margin-bottom:6px;display:flex;align-items:center;gap:6px
    }
    .section-label::after{content:'';flex:1;height:1px;background:#21262d}
    .output-block{
      background:#010409;border:1px solid #21262d;border-radius:6px;
      padding:12px 14px;white-space:pre-wrap;word-break:break-word;
      font-size:13px;line-height:1.7
    }
    .stdout{color:#e6edf3}
    .stderr{color:#f78166}
    .empty{color:#484f58;font-style:italic}
    ::-webkit-scrollbar{width:6px}
    ::-webkit-scrollbar-track{background:#0d1117}
    ::-webkit-scrollbar-thumb{background:#30363d;border-radius:3px}
  </style>
</head>
<body>
  <div class="header">
    <div class="dots">
      <div class="dot dot-r"></div>
      <div class="dot dot-y"></div>
      <div class="dot dot-g"></div>
    </div>
    <div class="lang-badge">${meta.icon} ${lang}</div>
    <span class="fname">${escHtml(fname)}</span>
    <div class="meta">
      ${execTime}
      <span class="${success ? "exit-ok" : "exit-err"}">exit ${result.exitCode}</span>
    </div>
  </div>
  <div class="terminal">
    <div class="${bannerClass}">${bannerText}</div>
    ${stdoutHtml}
    ${stderrHtml}
    ${emptyHtml}
  </div>
</body>
</html>`;
}

// ─── Language detection for web modes ────────────────────────────────────────

function detectMode(files: CodeFile[]): PreviewMode {
  if (files.length === 0) return "none";

  const browserFiles = files.filter((f) => !isServerSideFile(f));
  if (browserFiles.length === 0) return "backend";

  const hasHtml  = browserFiles.some((f) => f.language === "html" || f.filename.endsWith(".html"));
  const hasReact = browserFiles.some(
    (f) =>
      f.language === "react" ||
      f.filename.endsWith(".tsx") ||
      f.filename.endsWith(".jsx") ||
      (["javascript", "typescript"].includes(f.language) &&
        /\breact\b/i.test(f.code) &&
        /<[A-Z][A-Za-z]*[\s/>]/.test(f.code)),
  );
  const hasTs  = browserFiles.some((f) => f.language === "typescript");
  const hasJs  = browserFiles.some((f) => f.language === "javascript");
  const hasCss = browserFiles.some((f) => f.language === "css");

  if (hasReact)                    return "react";
  if (hasHtml || (hasCss && hasJs)) return "html";
  if (hasTs)                        return "ts";
  if (hasJs || hasCss)              return "js";
  return "none";
}

// ─── Web preview builders ─────────────────────────────────────────────────────

function buildReactPreview(files: CodeFile[]): string {
  return bundleWebFiles(files);
}

function buildHtmlPreview(files: CodeFile[]): string {
  if (files.length > 1) return bundleWebFiles(files);

  const htmlFile = files.find((f) => f.language === "html" || f.filename.endsWith(".html"));
  if (htmlFile) return sanitizeHtml(htmlFile.code);

  const cssFiles = files.filter((f) => f.language === "css");
  if (cssFiles.length > 0) {
    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/>
<style>body{margin:0;padding:0;font-family:system-ui,sans-serif}${cssFiles.map((f) => f.code).join("\n")}</style>
</head><body>
  <div class="container">
    <h1>CSS Preview</h1><p>Your styles have been applied.</p>
    <button class="btn">Sample Button</button><div class="card"><span>Sample Card</span></div>
  </div>
</body></html>`;
  }

  return bundleWebFiles(files);
}

function buildTsPreview(files: CodeFile[]): string {
  const browserFiles = files.filter((f) => !isServerSideFile(f));
  const cssFiles  = browserFiles.filter((f) => f.language === "css");
  const tsFiles   = browserFiles.filter((f) => f.language === "typescript");
  const inlineCss = cssFiles.map((f) => f.code).join("\n");
  const rawTs     = tsFiles.map((f) => f.code).join("\n\n");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    body{font-family:system-ui,sans-serif;background:#0f1117;color:#e2e8f0;margin:0;padding:16px}
    #app{margin-bottom:16px}
    #console-output{background:#1a1e2e;border:1px solid #2d3348;border-radius:8px;padding:12px;font-family:monospace;font-size:13px;white-space:pre-wrap;min-height:40px;color:#a0aec0}
    .console-label{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#4a5568;margin-bottom:4px}
    ${inlineCss}
  </style>
</head>
<body>
  <div id="app"></div>
  <div class="console-label">Console</div>
  <pre id="console-output"></pre>
  <script type="text/babel" data-presets="typescript">
    var _out=document.getElementById('console-output');
    var _write=function(color,text){var span=document.createElement('span');span.style.color=color;span.textContent=text+'\\n';_out.appendChild(span);};
    var __origLog=console.log,__origWarn=console.warn,__origErr=console.error;
    console.log  =function(){var s=Array.from(arguments).map(function(a){return typeof a==='object'?JSON.stringify(a,null,2):String(a);}).join(' ');_write('#a0aec0',s);__origLog.apply(console,arguments);};
    console.warn =function(){var s=Array.from(arguments).join(' ');_write('#f6e05e',s);__origWarn.apply(console,arguments);};
    console.error=function(){var s=Array.from(arguments).join(' ');_write('#fc8181',s);__origErr.apply(console,arguments);};
    window.onerror=function(_m,_s,_l,_c,e){_write('#fc8181','✖ '+(e?e.message:_m));return true;};
    try {
      ${rawTs}
    } catch(e) {
      _write('#fc8181','✖ '+e.name+': '+e.message);
    }
  </script>
</body>
</html>`;
}

function buildJsPreview(files: CodeFile[]): string {
  const browserFiles = files.filter((f) => !isServerSideFile(f));
  const cssFiles  = browserFiles.filter((f) => f.language === "css");
  const jsFiles   = browserFiles.filter((f) => f.language === "javascript");
  const inlineCss = cssFiles.map((f) => f.code).join("\n");
  const rawJs     = jsFiles.map((f) => f.code).join("\n\n");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <style>
    body{font-family:system-ui,sans-serif;background:#0f1117;color:#e2e8f0;margin:0;padding:16px}
    #app{margin-bottom:16px}
    #console-output{background:#1a1e2e;border:1px solid #2d3348;border-radius:8px;padding:12px;font-family:monospace;font-size:13px;white-space:pre-wrap;min-height:40px;color:#a0aec0}
    .console-label{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#4a5568;margin-bottom:4px}
    ${inlineCss}
  </style>
</head>
<body>
  <div id="app"></div>
  <div class="console-label">Console</div>
  <pre id="console-output"></pre>
  <script>
    var _out=document.getElementById('console-output');
    var _write=function(color,text){var span=document.createElement('span');span.style.color=color;span.textContent=text+'\\n';_out.appendChild(span);};
    var __origLog=console.log,__origWarn=console.warn,__origErr=console.error;
    console.log  =function(){var s=Array.from(arguments).map(function(a){return typeof a==='object'?JSON.stringify(a,null,2):String(a);}).join(' ');_write('#a0aec0',s);__origLog.apply(console,arguments);};
    console.warn =function(){var s=Array.from(arguments).join(' ');_write('#f6e05e',s);__origWarn.apply(console,arguments);};
    console.error=function(){var s=Array.from(arguments).join(' ');_write('#fc8181',s);__origErr.apply(console,arguments);};
    window.onerror=function(_m,_s,_l,_c,e){_write('#fc8181','✖ '+(e?e.message:_m));return true;};
    try {
${rawJs}
    } catch(e) { _write('#fc8181','✖ '+e.name+': '+e.message); }
  </script>
</body>
</html>`;
}

function buildBackendPlaceholder(files: CodeFile[]): string {
  const serverFiles = files.filter((f) => isServerSideFile(f));
  const fileList    = serverFiles.map((f) => `• ${f.filename}`).join("\n");
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/>
<style>
  body{font-family:system-ui,sans-serif;background:#0f1117;color:#e2e8f0;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
  .card{background:#1a1e2e;border:1px solid #2d3348;border-radius:12px;padding:32px 40px;text-align:center;max-width:420px}
  h2{margin:0 0 8px;color:#a78bfa;font-size:18px}
  p{margin:0 0 16px;color:#94a3b8;font-size:14px;line-height:1.5}
  pre{background:#0f1117;border:1px solid #2d3348;border-radius:8px;padding:12px;font-size:12px;text-align:left;color:#64748b;white-space:pre-wrap}
  .hint{margin-top:12px;font-size:12px;color:#475569}
</style></head>
<body>
  <div class="card">
    <h2>⚙️ Backend Project</h2>
    <p>This project runs server-side. Output will appear in the Console panel after execution.</p>
    <pre>${fileList}</pre>
    <p class="hint">Run the code to see results here.</p>
  </div>
</body>
</html>`;
}

// ─── Component ────────────────────────────────────────────────────────────────

const PreviewPanel = ({ files, visible = true, executionResult }: PreviewPanelProps) => {
  const iframeRef  = useRef<HTMLIFrameElement>(null);
  const [refreshKey, setRefreshKey]   = useState(0);
  const [iframeError, setIframeError] = useState<string | null>(null);
  const [isLoading, setIsLoading]     = useState(false);

  const mode = useMemo(() => detectMode(files), [files]);

  const { previewHTML, isTerminal } = useMemo<{
    previewHTML: string | null;
    isTerminal: boolean;
  }>(() => {
    if (files.length === 0 && !executionResult) {
      return { previewHTML: null, isTerminal: false };
    }

    try {
      switch (mode) {
        case "react":
          return { previewHTML: buildReactPreview(files), isTerminal: false };
        case "html":
          return { previewHTML: buildHtmlPreview(files), isTerminal: false };
        case "ts":
          return { previewHTML: buildTsPreview(files), isTerminal: false };
        case "js":
          return { previewHTML: buildJsPreview(files), isTerminal: false };
        case "backend":
          if (executionResult) {
            return { previewHTML: buildTerminalPage(executionResult, files), isTerminal: true };
          }
          return { previewHTML: buildBackendPlaceholder(files), isTerminal: false };
        case "none":
          if (executionResult) {
            return { previewHTML: buildTerminalPage(executionResult, files), isTerminal: true };
          }
          return { previewHTML: null, isTerminal: false };
      }
    } catch (err) {
      console.error("Preview generation error:", err);
      return { previewHTML: null, isTerminal: false };
    }

    return { previewHTML: null, isTerminal: false };
  }, [files, mode, executionResult]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !previewHTML) return;

    setIsLoading(true);
    setIframeError(null);

    try {
      iframe.srcdoc = previewHTML;
    } catch (e) {
      setIframeError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [previewHTML]);

  const handleOpenInNewTab = () => {
    if (!previewHTML) return;
    const blob = new Blob([previewHTML], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    URL.revokeObjectURL(url);
  };

  if (!visible) return null;

  if (!previewHTML) {
    return (
      <div className="flex flex-col h-full">
        <PanelHeader title="Preview" icon={Eye} iconColor="text-accent" />
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Eye className="h-8 w-8 opacity-20" />
          <p className="text-sm">No preview available yet</p>
          <p className="text-xs opacity-60">
            Run your code to see output here
          </p>
        </div>
      </div>
    );
  }

  const modeBadge = (() => {
    if (isTerminal) {
      const lang = (executionResult?.language ?? files[0]?.language ?? "").toLowerCase();
      const meta = getLangMeta(lang);
      return (
        <span
          className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded select-none"
          style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}
        >
          <Terminal className="h-2.5 w-2.5" />
          {lang || "output"}
        </span>
      );
    }
    if (mode === "backend") {
      return (
        <span className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded select-none bg-violet-500/10 text-violet-400">
          <Server className="h-2.5 w-2.5" />
          backend
        </span>
      );
    }
    return (
      <span className="text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded select-none bg-muted text-muted-foreground">
        {mode}
      </span>
    );
  })();

  return (
    <div className="flex flex-col h-full">
      <PanelHeader title="Preview" icon={Eye} iconColor="text-accent">
        {modeBadge}
        {!isTerminal && previewHTML && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            title="Open in new tab (full‑screen)"
            onClick={handleOpenInNewTab}
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          title="Refresh preview"
          onClick={() => setRefreshKey((k) => k + 1)}
        >
          <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </PanelHeader>

      {iframeError && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10 border-b border-destructive/30 text-destructive text-xs font-mono">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          <span className="truncate">{iframeError}</span>
        </div>
      )}

      <div className={`flex-1 min-h-0 ${isTerminal ? "bg-[#0d1117]" : "bg-white"}`}>
        <iframe
          ref={iframeRef}
          key={refreshKey}
          sandbox="allow-scripts allow-modals"
          className="w-full h-full border-0"
          title="Preview"
          srcDoc={previewHTML}
        />
      </div>
    </div>
  );
};

export default PreviewPanel;