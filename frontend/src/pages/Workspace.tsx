// src/pages/Workspace.tsx
import { useEffect, useState, useCallback, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Sparkles, ArrowRight, Eye, EyeOff,
  FolderTree, History, ListChecks, Search, GitBranch,
  PlayCircle, Package, UserCircle, Minus, Square, X,
  Files, ChevronRight, ChevronDown, MoreVertical,
  File, Folder, FolderOpen, Plus, Edit2, Trash2,
  Copy, Terminal, Save, RefreshCw, Command,
  Check, AlertCircle, Code2, Monitor, Trash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ChatPanel from "@/components/workspace/ChatPanel";
import CodePanel from "@/components/workspace/CodePanel";
import ConsolePanel, { ConsoleLine } from "@/components/workspace/ConsolePanel";
import PreviewPanel from "@/components/workspace/PreviewPanel";
import AgentStatus from "@/components/workspace/AgentStatus";
import VersionPanel from "@/components/workspace/VersionPanel";
import { PlanHeader } from "@/components/workspace/PlanHeader";
import { useAgentPipeline, loadPanelSizes, savePanelSizes } from "@/hooks/useAgentPipeline";
import { useCreateProject } from "@/hooks/useProjects";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

// ── Logo Component ────────────────────────────────────────────────
const Logo = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="url(#gradient)" />
    <path d="M12 16L20 12L28 16L20 20L12 16Z" stroke="white" strokeWidth="1.5" fill="none" />
    <path d="M20 20L20 28" stroke="white" strokeWidth="1.5" />
    <circle cx="20" cy="28" r="2" fill="white" />
    <path d="M12 24L20 20L28 24" stroke="white" strokeWidth="1.5" strokeDasharray="2 2" />
    <defs>
      <linearGradient id="gradient" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
        <stop stopColor="hsl(var(--primary))" />
        <stop offset="1" stopColor="hsl(var(--accent))" />
      </linearGradient>
    </defs>
  </svg>
);

// ── Type Definitions ──────────────────────────────────────────────
interface FileNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  language?: string;
}

// ── Constants ────────────────────────────────────────────────────
const DEMO_LIMIT = 1;
const DEMO_KEY = "codeagent_demo_count";

function getDemoCount() { return parseInt(localStorage.getItem(DEMO_KEY) || "0", 10); }
function incrementDemoCount() { const n = getDemoCount() + 1; localStorage.setItem(DEMO_KEY, String(n)); return n; }

// ── Helper: Build File Tree from flat files (with safety) ───────
function buildFileTree(files: Array<{ id: string; name: string; path?: string; language?: string }>): FileNode[] {
  const validFiles = files.filter(f => f && typeof f.name === 'string' && f.name.trim().length > 0);
  if (validFiles.length === 0) return [];

  const root: FileNode[] = [];
  const map = new Map<string, FileNode>();

  // Sort files so folders come first
  const sorted = [...validFiles].sort((a, b) => {
    const aIsDir = a.name.includes('/') || a.name.endsWith('/');
    const bIsDir = b.name.includes('/') || b.name.endsWith('/');
    if (aIsDir && !bIsDir) return -1;
    if (!aIsDir && bIsDir) return 1;
    return a.name.localeCompare(b.name);
  });

  for (const file of sorted) {
    const parts = file.name.split('/');
    let currentPath = '';
    let parent: FileNode | null = null;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const nodePath = currentPath ? `${currentPath}/${part}` : part;

      if (!map.has(nodePath)) {
        const newNode: FileNode = {
          id: isLast ? file.id : `folder-${nodePath}`,
          name: part,
          path: nodePath,
          type: isLast && !file.name.endsWith('/') ? 'file' : 'folder',
          children: isLast && !file.name.endsWith('/') ? undefined : [],
          language: isLast && !file.name.endsWith('/') ? file.language : undefined,
        };
        map.set(nodePath, newNode);

        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(newNode);
        } else {
          root.push(newNode);
        }
      }
      parent = map.get(nodePath) || null;
      currentPath = nodePath;
    }
  }
  return root;
}

// ── File Tree Component (VS Code Style) ──────────────────────────
interface FileTreeItemProps {
  node: FileNode;
  level: number;
  activeFileId: string | null;
  onSelectFile: (fileId: string) => void;
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void;
  expandedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
}

