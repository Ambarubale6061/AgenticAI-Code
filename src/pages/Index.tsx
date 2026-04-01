import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import { Cpu, Bug, Zap, ArrowRight, Terminal, Code2, Brain, Sparkles, Shield, Clock, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import heroVisual from "@/assets/hero-visual.jpg";

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

const agents = [
  {
    icon: Brain,
    name: "Planner",
    color: "text-[hsl(var(--ide-accent-blue))]",
    bg: "bg-[hsl(var(--ide-accent-blue)/0.1)]",
    border: "border-[hsl(var(--ide-accent-blue)/0.3)]",
    glow: "shadow-[0_0_40px_-10px_hsl(var(--ide-accent-blue)/0.3)]",
    description: "Analyzes your prompt, breaks it into actionable steps, and identifies the right language and framework.",
  },
  {
    icon: Code2,
    name: "Coder",
    color: "text-[hsl(var(--ide-accent-green))]",
    bg: "bg-[hsl(var(--ide-accent-green)/0.1)]",
    border: "border-[hsl(var(--ide-accent-green)/0.3)]",
    glow: "shadow-[0_0_40px_-10px_hsl(var(--ide-accent-green)/0.3)]",
    description: "Generates production-ready code for each step across JavaScript, Python, and more.",
  },
  {
    icon: Bug,
    name: "Debugger",
    color: "text-[hsl(var(--ide-accent-yellow))]",
    bg: "bg-[hsl(var(--ide-accent-yellow)/0.1)]",
    border: "border-[hsl(var(--ide-accent-yellow)/0.3)]",
    glow: "shadow-[0_0_40px_-10px_hsl(var(--ide-accent-yellow)/0.3)]",
    description: "Catches errors, identifies root causes, and auto-fixes with up to 3 retry attempts.",
  },
];

const features = [
  { icon: Sparkles, title: "AI-Powered", desc: "Three specialized agents collaborate to build your code autonomously." },
  { icon: Shield, title: "Auto-Debug", desc: "Errors are caught and fixed automatically — up to 3 retry attempts." },
  { icon: Clock, title: "Real-Time", desc: "Watch agents plan, code, and debug in real-time with streaming output." },
  { icon: Layers, title: "Multi-Language", desc: "Supports JavaScript, Python, TypeScript, and more out of the box." },
];

const typingPhrases = [
  "Build an e-commerce website",
  "Create a real-time dashboard",
  "Design a landing page",
  "Generate a REST API",
];

const Index = () => {
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -60]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0.3]);

  // Typing animation state
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentPhrase = typingPhrases[phraseIndex];
    let timeout: NodeJS.Timeout;

    if (!isDeleting && displayText !== currentPhrase) {
      // Typing
      timeout = setTimeout(() => {
        setDisplayText(currentPhrase.slice(0, displayText.length + 1));
      }, 100);
    } else if (!isDeleting && displayText === currentPhrase) {
      // Pause before deleting
      timeout = setTimeout(() => setIsDeleting(true), 1500);
    } else if (isDeleting && displayText !== "") {
      // Deleting
      timeout = setTimeout(() => {
        setDisplayText(displayText.slice(0, -1));
      }, 50);
    } else if (isDeleting && displayText === "") {
      // Move to next phrase
      setIsDeleting(false);
      setPhraseIndex((prev) => (prev + 1) % typingPhrases.length);
    }

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, phraseIndex]);

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-accent/5 blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/3 blur-[150px]" />
        <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--border)/0.05)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.05)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      {/* Nav */}
      <nav className="border-b border-border/30 backdrop-blur-xl sticky top-0 z-50 bg-background/60">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2.5">
            <Logo className="h-9 w-9" />
            <span className="font-black text-xl tracking-tight">AgenticAI Studio</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">Sign in</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="glow-green font-semibold">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 container mx-auto px-4 pt-20 pb-12 md:pt-28 md:pb-20">
        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="text-center max-w-4xl mx-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm font-medium mb-8"
          >
            <Zap className="h-3.5 w-3.5" />
            AI-Powered Multi-Agent System
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.05] mb-6"
          >
            Describe it.
            <br />
            <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
              We build it.
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-4 leading-relaxed"
          >
            An autonomous coding agent that plans, writes, executes, and debugs code — all from a single prompt.
            Three AI agents working together in real time.
          </motion.p>

          {/* Typing animation */}
          <div className="text-lg md:text-xl text-primary/80 font-mono flex justify-center items-center gap-2 mb-10">
            <span className="text-muted-foreground">Try:</span>
            <span className="min-w-[280px] text-left">
              {displayText}
              <span className="inline-block w-[2px] h-5 bg-primary ml-0.5 animate-pulse" />
            </span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/signup">
              <Button size="lg" className="glow-green gap-2 text-base h-12 px-8 font-semibold">
                Start Building <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/workspace/demo">
              <Button variant="outline" size="lg" className="gap-2 text-base h-12 px-8 border-border/50 hover:bg-secondary/50">
                <Terminal className="h-4 w-4" /> Try Demo
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Hero visual */}
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-16 max-w-5xl mx-auto relative"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-accent/5 to-transparent blur-3xl scale-110 -z-10" />
          <div className="rounded-2xl border border-panel-border/50 overflow-hidden shadow-2xl shadow-primary/10 relative">
            <img
              src={heroVisual}
              alt="AI-powered coding visualization with neural network and code streams"
              width={1920}
              height={1080}
              className="w-full h-auto object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
              <div className="rounded-xl border border-panel-border/80 overflow-hidden shadow-xl bg-terminal-bg/95 backdrop-blur-sm max-w-3xl mx-auto">
                <div className="bg-panel-header px-4 py-2.5 flex items-center gap-2 border-b border-panel-border/50">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-[hsl(var(--ide-accent-red))]/80" />
                    <div className="h-3 w-3 rounded-full bg-[hsl(var(--ide-accent-yellow))]/80" />
                    <div className="h-3 w-3 rounded-full bg-[hsl(var(--ide-accent-green))]/80" />
                  </div>
                  <span className="text-xs text-muted-foreground ml-2 font-mono">AgenticAI — workspace</span>
                </div>
                <div className="p-5 font-mono text-sm space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[hsl(var(--ide-accent-blue))] font-semibold">▸ Planner:</span>
                    <span className="text-muted-foreground">Breaking down "Build a REST API with auth"...</span>
                  </div>
                  <div className="flex items-center gap-2 pl-4">
                    <span className="text-muted-foreground/60">├─</span>
                    <span className="text-foreground/80">Step 1: Set up Express server with middleware</span>
                    <span className="text-[hsl(var(--ide-accent-green))] text-xs">✓</span>
                  </div>
                  <div className="flex items-center gap-2 pl-4">
                    <span className="text-muted-foreground/60">├─</span>
                    <span className="text-foreground/80">Step 2: Implement JWT authentication</span>
                    <span className="text-[hsl(var(--ide-accent-green))] text-xs">✓</span>
                  </div>
                  <div className="flex items-center gap-2 pl-4">
                    <span className="text-muted-foreground/60">└─</span>
                    <span className="text-foreground/80">Step 3: Create CRUD endpoints</span>
                    <span className="text-[hsl(var(--ide-accent-yellow))] text-xs agent-pulse">●</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[hsl(var(--ide-accent-green))] font-semibold">▸ Coder:</span>
                    <span className="text-muted-foreground">Generating code for step 3...</span>
                    <span className="typing-cursor" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features grid */}
      <section className="relative z-10 container mx-auto px-4 py-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-4xl mx-auto">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.08 * i }}
              className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-5 text-center hover:border-primary/20 transition-colors"
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-bold text-sm mb-1">{f.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Agents section */}
      <section className="relative z-10 container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-black mb-4">Three agents. One workflow.</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Each agent specializes in a different phase of the development cycle, working together seamlessly.
          </p>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {agents.map((agent, i) => (
            <motion.div
              key={agent.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.12 * i }}
              className={`rounded-2xl border ${agent.border} ${agent.bg} p-7 ${agent.glow} hover:scale-[1.02] transition-transform`}
            >
              <div className={`h-12 w-12 rounded-xl ${agent.bg} flex items-center justify-center mb-5 border ${agent.border}`}>
                <agent.icon className={`h-6 w-6 ${agent.color}`} />
              </div>
              <h3 className={`font-bold text-xl mb-3 ${agent.color}`}>{agent.name} Agent</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{agent.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-black mb-4">How it works</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            From prompt to production-ready code in seconds.
          </p>
        </motion.div>
        <div className="max-w-3xl mx-auto space-y-0">
          {[
            { step: "01", title: "Describe your idea", desc: "Write a natural language prompt describing what you want to build.", color: "text-primary" },
            { step: "02", title: "Planner creates a roadmap", desc: "The AI breaks your request into structured, actionable steps.", color: "text-[hsl(var(--ide-accent-blue))]" },
            { step: "03", title: "Coder writes the code", desc: "Production-quality code is generated file by file with streaming output.", color: "text-[hsl(var(--ide-accent-green))]" },
            { step: "04", title: "Debugger auto-fixes", desc: "Errors are detected and fixed automatically with up to 3 retry attempts.", color: "text-[hsl(var(--ide-accent-yellow))]" },
          ].map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 * i }}
              className="flex gap-6 py-6 border-b border-border/30 last:border-0"
            >
              <span className={`text-3xl font-black ${item.color} opacity-60 shrink-0 w-12`}>{item.step}</span>
              <div>
                <h3 className="font-bold text-lg mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 container mx-auto px-4 py-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/5 to-transparent p-12 md:p-16"
        >
          <h2 className="text-3xl md:text-4xl font-black mb-4">Ready to automate your coding?</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Join developers who are shipping faster with AI-powered multi-agent workflows.
          </p>
          <Link to="/signup">
            <Button size="lg" className="glow-green gap-2 text-base h-12 px-10 font-semibold">
              Get Started Free <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/30 py-8">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Logo className="h-4 w-4" />
            <span className="font-semibold">AgenticAI Studio</span>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-3">
            <span>Built with AI agents</span>
            <span className="hidden md:inline">•</span>
            <span>Developed by Ambar Ubale</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;