// backend/server.js

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";

import agentRoutes from "./routes/agentRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import versionRoutes from "./routes/versionRoutes.js";

import { errorHandler } from "./middleware/errorMiddleware.js";

// Connect DB
connectDB();

const app = express();

// ─── CORS ────────────────────────────────────────────────────────────────────

// FIX 1: Removed `as string[]` type assertion — this is a .js file, not .ts.
// FIX 2: process.env.FRONTEND_URL was undefined when not set in Render,
//         causing the array to contain `undefined` and silently block all requests.
//         We now filter out falsy values and use a function-based origin checker.
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:8080",
  "http://localhost:3000",
  process.env.FRONTEND_URL, // e.g. https://agentic-ai-studio-chi.vercel.app
  process.env.FRONTEND_URL_2, // optional second frontend URL
].filter(Boolean);

console.log("✅ CORS allowed origins:", allowedOrigins);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. server-to-server, curl, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      console.warn(`⛔ CORS blocked origin: ${origin}`);
      return callback(new Error(`CORS not allowed for origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// ─── Body parser ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/agent", agentRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/versions", versionRoutes);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "OK", message: "Backend running" });
});

// ─── 404 catch-all ────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
