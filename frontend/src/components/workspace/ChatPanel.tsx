import { useState, useRef, useEffect } from "react";
import { 
  Send, 
  MessageSquare, 
  Sparkles, 
  User, 
  ClipboardList, 
  Hammer, 
  ChevronDown, 
  Zap, 
  Trash2, 
  Cpu 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  agent?: "planner" | "coder" | "debugger";
  timestamp: Date;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  onClearChat?: () => void; 
  isLoading: boolean;
  userName?: string;
}

const agentColors: Record<string, string> = {
  planner: "text-emerald-400",
  coder:   "text-blue-400",
  debugger:"text-rose-400",
};

const ChatPanel = ({ messages, onSendMessage, onClearChat, isLoading, userName = "User" }: ChatPanelProps) => {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isEmpty = messages.length === 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const firstName = userName.split(" ")[0];

  return (
    <div className="flex flex-col h-full bg-[hsl(var(--ide-bg,215_28%_7%))] border-l border-[hsl(var(--ide-border,215_18%_16%))] font-sans shadow-2xl">

      {/* ── Tab header ───────────────────────────────── */}
      <div className="flex items-center justify-between h-10 border-b border-[hsl(var(--panel-border))] bg-background/50 backdrop-blur-md shrink-0 px-2">
        <div className="flex items-center gap-2 px-3 h-full text-xs font-semibold text-foreground relative">
          <MessageSquare className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />
          AI Assistant
          <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[hsl(var(--primary))] to-purple-500 rounded-t-full" />
        </div>
        
        <div className="flex items-center gap-1">
          {/* Clear Chat Button */}
          {!isEmpty && (
            <button
              onClick={onClearChat}
              className="flex items-center justify-center w-7 h-7 mr-1 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-all duration-200"
              title="Clear Chat"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Scrollable content area ───────────────────── */}
      <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
        {isEmpty ? (
          <div className="flex flex-col items-center px-6 pt-16 pb-8 fade-in h-full justify-center">
            <div className="text-center mb-10">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500/20 via-purple-500/20 to-pink-500/20 border border-white/10 flex items-center justify-center mx-auto mb-5 shadow-[0_0_30px_rgba(99,102,241,0.15)] ring-1 ring-white/5">
                <Sparkles className="h-8 w-8 text-indigo-400" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground leading-tight">
                Hello, {firstName}
              </h2>
              <p className="text-sm text-muted-foreground mt-2">
                What are we building today?
              </p>
            </div>

            <div className="w-full max-w-sm space-y-3">
              <button
                className="w-full text-left p-4 rounded-xl bg-secondary/40 hover:bg-secondary/80 border border-border/50 hover:border-[hsl(var(--primary)_/_0.5)] transition-all duration-300 group shadow-sm hover:shadow-md"
                onClick={() => setInput("Let's plan this out: ")}
              >
                <div className="flex items-center gap-3 mb-1.5">
                  <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary)_/_0.15)] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <ClipboardList className="h-4 w-4 text-[hsl(var(--primary))]" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Plan</span>
                </div>
                <p className="text-[13px] text-muted-foreground/80 leading-relaxed pl-11">
                  Draft requirements and design your architecture before coding.
                </p>
              </button>

              <button
                className="w-full text-left p-4 rounded-xl bg-secondary/40 hover:bg-secondary/80 border border-border/50 hover:border-purple-500/50 transition-all duration-300 group shadow-sm hover:shadow-md"
                onClick={() => setInput("Let's build: ")}
              >
                <div className="flex items-center gap-3 mb-1.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Hammer className="h-4 w-4 text-purple-400" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Build</span>
                </div>
                <p className="text-[13px] text-muted-foreground/80 leading-relaxed pl-11">
                  Jump straight in. Explore ideas and iterate as you discover needs.
                </p>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-6">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-3 fade-in ${msg.role === "user" ? "justify-end" : ""}`}
              >
                {msg.role === "assistant" && (
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0 shadow-sm mt-1">
                    <Sparkles className={`h-4 w-4 ${msg.agent ? agentColors[msg.agent] : "text-indigo-400"}`} />
                  </div>
                )}
                
                <div
                  className={`max-w-[82%] px-4 py-3 text-[13px] shadow-sm ${
                    msg.role === "user"
                      ? "bg-gradient-to-br from-[hsl(var(--primary))] to-indigo-600 border-none text-white rounded-2xl rounded-tr-sm"
                      : "bg-secondary/50 border border-border/60 text-secondary-foreground rounded-2xl rounded-tl-sm backdrop-blur-sm"
                  }`}
                >
                  {msg.agent && (
                    <span className={`flex items-center gap-1.5 text-[10px] font-bold ${agentColors[msg.agent]} mb-2 uppercase tracking-wider`}>
                      <Cpu className="h-3 w-3" />
                      {msg.agent} Agent
                    </span>
                  )}
                  {msg.role === "user" && (
                    <div className="text-[10px] font-medium text-white/70 mb-1.5 flex items-center gap-1.5">
                      {userName}
                    </div>
                  )}
                  <div className="prose prose-sm prose-invert max-w-none text-[13.5px] leading-relaxed">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>

                {msg.role === "user" && (
                  <div className="h-8 w-8 rounded-full bg-secondary/80 border border-border/50 flex items-center justify-center shrink-0 shadow-sm mt-1">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 fade-in items-end">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0 shadow-sm">
                  <Sparkles className="h-4 w-4 text-indigo-400 agent-pulse" />
                </div>
                <div className="bg-secondary/50 border border-border/60 rounded-2xl rounded-tl-sm px-4 py-3.5 backdrop-blur-sm shadow-sm">
                  <div className="flex gap-1.5 items-center h-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-400/70 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-400/70 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-400/70 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} className="h-1" />
          </div>
        )}
      </ScrollArea>

      {/* ── Bottom input area ─────────────────────────── */}
      <div className="p-4 bg-background/80 backdrop-blur-md border-t border-border/60 shrink-0">
        <div className="bg-secondary/40 border border-border/60 rounded-2xl overflow-hidden focus-within:border-[hsl(var(--primary)_/_0.6)] focus-within:ring-2 focus-within:ring-[hsl(var(--primary)_/_0.15)] transition-all duration-300 shadow-sm">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question or describe a task..."
            className="min-h-[64px] max-h-[160px] resize-none bg-transparent border-0 text-[13.5px] text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-0 px-4 pt-3.5 pb-2 scrollbar-thin"
            disabled={isLoading}
          />

          <div className="flex items-center justify-between px-3 pb-3 pt-1">
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-background/80 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors border border-transparent hover:border-border/50">
                <Zap className="h-3.5 w-3.5 text-amber-500 drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]" />
                <span></span>
                <ChevronDown className="h-3 w-3 opacity-70" />
              </button>

              <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                <span>Auto</span>
                <div className="relative inline-flex h-4 w-7 items-center rounded-full bg-secondary border border-border/50">
                  <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/70 translate-x-1 transition-transform" />
                </div>
              </label>
            </div>

            <Button
              type="button"
              size="icon"
              className="h-8 w-8 rounded-xl bg-gradient-to-br from-[hsl(var(--primary))] to-indigo-600 hover:opacity-90 text-white shadow-md hover:shadow-lg hover:shadow-indigo-500/20 transition-all duration-200 disabled:opacity-50 disabled:shadow-none"
              disabled={!input.trim() || isLoading}
              onClick={() => handleSubmit()}
            >
              <Send className="h-4 w-4 ml-0.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;