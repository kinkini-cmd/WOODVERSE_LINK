import { Router } from "express";
import { databaseConfigured, query } from "../db.js";
import bcrypt from "bcryptjs";
import { signToken, signRefreshToken, verifyRefreshToken } from "../utils/auth.js";
import { authenticateToken } from "../middleware/auth.js";
import { devAccounts, devPassword } from "../data/memory.js";

export const authRouter = Router();

// Without a database the portals would be unreachable, because every one of them is
// gated on a role that only a real login can supply. So login falls back to the seeded
// accounts in data/memory.js, the same way the catalog route serves memory products.
//
// This is a development convenience only. In production a missing DATABASE_URL must
// still fail loudly rather than hand out a token for a well known password.
const devAccountsEnabled = !databaseConfigured && process.env.NODE_ENV !== "production";

// Logged once at boot so the credentials do not have to be guessed or read out of the
// source when a developer needs to get into a portal.
export const devCredentials = devAccounts.map((user) => ({ email: user.email, password: devPassword }));

// Public self-registration. "admin" is deliberately not accepted: an admin account can
// only be created by another admin through POST /api/users.
const SELF_REGISTER_ROLES = new Set(["customer", "vendor", "supplier"]);

// Shared by both account sources so a suspended or unapproved account is refused
// identically whether it came from PostgreSQL or from the in-memory seed.
function accountBlocked(user) {
  if (user.status === "suspended") return "Account is suspended.";
  if (user.status === "pending_approval") return "Your account is still waiting for admin approval.";
  return null;
}

// Cookie names and options used across all auth endpoints.
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
};
const ACCESS_COOKIE = "woodverse_token";
const REFRESH_COOKIE = "woodverse_refresh";

authRouter.post("/api/auth/register", async (request, response) => {
  if (!databaseConfigured) {
    return response.status(503).json({
      error: "PostgreSQL is not configured.",
    });
  }

  const { email, fullName, password, role = "customer", businessName, documents = [] } = request.body;

  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedName = String(fullName || "").trim();
  const rawPassword = String(password || "");
  const requestedRole = String(role || "customer").trim().toLowerCase();

  if (!SELF_REGISTER_ROLES.has(requestedRole)) {
    return response.status(400).json({
      error: `role must be one of: ${[...SELF_REGISTER_ROLES].join(", ")}.`,
    });
  }

  if (!normalizedEmail || !normalizedName || !rawPassword) {
    return response.status(400).json({
      error: "Email, full name, and password are required.",
    });
  }

  if (rawPassword.length < 8) {
    return response.status(400).json({
      error: "Password must be at least 8 characters.",
    });
  }

  try {
    const existingUser = await query(
      "SELECT id FROM users WHERE email = $1",
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return response.status(409).json({
        error: "An account with this email already exists.",
      });
    }

    const passwordHash = await bcrypt.hash(rawPassword, 12);
    // Vendor and supplier accounts stay pending until an admin approves them, so a
    // freshly registered business account cannot immediately act as one.
    const isCustomer = requestedRole === "customer";
    const shouldCreateVendorProfile = requestedRole === "vendor";
    const status = isCustomer ? "active" : "pending_approval";

    const result = await query(
      `INSERT INTO users
        (email, full_name, role, password_hash, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, full_name, role, status, created_at`,
      [normalizedEmail, normalizedName, requestedRole, passwordHash, status]
    );

    const user = result.rows[0];

    if (shouldCreateVendorProfile) {
      // TODO: replace with a real file-upload endpoint; documents here are filename strings only
      await query(
        `INSERT INTO vendors (user_id, business_name, documents, verification_status)
         VALUES ($1, $2, $3, 'pending')`,
        [user.id, String(businessName || `${normalizedName}'s business`).slice(0, 200), JSON.stringify(Array.isArray(documents) ? documents : [])]
      );
    }

    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
    });
    const refreshToken = signRefreshToken(user.id);

    response.cookie(ACCESS_COOKIE, token, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 });
    response.cookie(REFRESH_COOKIE, refreshToken, { ...COOKIE_OPTS, maxAge: 24 * 60 * 60 * 1000 });

    return response.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    if (error.code === "23505") {
      return response.status(409).json({
        error: "An account with this email already exists.",
      });
    }

    console.error(error);
    return response.status(500).json({
      error: "Internal server error",
    });
  }
});


