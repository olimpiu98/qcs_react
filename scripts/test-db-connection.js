/*
 Small helper to verify DB connectivity with current env vars.
 Usage:
   - Ensure .env is configured (or env vars set in the environment)
   - Run: npm run test:db
*/

const dotenv = require('dotenv')
dotenv.config()

const mysql = require('mysql2/promise')

async function main() {
  const sslMode = String(process.env.DB_SSL || process.env.DB_SSL_MODE || '').toLowerCase()
  let ssl
  if (sslMode === 'true' || sslMode === 'required' || sslMode === 'require') {
    ssl = {
      rejectUnauthorized:
        process.env.DB_SSL_REJECT_UNAUTHORIZED === undefined
          ? true
          : String(process.env.DB_SSL_REJECT_UNAUTHORIZED).toLowerCase() !== 'false',
    }
    if (process.env.DB_SSL_CA) {
      ssl.ca = process.env.DB_SSL_CA.replace(/\\n/g, '\n')
    }
  }

  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'qcs_user',
    password: process.env.DB_PASSWORD || 'qcs_password',
    database: process.env.DB_NAME || 'qcs_db',
    ssl,
  }

  console.log('Testing MySQL connection with config:', {
    ...config,
    password: config.password ? '<redacted>' : undefined,
    ssl: !!ssl,
  })

  try {
    const conn = await mysql.createConnection(config)
    const [rows] = await conn.query('SELECT 1 AS ok')
    await conn.end()
    console.log('DB OK:', rows)
    process.exit(0)
  } catch (err) {
    console.error('DB ERROR:', err)
    process.exit(1)
  }
}

main()
