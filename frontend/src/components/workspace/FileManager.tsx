import { useState } from "react";
import { 
  FolderTree, 
  Plus, 
  Pencil, 
  Trash2, 
  FileCode, 
  X, 
  Check, 
  ChevronRight,
  MoreVertical,
  FileJson,
  FileText,
  FileType
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import PanelHeader from "./PanelHeader";
import type { CodeFile } from "./CodePanel";

interface FileManagerProps {
  files: CodeFile[];
  activeFileId?: string;
  onSelectFile: (id: string) => void;
  onCreateFile: (filename: string, language: string) => void;
  onRenameFile: (id: string, newName: string) => void;
  onDeleteFile: (id: string) => void;
}

const langFromExt: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  py: "python",
  html: "html",
  css: "css",
  json: "json",
  sh: "bash",
  txt: "text",
};

const getFileIcon = (lang: string) => {
  switch (lang) {
    case "javascript": return <FileCode className="h-4 w-4 text-yellow-400" />;
    case "typescript": return <FileCode className="h-4 w-4 text-blue-400" />;
    case "python": return <FileType className="h-4 w-4 text-emerald-400" />;
    case "json": return <FileJson className="h-4 w-4 text-orange-300" />;
    case "html": return <FileCode className="h-4 w-4 text-orange-500" />;
    case "css": return <FileCode className="h-4 w-4 text-blue-300" />;
    default: return <FileText className="h-4 w-4 text-zinc-400" />;
  }
};

function detectLang(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return langFromExt[ext] || "text";
}

const FileManager = ({
  files,
  activeFileId,
  onSelectFile,
  onCreateFile,
  onRenameFile,
  onDeleteFile,
}: FileManagerProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newFilename, setNewFilename] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const handleCreate = () => {
    const name = newFilename.trim();
    if (!name) return;
    const lang = detectLang(name);
    onCreateFile(name, lang);
    setNewFilename("");
    setIsCreating(false);
  };

  const handleRename = (id: string) => {
    const name = renameValue.trim();
    if (!name) return;
    onRenameFile(id, name);
    setRenamingId(null);
    setRenameValue("");
  };

  return (
    <div className="flex flex-col h-full bg-[#090b10] border-r border-white/[0.05]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.03]">
        <div className="flex items-center gap-2">
          <ChevronRight className="h-3 w-3 text-zinc-500" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Explorer</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 hover:bg-white/10 text-zinc-400"
          onClick={() => {
            setIsCreating(true);
            setNewFilename("");
          }}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {/* New File Input */}
          {isCreating && (
            <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-sm ring-1 ring-primary/30 mx-1">
              <FileCode className="h-3.5 w-3.5 text-primary/70" />
              <Input
                value={newFilename}
                onChange={(e) => setNewFilename(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") setIsCreating(false);
                }}
                className="h-5 p-0 text-[12px] bg-transparent border-0 focus-visible:ring-0 placeholder:text-zinc-600 font-mono"
                placeholder="new-file.ts"
                autoFocus
              />
            </div>
          )}

          {files.length === 0 && !isCreating && (
            <div className="flex flex-col items-center justify-center py-10 px-4 opacity-30">
              <FolderTree className="h-8 w-8 mb-2" />
              <p className="text-[10px] uppercase tracking-tighter">Empty Workspace</p>
            </div>
          )}

          {/* File List */}
          {files.map((file) => (
            <div key={file.id} className="relative group px-1">
              {renamingId === file.id ? (
                <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-sm ring-1 ring-primary/30">
                  {getFileIcon(file.language)}
                  <Input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename(file.id);
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    className="h-5 p-0 text-[12px] bg-transparent border-0 focus-visible:ring-0 font-mono"
                    autoFocus
                  />
                </div>
              ) : (
                <div
                  onClick={() => onSelectFile(file.id)}
                  className={`
                    flex items-center justify-between gap-2 px-3 py-1.5 rounded-sm text-[13px] 
                    cursor-pointer transition-all duration-200 border-l-2
                    ${file.id === activeFileId 
                      ? "bg-primary/10 text-primary-foreground border-primary shadow-[inset_0_0_15px_rgba(var(--primary),0.05)]" 
                      : "border-transparent text-zinc-400 hover:bg-white/[0.03] hover:text-zinc-200"}
                  `}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`shrink-0 ${file.id === activeFileId ? "opacity-100" : "opacity-70 group-hover:opacity-100"}`}>
                      {getFileIcon(file.language)}
                    </span>
                    <span className="truncate font-mono tracking-tight">{file.filename}</span>
                  </div>

                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <button className="p-1 rounded-md hover:bg-white/10 text-zinc-500 hover:text-zinc-200 transition-colors">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40 bg-[#0d0f14] border-white/10 text-zinc-300 backdrop-blur-xl">
                        <DropdownMenuItem
                          className="text-[12px] focus:bg-primary/20 focus:text-white"
                          onClick={() => {
                            setRenamingId(file.id);
                            setRenameValue(file.filename);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5 mr-2 opacity-60" /> Rename
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/5" />
                        <DropdownMenuItem
                          className="text-[12px] text-rose-400 focus:bg-rose-500/20 focus:text-rose-300"
                          onClick={() => onDeleteFile(file.id)}
                          disabled={files.length <= 1}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
      
      {/* Visual Footer (IDE Decorator) */}
      <div className="h-6 border-t border-white/[0.03] bg-black/20 flex items-center px-4">
          <div className="w-2 h-2 rounded-full bg-emerald-500/40 mr-2 animate-pulse" />
          <span className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold">Local Workspace</span>
      </div>
    </div>
  );
};

export default FileManager;