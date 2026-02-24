const express = require("express")
const { authenticateToken, requireAdmin } = require("../middleware/auth")
const db = require("../config/database")

const router = express.Router()

// Get all users (admin only)
router.get("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [users] = await db.query(
      "SELECT id, username, role, full_name, email, created_at, last_login, is_active FROM users ORDER BY created_at DESC",
    )
    res.json(users)
  } catch (error) {
    console.error("Get users error:", error)
    res.status(500).json({ error: "Failed to fetch users" })
  }
})

module.exports = router
