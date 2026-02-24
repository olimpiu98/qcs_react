const mysql = require("mysql2/promise")

// Build DB config from either DATABASE_URL or discrete DB_* env vars
function buildConfigFromEnv() {
  let cfg = {}

  // Support a single connection string, e.g. Aiven Service URI
  const connStr = process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.MYSQL_CONNECTION_STRING
  if (connStr) {
    try {
      const u = new URL(connStr)
      cfg.host = u.hostname
      cfg.port = Number(u.port || 3306)
      cfg.user = decodeURIComponent(u.username)
      cfg.password = decodeURIComponent(u.password)
      // pathname may start with '/'
      const pathname = (u.pathname || "").replace(/^\//, "")
      cfg.database = pathname || process.env.DB_NAME || "qcs_db"

      const sslMode = (u.searchParams.get("ssl-mode") || u.searchParams.get("sslmode") || "").toLowerCase()
      const envSslMode = String(process.env.DB_SSL || process.env.DB_SSL_MODE || "").toLowerCase()
      const effectiveSsl = sslMode || envSslMode
      if (effectiveSsl === "true" || effectiveSsl === "required" || effectiveSsl === "require") {
        cfg.ssl = {
          rejectUnauthorized:
            process.env.DB_SSL_REJECT_UNAUTHORIZED === undefined
              ? true
              : String(process.env.DB_SSL_REJECT_UNAUTHORIZED).toLowerCase() !== "false",
        }
        if (process.env.DB_SSL_CA) {
          cfg.ssl.ca = process.env.DB_SSL_CA.replace(/\\n/g, "\n")
        }
      }
      return cfg
    } catch (e) {
      console.warn("Invalid DATABASE_URL/MYSQL_URL, falling back to discrete env vars:", e.message)
    }
  }

  // Fallback to discrete env vars
  const sslMode = String(process.env.DB_SSL || process.env.DB_SSL_MODE || "").toLowerCase()
  let ssl
  if (sslMode === "true" || sslMode === "required" || sslMode === "require") {
    ssl = {
      rejectUnauthorized:
        process.env.DB_SSL_REJECT_UNAUTHORIZED === undefined
          ? true
          : String(process.env.DB_SSL_REJECT_UNAUTHORIZED).toLowerCase() !== "false",
    }
    if (process.env.DB_SSL_CA) {
      ssl.ca = process.env.DB_SSL_CA.replace(/\\n/g, "\n")
    }
  }

  cfg.host = process.env.DB_HOST || "localhost"
  cfg.port = Number(process.env.DB_PORT || 3306)
  cfg.user = process.env.DB_USER || "qcs_user"
  cfg.password = process.env.DB_PASSWORD || "qcs_password"
  cfg.database = process.env.DB_NAME || "qcs_db"
  cfg.ssl = ssl
  return cfg
}

const dbConfig = buildConfigFromEnv()

const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
})

module.exports = pool
