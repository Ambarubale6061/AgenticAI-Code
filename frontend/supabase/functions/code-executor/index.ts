import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a Code Execution Simulator. You receive code files and simulate their execution, producing realistic output.

You MUST respond with valid JSON only. No markdown, no extra text. Use this exact format:
{
  "stdout": "Standard output from the code execution",
  "stderr": "Any error messages or warnings (empty string if none)",
  "exitCode": 0,
  "executionTime": "0.12s"
}

Rules:
- Simulate execution as accurately as possible
- For code with syntax errors or runtime errors, set exitCode to 1 and put the error in stderr
- For code that prints output, put it in stdout
- For code that doesn't print anything, put a brief description of what it does in stdout
- Include realistic error messages with line numbers when applicable
- If the code would produce an infinite loop, note that in stderr and set exitCode to 1
- Be precise about what Python, JavaScript, TypeScript, Bash etc. would actually output`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { files, language } = await req.json();
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured");

    const filesStr = (files || [])
      .map((f: any) => `--- ${f.filename} (${f.language}) ---\n${f.code}`)
      .join("\n\n");

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Simulate executing the following ${language || "code"} files:\n\n${filesStr}` },
    ];

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages,
        stream: false,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let result;
    try {
      const cleaned = content.replace(/```json\s*\n?/g, "").replace(/```\s*$/g, "").trim();
      result = JSON.parse(cleaned);
    } catch {
      result = { stdout: content, stderr: "", exitCode: 0, executionTime: "0.1s" };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("executor error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
