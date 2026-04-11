// backend/server.js

import dotenv from "dotenv";
dotenv.config(); // ✅ production + local both works

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

// ---------------- MIDDLEWARE ----------------
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      process.env.FRONTEND_URL, // ✅ Vercel URL add in env
    ],
    credentials: true,
  }),
);

app.use(express.json());

// ---------------- ROUTES ----------------
app.use("/api/agent", agentRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/versions", versionRoutes);

// ---------------- HEALTH CHECK ----------------
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Backend running" });
});

// ---------------- ERROR HANDLER ----------------
app.use(errorHandler);

// ---------------- START SERVER ----------------
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
