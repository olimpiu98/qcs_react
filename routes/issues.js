const express = require("express")
const multer = require("multer")
const path = require("path")
const fs = require("fs")
const { body, validationResult } = require("express-validator")
const { authenticateToken, requireAdmin, verifyToken } = require("../middleware/auth")
const { validate } = require("../middleware/validate")
const { issueCreateSchema } = require("../schemas/issue")
const db = require("../config/database")

const router = express.Router()

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || "./uploads"
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  },
})

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)

    if (mimetype && extname) {
      return cb(null, true)
    } else {
      cb(new Error("Only image files are allowed"))
    }
  },
})

// Generate unique issue number
async function generateIssueNumber() {
  const [result] = await db.query("SELECT MAX(CAST(SUBSTRING(issue_number, 1) AS UNSIGNED)) as max_num FROM issues")
  const maxNum = result[0].max_num || 35000
  return String(maxNum + 1)
}

// Create audit trail entry
async function createAuditTrail(issueId, userId, action, oldStatus, newStatus, notes, connection = null) {
  const queryExecutor = connection || db
  await queryExecutor.query(
    "INSERT INTO audit_trail (issue_id, user_id, action, old_status, new_status, notes) VALUES (?, ?, ?, ?, ?, ?)",
    [issueId, userId, action, oldStatus, newStatus, notes],
  )
}

// Get all issues with filters
router.get("/", authenticateToken, async (req, res) => {
  try {
    const {
      status,
      checkType,
      supplierId,
      productId,
      startDate,
      endDate,
      page = 1,
      limit = 10,
      showCompleted,
      dateField,
    } = req.query

    const includeCompleted = ["true", "1", "yes"].includes(String(showCompleted).toLowerCase())
    const dateColumn = String(dateField).toLowerCase() === 'updated' ? 'i.updated_at' : 'i.created_at'

    let query = `
      SELECT 
        i.*,
        s.name as supplier_name,
        p.name as product_name,
        u.full_name as created_by_name,
        (SELECT COUNT(*) FROM issue_photos WHERE issue_id = i.id) as photo_count
      FROM issues i
      LEFT JOIN suppliers s ON i.supplier_id = s.id
      LEFT JOIN products p ON i.product_id = p.id
      LEFT JOIN users u ON i.created_by = u.id
      WHERE 1=1
    `

    const params = []

    if (status) {
      if (status === "complete") {
        // Accept either legacy status or new flag
        query += " AND (i.is_complete = TRUE OR i.status = 'complete')"
      } else if (status === "resolved_or_complete") {
        // Union of resolved status or any completed issue
        query += " AND (i.status = 'resolved' OR i.is_complete = TRUE OR i.status = 'complete')"
      } else {
        query += " AND i.status = ?"
        params.push(status)
      }
    }

    if (checkType) {
      query += " AND i.check_type = ?"
      params.push(checkType)
    }

    if (supplierId) {
      query += " AND i.supplier_id = ?"
      params.push(supplierId)
    }

    if (productId) {
      query += " AND i.product_id = ?"
      params.push(productId)
    }

    if (startDate) {
      query += ` AND DATE(${dateColumn}) >= ?`
      params.push(startDate)
    }

    if (endDate) {
      query += ` AND DATE(${dateColumn}) <= ?`
      params.push(endDate)
    }

    if (!includeCompleted && status !== "complete" && status !== "resolved_or_complete") {
      // Hide completed by default
      query += " AND COALESCE(i.is_complete, FALSE) = FALSE"
    }

  // Get total count using a subquery to avoid SELECT list issues
  const countQuery = `SELECT COUNT(*) as total FROM (${query}) as sub`
  const [countResult] = await db.query(countQuery, params)
  const total = Number(countResult?.[0]?.total) || 0

    // Add pagination
    query += " ORDER BY i.created_at DESC LIMIT ? OFFSET ?"
    params.push(Number.parseInt(limit), (Number.parseInt(page) - 1) * Number.parseInt(limit))

    const [issues] = await db.query(query, params)

    res.json({
      issues,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total,
        totalPages: Math.ceil(total / Number.parseInt(limit)),
      },
    })
  } catch (error) {
    console.error("Get issues error:", error)
    res.status(500).json({ error: "Failed to fetch issues" })
  }
})

