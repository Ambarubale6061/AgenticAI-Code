import { useState, useCallback } from "react";
import { Code2, Copy, Download, Check, Play, ChevronRight, FileCode, FileJson, FileType, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import PanelHeader from "./PanelHeader";
import Editor from "@monaco-editor/react";

export interface CodeFile {
  id: string;
  filename: string;
  language: string;
  code: string;
}

interface CodePanelProps {
  files: CodeFile[];
  activeFileId?: string;
  onSelectFile?: (id: string) => void;
  onFileChange?: (id: string, code: string) => void;
  onRunCode?: () => void;
  isRunning?: boolean;
}

const langMap: Record<string, string> = {
  javascript: "javascript",
  typescript: "typescript",
  python: "python",
  html: "html",
  css: "css",
  json: "json",
  bash: "shell",
  text: "plaintext",
};

const getFileIcon = (lang: string) => {
  switch (lang) {
    case "javascript": return <FileCode className="h-3.5 w-3.5 text-yellow-400" />;
    case "typescript": return <FileCode className="h-3.5 w-3.5 text-blue-400" />;
    case "python": return <FileType className="h-3.5 w-3.5 text-emerald-400" />;
    case "json": return <FileJson className="h-3.5 w-3.5 text-orange-300" />;
    default: return <FileText className="h-3.5 w-3.5 text-zinc-400" />;
  }
};

const CodePanel = ({ files, activeFileId, onSelectFile, onFileChange, onRunCode, isRunning }: CodePanelProps) => {
  const [copied, setCopied] = useState(false);
  const active = files.find(f => f.id === activeFileId) || files[0];

  const handleCopy = async () => {
    if (!active) return;
    await navigator.clipboard.writeText(active.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!active) return;
    const blob = new Blob([active.code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = active.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleEditorChange = useCallback((value: string | undefined) => {
    if (value !== undefined && active && onFileChange) {
      onFileChange(active.id, value);
    }
  }, [active, onFileChange]);

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      {/* Main Header */}
      <PanelHeader title="Source" icon={Code2} iconColor="text-blue-400">
        {active && (
          <div className="flex items-center gap-1.5 px-2">
            {onRunCode && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-3 gap-2 text-[11px] font-bold text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 transition-all active:scale-95"
                onClick={onRunCode}
                disabled={isRunning}
              >
                <Play className={`h-3.5 w-3.5 fill-current ${isRunning ? "animate-pulse" : ""}`} />
                {isRunning ? "Running..." : "Run Code"}
              </Button>
            )}
            <div className="h-4 w-px bg-white/10 mx-1" />
            <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-white" onClick={handleCopy}>
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-white" onClick={handleDownload}>
              <Download className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </PanelHeader>

      {/* Tabs Bar */}
      {files.length > 0 && (
        <div className="flex items-center bg-[#252526] border-b border-black/40 overflow-x-auto no-scrollbar">
          {files.map(f => {
            const isActive = f.id === active?.id;
            return (
              <button
                key={f.id}
                onClick={() => onSelectFile?.(f.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 text-[13px] font-medium min-w-fit transition-colors relative
                  ${isActive 
                    ? "bg-[#1e1e1e] text-zinc-100" 
                    : "bg-[#2d2d2d] text-zinc-500 hover:bg-[#2a2d2e] hover:text-zinc-300"}
                `}
              >
                {isActive && <div className="absolute top-0 left-0 right-0 h-[2px] bg-blue-500" />}
                {getFileIcon(f.language)}
                <span className="font-mono tracking-tight">{f.filename}</span>
                {isActive && <div className="ml-2 w-1.5 h-1.5 rounded-full bg-white/20" />}
              </button>
            );
          })}
        </div>
      )}

      {/* Breadcrumbs */}
      {active && (
        <div className="flex items-center gap-1.5 px-4 py-1.5 bg-[#1e1e1e] border-b border-white/[0.03]">
          <div className="flex items-center gap-1 text-[11px] text-zinc-500 font-mono">
            <span>src</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-zinc-300">{active.filename}</span>
          </div>
        </div>
      )}

      {/* Editor Surface */}
      <div className="flex-1 min-h-0 bg-[#1e1e1e]">
        {active ? (
          <Editor
            height="100%"
            language={langMap[active.language] || "plaintext"}
            value={active.code}
            onChange={handleEditorChange}
            theme="vs-dark"
            loading={<div className="h-full w-full bg-[#1e1e1e] animate-pulse" />}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineHeight: 22,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              fontLigatures: true,
              padding: { top: 12, bottom: 12 },
              scrollBeyondLastLine: false,
              renderLineHighlight: "all",
              bracketPairColorization: { enabled: true },
              autoClosingBrackets: "always",
              autoClosingQuotes: "always",
              tabSize: 2,
              wordWrap: "on",
              smoothScrolling: true,
              cursorBlinking: "smooth",
              cursorSmoothCaretAnimation: "on",
              roundedSelection: true,
              overviewRulerLanes: 0,
              scrollbar: {
                verticalScrollbarSize: 10,
                horizontalScrollbarSize: 10,
                verticalHasArrows: false,
                horizontalHasArrows: false,
                useShadows: false,
              },
              lineNumbersMinChars: 3,
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full opacity-20 select-none">
            <Code2 className="h-16 w-16 mb-4" />
            <p className="text-sm font-medium">Select a file to view code</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CodePanel;