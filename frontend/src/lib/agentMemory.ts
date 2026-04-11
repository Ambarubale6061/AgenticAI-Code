// Agent Memory System — stores error/fix patterns for smarter debugging

export interface MemoryEntry {
  id: string;
  timestamp: number;
  errorPattern: string;
  fix: string;
  language: string;
  confidence: string;
}

const MEMORY_KEY = "codeagent_agent_memory";
const MAX_ENTRIES = 50;

function loadMemory(): MemoryEntry[] {
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMemory(entries: MemoryEntry[]) {
  localStorage.setItem(MEMORY_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
}

export function addMemoryEntry(entry: Omit<MemoryEntry, "id" | "timestamp">): MemoryEntry {
  const entries = loadMemory();
  const newEntry: MemoryEntry = {
    ...entry,
    id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
    timestamp: Date.now(),
  };
  entries.push(newEntry);
  saveMemory(entries);
  return newEntry;
}

export function findSimilarFixes(errorMessage: string, language: string): MemoryEntry[] {
  const entries = loadMemory();
  const errorLower = errorMessage.toLowerCase();
  const keywords = errorLower.split(/\s+/).filter(w => w.length > 3);

  return entries
    .filter(e => {
      if (e.language !== language) return false;
      const patternLower = e.errorPattern.toLowerCase();
      const matchCount = keywords.filter(k => patternLower.includes(k)).length;
      return matchCount >= Math.max(1, keywords.length * 0.3);
    })
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5);
}

export function getMemoryStats(): { total: number; languages: Record<string, number> } {
  const entries = loadMemory();
  const languages: Record<string, number> = {};
  for (const e of entries) {
    languages[e.language] = (languages[e.language] || 0) + 1;
  }
  return { total: entries.length, languages };
}

export function getMemoryContext(errorMessage: string, language: string): string {
  const similar = findSimilarFixes(errorMessage, language);
  if (similar.length === 0) return "";

  return "\n\n--- AGENT MEMORY (past fixes for similar errors) ---\n" +
    similar.map((e, i) =>
      `[${i + 1}] Error: ${e.errorPattern.substring(0, 100)}\n    Fix: ${e.fix.substring(0, 200)}\n    Confidence: ${e.confidence}`
    ).join("\n") +
    "\n--- END MEMORY ---\n";
}

export function clearMemory() {
  localStorage.removeItem(MEMORY_KEY);
}
