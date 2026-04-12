// backend/services/groqService.js
import fetch from "node-fetch";

const GROQ_API_KEY = process.env.GROQ_API_KEY;

export async function streamGroqChat(
  messages,
  model = "llama-3.3-70b-versatile",
  res,
) {
  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages, stream: true }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Groq API error:", response.status, errorText);
    // At this point headers have NOT been sent yet, so json() is safe
    if (!res.headersSent) {
      res
        .status(response.status)
        .json({ error: `Groq API error: ${response.status}` });
    }
    return;
  }

  // Set SSE headers BEFORE any write so the client knows to stream
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  // Flush headers immediately so the client can start reading
  res.flushHeaders();

  const stream = response.body;

  stream.on("data", (chunk) => {
    // Headers are already sent at this point — res.write() is safe
    res.write(chunk);
  });

  stream.on("end", () => {
    res.end();
  });

  // FIX: Previously called res.status(500).json() after headers were already
  // sent (because res.flushHeaders() + res.write() had already run), which
  // caused Express to throw "Cannot set headers after they are sent to client".
  // Now we check headersSent and gracefully end the stream instead.
  stream.on("error", (err) => {
    console.error("Groq stream error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Stream error: " + err.message });
    } else {
      // Headers already sent — can only end the response, not change status
      res.end();
    }
  });
}