// Get issue by ID with full details
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const [issues] = await db.query(
      `
      SELECT 
        i.*,
        s.name as supplier_name, s.code as supplier_code,
        p.name as product_name, p.item_no as product_item_no,
        u.full_name as created_by_name,
        a.full_name as assigned_to_name
      FROM issues i
      LEFT JOIN suppliers s ON i.supplier_id = s.id
      LEFT JOIN products p ON i.product_id = p.id
      LEFT JOIN users u ON i.created_by = u.id
      LEFT JOIN users a ON i.assigned_to = a.id
      WHERE i.id = ?
    `,
      [req.params.id],
    )

    if (issues.length === 0) {
      return res.status(404).json({ error: "Issue not found" })
    }

    const issue = issues[0]

    // Get photos
    const [photos] = await db.query(
      "SELECT id, file_name, file_path, uploaded_at FROM issue_photos WHERE issue_id = ? ORDER BY uploaded_at",
      [issue.id],
    )

    // Get audit trail
    const [auditTrail] = await db.query(
      `
      SELECT 
        a.*,
        u.full_name as user_name
      FROM audit_trail a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.issue_id = ?
      ORDER BY a.created_at DESC
    `,
      [issue.id],
    )

    // Get comments
    const [comments] = await db.query(
      `
      SELECT 
        c.*,
        u.full_name as user_name
      FROM issue_comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.issue_id = ?
      ORDER BY c.created_at DESC
    `,
      [issue.id],
    )

    res.json({
      ...issue,
      photos,
      auditTrail,
      comments,
    })
  } catch (error) {
    console.error("Get issue error:", error)
    res.status(500).json({ error: "Failed to fetch issue" })
  }
})

// Create new issue
router.post(
  "/",
  // Example middleware pipeline for docs/screenshots
  verifyToken,
  upload.array("photos", 10),
  validate(issueCreateSchema),
  async (req, res) => {
    const connection = await db.getConnection()

    try {
      await connection.beginTransaction()

      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        await connection.rollback()
        return res.status(400).json({ errors: errors.array() })
      }

      const issueNumber = await generateIssueNumber()

      const {
        checkType,
        haulier,
        lorryRegistration,
        vehicleOrigin,
        supplierId,
        productId,
        origin,
        lotNumber,
        itemNo,
        affectedItem,
        palletsAffected,
        palletType,
        totalCasesAffected,
        piecesPerUnit,
        quantityType,
        issueType,
        description,
        notes,
      } = req.body

      // Build insert payload using object mapping so optional fields are handled cleanly
      const insertData = {
        issue_number: issueNumber,
        check_type: checkType,
        status: 'pending',
        haulier: haulier || null,
        lorry_registration: lorryRegistration || null,
        vehicle_origin: vehicleOrigin || null,
        supplier_id: supplierId || null,
        product_id: productId || null,
        origin: origin || null,
        lot_number: lotNumber || null,
        item_no: itemNo || null,
        affected_item: affectedItem || null,
        pallets_affected: palletsAffected || null,
        pallet_type: palletType || null,
        total_cases_affected: totalCasesAffected || null,
        pieces_per_unit: piecesPerUnit || null,
        quantity_type: quantityType || null,
        issue_type: issueType || null,
        description: description || null,
        notes: notes || null,
        created_by: req.user.id,
      }

      const [result] = await connection.query('INSERT INTO issues SET ?', [insertData])

      const issueId = result.insertId

      // Upload photos if any
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          await connection.query(
            "INSERT INTO issue_photos (issue_id, file_name, file_path, file_size, mime_type, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)",
            [issueId, file.originalname, file.filename, file.size, file.mimetype, req.user.id],
          )
        }
      }

      // Create audit trail
      await createAuditTrail(issueId, req.user.id, "created", null, "pending", "Issue created", connection)

      await connection.commit()

      res.status(201).json({
        message: "Issue created successfully",
        issueId,
        issueNumber,
      })
    } catch (error) {
      await connection.rollback()
      console.error("Create issue error:", error)
      res.status(500).json({ error: "Failed to create issue" })
    } finally {
      connection.release()
    }
  },
)

