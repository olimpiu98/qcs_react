// Simple validation middleware using express-validator style results
// Usage: validate([ body('field').isString() ... ]) before your handler
const { validationResult } = require('express-validator')

function validate(rules) {
  return [
    ...(rules || []),
    (req, res, next) => {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }
      next()
    },
  ]
}

module.exports = { validate }
