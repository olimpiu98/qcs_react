const express = require("express")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const { body, validationResult } = require("express-validator")
const db = require("../config/database")
const { authenticateToken, JWT_SECRET } = require("../middleware/auth")

const router = express.Router()

// Login
router.post(
  "/login",
  [
    body("username").trim().notEmpty().withMessage("Username is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { username, password } = req.body

      // Get user from database
      const [users] = await db.query(
        "SELECT id, username, password, role, full_name, email FROM users WHERE username = ? AND is_active = TRUE",
        [username],
      )

      if (users.length === 0) {
        return res.status(401).json({ error: "Invalid credentials" })
      }

      const user = users[0]

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password)
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid credentials" })
      }

      // Update last login
      await db.query("UPDATE users SET last_login = NOW() WHERE id = ?", [user.id])

      // Generate JWT token
      const token = jwt.sign({ userId: user.id, username: user.username, role: user.role }, JWT_SECRET, {
        expiresIn: "24h",
      })

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          fullName: user.full_name,
          email: user.email,
        },
      })
    } catch (error) {
      console.error("Login error:", error)
      res.status(500).json({ error: "Login failed" })
    }
  },
)

// Get current user
router.get("/me", authenticateToken, (req, res) => {
  res.json({ user: req.user })
})

// Logout (client-side token removal, but we can track it)
router.post("/logout", authenticateToken, (req, res) => {
  res.json({ message: "Logged out successfully" })
})

module.exports = router
