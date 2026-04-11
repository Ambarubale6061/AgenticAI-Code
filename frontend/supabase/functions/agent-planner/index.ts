import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are the Planner Agent in a multi-agent coding system. Your job is to analyze a user's coding request and create a structured step-by-step plan.

You MUST respond with valid JSON only. No markdown, no extra text. Use this exact format:
{
  "steps": [
    {
      "title": "Short step title",
      "description": "Brief description of what this step involves"
    }
  ],
  "language": "javascript|python|typescript|html|css|bash",
  "summary": "One sentence summary of the plan"
}

Rules:
- Create 3-7 steps maximum
- Each step should be a concrete, actionable coding task
- Choose the most appropriate language based on the request
- Keep titles under 60 characters
- Keep descriptions under 120 characters`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, conversationHistory } = await req.json();
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured");

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(conversationHistory || []),
      { role: "user", content: prompt },
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
        stream: false,
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

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON from the response, stripping markdown fences if present
    let plan;
    try {
      const cleaned = content.replace(/```json\s*\n?/g, "").replace(/```\s*$/g, "").trim();
      plan = JSON.parse(cleaned);
    } catch {
      plan = { steps: [{ title: "Execute request", description: content.substring(0, 100) }], language: "javascript", summary: content.substring(0, 200) };
    }

    return new Response(JSON.stringify(plan), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("planner error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
