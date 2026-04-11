import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are the Coder Agent in a multi-agent coding system. You receive a plan and generate production-quality code.

You MUST respond with valid JSON only. No markdown, no extra text. Use this exact format:
{
  "files": [
    {
      "filename": "example.js",
      "language": "javascript",
      "code": "// full file contents here"
    }
  ],
  "explanation": "Brief explanation of what the code does and key design decisions"
}

Rules:
- Generate complete, runnable code — no placeholders or TODOs
- Use modern syntax and best practices
- Add concise inline comments for clarity
- Each file should be self-contained when possible
- Support JavaScript, TypeScript, Python, HTML, CSS, Bash
- Include error handling where appropriate
- Keep filenames descriptive and lowercase`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { plan, prompt, language, conversationHistory } = await req.json();
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured");

    const userContent = `Original request: ${prompt}\n\nLanguage: ${language || "javascript"}\n\nPlan to implement:\n${
      (plan?.steps || []).map((s: any, i: number) => `${i + 1}. ${s.title}: ${s.description || ""}`).join("\n")
    }`;

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(conversationHistory || []),
      { role: "user", content: userContent },
    ];

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      throw new Error("AI gateway error");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("coder error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
