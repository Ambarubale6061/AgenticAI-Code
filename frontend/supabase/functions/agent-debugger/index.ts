import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are the Debugger Agent in a multi-agent coding system. You analyze code execution errors and produce fixes.

You MUST respond with valid JSON only. No markdown, no extra text. Use this exact format:
{
  "diagnosis": "Root cause analysis of the error",
  "fixes": [
    {
      "filename": "example.js",
      "language": "javascript",
      "code": "// complete corrected file contents"
    }
  ],
  "explanation": "What was wrong and what you changed to fix it",
  "confidence": "high|medium|low"
}

Rules:
- Analyze the error message and stack trace carefully
- Provide the COMPLETE corrected file, not just a patch
- Explain the root cause clearly
- Rate your confidence in the fix
- If the error is ambiguous, provide your best fix with a "medium" or "low" confidence
- Suggest additional steps if the fix might not fully resolve the issue`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, error: errorMsg, plan, prompt, retryCount } = await req.json();
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured");

    const filesStr = (code || [])
      .map((f: any) => `--- ${f.filename} ---\n${f.code}`)
      .join("\n\n");

    const userContent = `Original request: ${prompt}\n\nRetry attempt: ${retryCount || 1}/3\n\nCode that produced the error:\n${filesStr}\n\nError output:\n${errorMsg}`;

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
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
    console.error("debugger error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
