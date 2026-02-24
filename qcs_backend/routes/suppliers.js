const express = require("express")
const { authenticateToken } = require("../middleware/auth")
const db = require("../config/database")

const router = express.Router()

// Get all active suppliers
router.get("/", authenticateToken, async (req, res) => {
  try {
    const [suppliers] = await db.query(
      "SELECT id, name, code, contact_person, email, phone FROM suppliers WHERE is_active = TRUE ORDER BY name",
    )
    res.json(suppliers)
  } catch (error) {
    console.error("Get suppliers error:", error)
    res.status(500).json({ error: "Failed to fetch suppliers" })
  }
})

// Get supplier by ID
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const [suppliers] = await db.query("SELECT * FROM suppliers WHERE id = ? AND is_active = TRUE", [req.params.id])

    if (suppliers.length === 0) {
      return res.status(404).json({ error: "Supplier not found" })
    }

    res.json(suppliers[0])
  } catch (error) {
    console.error("Get supplier error:", error)
    res.status(500).json({ error: "Failed to fetch supplier" })
  }
})

module.exports = router
