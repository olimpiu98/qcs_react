"use client"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

const Layout = ({ children }) => {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    await logout()
    navigate("/login")
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#fafafa" }}>
      {/* Header */}
      <header
        style={{
          backgroundColor: "#000",
          color: "white",
          padding: "0.875rem 0",
          borderBottom: "1px solid #171717",
        }}
      >
        <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                borderRadius: "0.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                fontSize: "1rem",
                color: "white",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
            >
              QCS
            </div>
            <div>
              <h1
                style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "0.125rem", letterSpacing: "-0.025em" }}
              >
                Quality Control System
              </h1>
              <p style={{ fontSize: "0.75rem", opacity: 0.7 }}>Enterprise Quality Management</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: "0.875rem", fontWeight: "500" }}>{user?.fullName || user?.username}</p>
              <p style={{ fontSize: "0.75rem", opacity: 0.7 }}>{isAdmin ? "Administrator" : "User"}</p>
            </div>
            <button onClick={handleLogout} className="btn btn-secondary" style={{ fontSize: "0.875rem" }}>
              Log Out
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav
        style={{
          backgroundColor: "white",
          borderBottom: "1px solid #e5e5e5",
          boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        }}
      >
        <div className="container">
          <div style={{ display: "flex", gap: "0.5rem", padding: "0" }}>
            <Link
              to="/"
              style={{
                textDecoration: "none",
                color: location.pathname === "/" ? "#000" : "#737373",
                fontWeight: location.pathname === "/" ? "600" : "500",
                fontSize: "0.875rem",
                padding: "1rem 1.25rem",
                borderBottom: location.pathname === "/" ? "2px solid #000" : "2px solid transparent",
                transition: "all 0.15s ease",
              }}
            >
              Dashboard
            </Link>
            <Link
              to="/issues"
              style={{
                textDecoration: "none",
                color: location.pathname.startsWith("/issues") ? "#000" : "#737373",
                fontWeight: location.pathname.startsWith("/issues") ? "600" : "500",
                fontSize: "0.875rem",
                padding: "1rem 1.25rem",
                borderBottom: location.pathname.startsWith("/issues") ? "2px solid #000" : "2px solid transparent",
                transition: "all 0.15s ease",
              }}
            >
              Issues Overview
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                style={{
                  textDecoration: "none",
                  color: location.pathname === "/admin" ? "#000" : "#737373",
                  fontWeight: location.pathname === "/admin" ? "600" : "500",
                  fontSize: "0.875rem",
                  padding: "1rem 1.25rem",
                  borderBottom: location.pathname === "/admin" ? "2px solid #000" : "2px solid transparent",
                  transition: "all 0.15s ease",
                }}
              >
                Admin
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main style={{ flex: 1, padding: "2rem 0" }}>
        <div className="container">{children}</div>
      </main>

      {/* Footer */}
      <footer
        style={{
          backgroundColor: "white",
          borderTop: "1px solid #e5e5e5",
          padding: "1.5rem 0",
          textAlign: "center",
          fontSize: "0.75rem",
          color: "#737373",
        }}
      >
        <div className="container">
          <p>© 2025 Quality Control System | Version 2.0.0 | Built with React & Node.js</p>
        </div>
      </footer>
    </div>
  )
}

export default Layout
