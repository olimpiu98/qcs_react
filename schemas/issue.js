const { body } = require('express-validator')

// Minimal schema for create issue example
const issueCreateSchema = [
  body('checkType').isIn(['vehicle', 'product']).withMessage('Invalid check type'),
  body('supplierId').optional().isInt(),
  body('productId').optional().isInt(),
]

module.exports = { issueCreateSchema }