authRouter.post("/api/auth/login", async (request, response) => {
  if (!databaseConfigured && !devAccountsEnabled) {
    return response.status(503).json({ error: "PostgreSQL is not configured." });
  }
  const { email, password, rememberMe } = request.body;
  if (!email || !password) return response.status(400).json({ error: "Email and password are required." });

  try {
    const user = databaseConfigured
      ? (await query("SELECT id, email, full_name, role, password_hash, status FROM users WHERE email = $1", [email.toLowerCase()])).rows[0]
      : devAccounts.find((candidate) => candidate.email === String(email).trim().toLowerCase());

    if (!user || !user.password_hash) {
      return response.status(401).json({ error: "Invalid email or password." });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return response.status(401).json({ error: "Invalid email or password." });
    }
    const blocked = accountBlocked(user);
    if (blocked) {
      return response.status(403).json({ error: blocked });
    }

    const token = signToken({ id: user.id, email: user.email, role: user.role, fullName: user.full_name });
    const remember = Boolean(rememberMe);
    const refreshToken = signRefreshToken(user.id, remember);

    response.cookie(ACCESS_COOKIE, token, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 });
    response.cookie(REFRESH_COOKIE, refreshToken, { ...COOKIE_OPTS, maxAge: remember ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000 });

    response.json({
      token,
      user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role, status: user.status },
      source: databaseConfigured ? "postgresql" : "memory",
    });
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: "Internal server error" });
  }
});

authRouter.post("/api/auth/refresh", (request, response) => {
  const refreshToken = request.cookies?.[REFRESH_COOKIE];
  if (!refreshToken) return response.status(401).json({ error: "No refresh token." });

  const decoded = verifyRefreshToken(refreshToken);
  if (!decoded) {
    response.clearCookie(ACCESS_COOKIE);
    response.clearCookie(REFRESH_COOKIE);
    return response.status(401).json({ error: "Refresh token invalid or expired." });
  }

  const newToken = signToken({ id: decoded.id });
  response.cookie(ACCESS_COOKIE, newToken, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 });
  response.json({ ok: true });
});

authRouter.post("/api/auth/logout", (request, response) => {
  response.clearCookie(ACCESS_COOKIE, COOKIE_OPTS);
  response.clearCookie(REFRESH_COOKIE, COOKIE_OPTS);
  response.json({ ok: true });
});

authRouter.get("/api/auth/me", authenticateToken, async (request, response) => {
  if (!databaseConfigured) {
    return response.json({
      user: {
        id: request.user.id,
        email: request.user.email,
        role: request.user.role,
        fullName: request.user.fullName,
      },
    });
  }
  try {
    const result = await query(
      "SELECT id, email, full_name, role, status FROM users WHERE id = $1",
      [request.user.id]
    );
    const user = result.rows[0];
    if (!user) {
      response.clearCookie(ACCESS_COOKIE, COOKIE_OPTS);
      response.clearCookie(REFRESH_COOKIE, COOKIE_OPTS);
      return response.status(401).json({ error: "User not found." });
    }
    if (user.status === "suspended") return response.status(403).json({ error: "Account is suspended." });
    return response.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: "Internal server error" });
  }
});

authRouter.post("/api/auth/forgot-password", async (request, response) => {
  if (!databaseConfigured) return response.status(503).json({ error: "PostgreSQL is not configured." });
  const { email } = request.body;
  if (!email) return response.status(400).json({ error: "Email is required." });
  try {
    const result = await query(
      "SELECT id, email FROM users WHERE email = $1",
      [String(email).trim().toLowerCase()]
    );
    const user = result.rows[0];
    if (user) {
      const resetToken = signToken({ id: user.id, purpose: "password_reset" });
      // TODO: send email with reset link; for now, log the token server-side
      console.log("[forgot-password] Reset token for", user.email, ":", resetToken);
    }
    // Always return the same message to prevent email enumeration
    return response.json({ message: "If that email exists, a reset link has been sent." });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: "Internal server error" });
  }
});
