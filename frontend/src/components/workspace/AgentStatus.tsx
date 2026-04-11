import { Brain, Code2, Bug, Loader2 } from "lucide-react";

export type AgentState = "idle" | "planning" | "coding" | "debugging" | "complete" | "error";

interface AgentStatusProps {
  state: AgentState;
}

const stateConfig: Record<AgentState, { label: string; icon: any; color: string; animate: boolean }> = {
  idle: { label: "Ready", icon: null, color: "text-muted-foreground", animate: false },
  planning: { label: "Planning", icon: Brain, color: "text-agent-planner", animate: true },
  coding: { label: "Coding", icon: Code2, color: "text-agent-coder", animate: true },
  debugging: { label: "Debugging", icon: Bug, color: "text-agent-debugger", animate: true },
  complete: { label: "Complete", icon: null, color: "text-agent-coder", animate: false },
  error: { label: "Error", icon: null, color: "text-agent-error", animate: false },
};

const AgentStatus = ({ state }: AgentStatusProps) => {
  const { label, icon: Icon, color, animate } = stateConfig[state];

  return (
    <div className={`flex items-center gap-1.5 text-xs font-medium ${color}`}>
      {animate && Icon && <Icon className="h-3 w-3 agent-pulse" />}
      {animate && !Icon && <Loader2 className="h-3 w-3 animate-spin" />}
      {!animate && <div className={`h-2 w-2 rounded-full ${state === "complete" ? "bg-agent-coder" : state === "error" ? "bg-agent-error" : "bg-muted-foreground/40"}`} />}
      <span>{label}</span>
    </div>
  );
};

export default AgentStatus;