function FileTreeItem({ node, level, activeFileId, onSelectFile, onContextMenu, expandedFolders, onToggleFolder }: FileTreeItemProps) {
  const isExpanded = expandedFolders.has(node.path);
  const isActive = node.type === 'file' && node.id === activeFileId;
  const hasChildren = node.children && node.children.length > 0;

  const handleClick = () => {
    if (node.type === 'folder') {
      onToggleFolder(node.path);
    } else {
      onSelectFile(node.id);
    }
  };

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-sm cursor-pointer transition-colors group",
          "hover:bg-[hsl(215_22%_13%)]",
          isActive && "bg-[hsl(215_22%_15%)] text-primary"
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
        onContextMenu={(e) => onContextMenu(e, node)}
      >
        {node.type === 'folder' && (
          <span className="text-muted-foreground shrink-0">
            {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </span>
        )}
        {node.type === 'folder' ? (
          isExpanded ? <FolderOpen className="h-4 w-4 text-blue-400 shrink-0" /> : <Folder className="h-4 w-4 text-blue-400 shrink-0" />
        ) : (
          <File className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <span className="text-xs truncate flex-1">{node.name}</span>
        {node.type === 'file' && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0"
            onClick={(e) => { e.stopPropagation(); onContextMenu(e, node); }}
          >
            <MoreVertical className="h-3 w-3" />
          </Button>
        )}
      </div>
      {node.type === 'folder' && isExpanded && node.children && (
        <div>
          {node.children.map(child => (
            <FileTreeItem
              key={child.path}
              node={child}
              level={level + 1}
              activeFileId={activeFileId}
              onSelectFile={onSelectFile}
              onContextMenu={onContextMenu}
              expandedFolders={expandedFolders}
              onToggleFolder={onToggleFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface FileTreeProps {
  nodes: FileNode[];
  activeFileId: string | null;
  onSelectFile: (fileId: string) => void;
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void;
  expandedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
}

function FileTree({ nodes, activeFileId, onSelectFile, onContextMenu, expandedFolders, onToggleFolder }: FileTreeProps) {
  return (
    <div className="py-1">
      {nodes.map(node => (
        <FileTreeItem
          key={node.path}
          node={node}
          level={0}
          activeFileId={activeFileId}
          onSelectFile={onSelectFile}
          onContextMenu={onContextMenu}
          expandedFolders={expandedFolders}
          onToggleFolder={onToggleFolder}
        />
      ))}
    </div>
  );
}

// ── Search Panel Component ────────────────────────────────────────
interface SearchPanelProps {
  files: Array<{ id: string; name: string; content?: string }>;
  onOpenFile: (fileId: string) => void;
}

function SearchPanel({ files, onOpenFile }: SearchPanelProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ fileId: string; fileName: string; line: number; preview: string }>>([]);

  const handleSearch = useCallback(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const searchLower = query.toLowerCase();
    const newResults: typeof results = [];
    for (const file of files) {
      if (file.content) {
        const lines = file.content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes(searchLower)) {
            newResults.push({
              fileId: file.id,
              fileName: file.name || "untitled",
              line: i + 1,
              preview: lines[i].trim().slice(0, 80) + (lines[i].length > 80 ? '...' : ''),
            });
          }
        }
      }
    }
    setResults(newResults);
  }, [query, files]);

  useEffect(() => {
    const timer = setTimeout(handleSearch, 300);
    return () => clearTimeout(timer);
  }, [query, handleSearch]);

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-[hsl(var(--ide-border))]">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8 h-8 text-sm bg-[hsl(215_22%_12%)] border-[hsl(var(--ide-border))]"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        {results.length === 0 && query && (
          <div className="p-4 text-center text-muted-foreground text-sm">No results found</div>
        )}
        {results.map((result, idx) => (
          <button
            key={idx}
            className="w-full text-left p-2 hover:bg-[hsl(215_22%_13%)] transition-colors border-b border-[hsl(var(--ide-border))/50]"
            onClick={() => onOpenFile(result.fileId)}
          >
            <div className="text-xs font-mono text-primary">{result.fileName}</div>
            <div className="text-xs text-muted-foreground">Line {result.line}</div>
            <div className="text-xs font-mono mt-1 truncate">{result.preview}</div>
          </button>
        ))}
        {results.length > 0 && (
          <div className="p-2 text-xs text-muted-foreground border-t border-[hsl(var(--ide-border))]">
            {results.length} result{results.length !== 1 ? 's' : ''}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ── Editor Tabs Component (no longer used, but kept for reference) ──
// The component is not rendered anywhere.

// ── Command Palette ──────────────────────────────────────────────
interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: Array<{ id: string; name: string }>;
  onSelectFile: (fileId: string) => void;
  onRunCode: () => void;
}

function CommandPalette({ open, onOpenChange, files, onSelectFile, onRunCode }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [open]);

  const filteredFiles = files.filter(f => f?.name && f.name.toLowerCase().includes(query.toLowerCase()));
  const commands = [
    { name: "Run Code", shortcut: "Ctrl+Enter", action: onRunCode, icon: PlayCircle },
    { name: "Save All", shortcut: "Ctrl+S", action: () => {}, icon: Save },
    { name: "Toggle Preview", shortcut: "Ctrl+Shift+P", action: () => {}, icon: Monitor },
  ];

  const handleSelect = (action: () => void) => {
    action();
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50 backdrop-blur-sm" onClick={() => onOpenChange(false)}>
      <div className="w-full max-w-2xl bg-[hsl(215_22%_10%)] rounded-lg shadow-2xl border border-[hsl(var(--ide-border))] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 p-3 border-b border-[hsl(var(--ide-border))]">
          <Command className="h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or file name..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm"
          />
        </div>
        <div className="max-h-96 overflow-y-auto p-2">
          {query === "" && (
            <>
              <div className="px-2 py-1 text-xs text-muted-foreground">Commands</div>
              {commands.map(cmd => (
                <button
                  key={cmd.name}
                  className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-[hsl(215_22%_15%)] transition-colors"
                  onClick={() => handleSelect(cmd.action)}
                >
                  <div className="flex items-center gap-2">
                    <cmd.icon className="h-4 w-4" />
                    <span className="text-sm">{cmd.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{cmd.shortcut}</span>
                </button>
              ))}
            </>
          )}
          {filteredFiles.length > 0 && (
            <>
              <div className="px-2 py-1 text-xs text-muted-foreground mt-2">Files</div>
              {filteredFiles.map(file => (
                <button
                  key={file.id}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-[hsl(215_22%_15%)] transition-colors"
                  onClick={() => handleSelect(() => onSelectFile(file.id))}
                >
                  <File className="h-4 w-4" />
                  <span className="text-sm">{file.name.split('/').pop()}</span>
                </button>
              ))}
            </>
          )}
          {filteredFiles.length === 0 && query !== "" && (
            <div className="p-4 text-center text-muted-foreground text-sm">No matching files or commands</div>
          )}
        </div>
        <div className="p-2 border-t border-[hsl(var(--ide-border))] text-xs text-muted-foreground">
          Tip: Use ↑↓ to navigate, Enter to select, Esc to close
        </div>
      </div>
    </div>
  );
}

// ── Context Menu ─────────────────────────────────────────────────
interface ContextMenuProps {
  x: number;
  y: number;
  node: FileNode | null;
  onClose: () => void;
  onCreateFile: (path: string) => void;
  onCreateFolder: (path: string) => void;
  onRename: (node: FileNode) => void;
  onDelete: (node: FileNode) => void;
}

function ContextMenu({ x, y, node, onClose, onCreateFile, onCreateFolder, onRename, onDelete }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const adjustedX = Math.min(x, window.innerWidth - 200);
  const adjustedY = Math.min(y, window.innerHeight - 300);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-48 bg-[hsl(215_22%_12%)] border border-[hsl(var(--ide-border))] rounded-md shadow-lg py-1"
      style={{ top: adjustedY, left: adjustedX }}
    >
      {node && node.type === 'folder' && (
        <>
          <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-[hsl(215_22%_18%)]" onClick={() => { onCreateFile(node.path); onClose(); }}>
            <Plus className="h-3.5 w-3.5" /> New File
          </button>
          <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-[hsl(215_22%_18%)]" onClick={() => { onCreateFolder(node.path); onClose(); }}>
            <Folder className="h-3.5 w-3.5" /> New Folder
          </button>
          <div className="h-px bg-[hsl(var(--ide-border))] my-1" />
        </>
      )}
      {node && (
        <>
          <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-[hsl(215_22%_18%)]" onClick={() => { onRename(node); onClose(); }}>
            <Edit2 className="h-3.5 w-3.5" /> Rename
          </button>
          <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10" onClick={() => { onDelete(node); onClose(); }}>
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </>
      )}
    </div>
  );
}

// ── Menu Bar Dropdowns ──────────────────────────────────────────
interface MenuBarProps {
  onNewFile: () => void;
  onNewFolder: () => void;
  onSave: () => void;
  onSaveAll: () => void;
  onToggleSidebar: () => void;
  onTogglePreview: () => void;
  onToggleConsole: () => void;
  onCommandPalette: () => void;
  onRunCode: () => void;
  onCloseAllEditors: () => void;
}

function MenuBar({ onNewFile, onNewFolder, onSave, onSaveAll, onToggleSidebar, onTogglePreview, onToggleConsole, onCommandPalette, onRunCode, onCloseAllEditors }: MenuBarProps) {
  return (
    <div className="flex items-center h-full">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="h-full px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-[hsl(215_22%_13%)] transition-colors">File</button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 bg-[hsl(215_22%_12%)] border-[hsl(var(--ide-border))]">
          <DropdownMenuItem onClick={onNewFile}><Plus className="mr-2 h-4 w-4" /> New File <DropdownMenuShortcut>Ctrl+N</DropdownMenuShortcut></DropdownMenuItem>
          <DropdownMenuItem onClick={onNewFolder}><Folder className="mr-2 h-4 w-4" /> New Folder</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onSave}><Save className="mr-2 h-4 w-4" /> Save <DropdownMenuShortcut>Ctrl+S</DropdownMenuShortcut></DropdownMenuItem>
          <DropdownMenuItem onClick={onSaveAll}><Save className="mr-2 h-4 w-4" /> Save All <DropdownMenuShortcut>Ctrl+Shift+S</DropdownMenuShortcut></DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onCloseAllEditors}><X className="mr-2 h-4 w-4" /> Close All Editors</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="h-full px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-[hsl(215_22%_13%)] transition-colors">Edit</button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 bg-[hsl(215_22%_12%)] border-[hsl(var(--ide-border))]">
          <DropdownMenuItem>Undo <DropdownMenuShortcut>Ctrl+Z</DropdownMenuShortcut></DropdownMenuItem>
          <DropdownMenuItem>Redo <DropdownMenuShortcut>Ctrl+Y</DropdownMenuShortcut></DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Cut <DropdownMenuShortcut>Ctrl+X</DropdownMenuShortcut></DropdownMenuItem>
          <DropdownMenuItem>Copy <DropdownMenuShortcut>Ctrl+C</DropdownMenuShortcut></DropdownMenuItem>
          <DropdownMenuItem>Paste <DropdownMenuShortcut>Ctrl+V</DropdownMenuShortcut></DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="h-full px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-[hsl(215_22%_13%)] transition-colors">Selection</button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 bg-[hsl(215_22%_12%)] border-[hsl(var(--ide-border))]">
          <DropdownMenuItem>Select All <DropdownMenuShortcut>Ctrl+A</DropdownMenuShortcut></DropdownMenuItem>
          <DropdownMenuItem>Expand Selection</DropdownMenuItem>
          <DropdownMenuItem>Shrink Selection</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="h-full px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-[hsl(215_22%_13%)] transition-colors">View</button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 bg-[hsl(215_22%_12%)] border-[hsl(var(--ide-border))]">
          <DropdownMenuItem onClick={onCommandPalette}>Command Palette... <DropdownMenuShortcut>Ctrl+Shift+P</DropdownMenuShortcut></DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onToggleSidebar}>Toggle Sidebar <DropdownMenuShortcut>Ctrl+B</DropdownMenuShortcut></DropdownMenuItem>
          <DropdownMenuItem onClick={onTogglePreview}>Toggle Preview</DropdownMenuItem>
          <DropdownMenuItem onClick={onToggleConsole}>Toggle Console</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="h-full px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-[hsl(215_22%_13%)] transition-colors">Go</button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 bg-[hsl(215_22%_12%)] border-[hsl(var(--ide-border))]">
          <DropdownMenuItem>Go to File... <DropdownMenuShortcut>Ctrl+P</DropdownMenuShortcut></DropdownMenuItem>
          <DropdownMenuItem>Go to Line... <DropdownMenuShortcut>Ctrl+G</DropdownMenuShortcut></DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="h-full px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-[hsl(215_22%_13%)] transition-colors">Run</button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 bg-[hsl(215_22%_12%)] border-[hsl(var(--ide-border))]">
          <DropdownMenuItem onClick={onRunCode}>Run Code <DropdownMenuShortcut>Ctrl+Enter</DropdownMenuShortcut></DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="h-full px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-[hsl(215_22%_13%)] transition-colors">Terminal</button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 bg-[hsl(215_22%_12%)] border-[hsl(var(--ide-border))]">
          <DropdownMenuItem onClick={onToggleConsole}>Toggle Console</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="h-full px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-[hsl(215_22%_13%)] transition-colors">Help</button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 bg-[hsl(215_22%_12%)] border-[hsl(var(--ide-border))]">
          <DropdownMenuItem>Documentation</DropdownMenuItem>
          <DropdownMenuItem>About</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ── Terminal Panel Component ─────────────────────────────────────
interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'error';
  content: string;
}

function TerminalPanel() {
  const [lines, setLines] = useState<TerminalLine[]>([
    { id: 'welcome', type: 'output', content: 'Welcome to the integrated terminal. Type "help" for available commands.' }
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [lines]);

  const processCommand = (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    const inputLine: TerminalLine = { id: Date.now().toString(), type: 'input', content: `$ ${trimmed}` };
    setLines(prev => [...prev, inputLine]);

    let output = '';
    const lower = trimmed.toLowerCase();
    if (lower === 'clear') {
      setLines([]);
      return;
    } else if (lower === 'help') {
      output = 'Available commands:\n  help    - Show this help\n  clear   - Clear terminal\n  echo    - Echo text\n  ls      - List files (mock)\n  date    - Show current date/time';
    } else if (lower.startsWith('echo ')) {
      output = trimmed.slice(5);
    } else if (lower === 'ls') {
      output = 'index.js    style.css    README.md';
    } else if (lower === 'date') {
      output = new Date().toString();
    } else {
      output = `Command not found: ${trimmed}. Type "help" for available commands.`;
    }

    if (output) {
      const outputLine: TerminalLine = { id: Date.now().toString() + '-out', type: 'output', content: output };
      setLines(prev => [...prev, outputLine]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    processCommand(input);
    setInput('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <div className="h-full flex flex-col bg-black/90 text-green-400 font-mono text-sm">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10 bg-black/50 shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">bash</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setLines([])}
        >
          Clear Terminal
        </Button>
      </div>
      <ScrollArea className="flex-1 p-2" ref={scrollRef}>
        {lines.map(line => (
          <div
            key={line.id}
            className={cn(
              "whitespace-pre-wrap break-all",
              line.type === 'input' ? "text-cyan-400" : line.type === 'error' ? "text-red-400" : "text-green-300"
            )}
          >
            {line.content}
          </div>
        ))}
      </ScrollArea>
      <form onSubmit={handleSubmit} className="flex items-center gap-2 p-2 border-t border-white/10 shrink-0">
        <span className="text-cyan-400">$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-transparent outline-none text-green-300 font-mono text-sm"
          autoFocus
        />
      </form>
    </div>
  );
}

// ── Bottom Panel (Console + Terminal) – using ConsoleLine type ───
interface BottomPanelProps {
  consoleLines: ConsoleLine[];
  onClearConsole: () => void;
}

function BottomPanel({ consoleLines, onClearConsole }: BottomPanelProps) {
  const [activeTab, setActiveTab] = useState<'console' | 'terminal'>('console');

  return (
    <div className="h-full flex flex-col bg-[hsl(215_22%_10%)]">
      <div className="flex items-center gap-1 px-2 border-b border-[hsl(var(--ide-border))] shrink-0">
        <button
          onClick={() => setActiveTab('console')}
          className={cn(
            "px-3 py-1.5 text-xs font-medium transition-colors",
            activeTab === 'console'
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Console
        </button>
        <button
          onClick={() => setActiveTab('terminal')}
          className={cn(
            "px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1",
            activeTab === 'terminal'
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Terminal className="h-3 w-3" />
          Terminal
        </button>
      </div>
      <div className="flex-1 min-h-0">
        {activeTab === 'console' ? (
          <ConsolePanel lines={consoleLines} onClear={onClearConsole} />
        ) : (
          <TerminalPanel />
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN WORKSPACE COMPONENT
// ═══════════════════════════════════════════════════════════════════
const Workspace = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const createProject = useCreateProject();
  const isDemo = projectId === "demo";

  const [showSignupWall, setShowSignupWall] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [showConsole, setShowConsole] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<"files"|"search"|"versions">("files");
  const [activeIconId, setActiveIconId] = useState("explorer");
  const [savedSizes] = useState(() => loadPanelSizes());
  const [isMobile, setIsMobile] = useState(false);
  const [mobileTab, setMobileTab] = useState<"chat"|"code"|"preview"|"console">("chat");
  const [isPlanOpen, setIsPlanOpen] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: FileNode | null } | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [openFileIds, setOpenFileIds] = useState<string[]>([]);
  const [renameTarget, setRenameTarget] = useState<FileNode | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [newItemPrompt, setNewItemPrompt] = useState<{ type: 'file' | 'folder'; parentPath: string } | null>(null);

  const { user } = useAuth();
  const fullName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const avatarUrl = user?.user_metadata?.avatar_url;
  const initials = fullName
    ? fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.charAt(0).toUpperCase() || "U";

  const {
    agentState, messages, steps, activeStepId,
    files, setFiles, activeFileId, setActiveFileId,
    consoleLines, isLoading,
    lastExecutionResult,
    handleSendMessage, handleFileChange, handleCreateFile, handleCreateFolder,
    handleRenameFile, handleDeleteFile, handleRestoreSnapshot,
    handleRunCode, clearConsole,
  } = useAgentPipeline(projectId);

  // Local messages state
  const [localMessages, setLocalMessages] = useState(messages);

  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  const wrappedHandleSendMessage = useCallback((content: string) => {
    const userMessage = {
      role: "user",
      content,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    };
    setLocalMessages(prev => [...prev, userMessage]);
    handleSendMessage(content);
  }, [handleSendMessage]);

  // Clear chat function
  const handleClearChat = useCallback(() => {
    setLocalMessages([]);
  }, []);

  // Build file tree
  const fileTree = buildFileTree(files.map(f => ({ id: f.id, name: f.filename, language: f.language })));

  // Auto-expand root folders
  useEffect(() => {
    const newExpanded = new Set(expandedFolders);
    fileTree.forEach(node => {
      if (node.type === 'folder' && !expandedFolders.has(node.path)) {
        newExpanded.add(node.path);
      }
    });
    setExpandedFolders(newExpanded);
  }, [fileTree, expandedFolders]);

  useEffect(() => {
    if (activeFileId && !openFileIds.includes(activeFileId)) {
      setOpenFileIds(prev => [...prev, activeFileId]);
    }
  }, [activeFileId, openFileIds]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (projectId === "new") {
      createProject.mutateAsync({ title: "New Project" }).then(p => {
        navigate(`/workspace/${p.id}`, { replace: true });
      });
    }
  }, [projectId, createProject, navigate]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleRunCode();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        setShowSidebar(prev => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "`") {
        e.preventDefault();
        setShowConsole(prev => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleRunCode]);

  useEffect(() => {
    if (files.length > 0 && (agentState === "complete" || agentState === "error")) {
      setShowPreview(true);
    }
  }, [files, agentState]);

  useEffect(() => {
    if (lastExecutionResult) setShowPreview(true);
  }, [lastExecutionResult]);

const handleDemoSend = useCallback((content: string) => {
  if (!user) {
    setShowSignupWall(true);
    return;
  }
  if (isDemo) {
    if (getDemoCount() >= DEMO_LIMIT) {
      setShowSignupWall(true);
      return;
    }
    incrementDemoCount();
  }
  wrappedHandleSendMessage(content);
}, [isDemo, user, wrappedHandleSendMessage]);

  const handleIconClick = (id: string) => {
    if (id === activeIconId && showSidebar) {
      setShowSidebar(false);
    } else {
      setActiveIconId(id);
      if (id === "search") setSidebarTab("search");
      else if (id === "git") setSidebarTab("versions");
      else setSidebarTab("files");
      setShowSidebar(true);
    }
  };

  const handleCloseFile = (fileId: string) => {
    setOpenFileIds(prev => prev.filter(id => id !== fileId));
    if (activeFileId === fileId) {
      const remaining = openFileIds.filter(id => id !== fileId);
      setActiveFileId(remaining[0] || null);
    }
  };

  const handleCloseAllEditors = () => {
    setOpenFileIds([]);
    setActiveFileId(null);
  };

  const handleFileTreeSelect = (fileId: string) => {
    setActiveFileId(fileId);
    if (!openFileIds.includes(fileId)) {
      setOpenFileIds(prev => [...prev, fileId]);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, node: FileNode) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  };

  const promptForNewItem = (type: 'file' | 'folder', parentPath: string) => {
    const defaultName = type === 'file' ? 'new-file.js' : 'new-folder';
    const name = window.prompt(`Enter ${type} name:`, defaultName);
    if (!name) return;
    const fullPath = parentPath === '' ? name : `${parentPath}/${name}`;
    if (type === 'file') {
      handleCreateFile(fullPath);
    } else {
      handleCreateFolder(fullPath);
    }
  };

  const handleRenameSubmit = () => {
    if (renameTarget && renameValue.trim()) {
      handleRenameFile(renameTarget.id, renameValue.trim());
    }
    setRenameTarget(null);
    setRenameValue("");
  };

  const handleDeleteWithConfirm = (node: FileNode) => {
    if (confirm(`Delete ${node.name}?`)) {
      handleDeleteFile(node.id);
    }
  };

  if (projectId === "new") {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground animate-pulse">Creating project…</div>
      </div>
    );
  }

  const activeFile = files.find(f => f.id === activeFileId) || files[0];
  const langLabel = activeFile
    ? (activeFile.language?.charAt(0).toUpperCase() + activeFile.language?.slice(1) || "Plain Text")
    : "Plain Text";

  // Mobile layout (tabs removed)
  if (isMobile) {
    return (
      <div className="h-[100dvh] flex flex-col bg-background">
        <div className="flex items-center justify-between px-3 h-11 border-b border-border shrink-0">
          <Link to={isDemo ? "/" : "/dashboard"} className="flex items-center gap-2">
            <Logo className="h-6 w-6" />
            <span className="font-semibold text-sm">AgenticAI Studio</span>
          </Link>
          <AgentStatus state={agentState} />
        </div>
        <div className="flex items-center gap-2 px-3 py-1 border-b border-border bg-panel-header">
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setIsPlanOpen(!isPlanOpen)}>
            <ListChecks className="h-3.5 w-3.5" /> Plan
          </Button>
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setShowConsole(prev => !prev)}>
            <Terminal className="h-3.5 w-3.5" /> Console
          </Button>
        </div>
        {isPlanOpen && <PlanHeader steps={steps} activeStepId={activeStepId} />}
        <div className="flex items-center gap-0.5 px-2 py-1 border-b border-border bg-panel-header overflow-x-auto shrink-0">
          {(["chat","code","preview"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setMobileTab(tab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                mobileTab === tab ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex-1 min-h-0">
          {mobileTab === "chat" && (
            <ChatPanel
              messages={localMessages}
              onSendMessage={handleDemoSend}
              isLoading={isLoading}
              userName={fullName}
              onClearChat={handleClearChat}
            />
          )}
          {mobileTab === "code" && (
            <>
              {/* File name tabs removed */}
              <CodePanel files={files} activeFileId={activeFileId} onSelectFile={handleFileTreeSelect} onFileChange={handleFileChange} onRunCode={handleRunCode} isRunning={isLoading} />
            </>
          )}
          {mobileTab === "preview" && <PreviewPanel files={files} visible={true} executionResult={lastExecutionResult} />}
          {showConsole && (
            <div className="h-64 border-t border-border">
              <BottomPanel consoleLines={consoleLines} onClearConsole={clearConsole} />
            </div>
          )}
        </div>
        <SignupWall show={showSignupWall} onClose={() => setShowSignupWall(false)} />
      </div>
    );
  }

  // Desktop layout (tabs removed)
  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col bg-background overflow-hidden">

        {/* VS Code Menubar */}
        <div className="flex items-center h-9 shrink-0 select-none bg-[hsl(215_28%_7%)] border-b border-[hsl(var(--ide-border))]">
          <div className="flex items-center px-3 h-full border-r border-[hsl(var(--ide-border))]">
            <Link to={isDemo ? "/" : "/dashboard"} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Logo className="h-5 w-5" />
            </Link>
          </div>
          <MenuBar
            onNewFile={() => promptForNewItem('file', '')}
            onNewFolder={() => promptForNewItem('folder', '')}
            onSave={() => {}}
            onSaveAll={() => {}}
            onToggleSidebar={() => setShowSidebar(prev => !prev)}
            onTogglePreview={() => setShowPreview(prev => !prev)}
            onToggleConsole={() => setShowConsole(prev => !prev)}
            onCommandPalette={() => setCommandPaletteOpen(true)}
            onRunCode={handleRunCode}
            onCloseAllEditors={handleCloseAllEditors}
          />
          <div className="flex-1 flex justify-center px-4">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
              <input
                placeholder="Go to file (Ctrl+P)"
                className="w-full h-6 pl-7 pr-3 text-xs bg-[hsl(215_22%_13%)] border border-[hsl(var(--ide-border))] rounded text-muted-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-[hsl(var(--primary)_/_0.5)] transition-colors cursor-pointer"
                onClick={() => setCommandPaletteOpen(true)}
                readOnly
              />
            </div>
          </div>
          <div className="flex items-center gap-2 pr-2 h-full">
            <Button variant="ghost" size="sm" className="h-6 gap-1 text-[11px] text-muted-foreground hover:text-foreground" onClick={() => setIsPlanOpen(!isPlanOpen)}>
              <ListChecks className="h-3 w-3" /> Plan
            </Button>
            <div className="h-4 w-px bg-border" />
            <AgentStatus state={agentState} />
            <Button variant="ghost" size="sm" className="h-6 gap-1 text-[11px] text-muted-foreground hover:text-foreground" onClick={() => setShowPreview(p => !p)}>
              {showPreview ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              Preview
            </Button>
            <Button variant="ghost" size="sm" className="h-6 gap-1 text-[11px] text-muted-foreground hover:text-foreground" onClick={() => setShowConsole(c => !c)}>
              <Terminal className="h-3 w-3" />
              Console
            </Button>
            <div className="h-4 w-px bg-border" />
            {isDemo ? (
              <Link to="/signup">
                <Button size="sm" className="h-6 gap-1 text-[11px] font-semibold bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90">
                  <Sparkles className="h-3 w-3" /> Sign Up Free
                </Button>
              </Link>
            ) : (
              <>
                <div className="flex items-center gap-1.5">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={avatarUrl} />
                    <AvatarFallback className="text-[9px]">{initials}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium text-muted-foreground">{fullName}</span>
                </div>
                <Link to="/dashboard">
                  <Button variant="ghost" size="sm" className="h-6 gap-1 text-[11px] text-muted-foreground hover:text-foreground">
                    <LayoutDashboard className="h-3 w-3" /> Dashboard
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Main Body */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* Activity Bar */}
          <div className="flex flex-col justify-between w-12 shrink-0 bg-[hsl(215_28%_7%)] border-r border-[hsl(var(--ide-border))]">
            <div className="flex flex-col pt-1">
              {[
                { id: "explorer", Icon: Files, label: "Explorer" },
                { id: "search", Icon: Search, label: "Search" },
                { id: "git", Icon: GitBranch, label: "Source Control" },
                { id: "run", Icon: PlayCircle, label: "Run & Debug" },
                { id: "extensions", Icon: Package, label: "Extensions" },
              ].map(({ id, Icon, label }) => (
                <Tooltip key={id} delayDuration={200}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleIconClick(id)}
                      className={cn(
                        "flex justify-center items-center w-full py-3 transition-all relative group",
                        activeIconId === id && showSidebar
                          ? "text-primary border-l-2 border-primary bg-[hsl(215_22%_12%)]"
                          : "text-muted-foreground hover:text-foreground hover:bg-[hsl(215_22%_12%)]"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">{label}</TooltipContent>
                </Tooltip>
              ))}
            </div>
            <div className="flex flex-col pb-2">
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <button className="flex justify-center items-center w-full py-3 text-muted-foreground hover:text-foreground hover:bg-[hsl(215_22%_12%)] transition-all">
                    {isDemo ? <UserCircle className="h-5 w-5" /> : (
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={avatarUrl} />
                        <AvatarFallback className="text-[9px] bg-primary/20 text-primary">{initials}</AvatarFallback>
                      </Avatar>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Account</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Sidebar */}
          {showSidebar && (
            <div className="w-64 shrink-0 border-r border-[hsl(var(--ide-border))] flex flex-col bg-[hsl(215_26%_8%)] overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                  {sidebarTab === "search" ? "Search" : sidebarTab === "versions" ? "Source Control" : "Explorer"}
                </span>
                {isDemo && <Badge variant="outline" className="text-[9px] px-1 py-0">DEMO</Badge>}
              </div>
              <div className="flex items-center gap-0.5 px-1 pb-1 border-b border-[hsl(var(--ide-border))] shrink-0">
                <button
                  onClick={() => setSidebarTab("files")}
                  className={cn("flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors", sidebarTab === "files" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground")}
                >
                  <FolderTree className="h-3 w-3" /> Files
                </button>
                <button
                  onClick={() => setSidebarTab("search")}
                  className={cn("flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors", sidebarTab === "search" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground")}
                >
                  <Search className="h-3 w-3" /> Search
                </button>
                <button
                  onClick={() => setSidebarTab("versions")}
                  className={cn("flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors", sidebarTab === "versions" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground")}
                >
                  <History className="h-3 w-3" /> Timeline
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-auto">
                {sidebarTab === "files" && (
                  <FileTree
                    nodes={fileTree}
                    activeFileId={activeFileId}
                    onSelectFile={handleFileTreeSelect}
                    onContextMenu={handleContextMenu}
                    expandedFolders={expandedFolders}
                    onToggleFolder={(path) => {
                      const newSet = new Set(expandedFolders);
                      if (newSet.has(path)) newSet.delete(path);
                      else newSet.add(path);
                      setExpandedFolders(newSet);
                    }}
                  />
                )}
                {sidebarTab === "search" && (
                  <SearchPanel files={files.map(f => ({ id: f.id, name: f.filename, content: f.code }))} onOpenFile={handleFileTreeSelect} />
                )}
                {sidebarTab === "versions" && (
                  <VersionPanel projectId={projectId || "demo"} files={files} onRestore={handleRestoreSnapshot} />
                )}
              </div>
            </div>
          )}

          {/* Center Area - No file tabs above CodePanel */}
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
            {isPlanOpen && (
              <div className="shrink-0 border-b border-[hsl(var(--panel-border))] bg-[hsl(215_22%_9%)]">
                <PlanHeader steps={steps} activeStepId={activeStepId} />
              </div>
            )}

            <ResizablePanelGroup direction="horizontal" className="flex-1" onLayout={(sizes) => savePanelSizes(sizes)}>
              <ResizablePanel defaultSize={showPreview ? 60 : 100} minSize={35}>
                <ResizablePanelGroup direction="vertical">
                  <ResizablePanel defaultSize={showConsole ? 65 : 100} minSize={35}>
                    <CodePanel files={files} activeFileId={activeFileId} onSelectFile={handleFileTreeSelect} onFileChange={handleFileChange} onRunCode={handleRunCode} isRunning={isLoading} />
                  </ResizablePanel>
                  {showConsole && (
                    <>
                      <ResizableHandle className="bg-[hsl(var(--ide-border))] hover:bg-primary/40 transition-colors" />
                      <ResizablePanel defaultSize={35} minSize={15}>
                        <BottomPanel consoleLines={consoleLines} onClearConsole={clearConsole} />
                      </ResizablePanel>
                    </>
                  )}
                </ResizablePanelGroup>
              </ResizablePanel>

              {showPreview && (
                <>
                  <ResizableHandle withHandle className="bg-[hsl(var(--ide-border))]" />
                  <ResizablePanel defaultSize={40} minSize={25}>
                    <PreviewPanel files={files} visible={showPreview} executionResult={lastExecutionResult} />
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          </div>

          {/* Right: AI Chat Panel */}
          <div className="w-80 shrink-0 overflow-hidden flex flex-col border-l border-[hsl(var(--ide-border))]">
            <ChatPanel
              messages={localMessages}
              onSendMessage={handleDemoSend}
              isLoading={isLoading}
              userName={fullName}
              onClearChat={handleClearChat}
            />
          </div>
        </div>

        {/* Status Bar */}
        <div className="flex items-center gap-2 px-3 h-6 shrink-0 bg-[hsl(215_28%_8%)] border-t border-[hsl(var(--ide-border))] text-[11px] text-muted-foreground">
          <GitBranch className="h-3 w-3" />
          <span>main</span>
          <span className="ml-2">{isDemo ? "demo" : `Project: ${projectId?.substring(0, 8)}`}</span>
          <div className="ml-auto flex items-center gap-3">
            <span>Ln {activeFile?.code?.split('\n').length || 1}, Col 1</span>
            <span>Spaces: 4</span>
            <span>UTF-8</span>
            <span>LF</span>
            <Badge variant="outline" className="text-[10px] px-1 font-mono">{langLabel}</Badge>
            <AgentStatus state={agentState} />
          </div>
        </div>

        {/* Modals */}
        <SignupWall show={showSignupWall} onClose={() => setShowSignupWall(false)} />
        <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} files={files.map(f => ({ id: f.id, name: f.filename }))} onSelectFile={handleFileTreeSelect} onRunCode={handleRunCode} />

        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            node={contextMenu.node}
            onClose={() => setContextMenu(null)}
            onCreateFile={(path) => promptForNewItem('file', path)}
            onCreateFolder={(path) => promptForNewItem('folder', path)}
            onRename={(node) => { setRenameTarget(node); setRenameValue(node.name); setContextMenu(null); }}
            onDelete={(node) => handleDeleteWithConfirm(node)}
          />
        )}

        {renameTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setRenameTarget(null)}>
            <div className="bg-[hsl(215_22%_12%)] rounded-lg shadow-xl p-4 w-80" onClick={e => e.stopPropagation()}>
              <h3 className="text-sm font-medium mb-3">Rename {renameTarget.type === 'folder' ? 'Folder' : 'File'}</h3>
              <Input value={renameValue} onChange={e => setRenameValue(e.target.value)} className="mb-3" autoFocus onKeyDown={e => e.key === 'Enter' && handleRenameSubmit()} />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setRenameTarget(null)}>Cancel</Button>
                <Button size="sm" onClick={handleRenameSubmit}>Rename</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

// SignupWall Dialog Component
const SignupWall = ({ show, onClose }: { show: boolean; onClose: () => void }) => (
  <Dialog open={show} onOpenChange={onClose}>
    <DialogContent className="sm:max-w-md text-center bg-[hsl(215_22%_11%)] border-[hsl(var(--ide-border))]">
      <DialogHeader className="items-center">
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center mx-auto mb-3 border border-primary/20">
          <Sparkles className="h-7 w-7 text-primary" />
        </div>
        <DialogTitle className="text-2xl font-black">Unlock Unlimited Access</DialogTitle>
        <DialogDescription className="text-base mt-2">
          You've used your free demo. Sign up to get unlimited AI agent runs, project saving, and the full multi-agent coding experience.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-3 mt-4">
        <Link to="/signup">
          <Button size="lg" className="w-full gap-2 font-semibold bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90">
            Sign Up Free <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        <Link to="/login">
          <Button variant="ghost" size="lg" className="w-full text-muted-foreground">
            Already have an account? Sign in
          </Button>
        </Link>
      </div>
    </DialogContent>
  </Dialog>
);

export default Workspace;