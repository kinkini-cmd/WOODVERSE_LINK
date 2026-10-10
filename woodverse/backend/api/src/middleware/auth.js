import { verifyToken } from "../utils/auth.js";
import { authorizeRoles } from "./rbac.js";

export { authorizeRoles };

export function authenticateToken(request, response, next) {
  // Prefer the HttpOnly cookie; fall back to Bearer header for backward compat
  // (AI service and existing tests send Authorization: Bearer).
  let token = request.cookies?.woodverse_token || null;
  if (!token) {
    const header = request.headers.authorization;
    if (header && header.startsWith("Bearer ")) token = header.split(" ")[1];
  }
  if (!token) {
    return response.status(401).json({ error: "Missing or invalid authorization token." });
  }
  const decoded = verifyToken(token);
  if (!decoded) {
    return response.status(401).json({ error: "Invalid or expired token." });
  }
  request.user = decoded;
  next();
}

export function isAdmin(request, response, next) {
  if (!request.user || request.user.role !== "admin") {
    return response.status(403).json({ error: "Admin access required." });
  }
  next();
}