// Mark issue as complete without changing status (admin only)
router.patch("/:id/complete", authenticateToken, requireAdmin, async (req, res) => {
  const connection = await db.getConnection()

  try {
    await connection.beginTransaction()

    // Get current issue
    const [issues] = await connection.query("SELECT status, is_complete FROM issues WHERE id = ?", [req.params.id])

    if (issues.length === 0) {
      await connection.rollback()
      return res.status(404).json({ error: "Issue not found" })
    }

    // Update issue to mark as complete without changing status
    await connection.query("UPDATE issues SET is_complete = TRUE, updated_at = NOW() WHERE id = ?", [req.params.id])

    // Create audit trail
    await createAuditTrail(
      req.params.id,
      req.user.id,
      "marked_complete",
      null,
      null,
      "Issue marked as complete",
      connection,
    )

    await connection.commit()

    res.json({ message: "Issue marked as complete successfully" })
  } catch (error) {
    await connection.rollback()
    console.error("Mark complete error:", error)
    res.status(500).json({ error: "Failed to mark issue as complete" })
  } finally {
    connection.release()
  }
})

// Update issue status (admin only)
router.patch("/:id/status", authenticateToken, requireAdmin, async (req, res) => {
  const connection = await db.getConnection()

  try {
    await connection.beginTransaction()

    const { status, notes } = req.body

    if (!["pending", "awaiting_confirmation", "accepted", "rejected", "resolved"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" })
    }

    // Get current issue
    const [issues] = await connection.query("SELECT status FROM issues WHERE id = ?", [req.params.id])

    if (issues.length === 0) {
      await connection.rollback()
      return res.status(404).json({ error: "Issue not found" })
    }

    const oldStatus = issues[0].status

    // Update issue
    await connection.query("UPDATE issues SET status = ?, updated_at = NOW() WHERE id = ?", [status, req.params.id])

    // Create audit trail
    await createAuditTrail(req.params.id, req.user.id, "status_change", oldStatus, status, notes || null, connection)

    // Add comment if notes provided
    if (notes) {
      await connection.query("INSERT INTO issue_comments (issue_id, user_id, comment) VALUES (?, ?, ?)", [
        req.params.id,
        req.user.id,
        notes,
      ])
    }

    await connection.commit()

    res.json({ message: "Status updated successfully" })
  } catch (error) {
    await connection.rollback()
    console.error("Update status error:", error)
    res.status(500).json({ error: "Failed to update status" })
  } finally {
    connection.release()
  }
})

// Update issue (admin only)
router.put("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      supplierId,
      productId,
      origin,
      lotNumber,
      itemNo,
      affectedItem,
      palletsAffected,
      palletType,
      totalCasesAffected,
      piecesPerUnit,
      quantityType,
      issueType,
      description,
      notes,
      assignedTo,
    } = req.body

    await db.query(
      `UPDATE issues SET
        supplier_id = ?, product_id = ?, origin = ?, lot_number = ?, item_no = ?, affected_item = ?,
        pallets_affected = ?, pallet_type = ?, total_cases_affected = ?, pieces_per_unit = ?, quantity_type = ?,
        issue_type = ?, description = ?, notes = ?, assigned_to = ?, updated_at = NOW()
      WHERE id = ?`,
      [
        supplierId || null,
        productId || null,
        origin || null,
        lotNumber || null,
        itemNo || null,
        affectedItem || null,
        palletsAffected || null,
        palletType || null,
        totalCasesAffected || null,
        piecesPerUnit || null,
        quantityType || null,
        issueType || null,
        description || null,
        notes || null,
        assignedTo || null,
        req.params.id,
      ],
    )

    await createAuditTrail(req.params.id, req.user.id, "updated", null, null, "Issue details updated")

    res.json({ message: "Issue updated successfully" })
  } catch (error) {
    console.error("Update issue error:", error)
    res.status(500).json({ error: "Failed to update issue" })
  }
})

// Add photos to existing issue
router.post("/:id/photos", authenticateToken, upload.array("photos", 10), async (req, res) => {
  try {
    // Verify issue exists
    const [issues] = await db.query("SELECT id FROM issues WHERE id = ?", [req.params.id])

    if (issues.length === 0) {
      return res.status(404).json({ error: "Issue not found" })
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No photos provided" })
    }

    const photoIds = []

    for (const file of req.files) {
      const [result] = await db.query(
        "INSERT INTO issue_photos (issue_id, file_name, file_path, file_size, mime_type, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)",
        [req.params.id, file.originalname, file.filename, file.size, file.mimetype, req.user.id],
      )
      photoIds.push(result.insertId)
    }

    res.status(201).json({
      message: "Photos uploaded successfully",
      photoIds,
    })
  } catch (error) {
    console.error("Upload photos error:", error)
    res.status(500).json({ error: "Failed to upload photos" })
  }
})

