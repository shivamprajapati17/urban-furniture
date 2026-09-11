import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "urban-furniture-dev-secret";
const EXPIRES_IN = "12h";

export function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, contactId: user.contactId ?? null },
    SECRET,
    { expiresIn: EXPIRES_IN }
  );
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Authentication required" });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Roles that may access internal (back-office) routes.
export const STAFF_ROLES = ["admin", "accountant"];

export function requireStaff(req, res, next) {
  if (!req.user || !STAFF_ROLES.includes(req.user.role)) {
    return res.status(403).json({ error: "Staff access required" });
  }
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}