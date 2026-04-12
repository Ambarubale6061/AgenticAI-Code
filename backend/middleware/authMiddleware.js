// backend/middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import { SUPABASE_URL } from "../config/env.js";

// ─── JWKS client for RS256 / ES256 tokens (modern Supabase) ──────────────────
const jwksUri = `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`;
console.log("🔐 [Auth] JWKS URI:", jwksUri);

const client = jwksClient({
  jwksUri,
  cache: true,
  rateLimit: true,
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      console.error("[Auth] JWKS key fetch failed:", err.message);
      return callback(err);
    }
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

export const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  // Decode header to check the algorithm before verifying
  const decodedHeader = jwt.decode(token, { complete: true });
  if (!decodedHeader) {
    return res.status(401).json({ error: "Invalid token format" });
  }

  const alg = decodedHeader.header.alg;
  console.log("🔍 [Auth] Token algorithm:", alg);

  // ─── RS256 / ES256 — modern Supabase tokens ────────────────────────────────
  if (alg === "RS256" || alg === "ES256") {
    jwt.verify(
      token,
      getKey,
      { algorithms: ["RS256", "ES256"] },
      (err, decoded) => {
        if (err) {
          console.error("[Auth] Public key verification failed:", err.message);
          return res.status(401).json({ error: "Invalid token" });
        }
        console.log(`✅ [Auth] ${alg} token verified`);
        req.user = { id: decoded.sub, email: decoded.email };
        next();
      },
    );
    return; // Important: stop execution here, callback handles next()
  }

  // ─── HS256 — older Supabase tokens ────────────────────────────────────────
  if (alg === "HS256") {
    // FIX: SUPABASE_JWT_SECRET may be undefined if not set as an env var.
    // Calling jwt.verify(token, undefined) throws a non-obvious error.
    // We now guard explicitly and return a clear 401 with a helpful message.
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    if (!jwtSecret) {
      console.error(
        "[Auth] HS256 token received but SUPABASE_JWT_SECRET is not set. " +
          "Add it to your Render environment variables (found in Supabase → Project Settings → API → JWT Secret).",
      );
      return res.status(401).json({
        error: "Server misconfiguration: SUPABASE_JWT_SECRET not set",
      });
    }

    try {
      const decoded = jwt.verify(token, jwtSecret);
      console.log("✅ [Auth] HS256 token verified");
      req.user = { id: decoded.sub, email: decoded.email };
      next();
    } catch (err) {
      console.error("[Auth] HS256 verification failed:", err.message);
      return res.status(401).json({ error: "Invalid token" });
    }
    return;
  }

  // ─── Unsupported algorithm ─────────────────────────────────────────────────
  console.error("[Auth] Unsupported algorithm:", alg);
  return res.status(401).json({ error: `Unsupported token algorithm: ${alg}` });
};
