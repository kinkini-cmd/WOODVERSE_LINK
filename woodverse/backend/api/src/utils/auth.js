import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET must be configured");
}
const JWT_EXPIRY = "7d";

const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || (JWT_SECRET + "-refresh");
const REFRESH_TOKEN_EXPIRY = "1d";

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function signRefreshToken(userId, rememberMe = false) {
  return jwt.sign({ id: userId }, REFRESH_TOKEN_SECRET, { expiresIn: rememberMe ? "30d" : REFRESH_TOKEN_EXPIRY });
}

export function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, REFRESH_TOKEN_SECRET);
  } catch {
    return null;
  }
}