// Add comment to issue
router.post("/:id/comments", authenticateToken, async (req, res) => {
  try {
    const { comment } = req.body

    if (!comment || comment.trim() === "") {
      return res.status(400).json({ error: "Comment is required" })
    }

    const [result] = await db.query("INSERT INTO issue_comments (issue_id, user_id, comment) VALUES (?, ?, ?)", [
      req.params.id,
      req.user.id,
      comment,
    ])

    res.status(201).json({
      message: "Comment added successfully",
      commentId: result.insertId,
    })
  } catch (error) {
    console.error("Add comment error:", error)
    res.status(500).json({ error: "Failed to add comment" })
  }
})

// Export issues to CSV (admin only)
router.get("/export/csv", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, checkType, supplierId, productId, startDate, endDate } = req.query

    let query = `
      SELECT 
        i.issue_number,
        i.created_at,
        i.status,
        i.check_type,
        s.name as supplier_name,
        p.name as product_name,
        i.item_no,
        i.affected_item,
        i.issue_type,
        i.description,
        u.full_name as created_by
      FROM issues i
      LEFT JOIN suppliers s ON i.supplier_id = s.id
      LEFT JOIN products p ON i.product_id = p.id
      LEFT JOIN users u ON i.created_by = u.id
      WHERE 1=1
    `

    const params = []

    if (status) {
      query += " AND i.status = ?"
      params.push(status)
    }

    if (checkType) {
      query += " AND i.check_type = ?"
      params.push(checkType)
    }

    if (supplierId) {
      query += " AND i.supplier_id = ?"
      params.push(supplierId)
    }

    if (productId) {
      query += " AND i.product_id = ?"
      params.push(productId)
    }

    if (startDate) {
      query += " AND DATE(i.created_at) >= ?"
      params.push(startDate)
    }

    if (endDate) {
      query += " AND DATE(i.created_at) <= ?"
      params.push(endDate)
    }

    query += " ORDER BY i.created_at DESC"

    const [issues] = await db.query(query, params)

    // Generate CSV
    const headers = [
      "Issue",
      "Date/time",
      "Status",
      "Type of form",
      "Supplier Name",
      "Item No",
      "Affected Item",
      "Issue Type",
      "Description",
      "Created By",
    ]

    let csv = headers.join(",") + "\n"

    issues.forEach((issue) => {
      const row = [
        issue.issue_number,
        new Date(issue.created_at).toLocaleString(),
        issue.status,
        issue.check_type === "product" ? "Quality check" : "Vehicle check",
        issue.supplier_name || "",
        issue.item_no || "",
        issue.affected_item || "",
        issue.issue_type || "",
        (issue.description || "").replace(/"/g, '""'),
        issue.created_by || "",
      ]
      csv += row.map((field) => `"${field}"`).join(",") + "\n"
    })

    res.setHeader("Content-Type", "text/csv")
    res.setHeader("Content-Disposition", `attachment; filename="issues-export-${Date.now()}.csv"`)
    res.send(csv)
  } catch (error) {
    console.error("Export CSV error:", error)
    res.status(500).json({ error: "Failed to export CSV" })
  }
})

// Delete issue (admin only)
router.delete("/:id", authenticateToken, requireAdmin, async (req, res) => {
  const connection = await db.getConnection()

  try {
    await connection.beginTransaction()

    // Get photos to delete files
    const [photos] = await connection.query("SELECT file_path FROM issue_photos WHERE issue_id = ?", [req.params.id])

    // Delete issue (cascade will handle related records)
    await connection.query("DELETE FROM issues WHERE id = ?", [req.params.id])

    // Delete photo files
    const uploadDir = process.env.UPLOAD_DIR || "./uploads"
    photos.forEach((photo) => {
      const filePath = path.join(uploadDir, photo.file_path)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    })

    await connection.commit()

    res.json({ message: "Issue deleted successfully" })
  } catch (error) {
    await connection.rollback()
    console.error("Delete issue error:", error)
    res.status(500).json({ error: "Failed to delete issue" })
  } finally {
    connection.release()
  }
})

module.exports = router
