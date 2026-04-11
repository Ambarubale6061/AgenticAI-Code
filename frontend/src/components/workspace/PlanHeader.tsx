import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { CheckCircle2, Loader2, Circle, AlertCircle } from "lucide-react";
import type { PlanStep } from "./PlanPanel";

interface PlanHeaderProps {
  steps: PlanStep[];
  activeStepId?: string;
}

const statusIcon = (status: PlanStep["status"]) => {
  switch (status) {
    case "done":
      return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />;
    case "in-progress":
      return <Loader2 className="h-4 w-4 text-blue-500 shrink-0 animate-spin" />;
    case "error":
      return <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />;
    default:
      return <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />;
  }
};

export const PlanHeader = ({ steps, activeStepId }: PlanHeaderProps) => {
  if (steps.length === 0) return null;

  return (
    <div className="border-b border-border bg-card/50 px-4 py-2">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
        <span>Active Plan</span>
        <span className="text-[10px] font-mono">
          {steps.filter(s => s.status === "done").length}/{steps.length} complete
        </span>
      </div>
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-2">
          {steps.map((step, idx) => (
            <div
              key={step.id}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all ${
                step.id === activeStepId
                  ? "bg-primary/15 text-primary border border-primary/20"
                  : "bg-secondary/50 text-foreground border border-border"
              }`}
            >
              {statusIcon(step.status)}
              <span className={step.status === "done" ? "line-through text-muted-foreground" : ""}>
                {idx + 1}. {step.title}
              </span>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};