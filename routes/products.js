const express = require("express")
const { authenticateToken } = require("../middleware/auth")
const db = require("../config/database")

const router = express.Router()

// Get all active products
router.get("/", authenticateToken, async (req, res) => {
  try {
    const [products] = await db.query(
      "SELECT id, name, item_no, category, description FROM products WHERE is_active = TRUE ORDER BY name",
    )
    res.json(products)
  } catch (error) {
    console.error("Get products error:", error)
    res.status(500).json({ error: "Failed to fetch products" })
  }
})

// Get product by ID
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const [products] = await db.query("SELECT * FROM products WHERE id = ? AND is_active = TRUE", [req.params.id])

    if (products.length === 0) {
      return res.status(404).json({ error: "Product not found" })
    }

    res.json(products[0])
  } catch (error) {
    console.error("Get product error:", error)
    res.status(500).json({ error: "Failed to fetch product" })
  }
})

module.exports = router
