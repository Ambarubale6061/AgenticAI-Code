import { useEffect, useState, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { LayoutDashboard, Sparkles, ArrowRight, Eye, EyeOff, FolderTree, History, PanelLeftClose, PanelLeft, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import ChatPanel from "@/components/workspace/ChatPanel";
import CodePanel from "@/components/workspace/CodePanel";
import ConsolePanel from "@/components/workspace/ConsolePanel";
import PreviewPanel from "@/components/workspace/PreviewPanel";
import AgentStatus from "@/components/workspace/AgentStatus";
import FileManager from "@/components/workspace/FileManager";
import VersionPanel from "@/components/workspace/VersionPanel";
import { PlanHeader } from "@/components/workspace/PlanHeader";
import { useAgentPipeline, loadPanelSizes, savePanelSizes } from "@/hooks/useAgentPipeline";
import { useCreateProject } from "@/hooks/useProjects";
import { useAuth } from "@/hooks/useAuth";

// Custom logo SVG component
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

const DEMO_LIMIT = 1;
const DEMO_KEY = "codeagent_demo_count";

function getDemoCount(): number {
  return parseInt(localStorage.getItem(DEMO_KEY) || "0", 10);
}
function incrementDemoCount(): number {
  const next = getDemoCount() + 1;
  localStorage.setItem(DEMO_KEY, String(next));
  return next;
}

const Workspace = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const createProject = useCreateProject();
  const isDemo = projectId === "demo";
  const [showSignupWall, setShowSignupWall] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<"files" | "versions">("files");
  const [savedSizes] = useState(() => loadPanelSizes());
  const [isMobile, setIsMobile] = useState(false);
  const [mobileTab, setMobileTab] = useState<"chat" | "code" | "preview" | "console">("chat");
  const [isPlanOpen, setIsPlanOpen] = useState(true);

  // Get user for display name and avatar
  const { user } = useAuth();
  const fullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const avatarUrl = user?.user_metadata?.avatar_url;
  const initials = fullName
    ? fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.charAt(0).toUpperCase() || 'U';

  // Responsive detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Auto-create project if "new"
  useEffect(() => {
    if (projectId === "new") {
      createProject.mutateAsync({ title: "New Project" }).then(p => {
        navigate(`/workspace/${p.id}`, { replace: true });
      });
    }
  }, [projectId]);

  const {
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
    handleSendMessage,
    handleFileChange,
    handleCreateFile,
    handleRenameFile,
    handleDeleteFile,
    handleRestoreSnapshot,
    handleRunCode,
    clearConsole,
  } = useAgentPipeline(projectId);

  // Show preview when we have web files
  useEffect(() => {
    const hasWeb = files.some(f => ["html", "javascript", "css"].includes(f.language));
    if (hasWeb && files.length > 0 && agentState === "complete") {
      setShowPreview(true);
    }
  }, [files, agentState]);

  const handleDemoSend = useCallback((content: string) => {
    if (!isDemo) {
      handleSendMessage(content);
      return;
    }
    if (getDemoCount() >= DEMO_LIMIT) {
      setShowSignupWall(true);
      return;
    }
    incrementDemoCount();
    handleSendMessage(content);
  }, [isDemo, handleSendMessage]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleRunCode();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleRunCode]);

  if (projectId === "new") {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground animate-pulse">Creating project...</div>
      </div>
    );
  }

  // MOBILE LAYOUT (unchanged except logo)
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
        </div>
        {isPlanOpen && <PlanHeader steps={steps} activeStepId={activeStepId} />}
        <div className="flex items-center gap-0.5 px-2 py-1 border-b border-border bg-panel-header overflow-x-auto shrink-0">
          {(["chat", "code", "preview", "console"] as const).map(tab => (
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
          {mobileTab === "chat" && <ChatPanel messages={messages} onSendMessage={handleDemoSend} isLoading={isLoading} userName={fullName} />}
          {mobileTab === "code" && (
            <CodePanel
              files={files}
              activeFileId={activeFileId}
              onSelectFile={setActiveFileId}
              onFileChange={handleFileChange}
              onRunCode={handleRunCode}
              isRunning={isLoading}
            />
          )}
          {mobileTab === "preview" && <PreviewPanel files={files} visible={true} />}
          {mobileTab === "console" && <ConsolePanel lines={consoleLines} onClear={clearConsole} />}
        </div>
        <Dialog open={showSignupWall} onOpenChange={setShowSignupWall}>
          <DialogContent className="max-w-[90vw] text-center">
            <DialogHeader className="items-center">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center mx-auto mb-2 border border-primary/20">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <DialogTitle className="text-xl font-black">Unlock Unlimited Access</DialogTitle>
              <DialogDescription className="text-sm mt-1">
                Sign up to get unlimited AI agent runs and full project saving.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2 mt-3">
              <Link to="/signup">
                <Button size="lg" className="w-full glow-green gap-2 font-semibold">Sign Up Free <ArrowRight className="h-4 w-4" /></Button>
              </Link>
              <Link to="/login">
                <Button variant="ghost" className="w-full text-muted-foreground text-sm">Already have an account? Sign in</Button>
              </Link>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // DESKTOP LAYOUT
  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="flex items-center justify-between px-3 h-11 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowSidebar(s => !s)}>
            {showSidebar ? <PanelLeftClose className="h-3.5 w-3.5" /> : <PanelLeft className="h-3.5 w-3.5" />}
          </Button>
          <Link to={isDemo ? "/" : "/dashboard"} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Logo className="h-6 w-6" />
            <span className="font-semibold text-sm">AgenticAI Studio</span>
          </Link>
          <div className="h-4 w-px bg-border" />
          <span className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
            {isDemo ? "demo" : projectId?.substring(0, 8)}
          </span>
          {isDemo && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">DEMO</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setIsPlanOpen(!isPlanOpen)}>
            <ListChecks className="h-3.5 w-3.5" /> Plan
          </Button>
          <AgentStatus state={agentState} />
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setShowPreview(p => !p)}>
            {showPreview ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />} Preview
          </Button>
          {isDemo ? (
            <Link to="/signup">
              <Button size="sm" className="h-7 gap-1 text-xs glow-green font-semibold">
                <Sparkles className="h-3 w-3" /> Sign Up Free
              </Button>
            </Link>
          ) : (
            <>
              <div className="flex items-center gap-2 px-2 py-1">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{fullName}</span>
              </div>
              <Link to="/dashboard">
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                  <LayoutDashboard className="h-3 w-3" /> Dashboard
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {showSidebar && (
          <div className="w-56 shrink-0 border-r border-border flex flex-col bg-card/30">
            <div className="flex items-center gap-0.5 px-1 py-1 border-b border-panel-border">
              <button
                onClick={() => setSidebarTab("files")}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  sidebarTab === "files" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FolderTree className="h-3 w-3" /> Files
              </button>
              <button
                onClick={() => setSidebarTab("versions")}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  sidebarTab === "versions" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <History className="h-3 w-3" /> Versions
              </button>
            </div>
            <div className="flex-1 min-h-0">
              {sidebarTab === "files" ? (
                <FileManager
                  files={files}
                  activeFileId={activeFileId}
                  onSelectFile={setActiveFileId}
                  onCreateFile={handleCreateFile}
                  onRenameFile={handleRenameFile}
                  onDeleteFile={handleDeleteFile}
                />
              ) : (
                <VersionPanel projectId={projectId || "demo"} files={files} onRestore={handleRestoreSnapshot} />
              )}
            </div>
          </div>
        )}

        <ResizablePanelGroup direction="horizontal" className="flex-1" onLayout={(sizes) => savePanelSizes(sizes)}>
          <ResizablePanel defaultSize={savedSizes?.[0] ?? 28} minSize={18}>
            <ChatPanel messages={messages} onSendMessage={handleDemoSend} isLoading={isLoading} userName={fullName} />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={savedSizes?.[1] ?? (showPreview ? 42 : 72)} minSize={30}>
            <ResizablePanelGroup direction="vertical">
              {isPlanOpen && (
                <>
                  <ResizablePanel defaultSize={15} minSize={8}>
                    <PlanHeader steps={steps} activeStepId={activeStepId} />
                  </ResizablePanel>
                  <ResizableHandle />
                </>
              )}
              <ResizablePanel defaultSize={isPlanOpen ? 55 : 70} minSize={30}>
                <CodePanel
                  files={files}
                  activeFileId={activeFileId}
                  onSelectFile={setActiveFileId}
                  onFileChange={handleFileChange}
                  onRunCode={handleRunCode}
                  isRunning={isLoading}
                />
              </ResizablePanel>
              <ResizableHandle />
              <ResizablePanel defaultSize={isPlanOpen ? 30 : 30} minSize={15}>
                <ConsolePanel lines={consoleLines} onClear={clearConsole} />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
          {showPreview && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={savedSizes?.[2] ?? 30} minSize={20}>
                <PreviewPanel files={files} visible={showPreview} />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>

      <Dialog open={showSignupWall} onOpenChange={setShowSignupWall}>
        <DialogContent className="sm:max-w-md text-center">
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
              <Button size="lg" className="w-full glow-green gap-2 font-semibold">Sign Up Free <ArrowRight className="h-4 w-4" /></Button>
            </Link>
            <Link to="/login">
              <Button variant="ghost" size="lg" className="w-full text-muted-foreground">Already have an account? Sign in</Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Workspace;