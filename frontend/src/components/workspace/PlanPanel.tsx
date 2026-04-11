import { ListChecks, Circle, CheckCircle2, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import PanelHeader from "./PanelHeader";

export interface PlanStep {
  id: string;
  title: string;
  status: "pending" | "in-progress" | "done" | "error";
  description?: string;
}

interface PlanPanelProps {
  steps: PlanStep[];
  activeStepId?: string;
}

const statusIcon = (status: PlanStep["status"]) => {
  switch (status) {
    case "done":
      return <CheckCircle2 className="h-4 w-4 text-agent-coder shrink-0" />;
    case "in-progress":
      return <Loader2 className="h-4 w-4 text-agent-planner shrink-0 animate-spin" />;
    case "error":
      return <Circle className="h-4 w-4 text-agent-error shrink-0" />;
    default:
      return <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />;
  }
};

const PlanPanel = ({ steps, activeStepId }: PlanPanelProps) => (
  <div className="flex flex-col h-full">
    <PanelHeader title="Plan" icon={ListChecks} iconColor="text-agent-planner">
      {steps.length > 0 && (
        <span className="text-xs text-muted-foreground">
          {steps.filter(s => s.status === "done").length}/{steps.length}
        </span>
      )}
    </PanelHeader>
    <ScrollArea className="flex-1">
      <div className="p-3">
        {steps.length === 0 ? (
          <p className="text-xs text-muted-foreground/60 text-center py-8">
            Send a prompt to generate a plan
          </p>
        ) : (
          <div className="space-y-1">
            {steps.map((step, i) => (
              <div
                key={step.id}
                className={`flex items-start gap-2 p-2 rounded-md text-sm transition-colors ${
                  step.id === activeStepId ? "bg-agent-planner/10 border border-agent-planner/20" : "hover:bg-secondary/50"
                }`}
              >
                {statusIcon(step.status)}
                <div className="min-w-0">
                  <span className={`text-xs text-muted-foreground/50 mr-1`}>{i + 1}.</span>
                  <span className={step.status === "done" ? "text-muted-foreground line-through" : "text-foreground"}>
                    {step.title}
                  </span>
                  {step.description && (
                    <p className="text-xs text-muted-foreground/60 mt-0.5">{step.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  </div>
);

export default PlanPanel;
