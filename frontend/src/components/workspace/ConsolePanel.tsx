import { Terminal, Trash2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import PanelHeader from "./PanelHeader";
import { useRef, useEffect, useState, useMemo } from "react";

export interface ConsoleLine {
  id: string;
  type: "stdout" | "stderr" | "info" | "agent";
  content: string;
  agent?: "planner" | "coder" | "debugger";
  timestamp: Date;
}

interface ConsolePanelProps {
  lines: ConsoleLine[];
  onClear?: () => void;
}

type FilterType = "all" | "stdout" | "stderr" | "info" | "agent";

const typeStyles: Record<ConsoleLine["type"], string> = {
  stdout: "text-foreground/90",
  stderr: "text-agent-error",
  info: "text-agent-planner",
  agent: "text-agent-debugger",
};

const typeIcons: Record<ConsoleLine["type"], string> = {
  stdout: "›",
  stderr: "✗",
  info: "ℹ",
  agent: "⚙",
};

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

const ConsolePanel = ({ lines, onClear }: ConsolePanelProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<FilterType>("all");

  const filteredLines = useMemo(() => {
    if (filter === "all") return lines;
    return lines.filter(l => l.type === filter);
  }, [lines, filter]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredLines]);

  const filterOptions: { value: FilterType; label: string }[] = [
    { value: "all", label: "All" },
    { value: "stdout", label: "Output" },
    { value: "stderr", label: "Errors" },
    { value: "agent", label: "Agent" },
  ];

  return (
    <div className="flex flex-col h-full">
      <PanelHeader title="Console" icon={Terminal} iconColor="text-agent-debugger">
        <div className="flex items-center gap-1">
          {lines.length > 0 && (
            <>
              <div className="flex items-center gap-0.5 mr-1">
                {filterOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setFilter(opt.value)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                      filter === opt.value
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-panel-border">
                {filteredLines.length}
              </Badge>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClear}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      </PanelHeader>
      <ScrollArea className="flex-1 bg-terminal-bg" ref={scrollRef}>
        <div className="p-3 font-mono text-xs space-y-px">
          {filteredLines.length === 0 ? (
            <p className="text-muted-foreground/40">$ awaiting execution...</p>
          ) : (
            filteredLines.map(line => (
              <div key={line.id} className={`flex gap-2 py-0.5 hover:bg-secondary/20 rounded px-1 -mx-1 ${typeStyles[line.type]}`}>
                <span className="text-muted-foreground/30 shrink-0 w-[60px] text-right tabular-nums">
                  {formatTime(line.timestamp)}
                </span>
                <span className="text-muted-foreground/40 shrink-0 w-3">
                  {typeIcons[line.type]}
                </span>
                {line.agent && (
                  <span className="text-muted-foreground/50 shrink-0">[{line.agent}]</span>
                )}
                <span className="whitespace-pre-wrap break-all">{line.content}</span>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ConsolePanel;
