import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, Clock, Code2, Trash2, Pencil, MoreHorizontal, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useProjects, useCreateProject, useUpdateProject } from "@/hooks/useProjects";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { ProfileCard } from "@/components/ProfileCard";

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

const Dashboard = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { data: projects = [], isLoading, refetch } = useProjects();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editProject, setEditProject] = useState<{ id: string; title: string; description: string } | null>(null);

  const filtered = projects.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    (p.description || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleNew = async () => {
    const project = await createProject.mutateAsync({ title: "New Project" });
    navigate(`/workspace/${project.id}`);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("projects").delete().eq("id", deleteId);
    if (error) toast.error(error.message);
    else { toast.success("Project deleted"); refetch(); }
    setDeleteId(null);
  };

  const handleDuplicate = async (project: typeof projects[0]) => {
    await createProject.mutateAsync({ title: `${project.title} (copy)`, description: project.description });
    toast.success("Project duplicated");
  };

  const handleSaveEdit = async () => {
    if (!editProject) return;
    await updateProject.mutateAsync({ id: editProject.id, title: editProject.title, description: editProject.description });
    toast.success("Project updated");
    setEditProject(null);
  };

  const handleExport = (project: typeof projects[0]) => {
    const files = (project.generated_code as any[]) || [];
    if (files.length === 0) { toast.error("No code to export"); return; }
    const content = files.map((f: any) => `// === ${f.filename} ===\n${f.content}`).join("\n\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.title.replace(/\s+/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-1/4 w-[400px] h-[400px] rounded-full bg-primary/3 blur-[100px]" />
      </div>

      <nav className="border-b border-border/30 bg-background/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo className="h-9 w-9" />
            <span className="font-black text-xl">AgenticAI Studio</span>
          </Link>
          <Button size="sm" variant="ghost" onClick={() => { signOut(); navigate("/"); }}>Sign out</Button>
        </div>
      </nav>

      {/* rest of dashboard unchanged */}
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-black">Your Projects</h1>
                <p className="text-muted-foreground text-sm mt-1">{projects.length} project{projects.length !== 1 ? "s" : ""}</p>
              </div>
              <Button className="glow-green gap-2 font-semibold" onClick={handleNew} disabled={createProject.isPending}>
                <Plus className="h-4 w-4" /> New Project
              </Button>
            </div>

            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-card/50 border-border/50" />
            </div>

            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground animate-pulse">Loading projects...</div>
            ) : (
              <div className="space-y-3">
                {filtered.map(project => (
                  <div
                    key={project.id}
                    className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm hover:bg-secondary/30 p-4 transition-all group hover:border-primary/20 cursor-pointer"
                    onClick={() => navigate(`/workspace/${project.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold truncate">{project.title}</h3>
                          <Badge variant="outline" className="text-xs shrink-0 border-border/50">{project.language}</Badge>
                          <Badge
                            variant="outline"
                            className={`text-xs shrink-0 ${project.status === 'active' ? 'border-[hsl(var(--ide-accent-green))]/30 text-[hsl(var(--ide-accent-green))]' : 'border-border/50'}`}
                          >
                            {project.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{project.description || "No description"}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Code2 className="h-3 w-3" /> {(project.plan as any[])?.length || 0} steps
                          </span>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <button className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground opacity-0 group-hover:opacity-100 transition-all">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem onClick={() => setEditProject({ id: project.id, title: project.title, description: project.description || "" })}>
                            <Pencil className="h-4 w-4 mr-2" /> Rename / Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(project)}>
                            <Copy className="h-4 w-4 mr-2" /> Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExport(project)}>
                            <Download className="h-4 w-4 mr-2" /> Export Code
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteId(project.id)}>
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
                {filtered.length === 0 && !isLoading && (
                  <div className="text-center py-16 text-muted-foreground">
                    <Logo className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">{search ? "No projects found" : "No projects yet"}</p>
                    <p className="text-sm mt-1">{search ? "Try a different search" : "Create one to get started!"}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right column: Profile Card */}
          <div className="lg:w-80">
            <ProfileCard />
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. All code, plans, and messages will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit dialog */}
      <Dialog open={!!editProject} onOpenChange={() => setEditProject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Title</label>
              <Input value={editProject?.title || ""} onChange={e => setEditProject(prev => prev ? { ...prev, title: e.target.value } : null)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Description</label>
              <Textarea value={editProject?.description || ""} onChange={e => setEditProject(prev => prev ? { ...prev, description: e.target.value } : null)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProject(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={updateProject.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;