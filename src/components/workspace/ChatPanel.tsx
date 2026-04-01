import { useState, useRef, useEffect } from "react";
import { Send, MessageSquare, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import PanelHeader from "./PanelHeader";
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
  isLoading: boolean;
  userName?: string;
}

const agentColors: Record<string, string> = {
  planner: "text-agent-planner",
  coder: "text-agent-coder",
  debugger: "text-agent-debugger",
};

const ChatPanel = ({ messages, onSendMessage, isLoading, userName = "User" }: ChatPanelProps) => {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <PanelHeader title="Chat" icon={MessageSquare} iconColor="text-primary" />

      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-3 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <Bot className="h-8 w-8 text-primary/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Hello, {userName}!</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Describe what you want to build</p>
              <p className="text-xs text-muted-foreground/60">The agents will plan, code, and debug it for you</p>
            </div>
          )}
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : ""}`}>
              {msg.role === "assistant" && (
                <div className="h-6 w-6 rounded-md bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className={`h-3.5 w-3.5 ${msg.agent ? agentColors[msg.agent] : "text-primary"}`} />
                </div>
              )}
              <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-primary/15 text-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}>
                {msg.agent && (
                  <span className={`text-xs font-medium ${agentColors[msg.agent]} block mb-1`}>
                    {msg.agent.charAt(0).toUpperCase() + msg.agent.slice(1)} Agent
                  </span>
                )}
                {msg.role === "user" && (
                  <div className="text-xs font-medium text-primary/80 mb-1 flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {userName}
                  </div>
                )}
                <div className="prose prose-sm prose-invert max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
              {msg.role === "user" && (
                <div className="h-6 w-6 rounded-md bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="h-3.5 w-3.5 text-primary" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-2">
              <div className="h-6 w-6 rounded-md bg-secondary flex items-center justify-center shrink-0">
                <Bot className="h-3.5 w-3.5 text-primary agent-pulse" />
              </div>
              <div className="bg-secondary rounded-lg px-3 py-2">
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="p-3 border-t border-panel-border">
        <div className="relative">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to build..."
            className="min-h-[60px] max-h-[120px] pr-12 resize-none bg-secondary border-panel-border text-sm"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            className="absolute bottom-2 right-2 h-8 w-8"
            disabled={!input.trim() || isLoading}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ChatPanel;