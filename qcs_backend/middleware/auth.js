const jwt = require("jsonwebtoken")
const db = require("../config/database")

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key"

// Verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"]
    const token = authHeader && authHeader.split(" ")[1]

    if (!token) {
      return res.status(401).json({ error: "Access token required" })
    }

    const decoded = jwt.verify(token, JWT_SECRET)

    // Get user from database
    const [users] = await db.query(
      "SELECT id, username, role, full_name, email FROM users WHERE id = ? AND is_active = TRUE",
      [decoded.userId],
    )

    if (users.length === 0) {
      return res.status(401).json({ error: "User not found or inactive" })
    }

    req.user = users[0]
    next()
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(403).json({ error: "Invalid token" })
    }
    if (error.name === "TokenExpiredError") {
      return res.status(403).json({ error: "Token expired" })
    }
    return res.status(500).json({ error: "Authentication failed" })
  }
}

// Check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" })
  }
  next()
}

module.exports = {
  authenticateToken,
  requireAdmin,
  JWT_SECRET,
  // Alias to match common naming in docs/screenshots
  verifyToken: authenticateToken,
}
