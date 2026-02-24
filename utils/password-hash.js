// Utility script to generate bcrypt password hashes
// Run with: node utils/password-hash.js

const bcrypt = require("bcryptjs")

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10)
  const hash = await bcrypt.hash(password, salt)
  return hash
}

// Generate hash for 'demo' password
hashPassword("demo")
  .then((hash) => {
    console.log("Password hash for 'demo':")
    console.log(hash)
    console.log("\nUse this hash in your SQL INSERT statements")
  })
  .catch((err) => {
    console.error("Error:", err)
  })
